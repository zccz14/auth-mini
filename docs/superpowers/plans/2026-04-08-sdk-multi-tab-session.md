# SDK Multi-Tab Session Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add formal multi-tab session support by upgrading refresh to use `session_id + refresh_token`, distinguishing `session_invalidated` from `session_superseded`, and letting browser SDK instances synchronize session changes through shared `localStorage`.

**Architecture:** Keep the server-side source of truth in the `sessions` row identified by `session_id`, with exactly one current refresh token hash and a single invalidation mechanism via `expires_at`. On the browser side, keep the current storage key and state store, but persist `sessionId`, listen for `storage` events, and treat `session_superseded` as a bounded recovery path instead of immediate logout.

**Tech Stack:** TypeScript, Hono, Zod, better-sqlite3, Vitest

---

## File Map

- Modify: `src/shared/http-schemas.ts`
  - Refresh request schema must require both `session_id` and `refresh_token`.
- Modify: `src/server/app.ts`
  - Refresh route wiring must parse the new payload and return the new session fields.
- Modify: `src/server/errors.ts`
  - HTTP error mapping must expose `session_invalidated` and `session_superseded` as 401 responses.
- Modify: `src/modules/session/repo.ts`
  - Session persistence must stop relying on revocation for the session flow, support lookup by `session_id`, and rotate refresh tokens in place.
- Modify: `src/modules/session/service.ts`
  - Session mint / refresh / logout logic must return `session_id`, distinguish `session_invalidated` vs `session_superseded`, and use `expires_at` for logout invalidation.
- Modify: `src/modules/users/repo.ts`
  - Active-session queries must stop relying on `revoked_at` for runtime filtering.
- Modify: `src/sdk/types.ts`
  - Persisted and runtime session types must include `sessionId` and the new refresh error codes.
- Modify: `src/sdk/storage.ts`
  - Shared session read/write must include `sessionId`.
- Modify: `src/sdk/state.ts`
  - State store needs an entry point to adopt shared storage updates from other tabs.
- Modify: `src/sdk/session.ts`
  - Refresh must send `session_id + refresh_token`, preserve recovering state on `session_superseded`, and use a bounded recovery wait.
- Modify: `src/sdk/singleton-entry.ts`
  - Browser singleton runtime must mirror every session/storage contract change from the modular SDK implementation and register `storage` events.
- Modify: `tests/integration/sessions.test.ts`
  - Server contract tests for refresh rotation, superseded handling, and logout invalidation.
- Modify: `tests/integration/sdk-login-contract.test.ts`
  - Login contract tests must lock in `session_id` on first session creation.
- Modify: `tests/unit/sdk-session.test.ts`
  - SDK recovery tests for multi-instance shared storage behavior.
- Modify: `tests/unit/sdk-state.test.ts`
  - State-store tests for adopting external storage updates.
- Modify: `tests/helpers/sdk.ts`
  - Add shared-storage / storage-event helpers for multi-instance SDK tests.

## Chunk 1: Server Contract

### Task 1: Upgrade Refresh Payload And Session Persistence

**Files:**

- Modify: `src/shared/http-schemas.ts`
- Modify: `src/server/app.ts`
- Modify: `src/server/errors.ts`
- Modify: `src/modules/session/repo.ts`
- Modify: `src/modules/session/service.ts`
- Test: `tests/integration/sessions.test.ts`
- Test: `tests/integration/sdk-login-contract.test.ts`

- [ ] **Step 1: Write the failing integration test for the new refresh payload**

Add a test to `tests/integration/sessions.test.ts` that calls `/session/refresh` with:

```ts
body: json({
  session_id: testApp.sessionId,
  refresh_token: testApp.tokens.refresh_token,
});
```

and expects a `200` response whose JSON contains:

```ts
expect(body).toMatchObject({
  session_id: testApp.sessionId,
  refresh_token: expect.any(String),
  access_token: expect.any(String),
});
```

Also add a contract assertion to `tests/integration/sdk-login-contract.test.ts` that the first successful token payload from `email.verify` includes `session_id` and that the SDK stores it in `session.getState()`.

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -- tests/integration/sessions.test.ts && npm test -- tests/integration/sdk-login-contract.test.ts`
Expected: FAIL because `refreshSchema` still rejects `session_id`, login responses do not yet return `session_id`, and the server still rotates by revoking and creating a new row.

- [ ] **Step 3: Update the request schema and route wiring**

In `src/shared/http-schemas.ts`, replace the refresh schema with:

```ts
export const refreshSchema = z.object({
  session_id: z.uuid(),
  refresh_token: z.string().min(1),
});
```

In `src/server/app.ts`, pass both values into `refreshSessionTokens(...)` and include `session_id` in every token response path that mints or refreshes a session:

- `/session/refresh`
- email verify success
- WebAuthn authenticate verify success

- [ ] **Step 4: Rework the session repo for in-place rotation**

In `src/modules/session/repo.ts`:

```ts
type SessionRow = {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  expires_at: string;
  created_at: string;
};
```

Replace the revoke-based helpers with focused helpers like:

```ts
export function getSessionById(db: DatabaseClient, id: string): Session | null;
export function rotateRefreshToken(
  db: DatabaseClient,
  input: {
    sessionId: string;
    currentRefreshTokenHash: string;
    nextRefreshTokenHash: string;
  },
): Session | null;
export function expireSessionById(
  db: DatabaseClient,
  id: string,
  now: string,
): boolean;
```

The rotation query should only succeed when `id = ? AND refresh_token_hash = ? AND expires_at > ?`.

- [ ] **Step 5: Rework the session service around `session_id`**

In `src/modules/session/service.ts`:

```ts
export type TokenPair = {
  session_id: string;
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
};
```

Define explicit errors:

```ts
export class SessionInvalidatedError extends Error {
  constructor() {
    super('session_invalidated');
  }
}

export class SessionSupersededError extends Error {
  constructor() {
    super('session_superseded');
  }
}
```

In `src/server/errors.ts`, add focused 401 helpers or equivalent route-level mappings for `session_invalidated` and `session_superseded` so the HTTP contract can expose the new codes.

Refresh flow should:

1. Look up the session by `session_id`
2. If missing or expired, throw `SessionInvalidatedError`
3. If the stored hash differs from the submitted token hash, throw `SessionSupersededError`
4. Otherwise atomically rotate the stored hash and mint a new access token for the same `session_id`

Logout flow should call `expireSessionById(..., now)` and set `expires_at = now`.

- [ ] **Step 6: Update server-side logging names and failure reasons**

Make `session.refresh.failed` log `reason: 'session_invalidated'` or `reason: 'session_superseded'` instead of `invalid_refresh_token`.

- [ ] **Step 7: Run the targeted integration tests to verify they pass**

Run: `npm test -- tests/integration/sessions.test.ts && npm test -- tests/integration/sdk-login-contract.test.ts`
Expected: PASS for the new payload / in-place rotation path and for first-session `session_id` responses.

- [ ] **Step 8: Commit the server contract slice**

```bash
git add src/shared/http-schemas.ts src/server/app.ts src/server/errors.ts src/modules/session/repo.ts src/modules/session/service.ts tests/integration/sessions.test.ts tests/integration/sdk-login-contract.test.ts
git commit -m "feat: add session-id refresh contract"
```

### Task 2: Lock Down Error Semantics And Expiry-Based Logout

**Files:**

- Modify: `tests/integration/sessions.test.ts`
- Modify: `tests/integration/sdk-login-contract.test.ts`
- Modify: `src/modules/session/repo.ts`
- Modify: `src/modules/session/service.ts`
- Modify: `src/modules/users/repo.ts`
- Modify: `src/server/errors.ts`

- [ ] **Step 1: Write the failing tests for `session_superseded` and `session_invalidated`**

Add targeted cases that assert:

```ts
expect(await secondResponse.json()).toEqual({
  error: 'session_superseded',
});
```

and:

```ts
expect(await refreshResponse.json()).toEqual({
  error: 'session_invalidated',
});
```

Use the logout path and an expired `expires_at` row to cover the invalidated branch.

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- tests/integration/sessions.test.ts`
Expected: FAIL because the server still returns `invalid_refresh_token`, `active_sessions` still relies on `revoked_at`, and HTTP error mapping still only knows the legacy code.

- [ ] **Step 3: Update the integration fixtures and SQL assertions**

Replace assertions that inspect multiple session rows or `revoked_at`, for example:

```ts
const session = testApp.db
  .prepare(
    'SELECT id, refresh_token_hash, expires_at FROM sessions WHERE id = ?',
  )
  .get(testApp.sessionId);
```

and assert that refresh keeps the same `id`, changes the refresh token hash, and leaves the session active until logout.

Update `tests/integration/sdk-login-contract.test.ts` so the first session-establishing responses from email verify and adjacent login contract paths now require `session_id`.

- [ ] **Step 4: Remove revocation-specific repo behavior**

Delete or replace `revokeSessionByRefreshTokenHash` / `revokeSessionById` usage so the only invalidation write is `expires_at = now`. Update `src/modules/users/repo.ts:listActiveUserSessions()` to filter active sessions using `expires_at > ?` only, matching the new runtime contract.

- [ ] **Step 5: Wire the new HTTP error codes through the server layer**

Update `src/server/errors.ts` and any route-level error mapping so `SessionInvalidatedError` becomes `401 session_invalidated` and `SessionSupersededError` becomes `401 session_superseded`.

- [ ] **Step 6: Re-run the targeted integration test to verify it passes**

Run: `npm test -- tests/integration/sessions.test.ts`
Expected: PASS with `session_superseded` / `session_invalidated` behavior locked.

- [ ] **Step 7: Re-run the login-contract test to verify first-session payloads still match the plan**

Run: `npm test -- tests/integration/sdk-login-contract.test.ts`
Expected: PASS with `session_id` included in the first token-bearing responses.

- [ ] **Step 8: Commit the error-semantics slice**

```bash
git add src/modules/session/repo.ts src/modules/session/service.ts src/modules/users/repo.ts src/server/errors.ts tests/integration/sessions.test.ts tests/integration/sdk-login-contract.test.ts
git commit -m "fix: distinguish superseded and invalidated sessions"
```

## Chunk 2: SDK Shared-State Recovery

### Task 3: Persist `sessionId` And Accept Shared Storage Updates

**Files:**

- Modify: `src/sdk/types.ts`
- Modify: `src/sdk/storage.ts`
- Modify: `src/sdk/state.ts`
- Modify: `tests/unit/sdk-state.test.ts`
- Modify: `tests/helpers/sdk.ts`

- [ ] **Step 1: Write the failing state-store tests**

Add tests that show:

```ts
expect(
  createStateStore(
    fakeStorage({ sessionId: 's1', refreshToken: 'rt' }),
  ).getState(),
).toMatchObject({ sessionId: 's1', status: 'recovering' });
```

and that an external storage update can be adopted into the current store.

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -- tests/unit/sdk-state.test.ts`
Expected: FAIL because `sessionId` is not part of the persisted snapshot and the store has no external-adopt API.

- [ ] **Step 3: Add `sessionId` to SDK types and storage serialization**

Update `src/sdk/types.ts` so `SessionSnapshot`, `PersistedSdkState`, and `SessionTokens` include:

```ts
sessionId: string | null;
```

Update `src/sdk/storage.ts` validation and JSON serialization to require / persist `sessionId` alongside the token fields.

- [ ] **Step 4: Add an external-adopt entry point to the state store**

Extend `createStateStore(...)` with a narrow method such as:

```ts
applyPersistedState(next: PersistedSdkState | null): void
setAnonymousLocal(): void
```

Behavior:

- `null` clears to `anonymous`
- a persisted session with `refreshToken` becomes `recovering`
- listeners are notified using the same immutable snapshot path as local writes
- `setAnonymousLocal()` only drops the current instance's in-memory state to `anonymous` and must not call `clearPersistedSdkState(...)`

- [ ] **Step 5: Add shared-storage helpers for later SDK tests**

In `tests/helpers/sdk.ts`, add a helper that can create two SDK instances over one shared `Storage` implementation and manually dispatch a storage-style update callback.

- [ ] **Step 6: Re-run the targeted state-store test to verify it passes**

Run: `npm test -- tests/unit/sdk-state.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit the SDK persistence slice**

```bash
git add src/sdk/types.ts src/sdk/storage.ts src/sdk/state.ts tests/unit/sdk-state.test.ts tests/helpers/sdk.ts
git commit -m "feat: persist sdk session ids"
```

### Task 4: Make Refresh Supersession Recover Instead Of Logout

**Files:**

- Modify: `src/sdk/session.ts`
- Modify: `src/sdk/singleton-entry.ts`
- Modify: `tests/unit/sdk-session.test.ts`
- Modify: `tests/helpers/sdk.ts`

- [ ] **Step 1: Write the failing SDK session tests**

Add tests for:

```ts
await expect(loser.session.refresh()).rejects.toMatchObject({
  error: 'session_superseded',
});
expect(loser.session.getState().status).toBe('recovering');
```

and then simulate the winner writing a new shared session so the loser later converges to:

```ts
expect(loser.session.getState()).toMatchObject({
  status: 'authenticated',
  sessionId: 'session-1',
  refreshToken: 'refresh-2',
});
```

Also add a timeout-path test showing the loser only drops its own in-memory state to `anonymous` and does not clear shared storage.

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -- tests/unit/sdk-session.test.ts`
Expected: FAIL because refresh still posts only `refresh_token`, treats all 401s as auth-invalidating, and has no storage-event recovery path.

- [ ] **Step 3: Update the session controller to send `session_id + refresh_token`**

In `src/sdk/session.ts`, the refresh body should become:

```ts
{
  session_id: snapshot.sessionId,
  refresh_token: snapshot.refreshToken,
}
```

`normalizeTokenResponse(...)` must also require `session_id` from the server response.

- [ ] **Step 4: Add bounded superseded recovery**

Implement the smallest helper that waits for one external storage update before timing out. Do not wait on generic `state.onChange(...)`; wait only on the explicit external-storage adoption path, or on a dedicated callback invoked by the `storage` listener.

Rules to enforce in code:

- `session_invalidated` => `setAnonymous()`
- `session_superseded` => keep `recovering`, wait up to `recoveryTimeoutMs`, re-read shared storage once, then only call `setAnonymousLocal()` if still unrecoverable
- timeout must not call `clearPersistedSdkState(...)`

- [ ] **Step 5: Register browser `storage` synchronization in the singleton runtime**

In `src/sdk/singleton-entry.ts`, wire `window.addEventListener('storage', ...)` so updates to `SDK_STORAGE_KEY` call the new store adopt API. Because `singleton-entry.ts` embeds its own copy of the runtime helpers, mirror every relevant contract change here too:

- persisted `sessionId`
- refresh request body with `session_id`
- token response parsing with `session_id`
- `session_superseded` bounded recovery semantics
- external storage adoption

Keep the implementation minimal:

- ignore unrelated keys
- ignore events whose storage area is not the SDK storage
- parse the current storage snapshot using the same read helper as local boot recovery

- [ ] **Step 6: Re-run the targeted SDK tests to verify they pass**

Run: `npm test -- tests/unit/sdk-session.test.ts && npm test -- tests/unit/sdk-state.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit the SDK recovery slice**

```bash
git add src/sdk/session.ts src/sdk/singleton-entry.ts tests/unit/sdk-session.test.ts tests/unit/sdk-state.test.ts tests/helpers/sdk.ts
git commit -m "feat: sync sdk sessions across tabs"
```

## Chunk 3: Final Verification

### Task 5: End-To-End Verification And Cleanup

**Files:**

- Modify: any follow-up files from earlier tasks only if verification exposes a real gap

- [ ] **Step 1: Run the focused regression suite**

Run:

```bash
npm test -- tests/integration/sessions.test.ts
npm test -- tests/integration/sdk-login-contract.test.ts
npm test -- tests/unit/sdk-session.test.ts
npm test -- tests/unit/sdk-state.test.ts
```

Expected: all PASS.

- [ ] **Step 2: Run the broader SDK/server safety checks**

Run:

```bash
npm test -- tests/unit/sdk-webauthn.test.ts
npm run typecheck
npm run lint
```

Expected: PASS, proving the changed session payload does not break adjacent SDK contracts and the type/lint surface stays coherent.

- [ ] **Step 3: If source changes affect served artifacts, refresh them**

Run: `npm run build`
Expected: PASS and generated `dist/` stays in sync with the source changes.

- [ ] **Step 4: Run one final targeted manual grep check**

Verify there are no stale `invalid_refresh_token` expectations in the session flow tests or stale `revoked_at` checks in the runtime paths touched by this feature.

- [ ] **Step 5: Commit any verification-driven fixes**

```bash
git add .
git commit -m "test: finalize multi-tab session support"
```
