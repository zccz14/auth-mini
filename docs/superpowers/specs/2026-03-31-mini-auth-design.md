# auth-mini Design

## Context

- Repository state: only `README.md` exists; implementation has not started yet.
- Product goal: ship a minimal authentication server that is started and operated through an npm CLI.
- Delivery model: HTTP service only; no embedded library API is planned.

## Confirmed Technical Choices

- Runtime: TypeScript + Node.js
- HTTP framework: Hono
- CLI: `cac`
- Database: SQLite via `better-sqlite3` with handwritten SQL
- Validation: `zod`
- JWT signing: `EdDSA` with `Ed25519`
- Key publishing: JWKS endpoint backed by database-stored signing keys
- Email delivery: SMTP only
- SMTP testing: local mock SMTP server for integration tests
- Testing: Vitest, integration-heavy, with a small number of unit tests
- WebAuthn testing: real server-side verification with constructed test credentials
- Tooling: Prettier + ESLint + Husky + lint-staged

## Architecture

The project is a single npm CLI application that manages a local SQLite-backed auth server. The CLI exposes operational commands such as database creation, server startup, and JWKS rotation. The HTTP surface is implemented with Hono and organized by auth domain rather than by transport details.

The codebase should be split into focused modules with clear boundaries:

- `src/cli/`: command registration and command handlers
- `src/server/`: Hono app assembly, route registration, middleware, auth context
- `src/modules/email-auth/`: OTP issuance and verification
- `src/modules/session/`: access token auth, refresh rotation, logout, `/me`
- `src/modules/webauthn/`: registration/authentication options and verification
- `src/modules/jwks/`: Ed25519 key generation, JWT signing, JWKS exposure
- `src/infra/db/`: SQLite connection, schema bootstrap, SQL helpers
- `src/infra/smtp/`: SMTP config selection and message sending
- `src/shared/`: errors, schemas, config parsing, hashing, time/random helpers
- `tests/`: integration tests, unit tests, SMTP/WebAuthn test helpers
- `sql/`: schema initialization SQL

`cac` remains a thin command router. Command arguments and runtime configuration are re-validated with `zod` so that type safety lives in the application boundary rather than in the CLI library.

## Core Data Model

The first version should use the smallest table set that still keeps auth state boundaries clean.

### `users`

- `id`
- `email` (unique, normalized)
- `email_verified_at`
- `created_at`

This table owns the long-lived user identity. Email is stored directly on the user because there is no planned multi-email or profile expansion requirement.

### `email_otps`

- `email`
- `code_hash`
- `expires_at`
- `consumed_at`

This table stores the short-lived email login challenge. OTPs stay separate from `users` because the OTP lifecycle is transient, may exist before the user exists, and needs independent overwrite/consume semantics.

Behavioral rules:

- only one active OTP per normalized email
- a new OTP replaces the previous unused OTP for that email
- OTP values are never stored in plaintext

### `sessions`

- `id`
- `user_id`
- `refresh_token_hash`
- `expires_at`
- `revoked_at`
- `created_at`

Refresh tokens are stateful and rotatable. Access tokens remain stateless JWTs and are not persisted.

Behavioral rules:

- access tokens include a `sid` claim equal to `sessions.id`
- `POST /session/logout` revokes the refresh session referenced by the authenticated access token `sid`

### `jwks_keys`

- `id`
- `kid`
- `alg`
- `public_jwk`
- `private_jwk`
- `is_active`
- `created_at`

This table stores signing keys used for JWT issuance and JWKS publication. New keys become the default signer after rotation. Older keys remain available for verification until old access tokens naturally expire.

### `webauthn_credentials`

- `id`
- `user_id`
- `credential_id`
- `public_key`
- `counter`
- `transports`
- `created_at`

This table stores discoverable passkey credentials linked to a user.

Constraint rules:

- `credential_id` has a global UNIQUE constraint across the table

### `webauthn_challenges`

- `request_id`
- `type` (`register` or `authenticate`)
- `challenge`
- `user_id` (required for register, nullable for authenticate)
- `expires_at`
- `consumed_at`

This table stores short-lived WebAuthn ceremonies.

Behavioral rules:

- a fresh register options request replaces the previous unused register challenge for the same authenticated user
- authenticate challenges are tracked independently by `request_id`
- authenticate challenges are username-less and do not require email preselection
- challenges are one-time use and must be marked consumed on success

### `smtp_configs`

- `id`
- `host`
- `port`
- `username`
- `password`
- `from_email`
- `from_name`
- `secure`
- `is_active`
- `weight`

This table stores outbound SMTP accounts. First version behavior is intentionally minimal: active configs are selected by weight for email sending. No encryption, audit log, or health-management subsystem is included in this version.

Management rules:

- `create` supports loading one or more SMTP configs from a JSON file
- the JSON file is imported into `smtp_configs` during initialization
- post-create SMTP management commands are out of scope for v1
- `start` is allowed with zero active SMTP configs, but `POST /email/start` must return deterministic `503 smtp_not_configured` until at least one active config exists

SMTP import file contract for v1:

```json
[
  {
    "host": "smtp.example.com",
    "port": 587,
    "username": "mailer",
    "password": "secret",
    "from_email": "noreply@example.com",
    "from_name": "auth-mini",
    "secure": false,
    "weight": 1
  }
]
```

Validation rules:

- required fields: `host`, `port`, `username`, `password`, `from_email`
- optional fields: `from_name`, `secure`, `weight`
- default `from_name` = empty string
- default `secure` = `false`
- default `weight` = `1`
- invalid entries fail the entire import

## API Flows

## Token Transport Contract

- Access tokens are sent via `Authorization: Bearer <jwt>`
- Refresh tokens are sent in JSON request bodies as `{ "refresh_token": "..." }`
- v1 does not use cookies

Successful auth flows that mint a new session return this JSON shape:

```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "<opaque-token>"
}
```

### Email OTP

#### `POST /email/start`

- input: `email`
- normalize email
- generate a six-digit OTP
- hash and store it in `email_otps`, replacing the previous unused OTP for that email
- select an active SMTP config by weight and send the email
- always return a uniform success response regardless of whether the user already exists

This endpoint is a unified sign-up/sign-in entry point and must not reveal account existence.

#### `POST /email/verify`

- input: `email`, `code`
- validate against an unexpired, unused OTP
- mark OTP consumed
- if no user exists for the email, create one
- create a refresh session
- return the standard token response shape

This endpoint is the account creation point for first-time users.

### Session APIs

#### `GET /me`

- requires a valid access token
- returns user id, email, WebAuthn credentials, and active sessions

For v1, the response may return full lists without pagination because the expected cardinality is small in a single-user auth profile context.

Response shape:

```json
{
  "user_id": "<uuid>",
  "email": "user@example.com",
  "webauthn_credentials": [
    {
      "id": "<db-id>",
      "credential_id": "<base64url>",
      "transports": ["internal"],
      "created_at": "<iso-datetime>"
    }
  ],
  "active_sessions": [
    {
      "id": "<session-id>",
      "created_at": "<iso-datetime>",
      "expires_at": "<iso-datetime>"
    }
  ]
}
```

`active_sessions` means sessions where `revoked_at IS NULL` and `expires_at > now()`.

#### `POST /session/refresh`

- input: refresh token
- find session by token hash
- verify not expired and not revoked
- revoke the old session
- create a new session
- return the standard token response shape

#### `POST /session/logout`

- requires access token auth
- read `sid` from the validated access token and revoke the matching refresh session
- access token remains valid until expiry

### WebAuthn Registration

#### `POST /webauthn/register/options`

- requires access token auth
- create a register challenge plus `request_id`
- replace any previous unused register challenge for that user
- return options for discoverable credentials

#### `POST /webauthn/register/verify`

- requires access token auth
- input: browser attestation response + `request_id`
- load the matching register challenge
- perform real WebAuthn verification
- store the credential on success
- reject duplicate `credential_id` with a conflict-safe response
- mark challenge consumed

### WebAuthn Authentication

#### `POST /webauthn/authenticate/options`

- no email required
- create an authenticate challenge plus `request_id`
- do not replace other in-flight authenticate challenges
- return `PublicKeyCredentialRequestOptions` without `allowCredentials`

#### `POST /webauthn/authenticate/verify`

- input: browser assertion response + `request_id`
- load the matching authenticate challenge
- perform real WebAuthn verification
- identify user by returned credential id
- update the credential counter
- create a refresh session and return the standard token response shape
- mark challenge consumed

### Credential Management

#### `DELETE /webauthn/credentials/:id`

- requires access token auth
- `:id` is the database row id from `/me`, not the raw WebAuthn `credential_id`
- deletes only credentials owned by the authenticated user

### JWKS

#### `GET /jwks`

- returns public JWKs for all keys that should still verify outstanding access tokens

### Operations

#### CLI `create`

- creates SQLite database
- runs `sql/schema.sql`
- seeds initial JWKS key material if missing
- optionally imports SMTP configs from a JSON file passed to the command

#### CLI `start`

- opens existing database
- validates runtime config
- starts HTTP server

#### CLI `rotate-jwks`

- generates a new active Ed25519 signing key
- leaves older verification keys available until old access tokens expire

## Error Handling

- `POST /email/start` must not reveal whether a user exists
- OTP, refresh token, and WebAuthn challenge failures should return compact auth-safe `400` or `401` responses
- expired or already-consumed one-time artifacts are invalid and cannot be retried
- ownership checks apply to session and credential deletion paths
- if OTP persistence succeeds but SMTP send fails, the request returns `503` and the newly written OTP is invalidated in the same error path

## Security And Lifetime Defaults

- OTP TTL: 10 minutes
- WebAuthn challenge TTL: 5 minutes
- Access token TTL: 15 minutes
- Refresh token TTL: 7 days
- On successful refresh, the prior refresh session is revoked immediately
- Old JWKS verification keys stay published for at least the maximum access-token TTL after rotation and may be cleaned up afterward

These defaults are exposed as internal configuration constants in v1 and do not require runtime tuning.

## Runtime Configuration

The server needs a small runtime config surface in addition to the database path.

- HTTP listen host and port
- issuer URL used in JWTs
- WebAuthn RP ID
- allowed WebAuthn origin list
- path to optional SMTP config import file for `create`

WebAuthn verification must use the configured RP ID and allowed origins. The implementation should fail fast during startup if required WebAuthn config is missing.

## WebAuthn Policy

The first version fixes only the compatibility-sensitive knobs and leaves all other library defaults untouched.

- registration must request discoverable credentials (`residentKey = required`)
- registration `userVerification = preferred`
- authentication is username-less and must omit `allowCredentials`
- authentication `userVerification = preferred`

Minimum server-emitted registration options fields:

- `challenge`
- `rp`
- `user`
- `pubKeyCredParams`
- `timeout`
- `authenticatorSelection.residentKey`
- `authenticatorSelection.userVerification`

Minimum server-emitted authentication options fields:

- `challenge`
- `rpId`
- `timeout`
- `userVerification`

## Testing Strategy

Testing is integration-first because the value of this project is in state transitions across SQLite, SMTP, JWT, and WebAuthn flows.

### Integration test coverage

- email OTP start/verify for existing and new users
- OTP expiry and replay rejection
- refresh token rotation
- logout revoking the session referenced by `sid`
- logout invalidating refresh token reuse
- access-token-gated `/me`
- WebAuthn registration flow
- WebAuthn username-less authentication flow
- concurrent username-less authentication options requests without cross-invalidation
- duplicate WebAuthn credential registration rejection
- credential deletion authorization
- SMTP send failure invalidating the unsent OTP
- JWKS rotation preserving old-token verification during overlap window

### Test environment design

- use Vitest as the runner
- start the Hono app directly in tests
- use a dedicated test SQLite database per suite or case
- run a local mock SMTP server during integration tests
- read OTPs from the mock mailbox instead of from the database
- use real server-side WebAuthn verification with constructed test credentials/assertions

### Unit tests kept small

- email normalization helpers
- token and hash utilities
- SMTP selection logic
- config parsing and validation

No browser E2E suite is part of the first delivery scope.

## Tooling And Quality Gates

- Prettier handles formatting
- ESLint handles TypeScript and Node code quality checks
- Husky installs a `pre-commit` hook
- lint-staged runs `prettier --write` and `eslint --fix` on staged files
- test execution is exposed through npm scripts but is not required in `pre-commit`

Expected baseline scripts:

- `format`
- `lint`
- `typecheck`
- `test`
- `test:integration`

## Deferred Scope

The following are intentionally excluded from the first implementation:

- embedded library API
- OpenAPI export and generated SDKs
- browser E2E tests
- SMTP credential encryption at rest
- SMTP health checking/failover orchestration
- user profile expansion beyond email identity
