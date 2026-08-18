# WebAuthn integration

auth-mini uses discoverable credentials for passkey login. Users normally sign in with email OTP before registering a passkey. An Ed25519-authenticated user with no stored PassKey may also register the first PassKey, which lets an administrator created without an email address bootstrap human authentication. Users can later sign in directly with the passkey without entering an email address first.

## Registration flow

1. Sign in with email OTP, an existing PassKey, or Ed25519 when the user has no stored PassKey.
2. Call `POST /webauthn/register/options` while authenticated with `{}`.
3. Pass `publicKey` into `navigator.credentials.create()`.
4. Send `{ request_id, credential }` to `POST /webauthn/register/verify`.

Email OTP and WebAuthn sessions may register additional PassKeys. The Ed25519 exception applies only to the first PassKey: both registration endpoints return `403 insufficient_authentication_method` once the user has a stored PassKey. The verify endpoint checks again while storing the credential, so two concurrent Ed25519 registration ceremonies cannot both use the first-PassKey exception.

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
      "requireResidentKey": true,
      "userVerification": "required"
    },
    "extensions": {
      "credProps": true
    }
  }
}
```

Send the browser's registration extension result with the credential:

```json
{
  "request_id": "<uuid>",
  "credential": {
    "id": "<base64url>",
    "rawId": "<base64url>",
    "type": "public-key",
    "clientExtensionResults": {
      "credProps": { "rk": true }
    },
    "response": {
      "clientDataJSON": "<base64url>",
      "attestationObject": "<base64url>"
    }
  }
}
```

auth-mini requests a discoverable credential with `residentKey: "required"` and `credProps: true`, then completes the full WebAuthn ceremony. `clientExtensionResults.credProps.rk` is an unsigned compatibility report: an explicit JSON boolean `false` returns `400 invalid_webauthn_registration`, while a missing, unavailable, or unrecognized report does not replace or weaken challenge, origin, RP ID, user-verification, attestation, or credential-storage verification.

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

Registration and authentication use the same configured RP ID. Because authentication does not supply `allowCredentials`, the browser or authenticator must discover the credential for that RP.

## `rp_id` constraints

`rp_id` is configured once in `app_meta` through the administrator configuration API or GUI. Passkey registration and login always run on the Auth Mini server page, so WebAuthn origin is derived from the configured issuer and clients do not choose an origin or RP ID per request. The configured `rp_id` must satisfy normal WebAuthn rules relative to the issuer hostname: typically the same host or a parent domain, while `localhost` and IP-based setups generally require an exact match.

## Discoverable credentials

Discoverable credentials are what make auth-mini's passkey flow truly username-less. The browser or OS can offer available passkeys first, so the user does not need to type an identifier before authentication.

`credProps.rk` is an unsigned client report that page JavaScript can modify. It enforces auth-mini's registration protocol policy but is not cryptographic proof of authenticator storage. The Rust WebAuthn library normalizes an accepted report as `Unsigned(CredProps)` inside the new credential's `passkey_json`; auth-mini does not store the raw extension payload separately or copy it into a trusted column.

Existing credentials are never migrated, replaced, or deleted by registration. An older non-discoverable credential remains available for explicit management but may not appear in username-less authentication because auth-mini does not provide an `allowCredentials` fallback. Registering a duplicate credential ID returns the same generic `400 invalid_webauthn_registration` response and leaves the existing credential unchanged.

## Challenge behavior

- Generating a new registration challenge invalidates the previous unused registration challenge for the same signed-in user.
- Authentication challenges are preserved so concurrent sign-in attempts can complete independently.

## Library and algorithm note

The Rust backend uses the high-level `webauthn-rs` 0.5.5 passkey registration and discoverable-authentication APIs. Registration requests user verification as `required`; authentication currently requests `preferred`.

auth-mini intentionally limits advertised registration algorithms to `-7` (ES256) and `-257` (RS256), because those are the algorithms explicitly covered by the integration test suite.
