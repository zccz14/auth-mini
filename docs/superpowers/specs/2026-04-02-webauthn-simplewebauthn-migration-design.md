# WebAuthn migrate to @simplewebauthn/server for ES256 / RS256 compatibility

## Context

- Current registration options explicitly emit only `pubKeyCredParams: [{ type: 'public-key', alg: -7 }]`.
- Current registration verification logic in `src/modules/webauthn/service.ts` is hard-coded for ES256 attestation and EC2 COSE public keys.
- This narrows browser compatibility compared with Chromium defaults and risks registration failures on authenticators that prefer or require RS256.
- The project is expected to support a broader device matrix over time, including Android and iOS passkey flows.

## Goals

- Fix the immediate ES256 / RS256 compatibility issue.
- Reduce protocol-level maintenance in the application code.
- Preserve the current API shape and business semantics exactly unless this document says otherwise.
- Keep challenge lifecycle, session issuance, logging, and error handling behavior stable.
- Keep the implementation simple, even if that means a breaking persistence change.

## Non-goals

- Changing WebAuthn route paths.
- Expanding supported algorithms beyond `-7` and `-257` in this change.
- Refactoring unrelated OTP, JWT, or session modules.
- Preserving compatibility with historical WebAuthn credential data.

## Decision

Adopt `@simplewebauthn/server` for WebAuthn registration/authentication option generation and response verification, while retaining the project's existing routing, challenge persistence, user/session flows, and domain-specific errors.

## Why this direction

- The current hand-rolled implementation already owns low-level WebAuthn concerns such as CBOR parsing, COSE key handling, attestation validation, and signature verification. That logic will become more expensive to maintain as more authenticator and platform variants appear.
- `@simplewebauthn/server` is a mature community library with explicit support for registration and authentication verification across common passkey platforms and authenticators.
- Moving protocol validation to the library makes future Android/iOS/browser compatibility work less likely to require custom cryptographic changes in application code.

## Supported algorithms

Registration options will explicitly set:

- `supportedAlgorithmIDs: [-7, -257]`

Rationale:

- `-7` (ES256) and `-257` (RS256) address the concrete compatibility gap identified in Chrome/Chromium guidance.
- Keeping the algorithm list explicit preserves intent and avoids depending on upstream defaults.
- Not widening to additional algorithms yet avoids advertising support that this codebase does not explicitly test end-to-end.

## Architecture changes

### 1. Registration options

- Replace hand-built registration options with `generateRegistrationOptions()`.
- Keep current relying party values and user identity mapping.
- Preserve discoverable credential behavior by continuing to require resident keys.
- Preserve current user verification preference.
- Continue returning `request_id` plus a `publicKey` object compatible with the existing route contract.
- Preserve the current behavior where a new `/webauthn/register/options` request for the same signed-in user invalidates prior unused registration challenges.

### 2. Registration verification

- Replace custom attestation parsing and verification with `verifyRegistrationResponse()`.
- Continue resolving the stored challenge using the existing `request_id` and challenge repository logic.
- Pass existing origin and RP ID constraints into the library verification call.
- On success, persist credential data from the library's verification result.
- Continue consuming challenges only for valid, current requests.

### 3. Authentication options

- Replace hand-built authentication options with `generateAuthenticationOptions()`.
- Preserve username-less flow by continuing to omit `allowCredentials` for the public route.
- Keep current timeout and user verification semantics where supported by library options.
- Continue storing challenge records using the existing request/challenge persistence logic.

## Frozen route contracts

The migration is intended to be behavior-preserving at the HTTP contract level.

### Registration options response

The route must continue returning:

- `request_id`
- `publicKey.challenge`
- `publicKey.rp.name = "auth-mini"`
- `publicKey.rp.id = <rpId>`
- `publicKey.user.id` as base64url
- `publicKey.user.name = <email>`
- `publicKey.user.displayName = <email>`
- `publicKey.pubKeyCredParams` containing both `-7` and `-257`
- `publicKey.timeout = 300000`
- `publicKey.authenticatorSelection.residentKey = "required"`
- `publicKey.authenticatorSelection.userVerification = "preferred"`

### Authentication options response

The route must continue returning:

- `request_id`
- `publicKey.challenge`
- `publicKey.rpId = <rpId>`
- `publicKey.timeout = 300000`
- `publicKey.userVerification = "preferred"`
- no `publicKey.allowCredentials` field on the public username-less route

### Non-JSON observable behavior

The migration must also preserve:

- existing log event names for option generation and verification success/failure
- current domain errors and mapped API error codes
- challenge consumption and replay protection semantics

### 4. Authentication verification

- Replace custom assertion signature verification with `verifyAuthenticationResponse()`.
- Continue locating the credential by credential ID using the existing repository path.
- Feed stored credential public key bytes, counter, and transports into the library.
- Preserve the current counter update and challenge consumption flow.

## Data model and storage

The library expects credential public keys in raw byte form rather than as JWK JSON.

Planned approach:

- The implementation may treat this change as a clean break because there is no historical production data to preserve.
- `public_key` should store the credential public key bytes in a transport-safe encoding that can round-trip back to `Uint8Array` during verification.
- `credential_id`, `counter`, `transports`, and user linkage remain part of the stored credential model.

Simplification rule:

- Do not add dual-read, dual-write, backfill, or legacy-format parsing logic.
- If the simplest implementation is to recreate the local database or reset the WebAuthn credential table, that is acceptable.
- Favor the smallest code surface over migration flexibility.

Operational consequence:

- Existing local/test credentials may become invalid after the change.
- Re-registration is acceptable.

## Error handling

- Preserve existing domain errors such as invalid registration, invalid authentication, duplicate credential, and credential-not-found.
- Translate library verification failures into the same API-level error responses currently emitted by the routes.
- Preserve current log event names so operational behavior remains familiar.

## Testing strategy

Testing remains integration-first.

Required coverage updates:

- registration options emit both `-7` and `-257`
- ES256 registration still succeeds
- RS256 registration succeeds
- username-less authentication still succeeds for stored credentials
- counter updates still occur correctly after authentication
- duplicate credential protection still holds
- new credential rows stored in the new encoding round-trip through persistence and authenticate successfully
- route contracts for both options endpoints remain unchanged except for the widened `pubKeyCredParams`

Test helper changes:

- update `tests/helpers/webauthn.ts` so it can generate both ES256 and RS256 credentials, or replace helper internals if the new library changes expected test input shapes

## Documentation updates

- Update `README.md` registration options example to show both algorithms.
- Document why the project explicitly limits `supportedAlgorithmIDs` to `[-7, -257]` for now.
- Note that WebAuthn protocol verification is delegated to `@simplewebauthn/server`.

## Risks and mitigations

### Risk: persistence format changes break old local data

- Mitigation: accept the breaking change, reset the local database if needed, and keep the code free of legacy compatibility branches.

### Risk: library integration changes current JSON shape

- Mitigation: normalize library output back into the existing route response contract where needed.

### Risk: hidden dependency/runtime constraints

- Mitigation: the current environment already runs on Node 22, which satisfies the library's documented Node 20+ requirement; verify through build and integration tests.

## Acceptance criteria

- Registration options include both ES256 and RS256.
- Registration verification accepts both ES256 and RS256 credentials through the library path.
- Authentication verification continues to work for stored credentials.
- Existing API-level behavior and route contracts remain stable except that `pubKeyCredParams` now contains both `-7` and `-257`.
- Integration tests cover the new compatibility path and pass.
