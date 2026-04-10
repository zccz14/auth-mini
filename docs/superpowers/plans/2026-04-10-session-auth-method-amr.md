# Session Auth Method And `amr` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist each session's authentication method, emit JWT `amr` from that persisted source, and enforce passkey-management routes so only human-authenticated sessions can use them.

**Architecture:** Extend the `sessions` persistence model with an `auth_method` field, thread that field through login and refresh token issuance, and surface `amr` in the server auth context. Keep policy separate from basic access-token validation by adding a dedicated guard for passkey-management routes.

**Tech Stack:** TypeScript, SQLite schema/bootstrap path, Hono middleware, jose-compatible JWT claims via existing JWKS signer, Vitest integration/unit tests

---

## File Structure

- Modify: `sql/schema.sql` - add `sessions.auth_method` and keep bootstrap schema aligned.
- Modify: `src/modules/session/repo.ts` - persist/read `auth_method`, preserve it through refresh rotation, and expose it on `Session`.
- Modify: `src/modules/session/service.ts` - require `authMethod` when minting sessions and derive `amr` from persisted session state during mint/refresh.
- Modify: `src/modules/email-auth/service.ts` - mint Email OTP sessions with `authMethod = email_otp`.
- Modify: `src/modules/webauthn/service.ts` - mint passkey sessions with `authMethod = webauthn`.
- Modify: `src/server/auth.ts` - validate `amr`, expose it in auth context, and add a dedicated passkey-management guard.
- Modify: `src/server/app.ts` - attach the new guard to passkey-management routes only.
- Modify: `src/shared/crypto.ts` or the JWT payload type owner used by JWKS signing/verifying - extend token payload typing to include `amr`.
- Modify: `docs/reference/http-api.md` - document that access tokens now carry authentication-method context and that passkey-management routes require human-authenticated sessions.
- Test: `tests/integration/*.test.ts` and any targeted unit tests touching session mint/refresh/auth middleware.

## Task 1: Persist `auth_method` on sessions

**Files:**

- Modify: `sql/schema.sql`
- Modify: `src/modules/session/repo.ts`
- Test: session repo / integration tests that create and read sessions

- [ ] **Step 1: Write a failing persistence test**

Add or update a focused test that creates a session and asserts the returned/stored `Session` shape includes `authMethod`. Use a concrete expectation like `email_otp` instead of a loose truthy check.

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npx vitest run tests --grep "auth method"`
Expected: FAIL because the schema/repo do not yet support `auth_method`.

- [ ] **Step 3: Add the schema field**

Update `sql/schema.sql` so `sessions` includes `auth_method TEXT NOT NULL` alongside the existing session columns. Keep the column name snake_case to match the database style already used by `sessions`.

- [ ] **Step 4: Thread the field through the repo layer**

Update `src/modules/session/repo.ts` so:

```ts
export type Session = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  authMethod: 'email_otp' | 'webauthn';
  expiresAt: string;
  createdAt: string;
};
```

and `createSession(...)` requires `authMethod`, inserts it, and all repo reads map `auth_method` back to `authMethod`.

- [ ] **Step 5: Preserve `authMethod` during refresh rotation**

Ensure the refresh-token rotation update path does not overwrite or drop `auth_method` and that the returned rotated session still includes it.

- [ ] **Step 6: Re-run the targeted test to verify it passes**

Run: `npx vitest run tests --grep "auth method"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add sql/schema.sql src/modules/session/repo.ts tests
git commit -m "feat: persist session auth method"
```

## Task 2: Emit JWT `amr` from login and refresh flows

**Files:**

- Modify: `src/modules/session/service.ts`
- Modify: `src/modules/email-auth/service.ts`
- Modify: `src/modules/webauthn/service.ts`
- Modify: the JWT payload type definition used by `src/modules/jwks/service.ts`
- Test: login/refresh integration tests that inspect token payloads

- [ ] **Step 1: Write failing login and refresh claim tests**

Add tests that:

1. Email OTP login yields a JWT payload with `amr = ["email_otp"]`
2. passkey login yields a JWT payload with `amr = ["webauthn"]`
3. refresh preserves the original session `amr`

Decode the signed JWT with the existing verification helper or JWKS verifier already used in tests; do not assert on token substrings.

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npx vitest run tests --grep "amr"`
Expected: FAIL because tokens do not yet carry `amr` and minting does not accept an auth method.

- [ ] **Step 3: Require `authMethod` when minting sessions**

Update `src/modules/session/service.ts` so `mintSessionTokens(...)` accepts:

```ts
input: { userId: string; issuer: string; authMethod: 'email_otp' | 'webauthn'; logger?: AppLogger }
```

and passes `authMethod` into `createSession(...)`.

- [ ] **Step 4: Derive `amr` from persisted session state**

Add a small mapper in `src/modules/session/service.ts`:

```ts
function toAmr(authMethod: 'email_otp' | 'webauthn') {
  return [authMethod];
}
```

Use it for both initial mint and refresh signing so refresh reads `rotatedSession.authMethod` instead of reconstructing the value from request context.

- [ ] **Step 5: Update the login callers**

Update the Email OTP and WebAuthn success paths so they pass explicit auth methods:

```ts
authMethod: 'email_otp';
```

and

```ts
authMethod: 'webauthn';
```

- [ ] **Step 6: Extend JWT payload typing**

Update the JWT payload type owner so signed/verified payloads can include:

```ts
amr?: string[];
```

Keep the runtime signing logic unchanged beyond adding the claim; `iat`/`exp` should still be injected centrally by `signJwt(...)`.

- [ ] **Step 7: Re-run the targeted tests to verify they pass**

Run: `npx vitest run tests --grep "amr"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/modules/session/service.ts src/modules/email-auth/service.ts src/modules/webauthn/service.ts src/shared src/modules/jwks tests
git commit -m "feat: add amr to session tokens"
```

## Task 3: Enforce human-authenticated passkey management

**Files:**

- Modify: `src/server/auth.ts`
- Modify: `src/server/app.ts`
- Test: integration tests covering allowed and denied passkey-management access

- [ ] **Step 1: Write failing middleware/route tests**

Add integration coverage for these cases:

1. a token with `amr = ["email_otp"]` can call `POST /webauthn/register/options`
2. a token with `amr = ["webauthn"]` can call `POST /webauthn/register/options`
3. a token with `amr = ["ed25519"]` gets `403 { "error": "insufficient_authentication_method" }` on passkey-management routes

Use forged test fixtures through the existing auth test setup if available, or mint a valid token from the current signer with the desired claims.

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npx vitest run tests --grep "insufficient_authentication_method|passkey management"`
Expected: FAIL because the server does not yet validate/expose `amr` or enforce the route guard.

- [ ] **Step 3: Extend auth context with `amr`**

Update `src/server/auth.ts` so the access-token context includes:

```ts
export type AccessTokenClaims = {
  sub: string;
  sid: string;
  amr: string[];
};
```

Validate that `payload.amr` is a non-empty string array before accepting the token.

- [ ] **Step 4: Add a dedicated passkey-management guard**

Implement a small middleware helper in `src/server/auth.ts` that permits only tokens whose `amr` contains `email_otp` or `webauthn`, and throws a `403` error with `insufficient_authentication_method` otherwise.

- [ ] **Step 5: Attach the guard only to passkey-management routes**

Update `src/server/app.ts` so the new guard wraps:

- `POST /webauthn/register/options`
- `POST /webauthn/register/verify`
- `DELETE /webauthn/credentials/:id`

Do not apply it to unrelated authenticated endpoints like `/me` or `/session/logout` in this task.

- [ ] **Step 6: Re-run the targeted tests to verify they pass**

Run: `npx vitest run tests --grep "insufficient_authentication_method|passkey management"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/server/auth.ts src/server/app.ts tests
git commit -m "feat: guard passkey management by amr"
```

## Task 4: Document and verify the completed behavior

**Files:**

- Modify: `docs/reference/http-api.md`
- Test: targeted tests from Tasks 1-3
- Test: full repo verification commands

- [ ] **Step 1: Update the API reference**

Document that access tokens now carry authentication-method context via `amr`, and note that passkey-management routes require a human-authenticated session (`email_otp` or `webauthn`). Keep the docs at the contract level; do not over-specify internal table names.

- [ ] **Step 2: Run the focused test slice**

Run: `npx vitest run tests --grep "auth method|amr|insufficient_authentication_method|passkey management"`
Expected: PASS.

- [ ] **Step 3: Run full verification**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/reference/http-api.md tests src sql
git commit -m "docs: describe session amr behavior"
```
