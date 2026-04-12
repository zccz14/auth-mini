# Session Peer Logout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `POST /session/:session_id/logout` so a human-authenticated session can invalidate one other active session without changing current-session logout semantics.

**Architecture:** Keep the route thin in `src/server/app.ts` by reusing the existing Bearer-token middleware and delegating the ownership/activity decision matrix to `src/modules/session/service.ts`. Add one repository helper that expires only a same-user, still-active, non-current target session, then cover the contract end-to-end in `tests/integration/sessions.test.ts` and document the HTTP behavior in `docs/reference/http-api.md`.

**Tech Stack:** TypeScript, Hono, better-sqlite3, Vitest, Zod

---

## File Map

- Modify: `src/modules/session/repo.ts`
  - Add a focused repository helper that expires only a same-user, active, non-current target session.
- Modify: `src/modules/session/service.ts`
  - Add the peer-logout service entrypoint, self-target guard, and success logging.
- Modify: `src/server/app.ts`
  - Register `POST /session/:session_id/logout` with existing access-token and human-session middleware.
- Modify: `src/server/errors.ts`
  - Add a dedicated `400` helper for the self-target route-boundary rejection so the route stays explicit and readable.
- Modify: `tests/unit/session-service.test.ts`
  - Add service-level tests for success, idempotent success, and self-target rejection.
- Modify: `tests/integration/sessions.test.ts`
  - Add end-to-end coverage for allowed callers, denied callers, idempotent target handling, current-session preservation, and `active_sessions` shrinking.
- Modify: `docs/reference/http-api.md`
  - Document the new route, its allowed AMR values, idempotent success cases, and the `400` self-target rule.
- Do not modify: `src/shared/http-schemas.ts`, SDK files, or demo files.
  - This route has no JSON request body and the approved spec does not require SDK/demo changes.

## Chunk 1: Session-Service Decision Matrix

### Task 1: Add the peer-session service primitive

**Files:**

- Modify: `tests/unit/session-service.test.ts`
- Modify: `src/modules/session/service.ts`
- Modify: `src/modules/session/repo.ts`

- [ ] **Step 1: Write the failing unit tests for the service contract**

Add three focused tests in `tests/unit/session-service.test.ts`: one for expiring another active session, one for idempotent success when nothing matches, and one for the self-target rejection.

```ts
const expireOtherActiveSessionById = vi.fn();

vi.mock('../../src/modules/session/repo.js', () => ({
  createSession: vi.fn(),
  expireOtherActiveSessionById,
  expireSessionById: vi.fn(),
  getSessionById,
  rotateRefreshToken,
}));

it('expires a same-user peer session and logs success', async () => {
  const { logoutPeerSession } =
    await import('../../src/modules/session/service.js');
  const logger = { info: vi.fn() };

  expireOtherActiveSessionById.mockReturnValueOnce(true);

  await expect(
    logoutPeerSession({} as never, {
      currentSessionId: 'session-current',
      targetSessionId: 'session-peer',
      userId: 'user-1',
      logger: logger as never,
    }),
  ).resolves.toEqual({ ok: true });

  expect(expireOtherActiveSessionById).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      currentSessionId: 'session-current',
      targetSessionId: 'session-peer',
      userId: 'user-1',
      now: expect.any(String),
    }),
  );
  expect(logger.info).toHaveBeenCalledWith(
    expect.objectContaining({
      event: 'session.peer_logout.succeeded',
      session_id: 'session-peer',
      actor_session_id: 'session-current',
      user_id: 'user-1',
    }),
    'Session peer logout succeeded',
  );
});

it('returns ok without logging when the target session is missing, expired, or foreign', async () => {
  const { logoutPeerSession } =
    await import('../../src/modules/session/service.js');
  const logger = { info: vi.fn() };

  expireOtherActiveSessionById.mockReturnValueOnce(false);

  await expect(
    logoutPeerSession({} as never, {
      currentSessionId: 'session-current',
      targetSessionId: 'session-peer',
      userId: 'user-1',
      logger: logger as never,
    }),
  ).resolves.toEqual({ ok: true });

  expect(logger.info).not.toHaveBeenCalled();
});

it('rejects self-target peer logout so /session/logout keeps responsibility', async () => {
  const { logoutPeerSession, SessionPeerLogoutSelfTargetError } =
    await import('../../src/modules/session/service.js');

  await expect(
    logoutPeerSession({} as never, {
      currentSessionId: 'session-current',
      targetSessionId: 'session-current',
      userId: 'user-1',
    }),
  ).rejects.toBeInstanceOf(SessionPeerLogoutSelfTargetError);

  expect(expireOtherActiveSessionById).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the focused unit test to confirm the missing API fails first**

Run: `npm run test:unit -- tests/unit/session-service.test.ts`
Expected: FAIL with missing `logoutPeerSession`, missing `SessionPeerLogoutSelfTargetError`, or missing `expireOtherActiveSessionById` exports.

- [ ] **Step 3: Implement the minimal repository and service code**

Add a repo helper that only updates a same-user, active, non-current session, then call it from a new service function that returns `{ ok: true }` for both the real-expire and idempotent-success paths.

```ts
// src/modules/session/repo.ts
export function expireOtherActiveSessionById(
  db: DatabaseClient,
  input: {
    currentSessionId: string;
    targetSessionId: string;
    userId: string;
    now: string;
  },
): boolean {
  const result = db
    .prepare(
      [
        'UPDATE sessions',
        'SET expires_at = ?',
        'WHERE id = ? AND user_id = ? AND expires_at > ? AND id <> ?',
      ].join(' '),
    )
    .run(
      input.now,
      input.targetSessionId,
      input.userId,
      input.now,
      input.currentSessionId,
    );

  return result.changes > 0;
}

// src/modules/session/service.ts
export class SessionPeerLogoutSelfTargetError extends Error {
  constructor() {
    super('session_peer_logout_self_target');
  }
}

export function logoutPeerSession(
  db: DatabaseClient,
  input: {
    currentSessionId: string;
    targetSessionId: string;
    userId: string;
    logger?: AppLogger;
  },
): { ok: true } {
  if (input.targetSessionId === input.currentSessionId) {
    throw new SessionPeerLogoutSelfTargetError();
  }

  const expired = expireOtherActiveSessionById(db, {
    currentSessionId: input.currentSessionId,
    targetSessionId: input.targetSessionId,
    userId: input.userId,
    now: new Date().toISOString(),
  });

  if (expired) {
    input.logger?.info(
      {
        event: 'session.peer_logout.succeeded',
        session_id: input.targetSessionId,
        actor_session_id: input.currentSessionId,
        user_id: input.userId,
      },
      'Session peer logout succeeded',
    );
  }

  return { ok: true };
}
```

- [ ] **Step 4: Run the unit tests again to verify the decision matrix passes**

Run: `npm run test:unit -- tests/unit/session-service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit the service primitive**

```bash
git add tests/unit/session-service.test.ts src/modules/session/service.ts src/modules/session/repo.ts
git commit -m "feat: add session peer logout service"
```

## Chunk 2: HTTP Route And Successful Flows

### Task 2: Wire `POST /session/:session_id/logout` for human-authenticated callers

**Files:**

- Modify: `tests/integration/sessions.test.ts`
- Modify: `src/server/app.ts`
- Modify: `src/server/errors.ts`

- [ ] **Step 1: Write the failing integration tests for successful email OTP, successful webauthn, and self-target rejection**

Add focused route tests in `tests/integration/sessions.test.ts` that create a second session for the same user, call the new endpoint, then assert the current session survives while the target session becomes unusable. Keep the self-target assertion in the same file so the route-boundary rule stays visible.

```ts
it('email_otp can logout another active session without logging itself out', async () => {
  const testApp = await createSignedInApp('peer-logout-email@example.com');
  openApps.push(testApp);
  const peer = createSession(testApp.db, {
    userId: testApp.userId,
    refreshTokenHash: hashValue('peer-refresh-token'),
    authMethod: 'email_otp',
    expiresAt: '2099-01-01T00:00:00.000Z',
  });

  const logoutResponse = await testApp.app.request(
    `/session/${peer.id}/logout`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${testApp.tokens.access_token}` },
    },
  );
  const meResponse = await testApp.app.request('/me', {
    headers: { authorization: `Bearer ${testApp.tokens.access_token}` },
  });
  const refreshResponse = await testApp.app.request('/session/refresh', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: json({ session_id: peer.id, refresh_token: 'peer-refresh-token' }),
  });

  expect(logoutResponse.status).toBe(200);
  expect(await logoutResponse.json()).toEqual({ ok: true });
  expect(meResponse.status).toBe(200);
  expect(
    (await meResponse.json()).active_sessions.map(
      (session: { id: string }) => session.id,
    ),
  ).toEqual([testApp.sessionId]);
  expect(refreshResponse.status).toBe(401);
  expect(await refreshResponse.json()).toEqual({
    error: 'session_invalidated',
  });
});

it('webauthn can logout another active session', async () => {
  const testApp = await createSignedInApp('peer-logout-webauthn@example.com');
  openApps.push(testApp);
  testApp.db
    .prepare('UPDATE sessions SET auth_method = ? WHERE id = ?')
    .run('webauthn', testApp.sessionId);
  const accessToken = await jwksService.signJwt(testApp.db, {
    sub: testApp.userId,
    sid: testApp.sessionId,
    iss: 'https://issuer.example',
    amr: ['webauthn'],
    typ: 'access',
  });
  const peer = createSession(testApp.db, {
    userId: testApp.userId,
    refreshTokenHash: hashValue('webauthn-peer-refresh-token'),
    authMethod: 'email_otp',
    expiresAt: '2099-01-01T00:00:00.000Z',
  });

  const response = await testApp.app.request(`/session/${peer.id}/logout`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
  });

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});

it('returns 400 when the target session id matches the current session id', async () => {
  const testApp = await createSignedInApp('peer-logout-self@example.com');
  openApps.push(testApp);

  const response = await testApp.app.request(
    `/session/${testApp.sessionId}/logout`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${testApp.tokens.access_token}` },
    },
  );

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: 'invalid_request' });
});
```

- [ ] **Step 2: Run the focused integration cases to capture the pre-route failure**

Run: `npm run test:integration -- tests/integration/sessions.test.ts`
Expected: FAIL with `404` for the new route or `400/500` while the route/service wiring is incomplete.

- [ ] **Step 3: Implement the route and explicit self-target HTTP error**

Keep the route thin: reuse `requireAccessToken` + `requirePasskeyManagementAuth`, map only the self-target service error to `400`, and otherwise return the service result directly.

```ts
// src/server/errors.ts
export function sessionPeerLogoutSelfTargetError(): HttpError {
  return new HttpError(400, 'invalid_request');
}

// src/server/app.ts
import {
  logoutPeerSession,
  SessionPeerLogoutSelfTargetError,
} from '../modules/session/service.js';
import { sessionPeerLogoutSelfTargetError } from './errors.js';

app.post(
  '/session/:session_id/logout',
  requireAccessToken,
  requirePasskeyManagementAuth,
  async (c) => {
    try {
      return c.json(
        logoutPeerSession(c.var.db, {
          currentSessionId: c.var.auth.sid,
          targetSessionId: c.req.param('session_id'),
          userId: c.var.auth.sub,
          logger: c.var.logger,
        }),
      );
    } catch (error) {
      if (error instanceof SessionPeerLogoutSelfTargetError) {
        throw sessionPeerLogoutSelfTargetError();
      }

      throw error;
    }
  },
);
```

- [ ] **Step 4: Re-run the integration file until the happy-path and self-target cases pass**

Run: `npm run test:integration -- tests/integration/sessions.test.ts`
Expected: PASS for the new success-path and self-target assertions, with no regressions in the existing `/session/logout`, `/session/refresh`, and `/me` cases.

- [ ] **Step 5: Commit the route wiring**

```bash
git add tests/integration/sessions.test.ts src/server/app.ts src/server/errors.ts
git commit -m "feat: add session peer logout route"
```

## Chunk 3: Denied And Idempotent Cases

### Task 3: Cover the remaining authorization and idempotency rules

**Files:**

- Modify: `tests/integration/sessions.test.ts`
- Modify: `src/server/app.ts` (only if Task 2 left gaps)
- Modify: `src/modules/session/service.ts` (only if Task 1 left gaps)

- [ ] **Step 1: Add the failing integration cases for `403`, `401`, foreign target, missing target, and expired target**

Extend `tests/integration/sessions.test.ts` with the remaining spec matrix. Reuse the existing OTP helper, then forge an `ed25519` access token the same way other integration suites already do for AMR-sensitive routes.

```ts
it('rejects ed25519 peer logout with insufficient_authentication_method', async () => {
  const testApp = await createSignedInApp('peer-logout-ed25519@example.com');
  openApps.push(testApp);
  testApp.db
    .prepare('UPDATE sessions SET auth_method = ? WHERE id = ?')
    .run('ed25519', testApp.sessionId);
  const accessToken = await jwksService.signJwt(testApp.db, {
    sub: testApp.userId,
    sid: testApp.sessionId,
    iss: 'https://issuer.example',
    amr: ['ed25519'],
    typ: 'access',
  });

  const response = await testApp.app.request(
    '/session/00000000-0000-0000-0000-000000000000/logout',
    {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}` },
    },
  );

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({
    error: 'insufficient_authentication_method',
  });
});

it('requires a bearer token for peer logout', async () => {
  const testApp = await createSignedInApp('peer-logout-auth@example.com');
  openApps.push(testApp);

  const response = await testApp.app.request(
    '/session/00000000-0000-0000-0000-000000000000/logout',
    {
      method: 'POST',
    },
  );

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: 'invalid_access_token' });
});

it('returns ok for a foreign user session id without expiring it', async () => {
  const ownerApp = await createSignedInApp('peer-logout-owner@example.com');
  const otherApp = await createSignedInApp('peer-logout-other@example.com');
  openApps.push(ownerApp, otherApp);

  const response = await ownerApp.app.request(
    `/session/${otherApp.sessionId}/logout`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${ownerApp.tokens.access_token}` },
    },
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
  expect(
    getSessionById(otherApp.db, otherApp.sessionId)?.expiresAt,
  ).toBeGreaterThan(new Date().toISOString());
});

it('returns ok for a missing or already expired target session id', async () => {
  const testApp = await createSignedInApp('peer-logout-idempotent@example.com');
  openApps.push(testApp);
  const expiredPeer = createSession(testApp.db, {
    userId: testApp.userId,
    refreshTokenHash: hashValue('expired-peer-refresh-token'),
    authMethod: 'email_otp',
    expiresAt: '2020-01-01T00:00:00.000Z',
  });

  const missingResponse = await testApp.app.request(
    '/session/00000000-0000-0000-0000-000000000000/logout',
    {
      method: 'POST',
      headers: { authorization: `Bearer ${testApp.tokens.access_token}` },
    },
  );
  const expiredResponse = await testApp.app.request(
    `/session/${expiredPeer.id}/logout`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${testApp.tokens.access_token}` },
    },
  );

  expect(missingResponse.status).toBe(200);
  expect(await missingResponse.json()).toEqual({ ok: true });
  expect(expiredResponse.status).toBe(200);
  expect(await expiredResponse.json()).toEqual({ ok: true });
});
```

- [ ] **Step 2: Run the integration file again to confirm only the uncovered cases are failing**

Run: `npm run test:integration -- tests/integration/sessions.test.ts`
Expected: FAIL only where the route or service still does not match the full decision matrix.

- [ ] **Step 3: Apply the smallest code change needed to make the remaining cases pass**

If Task 2 already used `requirePasskeyManagementAuth` and Task 1 already made the repo update idempotent, this step should be a no-op. If the failing output shows a mismatch, keep the fix minimal and inside the same files:

```ts
// src/server/app.ts
app.post(
  '/session/:session_id/logout',
  requireAccessToken,
  requirePasskeyManagementAuth,
  async (c) => {
    return c.json(
      logoutPeerSession(c.var.db, {
        currentSessionId: c.var.auth.sid,
        targetSessionId: c.req.param('session_id'),
        userId: c.var.auth.sub,
        logger: c.var.logger,
      }),
    );
  },
);

// src/modules/session/service.ts
if (input.targetSessionId === input.currentSessionId) {
  throw new SessionPeerLogoutSelfTargetError();
}
```

- [ ] **Step 4: Re-run the integration suite for final route coverage**

Run: `npm run test:integration -- tests/integration/sessions.test.ts`
Expected: PASS, including:

- `email_otp` can logout a same-user peer session
- `webauthn` can logout a same-user peer session
- `ed25519` gets `403 { "error": "insufficient_authentication_method" }`
- missing / foreign / expired targets all return `200 { "ok": true }`
- self-target returns `400`
- the caller still reaches `/me` while the target session can no longer refresh

- [ ] **Step 5: Commit the remaining test matrix**

```bash
git add tests/integration/sessions.test.ts src/server/app.ts src/modules/session/service.ts
git commit -m "test: cover session peer logout edge cases"
```

## Chunk 4: Documentation And Final Verification

### Task 4: Document the new endpoint and run the acceptance checks

**Files:**

- Modify: `docs/reference/http-api.md`
- Modify: no additional code unless verification proves a gap

- [ ] **Step 1: Update the HTTP reference with the new route contract**

Add the new authenticated endpoint to the list and document the exact success/error semantics near the existing session routes.

```md
- `POST /session/:session_id/logout`

### `POST /session/:session_id/logout`

Logs out one other active session for the authenticated user.

Request: send `Authorization: Bearer <access_token>` and the target session id in the route.

This route requires a human-authenticated session. The presented access token must carry an `amr` that includes either `email_otp` or `webauthn`.

Successful response: `200 { "ok": true }`.

`ed25519` callers receive `403 { "error": "insufficient_authentication_method" }`.

Missing, foreign, or already expired targets still return `200 { "ok": true }`.
If `:session_id` matches the current session id, the server returns `400 { "error": "invalid_request" }` and clients must use `POST /session/logout` instead.
```

- [ ] **Step 2: Run the targeted verification commands**

Run these commands from the repo root:

- `npm run test:unit -- tests/unit/session-service.test.ts`
- `npm run test:integration -- tests/integration/sessions.test.ts`
- `npm run typecheck`

Expected:

- the unit service test passes
- the session integration file passes with the new route coverage
- `tsc --noEmit` exits `0`

- [ ] **Step 3: Run a placeholder and consistency scan on the touched surface**

Run:

- `grep -nE "T[O]DO|T[B]D|implement[[:space:]]later|fill[[:space:]]in[[:space:]]details" docs/superpowers/plans/2026-04-12-session-peer-logout.md`
- `grep -nE "logoutPeerSession|SessionPeerLogoutSelfTargetError|expireOtherActiveSessionById|sessionPeerLogoutSelfTargetError" src/modules/session/service.ts src/modules/session/repo.ts src/server/app.ts src/server/errors.ts tests/unit/session-service.test.ts tests/integration/sessions.test.ts`

Expected:

- the placeholder grep returns no matches
- the symbol grep shows the same names/signatures across service, repo, route, and tests

- [ ] **Step 4: Commit the documentation update**

```bash
git add docs/reference/http-api.md
git commit -m "docs: add session peer logout endpoint"
```
