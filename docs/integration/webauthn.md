# WebAuthn integration

auth-mini uses discoverable credentials for passkey login. Users sign in with email first, register a passkey while authenticated, and can later sign in directly with the passkey without entering an email address first.

## Registration flow

1. Sign in with email OTP.
2. Call `POST /webauthn/register/options` while authenticated with `{}`.
3. Pass `publicKey` into `navigator.credentials.create()`.
4. Send `{ request_id, credential }` to `POST /webauthn/register/verify`.

Registration options require discoverable credentials:

```json
{
  "request_id": "<uuid>",
  "publicKey": {
    "challenge": "<base64url>",
    "rp": { "name": "auth-mini", "id": "example.com" },
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

## Authentication flow

1. Call `POST /webauthn/authenticate/options` with `{}`.
2. Pass `publicKey` into `navigator.credentials.get()`.
3. Send `{ request_id, credential }` to `POST /webauthn/authenticate/verify`.

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

## `rp_id` constraints

`rp_id` is configured once in `app_meta` through the administrator configuration API or GUI. Passkey registration and login always run on the Auth Mini server page, so WebAuthn origin is derived from the configured issuer and clients do not choose an origin or RP ID per request. The configured `rp_id` must satisfy normal WebAuthn rules relative to the issuer hostname: typically the same host or a parent domain, while `localhost` and IP-based setups generally require an exact match.

## Discoverable credentials

Discoverable credentials are what make auth-mini's passkey flow truly username-less. The browser or OS can offer available passkeys first, so the user does not need to type an identifier before authentication.

## Challenge behavior

- Generating a new registration challenge invalidates the previous unused registration challenge for the same signed-in user.
- Authentication challenges are preserved so concurrent sign-in attempts can complete independently.

## Library and algorithm note

WebAuthn registration and authentication verification use `@simplewebauthn/server`.

auth-mini intentionally limits advertised registration algorithms to `-7` (ES256) and `-257` (RS256), because those are the algorithms explicitly covered by the integration test suite.
