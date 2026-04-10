# HTTP API reference

## Public endpoints

- `POST /email/start` sends an OTP to the email address.
- `POST /email/verify` verifies the OTP and returns an access/refresh token pair plus `session_id`.
- `POST /session/refresh` exchanges `{ session_id, refresh_token }` for a new access/refresh token pair.
- `POST /webauthn/authenticate/options` creates a username-less passkey challenge.
- `POST /webauthn/authenticate/verify` verifies the passkey assertion and returns a session plus `session_id`.
- `GET /jwks` returns public keys for verifying access tokens.

## Authenticated endpoints

Send `Authorization: Bearer <access_token>`.

Access tokens issued by this API include an `amr` (Authentication Methods References) claim so downstream consumers can tell which sign-in method established the session. Current session-issuing flows produce `amr` values aligned with the completed login step, such as `email_otp` for email OTP sign-in and `webauthn` for passkey sign-in.

- `GET /me`
- `POST /session/logout`
- `POST /webauthn/register/options`
- `POST /webauthn/register/verify`
- `DELETE /webauthn/credentials/:id`

## Core auth flow contracts

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
  "expires_in": 3600,
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
  "expires_in": 3600,
  "refresh_token": "..."
}
```

### `POST /webauthn/register/options`

Starts passkey registration for an authenticated user.

Request: send `Authorization: Bearer <access_token>`.

This route requires a human-authenticated session. The presented access token must carry an `amr` that includes either `email_otp` or `webauthn`.

Request body:

```json
{ "rp_id": "example.com" }
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
      "userVerification": "preferred"
    }
  }
}
```

### `POST /webauthn/authenticate/options`

Starts a username-less passkey sign-in challenge.

Request body:

```json
{ "rp_id": "example.com" }
```

Response shape:

```json
{
  "request_id": "...",
  "publicKey": {
    "challenge": "...",
    "rpId": "example.com",
    "timeout": 300000,
    "userVerification": "preferred"
  }
}
```

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
  "expires_in": 3600,
  "refresh_token": "..."
}
```

### `POST /webauthn/register/verify`

Completes passkey registration for an authenticated user.

Request: send `Authorization: Bearer <access_token>`.

This route requires a human-authenticated session. The presented access token must carry an `amr` that includes either `email_otp` or `webauthn`.

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
    "clientExtensionResults": {},
    "response": {
      "clientDataJSON": "<base64url>",
      "attestationObject": "<base64url>",
      "transports": ["internal"]
    }
  }
}
```

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

### `DELETE /webauthn/credentials/:id`

Deletes one stored WebAuthn credential for the authenticated user.

Request: send `Authorization: Bearer <access_token>` and the credential id in the route.

This route requires a human-authenticated session. The presented access token must carry an `amr` that includes either `email_otp` or `webauthn`.

Successful response: deletion confirmation; clients should treat the credential as removed from local UI state.

Example response:

```json
{ "ok": true }
```

## `/me` behavior

`GET /me` returns the current user, stored WebAuthn credentials, and only active sessions.

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
