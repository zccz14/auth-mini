# Backend JWT verification

auth-mini separates frontend session recovery from backend API authorization.

- **Access tokens** are short-lived JWTs signed by auth-mini for one hostname audience.
- **Refresh tokens** are database-backed secrets used only with auth-mini, together with `session_id`, to mint a new access/refresh pair.

That means your backend usually sees only the access token. It verifies the JWT locally, while the frontend handles refresh with auth-mini when needed.

## Verification chain

1. A user signs in with email OTP or a passkey.
2. auth-mini returns `session_id`, an access token, and a refresh token.
3. The frontend sends the access token to your backend as a bearer token.
4. Your backend fetches `GET /jwks` from auth-mini.
5. Your backend verifies the JWT signature and claims against those public keys.
6. The backend accepts or rejects the request.
7. When the access token expires, the frontend calls `POST /session/refresh` with both `session_id` and `refresh_token`, then retries with the new access token.

## Verifier guidance

- Fetch `GET /jwks` from auth-mini and cache the key set according to your verifier library's normal JWKS caching strategy instead of refetching on every request.
- Validate the JWT `iss` claim against the exact auth-mini issuer origin you configured.
- Validate the JWT `aud` claim against your exact business hostname; reject tokens minted for a different audience.
- Authorize requests from the verified JWT claims your backend trusts, rather than calling `GET /me` on every protected request.
- Reserve `/me` for Auth Mini's self-audience session/profile views. A token minted for a downstream hostname cannot read or manage the Auth Mini account.

Minimal `jose` verification:

```js
import { createRemoteJWKSet, jwtVerify } from 'jose';

const issuer = 'https://auth.example.com';
const audience = 'app.example.com';
const JWKS = createRemoteJWKSet(new URL('/jwks', issuer));

export function verifyAccessToken(token) {
  return jwtVerify(token, JWKS, { issuer, audience });
}
```

## Rust Axum middleware

For Axum services, use the published [`auth-mini-axum`](https://crates.io/crates/auth-mini-axum)
crate. Construct the layer once during application startup with the exact issuer
origin and the one audience that this service accepts. Startup fails closed if
the initial JWKS warm-up fails.

```rust,no_run
use auth_mini_axum::{AuthMiniLayer, AuthMiniPrincipal, JwksCachePolicy};
use axum::{extract::Extension, routing::get, Router};

async fn private(Extension(principal): Extension<AuthMiniPrincipal>) -> String {
    principal.subject
}

async fn app() -> Result<Router, auth_mini_axum::AuthMiniError> {
    let auth = AuthMiniLayer::from_issuer(
        "https://auth.example.com",
        "api.example.com",
        JwksCachePolicy::default(),
    )
    .await?;

    Ok(Router::new().route("/private", get(private)).route_layer(auth))
}
```

The middleware derives `/jwks` only from the configured issuer, rejects
redirects and non-Ed25519 signing keys, verifies the signature before exposing
`AuthMiniPrincipal`, and never exposes Auth Mini's `auth_admin` claim as a
downstream authorization role. The cache uses stale-while-revalidate for known
keys, single-flights key rotation refreshes, backs off failed refreshes from one
second to one minute, and refuses cache entries at or beyond `max_stale`.

When a process must expose liveness before the issuer round trip completes, use
`AuthMiniLayer::from_issuer_background` instead. It starts the same initial
JWKS fetch immediately without awaiting it. Until that fetch succeeds, every
JWT-bearing request fails closed with `503 Service Unavailable`; no token is
accepted without a validated key set.

## Why `/jwks` exists

`/jwks` lets API consumers verify access tokens without sharing auth-mini's private keys and without hitting the auth database for every protected request. auth-mini initializes and publishes `CURRENT` and `STANDBY` keys automatically when the database is created.

## Integration boundary

- Frontends talk to auth-mini for sign-in and refresh. Auth Mini's own GUI uses a self-audience token for `/me` and account management.
- Backends trust verified access tokens for API authorization and derive request authorization from the verified JWT.
- Refresh tokens should stay between the client and auth-mini; they are not backend bearer tokens.
