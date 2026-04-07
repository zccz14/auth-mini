# origin / rpId Startup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow `auth-mini start` to boot without configured origins, remove startup-time global `rpId` derivation, require HTTP WebAuthn options `rp_id`, and keep Browser SDK `rpId` optional by filling it from the current page hostname.

**Architecture:** Remove the unused startup-time `rpId` injection path first so server boot only depends on schema, DB, JWKS, and listen state. Then tighten the HTTP contract so WebAuthn options always receive an explicit `rp_id`, while preserving browser ergonomics by having the SDK derive `rp_id` client-side from `window.location.hostname` unless the caller overrides it. Finally, update server-side WebAuthn validation to enforce all three gates: request origin allowed, request origin compatible with requested `rp_id`, and requested `rp_id` covered by configured allowed origins.

**Tech Stack:** TypeScript, Hono, Zod, Vitest, SimpleWebAuthn

---

## File Map

- Modify: `src/app/commands/start.ts` - remove empty-origin startup failure and startup-time `rpId` derivation.
- Modify: `src/server/app.ts` - remove global `rpId` app variable and require explicit `rp_id` on both WebAuthn options routes.
- Modify: `src/shared/http-schemas.ts` - make `webauthnOptionsSchema.rp_id` required.
- Modify: `src/modules/webauthn/service.ts` - remove `rp_id` fallback, add explicit origin resolution/validation helpers, and enforce request-origin + allowlist + origin/rpId pairing gates.
- Modify: `src/sdk/singleton-entry.ts` - always send `rp_id` on WebAuthn options requests, defaulting to current page hostname when caller omits `rpId`.
- Modify: `src/sdk/types.ts` - keep SDK `rpId` optional; no public API tightening here.
- Modify: `tests/unit/start-command.test.ts` - replace startup-time derived-`rpId` expectations with no-origin startup expectations.
- Modify: `tests/helpers/app.ts` - stop injecting derived `rpId` into `createApp` in test helper.
- Modify: `tests/integration/webauthn.test.ts` - replace fallback-based expectations with explicit `rp_id` contract tests and add multi-origin boundary cases.
- Modify: `tests/unit/sdk-webauthn.test.ts` - verify SDK fills hostname by default and preserves explicit override.

## Chunk 1: Startup Decoupling

### Task 1: Remove startup-time global `rpId`

**Files:**

- Modify: `tests/unit/start-command.test.ts`
- Modify: `src/app/commands/start.ts`
- Modify: `src/server/app.ts`
- Modify: `tests/helpers/app.ts`

- [ ] **Step 1: Write the failing startup tests**

Update `tests/unit/start-command.test.ts` so the old expectation:

```ts
expect(createApp).toHaveBeenCalledWith(
  expect.objectContaining({
    origins: ['https://app.example.com', 'https://admin.example.com'],
    rpId: 'app.example.com',
  }),
);
```

becomes two behaviors:

```ts
expect(createApp).toHaveBeenCalledWith(
  expect.objectContaining({
    origins: ['https://app.example.com', 'https://admin.example.com'],
  }),
);
expect(createApp).not.toHaveBeenCalledWith(
  expect.objectContaining({ rpId: expect.anything() }),
);
```

Add a new test for an empty `allowed_origins` query result that still resolves `runStartCommand()` and listens successfully.

- [ ] **Step 2: Run startup unit tests to verify failure**

Run: `npm test -- tests/unit/start-command.test.ts`
Expected: FAIL because startup still derives and passes `rpId`, and/or still throws on empty origins.

- [ ] **Step 3: Write the minimal startup implementation**

In `src/app/commands/start.ts`:

```ts
function loadStartRuntimeResources(
  db: ReturnType<typeof createDatabaseClient>,
): {
  origins: string[];
} {
  return {
    origins: listAllowedOrigins(db).map((origin) => origin.origin),
  };
}
```

Remove the empty-origin throw and all returned `rpId` fields.

In `src/server/app.ts`, delete `rpId` from:

- `AppVariables`
- `createApp` input type
- request-context `c.set('rpId', ...)`

In `tests/helpers/app.ts`, stop deriving and passing `rpId` to `createApp`.

- [ ] **Step 4: Run startup unit tests to verify pass**

Run: `npm test -- tests/unit/start-command.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit startup decoupling**

```bash
git add tests/unit/start-command.test.ts src/app/commands/start.ts src/server/app.ts tests/helpers/app.ts
git commit -m "refactor: remove startup rpid derivation"
```

## Chunk 2: HTTP WebAuthn Contract Tightening

### Task 2: Make HTTP `rp_id` required and remove server fallback

**Files:**

- Modify: `tests/integration/webauthn.test.ts`
- Modify: `src/shared/http-schemas.ts`
- Modify: `src/server/app.ts`
- Modify: `src/modules/webauthn/service.ts`

- [ ] **Step 1: Write the failing HTTP contract tests**

In `tests/integration/webauthn.test.ts`:

- Replace the existing “defaults rp id from the current request origin” test with a missing-`rp_id` rejection test for both `/webauthn/register/options` and `/webauthn/authenticate/options`.
- Add a test that omits the `Origin` header but still posts to a concrete request URL whose origin is allowed, proving the server falls back to the current request URL origin rather than `allowed_origins[0]` or a placeholder value.
- Add a test that omits the `Origin` header, uses a request URL origin that is not allowlisted, and verifies options still fail even if the submitted `rp_id` is covered by some other configured allowed origin.
- Add a test where request origin is allowlisted but sibling-host `rp_id` is rejected, e.g. request `Origin: https://login.example.com` with body `{ "rp_id": "app.example.com" }`.
- Add a dedicated test where request origin itself is not allowlisted but `rp_id` would be covered by another allowed origin, and assert this still fails. Example: configured origins `https://app.example.com`, request origin `https://evil.example.com`, body `{ "rp_id": "example.com" }`.
- Keep/extend the explicit parent-domain test, e.g. `Origin: https://app.example.com` plus body `{ "rp_id": "example.com" }`, which should still pass.
- Add a no-config-origin runtime test after successful startup/app construction: no allowed origins configured, non-WebAuthn endpoint still works, but `/webauthn/register/options` and `/webauthn/authenticate/options` fail because neither request-origin allowlist nor `rp_id` coverage can pass.

Suggested assertions:

```ts
expect(response.status).toBe(400);
expect(await response.json()).toEqual({
  error: 'invalid_webauthn_registration',
});
```

and for authenticate options:

```ts
expect(response.status).toBe(400);
expect(await response.json()).toEqual({
  error: 'invalid_webauthn_authentication',
});
```

For the no-`Origin`-header fallback case, build the request with an absolute URL such as `https://login.example.com/webauthn/authenticate/options` so the test can prove request-URL-origin fallback deterministically.

- [ ] **Step 2: Run targeted integration tests to verify failure**

Run: `npm test -- tests/integration/webauthn.test.ts`
Expected: FAIL because `rp_id` is still optional and service still falls back to request origin hostname.

- [ ] **Step 3: Tighten HTTP schema and route contract**

In `src/shared/http-schemas.ts` change:

```ts
export const webauthnOptionsSchema = z.object({
  rp_id: z.string().min(1),
});
```

In `src/server/app.ts`, keep passing `body.rp_id`, but remove any route-level `?? c.var.origins[0]` fallback for options handlers. Resolve the request origin from the current request instead of from configured origins.

- [ ] **Step 4: Refactor WebAuthn service to require explicit `rp_id`**

Implement focused helpers in `src/modules/webauthn/service.ts` so options inputs look like:

```ts
type OptionsInput = {
  rpId: string;
  origin: string;
};
```

Use a resolver shape like:

```ts
function resolveWebauthnOptionsInput(input: { rpId: string; origin: string }) {
  const origin = normalizeAllowedOrigin(input.origin);
  const originHostname = new URL(origin).hostname;
  const rpId = normalizeRpId(input.rpId);

  if (!isRpIdAllowedForOrigin(originHostname, rpId)) {
    throw new Error('invalid_rp_id');
  }

  return { origin, rpId };
}
```

Add/adjust allowlist checks so options creation enforces all three gates:

- request origin is in `allowed_origins`
- request origin hostname is compatible with `rp_id`
- `rp_id` is covered by at least one configured allowed origin

Do not add new fallback values.

- [ ] **Step 5: Run targeted integration tests to verify pass**

Run: `npm test -- tests/integration/webauthn.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit HTTP contract changes**

```bash
git add tests/integration/webauthn.test.ts src/shared/http-schemas.ts src/server/app.ts src/modules/webauthn/service.ts
git commit -m "fix: require explicit webauthn rp ids"
```

## Chunk 3: Browser SDK Defaulting

### Task 3: Keep SDK `rpId` optional while always sending HTTP `rp_id`

**Files:**

- Modify: `tests/unit/sdk-webauthn.test.ts`
- Modify: `src/sdk/singleton-entry.ts`
- Modify: `src/sdk/types.ts`

- [ ] **Step 1: Write the failing SDK tests**

In `tests/unit/sdk-webauthn.test.ts`:

- Keep the explicit override assertions, but rename them from “optional rpId” wording to “explicit rpId override”.
- Add a defaulting test that calls `sdk.passkey.authenticate()` and asserts:

```ts
expect(readJsonBody(fetch, '/webauthn/authenticate/options')).toEqual({
  rp_id: 'app.example.com',
});
```

- Add the same defaulting assertion for `sdk.passkey.register()`.

Use the existing test browser URL/source setup from `tests/helpers/sdk.ts`; if helper defaults are insufficient, update the helper input so the singleton code can read a predictable current page hostname.

- [ ] **Step 2: Run SDK unit tests to verify failure**

Run: `npm test -- tests/unit/sdk-webauthn.test.ts`
Expected: FAIL because SDK currently sends `{}` when caller omits `rpId`.

- [ ] **Step 3: Write the minimal SDK implementation**

In `src/sdk/singleton-entry.ts`, replace:

```ts
function createOptionsPayload(payload) {
  return typeof payload?.rpId === 'string' && payload.rpId.length > 0
    ? { rp_id: payload.rpId }
    : {};
}
```

with logic equivalent to:

```ts
function createOptionsPayload(payload) {
  const rpId =
    typeof payload?.rpId === 'string' && payload.rpId.length > 0
      ? payload.rpId
      : window.location.hostname;

  return { rp_id: rpId };
}
```

Adapt to the existing dependency-injected browser/global access pattern instead of directly hardcoding `window` if the file already centralizes that access.

Do not change `src/sdk/types.ts` to make `rpId` required; keep the current public type.

- [ ] **Step 4: Run SDK unit tests to verify pass**

Run: `npm test -- tests/unit/sdk-webauthn.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit SDK changes**

```bash
git add tests/unit/sdk-webauthn.test.ts src/sdk/singleton-entry.ts src/sdk/types.ts
git commit -m "feat: default sdk passkey rp ids"
```

## Chunk 4: Full Verification

### Task 4: Run focused and full verification

**Files:**

- Verify only

- [ ] **Step 1: Run focused regression suite**

Run:

```bash
npm test -- tests/unit/start-command.test.ts tests/unit/sdk-webauthn.test.ts tests/integration/webauthn.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full repository verification**

Run:

```bash
npm test && npm run typecheck && npm run lint && npm run build
```

Expected: all commands succeed.

- [ ] **Step 3: Review resulting diff for contract drift**

Check that:

- no startup code derives `rpId` from `allowed_origins`
- no HTTP options handler accepts missing `rp_id`
- SDK still exposes optional `rpId` input while always sending `rp_id`

- [ ] **Step 4: Commit any final follow-up if verification required code adjustments**

```bash
git add -A
git commit -m "test: cover origin and rpid startup contract"
```

Only create this commit if verification required an additional code/test adjustment beyond Tasks 1-3.
