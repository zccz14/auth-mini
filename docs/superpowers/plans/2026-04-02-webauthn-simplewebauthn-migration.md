# WebAuthn SimpleWebAuthn Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-rolled WebAuthn verification path with `@simplewebauthn/server`, explicitly support ES256 and RS256 registration, and keep the existing HTTP behavior stable while allowing a breaking credential-storage change.

**Architecture:** Keep the existing routes, challenge lifecycle, logging, and domain errors, but swap WebAuthn option generation and verification to `@simplewebauthn/server`. Store credential public keys in the format the library wants, keep the API response shape normalized to current tests, and remove legacy JWK-specific verification logic instead of layering compatibility code on top.

**Tech Stack:** TypeScript, Node.js 22, Hono, better-sqlite3, Vitest, `@simplewebauthn/server`

---

## File map

- Modify: `package.json`
  - Add `@simplewebauthn/server` and keep scripts unchanged unless install/build needs a minimal adjustment.
- Modify: `src/modules/webauthn/service.ts`
  - Replace custom registration/authentication option builders and verification helpers with library-based flows.
  - Preserve route response shape, challenge invalidation, logging, and domain errors.
- Modify: `src/modules/webauthn/repo.ts`
  - Keep repository boundaries narrow; store credential public key data in the new transport-safe encoding used by the library flow.
- Modify: `tests/helpers/webauthn.ts`
  - Stop assuming ES256-only credentials; support generating ES256 and RS256 credentials for integration coverage.
- Modify: `tests/integration/webauthn.test.ts`
  - Update expectations for `pubKeyCredParams` and add RS256 registration coverage.
- Modify: `README.md`
  - Update WebAuthn registration example and explanation to show both algorithms and the library-backed behavior.
- Reference: `docs/superpowers/specs/2026-04-02-webauthn-simplewebauthn-migration-design.md`
  - Source-of-truth design for this implementation.

## Chunk 1: Dependency and registration-options migration

### Task 1: Add library dependency

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Add the dependency**

Update `package.json` dependencies to include:

```json
"@simplewebauthn/server": "^13.0.0"
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: lockfile updates and the package is installed without changing project scripts.

- [ ] **Step 3: Verify dependency is available**

Run: `npm ls @simplewebauthn/server`

Expected: a single installed version is shown.

### Task 2: Write failing registration-options test expectation

**Files:**

- Modify: `tests/integration/webauthn.test.ts`
- Test: `tests/integration/webauthn.test.ts`

- [ ] **Step 1: Add a failing assertion for both supported algorithms**

Extend the existing `register/verify stores a discoverable credential` test so it expects:

```ts
pubKeyCredParams: [
  { type: 'public-key', alg: -7 },
  { type: 'public-key', alg: -257 },
],
```

- [ ] **Step 2: Run the focused test to verify it fails for the right reason**

Run: `npm test -- tests/integration/webauthn.test.ts --runInBand`

Expected: FAIL because the current code only returns `-7`.

- [ ] **Step 3: Replace hand-built registration options with library generation**

In `src/modules/webauthn/service.ts`:

```ts
const options = await generateRegistrationOptions({
  rpName: 'mini-auth',
  rpID: input.rpId,
  userName: input.email,
  userID: Buffer.from(input.userId, 'utf8'),
  timeout: 300000,
  authenticatorSelection: {
    residentKey: 'required',
    userVerification: 'preferred',
  },
  supportedAlgorithmIDs: [-7, -257],
});
```

Then normalize the returned object so the route still emits:

```ts
{
  request_id: record.requestId,
  publicKey: {
    challenge: options.challenge,
    rp: options.rp,
    user: options.user,
    pubKeyCredParams: options.pubKeyCredParams,
    timeout: options.timeout,
    authenticatorSelection: options.authenticatorSelection,
  },
}
```

Preserve the existing `consumeUnusedRegistrationChallengesForUser()` call and current log event.

- [ ] **Step 4: Run the focused registration test again**

Run: `npm test -- tests/integration/webauthn.test.ts --runInBand`

Expected: the previous algorithm assertion passes, with any remaining failures now due to verification/storage paths still using old logic.

### Task 3: Migrate authentication options generation with a frozen contract

**Files:**

- Modify: `tests/integration/webauthn.test.ts`
- Modify: `src/modules/webauthn/service.ts`
- Test: `tests/integration/webauthn.test.ts`

- [ ] **Step 1: Tighten the existing auth-options contract test before implementation**

Update `authenticate/options omits allowCredentials` so it explicitly asserts:

```ts
expect(body).toMatchObject({
  request_id: expect.any(String),
  publicKey: {
    challenge: expect.any(String),
    rpId: 'example.com',
    timeout: 300000,
    userVerification: 'preferred',
  },
});
expect(body.publicKey.allowCredentials).toBeUndefined();
```

Also keep the existing log assertion in place.

- [ ] **Step 2: Run the focused auth-options test to verify current behavior is pinned**

Run: `npm test -- tests/integration/webauthn.test.ts --runInBand`

Expected: PASS before migration, proving the contract is captured.

- [ ] **Step 3: Replace hand-built authentication options with library generation**

Use `generateAuthenticationOptions()` in `src/modules/webauthn/service.ts` with explicit inputs:

```ts
const options = await generateAuthenticationOptions({
  rpID: input.rpId,
  timeout: 300000,
  userVerification: 'preferred',
});
```

Normalize the output back to the current route shape and do not add `allowCredentials`.

- [ ] **Step 4: Run the focused auth-options test again**

Run: `npm test -- tests/integration/webauthn.test.ts --runInBand`

Expected: PASS with unchanged route behavior.

## Chunk 2: Registration verification and persistence rewrite

### Task 4: Write failing RS256 registration test

**Files:**

- Modify: `tests/helpers/webauthn.ts`
- Modify: `tests/integration/webauthn.test.ts`
- Test: `tests/integration/webauthn.test.ts`

- [ ] **Step 1: Add an RS256 registration integration test**

Create a new test near the existing registration success path:

```ts
it('register/verify accepts an RS256 credential', async () => {
  const testApp = await createSignedInApp('register-rs256@example.com');
  const passkey = createTestPasskey({
    seed: 'register-rs256@example.com',
    algorithm: 'RS256',
  });

  const options = await getRegisterOptions(testApp);
  const credential = passkey.createRegistrationCredential(
    options.publicKey,
    origin,
  );
  const response = await testApp.app.request('/webauthn/register/verify', {
    method: 'POST',
    headers: authHeaders(testApp.tokens.access_token),
    body: json({ request_id: options.request_id, credential }),
  });

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});
```

- [ ] **Step 2: Update the test helper to support configurable algorithms**

Refactor `tests/helpers/webauthn.ts` so `createTestPasskey()` accepts an options object like:

```ts
createTestPasskey({
  seed: 'default-passkey',
  algorithm: 'ES256' | 'RS256',
});
```

Implementation details to encode in the helper:

- ES256 uses `generateKeyPairSync('ec', { namedCurve: 'prime256v1' })`
- RS256 uses `generateKeyPairSync('rsa', { modulusLength: 2048 })`
- registration attestation `attStmt.alg` must match the selected algorithm
- generated COSE public key must match the selected key type and algorithm

- [ ] **Step 3: Run the new RS256 test to verify it fails correctly**

Run: `npm test -- tests/integration/webauthn.test.ts --runInBand`

Expected: FAIL because current registration verification/storage is still tied to the old manual format.

- [ ] **Step 4: Replace registration verification with `verifyRegistrationResponse()`**

In `src/modules/webauthn/service.ts`, replace the custom registration verification helper with a library-based path:

```ts
const verification = await verifyRegistrationResponse({
  response: input.credential,
  expectedChallenge: challenge.challenge,
  expectedOrigin: input.origins,
  expectedRPID: input.rpId,
  requireUserVerification: false,
});

if (!verification.verified || !verification.registrationInfo) {
  throw new InvalidWebauthnRegistrationError();
}
```

Keep `requireUserVerification: false` because the current route semantics are `userVerification: 'preferred'`, not a hard requirement.

Persist the returned credential data using the library result rather than JWK conversion logic. Keep duplicate-credential detection and success/failure logging behavior unchanged.

- [ ] **Step 5: Simplify repository persistence to the new public key format**

In `src/modules/webauthn/repo.ts`, keep the existing repository signatures if practical, but write `public_key` as a transport-safe encoded version of `registrationInfo.credential.publicKey`, for example:

```ts
const encodedPublicKey = Buffer.from(publicKeyBytes).toString('base64url');
```

Hard rules for this migration:

- `credential_id` remains the browser/base64url credential ID used by route payloads
- `public_key` becomes base64url-encoded raw credential public key bytes
- authentication lookup still keys by `credential.id`
- do not add dual-read, dual-write, JWK fallback, or legacy parsing branches

- [ ] **Step 6: Add one DB-shape assertion to the registration success test**

Update the existing registration success test to assert the stored row still uses the same `credential_id`, and that `public_key` is a non-empty string that is not JSON-shaped.

- [ ] **Step 7: Re-run the focused registration tests**

Run: `npm test -- tests/integration/webauthn.test.ts --runInBand`

Expected: ES256 and RS256 registration paths pass, duplicate credential behavior remains intact, and the stored credential shape matches the new format.

### Task 5: Re-pin registration-side invariants before authentication rewrite

**Files:**

- Modify: `tests/integration/webauthn.test.ts`
- Test: `tests/integration/webauthn.test.ts`

- [ ] **Step 1: Strengthen duplicate and replay-sensitive tests before more refactoring**

Keep or extend current tests so they explicitly prove:

- duplicate credential registration still returns `invalid_webauthn_registration` or the current duplicate mapping
- stale registration request IDs still fail after a newer one is issued
- registration success/failure log events are still emitted with the same event names

- [ ] **Step 2: Run the focused registration test file to verify the invariants are pinned**

Run: `npm test -- tests/integration/webauthn.test.ts --runInBand`

Expected: PASS before moving to authentication rewrite.

## Chunk 3: Authentication verification rewrite

### Task 6: Write failing authentication round-trip check for the new storage format

**Files:**

- Modify: `tests/integration/webauthn.test.ts`
- Test: `tests/integration/webauthn.test.ts`

- [ ] **Step 1: Strengthen an existing username-less sign-in test to prove persistence round-trip**

In the existing authentication success test, add direct assertions that:

- the stored credential row contains a non-empty encoded `public_key` string
- the authentication flow still succeeds using the persisted record
- success log events remain unchanged
- counter updates still occur

- [ ] **Step 2: Run the focused authentication test to verify it fails**

Run: `npm test -- tests/integration/webauthn.test.ts --runInBand`

Expected: FAIL because authentication verification still `JSON.parse()`s the stored public key.

- [ ] **Step 3: Replace authentication verification with `verifyAuthenticationResponse()`**

In `src/modules/webauthn/service.ts`, replace the custom assertion verification helper with:

```ts
const verification = await verifyAuthenticationResponse({
  response: input.credential,
  expectedChallenge: challenge.challenge,
  expectedOrigin: input.origins,
  expectedRPID: input.rpId,
  credential: {
    id: storedCredential.credentialId,
    publicKey: Buffer.from(storedCredential.publicKey, 'base64url'),
    counter: storedCredential.counter,
    transports: storedCredential.transports,
  },
  requireUserVerification: false,
});
```

Keep `requireUserVerification: false` here as well to preserve the current `preferred` verification semantics.

Then use `verification.authenticationInfo.newCounter` for the counter update path.

- [ ] **Step 4: Remove obsolete custom verification helpers**

Delete or inline dead code that only existed for the hand-rolled WebAuthn stack, including the old attestation/assertion verification helpers and JWK/COSE conversion functions that are no longer called.

- [ ] **Step 5: Run the focused WebAuthn integration suite**

Run: `npm test -- tests/integration/webauthn.test.ts --runInBand`

Expected: PASS for WebAuthn integration tests.

## Chunk 4: Docs and full verification

### Task 5: Update documentation

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Update the README registration example**

Change the example to show:

```json
"pubKeyCredParams": [
  { "type": "public-key", "alg": -7 },
  { "type": "public-key", "alg": -257 }
]
```

- [ ] **Step 2: Add a short note about the server implementation choice**

Document that WebAuthn verification now uses `@simplewebauthn/server` and that the project intentionally limits registration algorithms to `-7` and `-257` for explicitly tested compatibility.

- [ ] **Step 3: Run formatting if needed for touched docs/code**

Run: `npm run format`

Expected: only intentional formatting changes in touched files.

### Task 6: Run the full verification set

**Files:**

- Modify: any touched files from prior tasks only if verification reveals defects

- [ ] **Step 1: Run WebAuthn integration tests**

Run: `npm test -- tests/integration/webauthn.test.ts`

Expected: PASS

- [ ] **Step 2: Run the full integration suite**

Run: `npm run test:integration`

Expected: PASS

- [ ] **Step 3: Run static verification**

Run: `npm run typecheck && npm run lint && npm run build`

Expected: all commands PASS

- [ ] **Step 4: Inspect final diff**

Run: `git diff -- package.json src/modules/webauthn/service.ts src/modules/webauthn/repo.ts tests/helpers/webauthn.ts tests/integration/webauthn.test.ts README.md docs/superpowers/specs/2026-04-02-webauthn-simplewebauthn-migration-design.md docs/superpowers/plans/2026-04-02-webauthn-simplewebauthn-migration.md`

Expected: only the intended migration, test, and documentation changes are present.

- [ ] **Step 5: Commit**

Run:

```bash
git add package.json package-lock.json src/modules/webauthn/service.ts src/modules/webauthn/repo.ts tests/helpers/webauthn.ts tests/integration/webauthn.test.ts README.md docs/superpowers/specs/2026-04-02-webauthn-simplewebauthn-migration-design.md docs/superpowers/plans/2026-04-02-webauthn-simplewebauthn-migration.md
git commit -m "fix: migrate webauthn verification to simplewebauthn"
```

Expected: commit succeeds with the WebAuthn migration only.
