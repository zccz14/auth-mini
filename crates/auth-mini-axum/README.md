# auth-mini-axum

`auth-mini-axum` verifies Auth Mini access tokens in Axum applications.

The layer trusts one exact Auth Mini issuer and audience. It verifies `EdDSA`
signatures using the issuer's `/jwks` endpoint, accepts only `access` tokens,
and validates `iss`, `aud`, `sub`, `sid`, and `exp` claims.

JWKS state is warmed before the layer is returned. Known keys are served while
the cache is stale and one background refresh runs. A poller refreshes keys on
the configured interval. An unknown `kid` always causes a synchronous,
coalesced refresh; keys older than `max_stale` are never used.

```no_run
use auth_mini_axum::{AuthMiniLayer, JwksCachePolicy};
use axum::{routing::get, Router};
use std::time::Duration;

#[tokio::main]
async fn main() -> Result<(), auth_mini_axum::AuthMiniError> {
    let layer = AuthMiniLayer::from_issuer(
        "https://auth.example.com",
        "api.example.com",
        JwksCachePolicy {
            refresh_after: Duration::from_secs(300),
            max_stale: Duration::from_secs(3600),
            poll_interval: Duration::from_secs(300),
        },
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
