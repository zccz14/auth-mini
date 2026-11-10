# auth-mini-axum

`auth-mini-axum` verifies Auth Mini access tokens in Axum applications.

The layer trusts one exact Auth Mini issuer and audience. It verifies `EdDSA`
signatures using the issuer's `/jwks` endpoint, accepts only `access` tokens,
and validates `iss`, `aud`, `sub`, `sid`, and `exp` claims.

JWKS state is warmed before the layer is returned. Known keys are served while
the cache is stale and one background refresh runs; keys older than `max_stale`
are never used. The defaults fetch a key set every six hours, because a key set
changes only when an operator rotates keys.

Rotation does not wait for that interval. An unknown `kid` causes a synchronous,
coalesced refresh, rate-limited to one attempt per `min_refresh_interval` (thirty
seconds by default) so invented `kid`s cannot turn every rejected token into a
`/jwks` request. Claim failures — expired, wrong issuer, wrong audience — never
refresh the key set.

Services whose liveness must not wait for an issuer network round trip can use
`AuthMiniLayer::from_issuer_background` instead. It starts the same JWKS warmup
immediately in the background; until that first validated fetch completes,
token-bearing requests fail closed with `503 Service Unavailable`.

```no_run
use auth_mini_axum::{AuthMiniLayer, JwksCachePolicy};
use axum::{routing::get, Router};

#[tokio::main]
async fn main() -> Result<(), auth_mini_axum::AuthMiniError> {
    let layer = AuthMiniLayer::from_issuer(
        "https://auth.example.com",
        "api.example.com",
        JwksCachePolicy::default(),
    )
    .await?;

    let _app = Router::new()
        .route("/private", get(|| async { "ok" }))
        .route_layer(layer);

    Ok(())
}
```

Handlers can read `AuthMiniPrincipal` from request extensions with Axum's
`Extension<AuthMiniPrincipal>` extractor:

```no_run
use auth_mini_axum::AuthMiniPrincipal;
use axum::extract::Extension;

async fn private(Extension(principal): Extension<AuthMiniPrincipal>) -> String {
    principal.subject
}
```
