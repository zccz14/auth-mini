# HTTP API reference

`openapi.yaml` is the source of truth for the current HTTP contract.

Use this document for narrative examples and `openapi.yaml` for the exact route, auth, and schema contract.
If you want a typed low-level client for that contract, use `auth-mini/sdk/api` and see [API SDK integration](../integration/api-sdk.md).

## Public endpoints

- `GET /admin/setup` returns loopback-only setup state, including issuer, passkey RP ID, admin user id, admin Ed25519 credential summary, and SMTP summary without password.
- `PUT /admin/setup` initializes the administrator Ed25519 credential from loopback clients.
- `POST /email/start` sends an OTP to the email address.
- `POST /email/verify` verifies the OTP and returns an access/refresh token pair plus `session_id`.
- `POST /session/refresh` exchanges `{ session_id, refresh_token }` for a new access/refresh token pair.
- `POST /webauthn/authenticate/options` creates a username-less passkey challenge.
- `POST /webauthn/authenticate/verify` verifies the passkey assertion and returns a session plus `session_id`.
- `GET /jwks` returns public keys for verifying access tokens.

## Authenticated endpoints

Send `Authorization: Bearer <access_token>`.

Access tokens issued by this API include an `amr` (Authentication Methods References) claim so downstream consumers can tell which sign-in method established the session. Current session-issuing flows produce `amr` values aligned with the completed login step, such as `email_otp` for email OTP sign-in, `webauthn` for passkey sign-in, and `ed25519` for registered device-key sign-in.

- `GET /me`
- `POST /me/email/start` sends an OTP to a new email for the authenticated user.
- `POST /me/email/verify` verifies that OTP and changes the authenticated user email.
- `POST /session/logout`
- `POST /session/{session_id}/logout`
- `GET /ed25519/credentials`
- `POST /ed25519/credentials`
- `PATCH /ed25519/credentials/{id}`
- `DELETE /ed25519/credentials/{id}`
- `POST /webauthn/register/options`
- `POST /webauthn/register/verify`
- `DELETE /webauthn/credentials/{id}`

## Core auth flow contracts

### `PUT /admin/setup`

Initializes the administrator account from the machine running auth-mini. Non-loopback callers receive `admin_setup_forbidden`.

Request body:

```json
{
  "admin_ed25519": {
    "name": "ops laptop",
    "public_key": "<base58-ed25519-public-key>"
  }
}
```

`admin_ed25519` is required. auth-mini creates or reuses the configured admin user and stores `app_meta.admin_user_id`; the admin user can have `email: null` and can sign in through the normal Ed25519 start/verify flow.

Example response:

```json
{
  "issuer": "https://auth.example.com",
  "rp_id": "auth.example.com",
  "admin_user_id": "user-id",
  "admin_ed25519": {
    "id": "credential-id",
    "name": "ops laptop",
    "public_key": "<base58-ed25519-public-key>",
    "last_used_at": null,
    "created_at": "2026-06-30T00:00:00Z"
  },
  "smtp": null
}
```

SMTP password and private keys are never returned.

### `POST /email/start`

Starts the email OTP flow.

Request body:

```json
{ "email": "user@example.com" }
```

Successful response: no session yet; the server confirms the OTP was started/sent.

Example response:

```json
{ "ok": true }
```

### `POST /email/verify`

Completes the email OTP flow and creates a session.

The returned access token represents a human-authenticated email OTP session and carries `amr: ["email_otp"]`.

Request body:

```json
{ "email": "user@example.com", "code": "123456" }
```

Session-issuing endpoints include `session_id` so clients can later call `POST /session/refresh`.

Response shape:

```json
{
  "session_id": "...",
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "..."
}
```

### `POST /session/refresh`

Exchanges the current refresh token for a new access/refresh pair.

The refreshed access token keeps the session's existing authentication-method context in its `amr` claim.

Request body:

```json
{ "session_id": "...", "refresh_token": "..." }
```

Response shape:

```json
{
  "session_id": "...",
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "..."
}
```

### `POST /webauthn/register/options`

Starts passkey registration for an authenticated user.

Request: send `Authorization: Bearer <access_token>`.

Sessions with `amr: ["email_otp"]` or `amr: ["webauthn"]` may start registration. A session with `amr: ["ed25519"]` may start registration only when the current user has no stored PassKey. This exception lets an administrator created without an email address bootstrap a first PassKey. Once the user has a PassKey, an Ed25519 session receives `403 insufficient_authentication_method`.

Request body:

```json
{}
```

Response shape:

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "publicKey": {
    "challenge": "...",
    "rp": { "id": "example.com", "name": "auth-mini" },
    "user": {
      "id": "<base64url>",
      "name": "user@example.com",
      "displayName": "user@example.com"
    },
    "pubKeyCredParams": [
      { "type": "public-key", "alg": -7 },
      { "type": "public-key", "alg": -257 }
    ],
    "timeout": 300000,
    "authenticatorSelection": {
      "residentKey": "required",
      "requireResidentKey": true,
      "userVerification": "required"
    },
    "extensions": {
      "credProps": true
    }
  }
}
```

The RP ID comes from server configuration. The response always requests a discoverable credential with `residentKey: "required"`, the legacy-compatible `requireResidentKey: true`, and exactly the `credProps: true` extension input.

### `POST /webauthn/authenticate/options`

Starts a username-less passkey sign-in challenge.

The response uses the same configured RP ID as registration and intentionally has no `allowCredentials` field. auth-mini does not offer a username-first fallback for credentials that the client cannot discover.

Request body:

```json
{}
```

Response shape:

```json
{
  "request_id": "...",
  "publicKey": {
    "challenge": "...",
    "rpId": "example.com",
    "timeout": 300000,
    "userVerification": "required"
  }
}
```

The authentication request requires user verification, matching the server-side ceremony state. Assertions that only report user presence are rejected.

### `POST /webauthn/authenticate/verify`

Completes the passkey assertion and creates a session.

The returned access token represents a human-authenticated passkey session and carries `amr: ["webauthn"]`.

Request body:

```json
{ "request_id": "...", "credential": { "...": "WebAuthn assertion" } }
```

Serialize the browser `PublicKeyCredential` into JSON before sending it. Keep string fields as-is, include `authenticatorAttachment` when present, include `clientExtensionResults`, and base64url-encode binary fields such as `rawId`, `response.authenticatorData`, `response.clientDataJSON`, `response.signature`, and `response.userHandle` when present.

Example request body:

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "credential": {
    "id": "cred_123",
    "rawId": "<base64url>",
    "type": "public-key",
    "authenticatorAttachment": "platform",
    "clientExtensionResults": {},
    "response": {
      "authenticatorData": "<base64url>",
      "clientDataJSON": "<base64url>",
      "signature": "<base64url>",
      "userHandle": "<base64url-or-null>"
    }
  }
}
```

Response shape:

```json
{
  "session_id": "...",
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "..."
}
```

### `POST /webauthn/register/verify`

Completes passkey registration for an authenticated user.

Request: send `Authorization: Bearer <access_token>`.

Sessions with `amr: ["email_otp"]` or `amr: ["webauthn"]` may complete registration. A session with `amr: ["ed25519"]` may complete only the current user's first PassKey registration. The server checks this condition again when it stores the credential; if another PassKey was added after options were created, verification returns `403 insufficient_authentication_method` without consuming the registration challenge or storing the new credential.

Serialize the browser `PublicKeyCredential` into JSON before sending it. Keep string fields as-is, include `authenticatorAttachment` when present, include `clientExtensionResults`, base64url-encode binary fields such as `rawId`, `response.clientDataJSON`, and `response.attestationObject`, and keep `response.transports` as a plain string array when your client exposes it.

Example request body:

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "credential": {
    "id": "cred_123",
    "rawId": "<base64url>",
    "type": "public-key",
    "authenticatorAttachment": "platform",
    "clientExtensionResults": {
      "credProps": { "rk": true }
    },
    "response": {
      "clientDataJSON": "<base64url>",
      "attestationObject": "<base64url>",
      "transports": ["internal"]
    }
  }
}
```

Auth Mini requests `clientExtensionResults.credProps` to check discoverable-credential interoperability. An explicit JSON boolean `false` for `credProps.rk` returns the existing generic `400 invalid_webauthn_registration` response. A missing, unavailable, `null`, or otherwise unrecognized report is accepted only after complete WebAuthn registration verification; the unsigned extension result never replaces challenge, origin, RP ID, user-verification, algorithm, attestation, or credential-storage checks.

Rejected registration does not consume the challenge or write, update, or delete a credential. A cryptographically valid duplicate credential ID also returns `400 invalid_webauthn_registration`; its transaction rolls back, preserving the challenge and all fields of the existing row.

`credProps.rk` is client-reported and unsigned, so it is a protocol policy signal rather than proof that an authenticator stored a resident key. For successful registration, `webauthn-rs` 0.5.5 normalizes it as `Unsigned(CredProps)` inside the new credential's `passkey_json`. auth-mini does not persist the raw extension payload separately or copy it into a trusted column.

Registration is append-only. Existing credentials are not migrated, replaced, rewritten, or deleted. Older non-discoverable credentials can remain visible for explicit management while still being unavailable to username-less authentication.

Response shape:

```json
{ "ok": true }
```

### `POST /session/logout`

Invalidates the current authenticated session.

Request: send `Authorization: Bearer <access_token>`.

Successful response: logout confirmation with no new tokens returned.

Example response:

```json
{ "ok": true }
```

### `POST /session/{session_id}/logout`

Invalidates one other session for the authenticated user.

Request: send `Authorization: Bearer <access_token>` and pass the target session id in the route.

This route requires a human-authenticated session. The presented access token must carry an `amr` that includes either `email_otp` or `webauthn`.

`POST /session/logout` remains the current-session logout route. If `{session_id}` matches the current session id, the server returns `400`:

```json
{ "error": "invalid_request" }
```

`ed25519` sessions cannot use this route and receive `403`:

```json
{ "error": "insufficient_authentication_method" }
```

If the target session id is foreign, missing, or already expired, the server still returns `200 { "ok": true }` without revealing ownership or existence.

Response shape:

```json
{ "ok": true }
```

### `POST /ed25519/credentials`

Registers a device ED25519 public key for the authenticated user.

Request: send `Authorization: Bearer <access_token>`.

This route requires a human-authenticated session. The presented access token must carry an `amr` that includes either `email_otp` or `webauthn`.

Request body:

```json
{ "name": "CI runner", "public_key": "<base64url-32-byte-key>" }
```

Response shape:

```json
{
  "id": "...",
  "name": "CI runner",
  "public_key": "<base64url-32-byte-key>",
  "last_used_at": null,
  "created_at": "2026-04-11T00:00:00.000Z"
}
```

### `GET /ed25519/credentials`

Lists the authenticated user's registered ED25519 credentials.

Request: send `Authorization: Bearer <access_token>`.

This route requires a human-authenticated session. The presented access token must carry an `amr` that includes either `email_otp` or `webauthn`.

Response shape:

```json
[
  {
    "id": "...",
    "name": "CI runner",
    "public_key": "<base64url-32-byte-key>",
    "last_used_at": null,
    "created_at": "2026-04-11T00:00:00.000Z"
  }
]
```

### `PATCH /ed25519/credentials/{id}`

Renames one registered ED25519 credential for the authenticated user.

Request: send `Authorization: Bearer <access_token>` and the credential id in the route.

This route requires a human-authenticated session. The presented access token must carry an `amr` that includes either `email_otp` or `webauthn`.

Request body:

```json
{ "name": "Renamed runner" }
```

Response shape matches `POST /ed25519/credentials`.

### `DELETE /ed25519/credentials/{id}`

Deletes one registered ED25519 credential for the authenticated user.

Request: send `Authorization: Bearer <access_token>` and the credential id in the route.

This route requires a human-authenticated session. The presented access token must carry an `amr` that includes either `email_otp` or `webauthn`.

Example response:

```json
{ "ok": true }
```

### `POST /ed25519/start`

Starts device authentication for one registered ED25519 credential.

Request body:

```json
{ "credential_id": "550e8400-e29b-41d4-a716-446655440000" }
```

Response shape:

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "challenge": "<opaque-string>"
}
```

### `POST /ed25519/verify`

Verifies a device signature over the issued challenge and creates a session.

The returned access token represents a device-authenticated session and carries `amr: ["ed25519"]`.

Request body:

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "signature": "<base64url-signature>"
}
```

Response shape:

```json
{
  "session_id": "...",
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "..."
}
```

### `DELETE /webauthn/credentials/{id}`

Deletes one stored WebAuthn credential for the authenticated user.

Request: send `Authorization: Bearer <access_token>` and the credential id in the route.

This route requires a human-authenticated session. The presented access token must carry an `amr` that includes either `email_otp` or `webauthn`.

Successful response: deletion confirmation; clients should treat the credential as removed from local UI state.

Example response:

```json
{ "ok": true }
```

## `/me` behavior

`GET /me` returns the current user, stored WebAuthn credentials, stored ED25519 credentials, and only active sessions. It is the self-audience profile and account-management capability used by Auth Mini's own GUI. Downstream Browser and Device high-level SDKs do not expose `sdk.me.fetch()`; callers that need this raw operation must use the low-level API SDK's `sdk.me.get()` with an appropriate self-audience token.

Example response:

```json
{
  "user_id": "user_123",
  "email": "user@example.com",
  "webauthn_credentials": [
    {
      "credential_id": "cred_123",
      "public_key": "<base64url>",
      "counter": 1,
      "transports": "internal"
    }
  ],
  "ed25519_credentials": [
    {
      "id": "cred_device_123",
      "name": "CI runner",
      "public_key": "<base64url-32-byte-key>",
      "last_used_at": "2026-04-11T00:00:00.000Z",
      "created_at": "2026-04-10T00:00:00.000Z"
    }
  ],
  "active_sessions": [
    {
      "id": "sess_123",
      "created_at": "2026-04-04T00:00:00.000Z",
      "expires_at": "2026-04-05T00:00:00.000Z"
    }
  ]
}
```

## `GET /jwks`

Returns the public keys used to verify access-token JWT signatures.

`/jwks` publishes both the `CURRENT` and `STANDBY` keys.

Example response:

```json
{
  "keys": [
    {
      "kid": "current-key-id",
      "kty": "OKP",
      "alg": "EdDSA",
      "use": "sig",
      "crv": "Ed25519",
      "x": "..."
    },
    {
      "kid": "standby-key-id",
      "kty": "OKP",
      "alg": "EdDSA",
      "use": "sig",
      "crv": "Ed25519",
      "x": "..."
    }
  ]
}
```
