# mini-auth

Minimal email OTP + WebAuthn auth server built with Hono and SQLite.

## Features

- Email sign-in with one-time passwords
- Discoverable WebAuthn credentials for username-less sign-in
- Access + refresh token sessions
- JWKS endpoint for access token verification
- SQLite storage for users, sessions, SMTP config, WebAuthn credentials, and challenges

## CLI

Create a database and optionally import SMTP config rows from a JSON file:

```bash
npx mini-auth create ./mini-auth.sqlite --smtp-config ./smtp.json
```

Start the server:

```bash
npx mini-auth start ./mini-auth.sqlite \
  --host 127.0.0.1 \
  --port 7777 \
  --issuer https://auth.example.com \
  --rp-id example.com \
  --origin https://app.example.com
```

Rotate JWKS keys:

```bash
npx mini-auth rotate-jwks ./mini-auth.sqlite
```

## SMTP import format

`--smtp-config` expects a JSON array. Every row must be valid or the whole import is rejected.

```json
[
  {
    "host": "smtp.example.com",
    "port": 587,
    "username": "mailer",
    "password": "secret",
    "from_email": "noreply@example.com",
    "from_name": "mini-auth",
    "secure": false,
    "weight": 1
  }
]
```

## HTTP API

### Public endpoints

- `POST /email/start`
- `POST /email/verify`
- `POST /webauthn/authenticate/options`
- `POST /webauthn/authenticate/verify`
- `GET /jwks`

### Authenticated endpoints

Send `Authorization: Bearer <access_token>`.

- `GET /me`
- `POST /session/logout`
- `POST /webauthn/register/options`
- `POST /webauthn/register/verify`
- `DELETE /webauthn/credentials/:id`

Refresh uses the refresh token in the JSON body:

```json
{ "refresh_token": "..." }
```

`GET /me` returns the current user, stored WebAuthn credentials, and only active sessions.

## WebAuthn flow

1. Sign in with email OTP.
2. Call `POST /webauthn/register/options` while authenticated.
3. Pass `publicKey` into `navigator.credentials.create()`.
4. Send `{ request_id, credential }` to `POST /webauthn/register/verify`.
5. Later, call `POST /webauthn/authenticate/options` with an empty body.
6. Pass `publicKey` into `navigator.credentials.get()`.
7. Send `{ request_id, credential }` to `POST /webauthn/authenticate/verify`.

Registration options require discoverable credentials:

```json
{
  "request_id": "<uuid>",
  "publicKey": {
    "challenge": "<base64url>",
    "rp": { "name": "mini-auth", "id": "example.com" },
    "user": {
      "id": "<base64url>",
      "name": "user@example.com",
      "displayName": "user@example.com"
    },
    "pubKeyCredParams": [{ "type": "public-key", "alg": -7 }],
    "timeout": 300000,
    "authenticatorSelection": {
      "residentKey": "required",
      "userVerification": "preferred"
    }
  }
}
```

Authentication options are username-less and intentionally omit `allowCredentials`:

```json
{
  "request_id": "<uuid>",
  "publicKey": {
    "challenge": "<base64url>",
    "rpId": "example.com",
    "timeout": 300000,
    "userVerification": "preferred"
  }
}
```

## Development

```bash
npm run format
npm run lint
npm run typecheck
npm test
```
