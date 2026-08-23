//! Axum middleware for verifying Auth Mini access tokens.

use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::task::{Context, Poll};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use axum::body::Body;
use axum::http::{header, Request, Response, StatusCode};
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use reqwest::redirect::Policy;
use serde::Deserialize;
use thiserror::Error;
use tokio::sync::{watch, Mutex, RwLock};
use tower::{Layer, Service};
use url::Url;

const MAX_ACCESS_TOKEN_LIFETIME_SECONDS: i64 = 900;
const JWKS_RETRY_INITIAL: Duration = Duration::from_secs(1);
const JWKS_RETRY_MAX: Duration = Duration::from_secs(60);

/// The verified Auth Mini access-token claims exposed to downstream handlers.
///
/// Auth Mini's `auth_admin` claim intentionally is not exposed as a downstream
/// authorization decision. Applications must map this principal to their own
/// roles and permissions.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AuthMiniPrincipal {
    pub subject: String,
    pub session_id: String,
    pub audience: String,
    pub audiences: Vec<String>,
    pub authentication_methods: Vec<String>,
    pub issued_at: i64,
    pub expires_at: i64,
}

/// Explicit JWKS cache timings used independently of issuer HTTP cache headers.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct JwksCachePolicy {
    /// A cached key set is fresh for this duration and needs no refresh.
    pub refresh_after: Duration,
    /// A known key may still verify a token during this stale interval.
    pub max_stale: Duration,
    /// How often the background worker checks whether a refresh is due.
    pub poll_interval: Duration,
}

impl Default for JwksCachePolicy {
    fn default() -> Self {
        Self {
            refresh_after: Duration::from_secs(300),
            max_stale: Duration::from_secs(900),
            poll_interval: Duration::from_secs(60),
        }
    }
}

/// Errors returned while creating a verifier or validating an access token.
#[derive(Clone, Copy, Debug, Error)]
pub enum AuthMiniError {
    #[error("issuer must be an absolute HTTPS origin or a loopback HTTP origin")]
    InvalidIssuer,
    #[error("JWKS is unavailable")]
    JwksUnavailable,
    #[error("access token is invalid")]
    InvalidToken,
}

impl AuthMiniError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::JwksUnavailable => StatusCode::SERVICE_UNAVAILABLE,
            Self::InvalidIssuer | Self::InvalidToken => StatusCode::UNAUTHORIZED,
        }
    }
}

/// A Tower layer that verifies Auth Mini bearer access tokens.
#[derive(Clone)]
pub struct AuthMiniLayer {
    verifier: AuthMiniVerifier,
}

impl AuthMiniLayer {
    /// Fetches and validates the issuer JWKS before returning a usable layer.
    pub async fn from_issuer(
        issuer: impl AsRef<str>,
        audience: impl Into<String>,
        policy: JwksCachePolicy,
    ) -> Result<Self, AuthMiniError> {
        let verifier =
            AuthMiniVerifier::from_issuer(issuer.as_ref(), audience.into(), policy).await?;
        Ok(Self { verifier })
    }

    /// Returns immediately and begins warming the issuer JWKS in the background.
    ///
    /// Until the first successful refresh, token-bearing requests fail closed with
    /// [`AuthMiniError::JwksUnavailable`]. Use this only when process liveness
    /// must not depend on the issuer network round trip.
    pub fn from_issuer_background(
        issuer: impl AsRef<str>,
        audience: impl Into<String>,
        policy: JwksCachePolicy,
    ) -> Result<Self, AuthMiniError> {
        let verifier =
            AuthMiniVerifier::from_issuer_background(issuer.as_ref(), audience.into(), policy)?;
        Ok(Self { verifier })
    }

    /// Fetches and validates issuer JWKS for tokens containing any supplied audience.
    pub async fn from_issuer_audiences(
        issuer: impl AsRef<str>,
        audiences: impl IntoIterator<Item = String>,
        policy: JwksCachePolicy,
    ) -> Result<Self, AuthMiniError> {
        let verifier =
            AuthMiniVerifier::from_issuer_audiences(issuer.as_ref(), audiences, policy).await?;
        Ok(Self { verifier })
    }

    /// Begins background JWKS warming for tokens containing any supplied audience.
    pub fn from_issuer_audiences_background(
        issuer: impl AsRef<str>,
        audiences: impl IntoIterator<Item = String>,
        policy: JwksCachePolicy,
    ) -> Result<Self, AuthMiniError> {
        let verifier =
            AuthMiniVerifier::from_issuer_audiences_background(issuer.as_ref(), audiences, policy)?;
        Ok(Self { verifier })
    }

    /// Returns the shared verifier backing this layer.
    pub fn verifier(&self) -> AuthMiniVerifier {
        self.verifier.clone()
    }
}

impl<S> Layer<S> for AuthMiniLayer {
    type Service = AuthMiniService<S>;

    fn layer(&self, inner: S) -> Self::Service {
        AuthMiniService {
            inner,
            verifier: self.verifier.clone(),
        }
    }
}

/// The Tower service produced by [`AuthMiniLayer`].
#[derive(Clone)]
pub struct AuthMiniService<S> {
    inner: S,
    verifier: AuthMiniVerifier,
}

impl<S, B> Service<Request<B>> for AuthMiniService<S>
where
    S: Service<Request<B>, Response = Response<Body>> + Clone + Send + 'static,
    S::Future: Send + 'static,
    B: Send + 'static,
{
    type Response = Response<Body>;
    type Error = S::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, context: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(context)
    }

    fn call(&mut self, mut request: Request<B>) -> Self::Future {
        let verifier = self.verifier.clone();
        let mut inner = self.inner.clone();

        Box::pin(async move {
            let token = match bearer_token(request.headers()) {
                Some(token) => token,
                None => return Ok(auth_error(AuthMiniError::InvalidToken)),
            };
            let principal = match verifier.verify(&token).await {
                Ok(principal) => principal,
                Err(error) => return Ok(auth_error(error)),
            };
            request.extensions_mut().insert(principal);
            inner.call(request).await
        })
    }
}

/// A shared Auth Mini JWT verifier. It can also be used outside Tower middleware.
#[derive(Clone)]
pub struct AuthMiniVerifier {
    inner: Arc<VerifierInner>,
}

struct VerifierInner {
    issuer: String,
    audiences: Vec<String>,
    jwks_url: Url,
    policy: JwksCachePolicy,
    client: reqwest::Client,
    cache: RwLock<Option<CachedJwks>>,
    refresh: Mutex<RefreshState>,
    refresh_events: watch::Sender<u64>,
    background_refresh_scheduled: AtomicBool,
}

#[derive(Clone)]
struct CachedJwks {
    generation: u64,
    keys: HashMap<String, VerifyingKey>,
    fetched_at: Instant,
}

struct RefreshState {
    in_flight: bool,
    failure: Option<RefreshFailure>,
}

struct RefreshFailure {
    generation: Option<u64>,
    retry_at: Instant,
    retry_delay: Duration,
}

impl AuthMiniVerifier {
    /// Builds a verifier after successfully warming its JWKS cache.
    pub async fn from_issuer(
        issuer: &str,
        audience: String,
        policy: JwksCachePolicy,
    ) -> Result<Self, AuthMiniError> {
        let verifier = Self::new(issuer, vec![audience], policy)?;
        verifier.refresh_now().await?;
        verifier.start_poller();
        Ok(verifier)
    }

    /// Returns immediately and begins the first issuer JWKS refresh in the background.
    ///
    /// Verification fails closed with [`AuthMiniError::JwksUnavailable`] until a
    /// JWKS document has been fetched and validated.
    pub fn from_issuer_background(
        issuer: &str,
        audience: String,
        policy: JwksCachePolicy,
    ) -> Result<Self, AuthMiniError> {
        let verifier = Self::new(issuer, vec![audience], policy)?;
        let refresh = verifier.clone();
        tokio::spawn(async move {
            let _ = refresh.refresh_now().await;
        });
        verifier.start_poller();
        Ok(verifier)
    }

    /// Builds a verifier after successfully warming its JWKS cache for any supplied audience.
    pub async fn from_issuer_audiences(
        issuer: &str,
        audiences: impl IntoIterator<Item = String>,
        policy: JwksCachePolicy,
    ) -> Result<Self, AuthMiniError> {
        let verifier = Self::new(issuer, audiences.into_iter().collect(), policy)?;
        verifier.refresh_now().await?;
        verifier.start_poller();
        Ok(verifier)
    }

    /// Begins background JWKS warming for any supplied audience.
    pub fn from_issuer_audiences_background(
        issuer: &str,
        audiences: impl IntoIterator<Item = String>,
        policy: JwksCachePolicy,
    ) -> Result<Self, AuthMiniError> {
        let verifier = Self::new(issuer, audiences.into_iter().collect(), policy)?;
        let refresh = verifier.clone();
        tokio::spawn(async move {
            let _ = refresh.refresh_now().await;
        });
        verifier.start_poller();
        Ok(verifier)
    }

    fn new(
        issuer: &str,
        audiences: Vec<String>,
        policy: JwksCachePolicy,
    ) -> Result<Self, AuthMiniError> {
        let audiences = normalize_audiences(audiences)?;
        if audiences.is_empty()
            || policy.max_stale < policy.refresh_after
            || policy.poll_interval.is_zero()
        {
            return Err(AuthMiniError::InvalidIssuer);
        }
        let (issuer, jwks_url) = normalize_issuer(issuer)?;
        let client = reqwest::Client::builder()
            .redirect(Policy::none())
            .build()
            .map_err(|_| AuthMiniError::JwksUnavailable)?;
        let (refresh_events, _) = watch::channel(0_u64);
        Ok(Self {
            inner: Arc::new(VerifierInner {
                issuer,
                audiences,
                jwks_url,
                policy,
                client,
                cache: RwLock::new(None),
                refresh: Mutex::new(RefreshState {
                    in_flight: false,
                    failure: None,
                }),
                refresh_events,
                background_refresh_scheduled: AtomicBool::new(false),
            }),
        })
    }

    /// Verifies one bearer access token against the latest valid JWKS cache.
    pub async fn verify(&self, token: &str) -> Result<AuthMiniPrincipal, AuthMiniError> {
        let parsed = ParsedToken::parse(token)?;
        let key = self.verifying_key(&parsed.kid).await?;
        key.verify(parsed.signing_input.as_bytes(), &parsed.signature)
            .map_err(|_| AuthMiniError::InvalidToken)?;
        parsed.principal(&self.inner.issuer, &self.inner.audiences)
    }

    async fn verifying_key(&self, kid: &str) -> Result<VerifyingKey, AuthMiniError> {
        let cache = self.inner.cache.read().await.clone();
        let Some(cache) = cache else {
            return Err(AuthMiniError::JwksUnavailable);
        };
        let age = cache.fetched_at.elapsed();

        if age >= self.inner.policy.max_stale {
            self.refresh_for_generation(Some(cache.generation)).await?;
            return self.key_after_refresh(kid).await;
        }

        if let Some(key) = cache.keys.get(kid) {
            if age >= self.inner.policy.refresh_after {
                self.refresh_in_background(cache.generation).await;
            }
            return Ok(*key);
        }

        if self
            .refresh_for_generation(Some(cache.generation))
            .await
            .is_err()
        {
            return Err(AuthMiniError::InvalidToken);
        }
        self.key_after_refresh(kid).await
    }

    async fn key_after_refresh(&self, kid: &str) -> Result<VerifyingKey, AuthMiniError> {
        self.inner
            .cache
            .read()
            .await
            .as_ref()
            .and_then(|cache| cache.keys.get(kid))
            .copied()
            .ok_or(AuthMiniError::InvalidToken)
    }

    async fn refresh_in_background(&self, generation: u64) {
        let refresh = self.inner.refresh.lock().await;
        if refresh.in_flight
            || refresh.failure.as_ref().is_some_and(|failure| {
                failure.generation == Some(generation) && Instant::now() < failure.retry_at
            })
        {
            return;
        }
        if self
            .inner
            .background_refresh_scheduled
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .is_err()
        {
            return;
        }
        drop(refresh);
        let verifier = self.clone();
        tokio::spawn(async move {
            let _ = verifier.refresh_for_generation(Some(generation)).await;
            verifier
                .inner
                .background_refresh_scheduled
                .store(false, Ordering::Release);
        });
    }

    fn start_poller(&self) {
        let weak = Arc::downgrade(&self.inner);
        tokio::spawn(async move {
            loop {
                let Some(inner) = weak.upgrade() else {
                    return;
                };
                let verifier = AuthMiniVerifier { inner };
                let delay = verifier.next_poll_delay().await;
                let mut refresh_events = verifier.inner.refresh_events.subscribe();
                tokio::select! {
                    _ = tokio::time::sleep(delay) => {}
                    changed = refresh_events.changed() => {
                        if changed.is_err() {
                            return;
                        }
                        continue;
                    }
                }
                let cache = verifier.inner.cache.read().await.as_ref().cloned();
                let Some(cache) = cache else {
                    let _ = verifier.refresh_now().await;
                    continue;
                };
                if cache.fetched_at.elapsed() < verifier.inner.policy.refresh_after {
                    continue;
                }
                let _ = verifier
                    .refresh_for_generation(Some(cache.generation))
                    .await;
            }
        });
    }

    async fn refresh_now(&self) -> Result<(), AuthMiniError> {
        self.refresh_for_generation(None).await
    }

    async fn refresh_for_generation(
        &self,
        expected_generation: Option<u64>,
    ) -> Result<(), AuthMiniError> {
        loop {
            let mut refresh_events = self.inner.refresh_events.subscribe();
            let wait_for_refresh = {
                let mut refresh = self.inner.refresh.lock().await;
                let current_generation = self
                    .inner
                    .cache
                    .read()
                    .await
                    .as_ref()
                    .map(|cache| cache.generation);
                if expected_generation.is_some() && current_generation != expected_generation {
                    return Ok(());
                }
                if refresh.in_flight {
                    true
                } else if refresh.failure.as_ref().is_some_and(|failure| {
                    failure.generation == expected_generation && Instant::now() < failure.retry_at
                }) {
                    return Err(AuthMiniError::JwksUnavailable);
                } else {
                    refresh.in_flight = true;
                    false
                }
            };
            if wait_for_refresh {
                let _ = refresh_events.changed().await;
                continue;
            }

            let result = self.fetch_jwks().await;
            let mut refresh = self.inner.refresh.lock().await;
            refresh.in_flight = false;
            refresh.failure = match result {
                Ok(()) => None,
                Err(_) => {
                    let retry_delay = refresh
                        .failure
                        .as_ref()
                        .filter(|failure| failure.generation == expected_generation)
                        .map(|failure| (failure.retry_delay * 2).min(JWKS_RETRY_MAX))
                        .unwrap_or(JWKS_RETRY_INITIAL);
                    Some(RefreshFailure {
                        generation: expected_generation,
                        retry_at: Instant::now() + retry_delay,
                        retry_delay,
                    })
                }
            };
            drop(refresh);
            self.inner
                .refresh_events
                .send_modify(|event| *event = event.wrapping_add(1));
            return result;
        }
    }

    async fn next_poll_delay(&self) -> Duration {
        let cache = self.inner.cache.read().await.as_ref().cloned();
        let refresh = self.inner.refresh.lock().await;
        if let Some(failure) = refresh.failure.as_ref() {
            if failure.generation == cache.as_ref().map(|cache| cache.generation) {
                return failure.retry_at.saturating_duration_since(Instant::now());
            }
        }
        let Some(cache) = cache else {
            return self.inner.policy.poll_interval;
        };
        let age = cache.fetched_at.elapsed();
        if age >= self.inner.policy.refresh_after {
            self.inner.policy.poll_interval
        } else {
            self.inner
                .policy
                .poll_interval
                .min(self.inner.policy.refresh_after - age)
        }
    }

    async fn fetch_jwks(&self) -> Result<(), AuthMiniError> {
        let response = self
            .inner
            .client
            .get(self.inner.jwks_url.clone())
            .send()
            .await
            .map_err(|_| AuthMiniError::JwksUnavailable)?;
        if !response.status().is_success() {
            return Err(AuthMiniError::JwksUnavailable);
        }
        let document = response
            .json::<JwksDocument>()
            .await
            .map_err(|_| AuthMiniError::JwksUnavailable)?;
        let keys = document.verifying_keys()?;
        let mut cache = self.inner.cache.write().await;
        let generation = cache
            .as_ref()
            .map(|cache| cache.generation.saturating_add(1))
            .unwrap_or(0);
        *cache = Some(CachedJwks {
            generation,
            keys,
            fetched_at: Instant::now(),
        });
        Ok(())
    }
}

fn normalize_issuer(issuer: &str) -> Result<(String, Url), AuthMiniError> {
    let parsed = Url::parse(issuer).map_err(|_| AuthMiniError::InvalidIssuer)?;
    if parsed.query().is_some()
        || parsed.fragment().is_some()
        || parsed.username() != ""
        || parsed.password().is_some()
        || parsed.path() != "/"
    {
        return Err(AuthMiniError::InvalidIssuer);
    }
    let loopback_http = parsed.scheme() == "http"
        && match parsed.host() {
            Some(url::Host::Ipv4(ip)) => ip.is_loopback(),
            Some(url::Host::Ipv6(ip)) => ip.is_loopback(),
            Some(url::Host::Domain(_)) | None => false,
        };
    if parsed.scheme() != "https" && !loopback_http {
        return Err(AuthMiniError::InvalidIssuer);
    }
    let issuer = parsed.origin().ascii_serialization();
    if issuer == "null" {
        return Err(AuthMiniError::InvalidIssuer);
    }
    let jwks_url =
        Url::parse(&format!("{issuer}/jwks")).map_err(|_| AuthMiniError::InvalidIssuer)?;
    Ok((issuer, jwks_url))
}

fn bearer_token(headers: &axum::http::HeaderMap) -> Option<String> {
    headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .filter(|token| !token.is_empty())
        .map(ToOwned::to_owned)
}

fn auth_error(error: AuthMiniError) -> Response<Body> {
    let status = error.status_code();
    let body = match status {
        StatusCode::SERVICE_UNAVAILABLE => r#"{"error":"jwks_unavailable"}"#,
        _ => r#"{"error":"invalid_token"}"#,
    };
    Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, "application/json; charset=utf-8")
        .body(Body::from(body))
        .expect("constant response is valid")
}

#[derive(Deserialize)]
struct JwksDocument {
    keys: Vec<Jwk>,
}

impl JwksDocument {
    fn verifying_keys(self) -> Result<HashMap<String, VerifyingKey>, AuthMiniError> {
        let mut keys = HashMap::new();
        for jwk in self.keys {
            if jwk.kid.is_empty() {
                return Err(AuthMiniError::JwksUnavailable);
            }
            if jwk.kty != "OKP"
                || jwk.crv != "Ed25519"
                || jwk.alg.as_deref() != Some("EdDSA")
                || jwk.use_.as_deref() != Some("sig")
            {
                continue;
            }
            let decoded = URL_SAFE_NO_PAD
                .decode(jwk.x)
                .map_err(|_| AuthMiniError::JwksUnavailable)?;
            let bytes: [u8; 32] = decoded
                .try_into()
                .map_err(|_| AuthMiniError::JwksUnavailable)?;
            let key =
                VerifyingKey::from_bytes(&bytes).map_err(|_| AuthMiniError::JwksUnavailable)?;
            if keys.insert(jwk.kid, key).is_some() {
                return Err(AuthMiniError::JwksUnavailable);
            }
        }
        if keys.is_empty() {
            return Err(AuthMiniError::JwksUnavailable);
        }
        Ok(keys)
    }
}

#[derive(Deserialize)]
struct Jwk {
    kid: String,
    kty: String,
    crv: String,
    alg: Option<String>,
    #[serde(rename = "use")]
    use_: Option<String>,
    x: String,
}

struct ParsedToken {
    kid: String,
    signing_input: String,
    signature: Signature,
    claims: serde_json::Value,
}

impl ParsedToken {
    fn parse(token: &str) -> Result<Self, AuthMiniError> {
        let mut segments = token.split('.');
        let header_segment = segments.next().ok_or(AuthMiniError::InvalidToken)?;
        let payload = segments.next().ok_or(AuthMiniError::InvalidToken)?;
        let signature = segments.next().ok_or(AuthMiniError::InvalidToken)?;
        if segments.next().is_some() {
            return Err(AuthMiniError::InvalidToken);
        }
        let header: JwtHeader = decode_json_segment(header_segment)?;
        if header.alg != "EdDSA"
            || header.kid.is_empty()
            || header.parameters.contains_key("crit")
            || header.parameters.contains_key("b64")
        {
            return Err(AuthMiniError::InvalidToken);
        }
        let claims = decode_json_segment(payload)?;
        let signature = URL_SAFE_NO_PAD
            .decode(signature)
            .map_err(|_| AuthMiniError::InvalidToken)?;
        let signature =
            Signature::from_slice(&signature).map_err(|_| AuthMiniError::InvalidToken)?;
        Ok(Self {
            kid: header.kid,
            signing_input: format!("{header_segment}.{payload}"),
            signature,
            claims,
        })
    }

    fn principal(
        self,
        expected_issuer: &str,
        expected_audiences: &[String],
    ) -> Result<AuthMiniPrincipal, AuthMiniError> {
        let subject = required_string(&self.claims, "sub")?;
        let session_id = required_string(&self.claims, "sid")?;
        let issuer = required_string(&self.claims, "iss")?;
        let audiences = required_audiences(&self.claims)?;
        let token_type = required_string(&self.claims, "typ")?;
        let issued_at = required_number(&self.claims, "iat")?;
        let expires_at = required_number(&self.claims, "exp")?;
        let authentication_methods = self
            .claims
            .get("amr")
            .and_then(serde_json::Value::as_array)
            .ok_or(AuthMiniError::InvalidToken)?
            .iter()
            .map(|value| value.as_str().filter(|value| !value.is_empty()))
            .collect::<Option<Vec<_>>>()
            .filter(|methods| !methods.is_empty())
            .ok_or(AuthMiniError::InvalidToken)?;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| AuthMiniError::InvalidToken)?
            .as_secs() as i64;
        let not_before = match self.claims.get("nbf") {
            None => None,
            Some(value) => Some(value.as_i64().ok_or(AuthMiniError::InvalidToken)?),
        };
        if issuer != expected_issuer
            || !audiences
                .iter()
                .any(|audience| expected_audiences.contains(audience))
            || token_type != "access"
            || expires_at <= now
            || issued_at > now.saturating_add(60)
            || expires_at <= issued_at
            || not_before.is_some_and(|not_before| not_before > now)
        {
            return Err(AuthMiniError::InvalidToken);
        }
        if expires_at
            .checked_sub(issued_at)
            .is_none_or(|lifetime| lifetime > MAX_ACCESS_TOKEN_LIFETIME_SECONDS)
        {
            return Err(AuthMiniError::InvalidToken);
        }
        Ok(AuthMiniPrincipal {
            subject: subject.to_string(),
            session_id: session_id.to_string(),
            audience: expected_audiences
                .iter()
                .find(|expected| audiences.contains(expected))
                .cloned()
                .ok_or(AuthMiniError::InvalidToken)?,
            audiences,
            authentication_methods: authentication_methods
                .into_iter()
                .map(ToOwned::to_owned)
                .collect(),
            issued_at,
            expires_at,
        })
    }
}

#[derive(Deserialize)]
struct JwtHeader {
    alg: String,
    kid: String,
    #[serde(flatten)]
    parameters: serde_json::Map<String, serde_json::Value>,
}

fn decode_json_segment<T: serde::de::DeserializeOwned>(segment: &str) -> Result<T, AuthMiniError> {
    let bytes = URL_SAFE_NO_PAD
        .decode(segment)
        .map_err(|_| AuthMiniError::InvalidToken)?;
    serde_json::from_slice(&bytes).map_err(|_| AuthMiniError::InvalidToken)
}

fn normalize_audiences(mut audiences: Vec<String>) -> Result<Vec<String>, AuthMiniError> {
    if audiences.iter().any(|audience| audience.is_empty()) {
        return Err(AuthMiniError::InvalidIssuer);
    }
    audiences.sort();
    audiences.dedup();
    (!audiences.is_empty())
        .then_some(audiences)
        .ok_or(AuthMiniError::InvalidIssuer)
}

fn required_audiences(value: &serde_json::Value) -> Result<Vec<String>, AuthMiniError> {
    let audiences = match value.get("aud") {
        Some(serde_json::Value::String(audience)) => vec![audience.to_owned()],
        Some(serde_json::Value::Array(values)) => values
            .iter()
            .map(|value| {
                value
                    .as_str()
                    .map(str::to_owned)
                    .ok_or(AuthMiniError::InvalidToken)
            })
            .collect::<Result<Vec<_>, _>>()?,
        _ => return Err(AuthMiniError::InvalidToken),
    };
    let mut audiences = audiences;
    audiences.sort();
    audiences.dedup();
    (!audiences.is_empty() && audiences.iter().all(|audience| !audience.is_empty()))
        .then_some(audiences)
        .ok_or(AuthMiniError::InvalidToken)
}

fn required_string<'a>(value: &'a serde_json::Value, key: &str) -> Result<&'a str, AuthMiniError> {
    value
        .get(key)
        .and_then(serde_json::Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or(AuthMiniError::InvalidToken)
}

fn required_number(value: &serde_json::Value, key: &str) -> Result<i64, AuthMiniError> {
    value
        .get(key)
        .and_then(serde_json::Value::as_i64)
        .ok_or(AuthMiniError::InvalidToken)
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use axum::extract::{Extension, State};
    use axum::response::Response as AxumResponse;
    use axum::response::{IntoResponse, Redirect};
    use axum::routing::get;
    use axum::{Json, Router};
    use ed25519_dalek::{Signer, SigningKey};
    use serde_json::json;
    use tokio::sync::Mutex;
    use tokio::time::{advance, sleep};
    use tower::ServiceExt;

    use super::*;

    #[derive(Clone)]
    struct MockJwks {
        document: serde_json::Value,
        status: StatusCode,
        calls: usize,
        delay: Duration,
    }

    async fn jwks_handler(State(state): State<Arc<Mutex<MockJwks>>>) -> AxumResponse {
        let (document, status, delay) = {
            let mut state = state.lock().await;
            state.calls += 1;
            (state.document.clone(), state.status, state.delay)
        };
        if !delay.is_zero() {
            sleep(delay).await;
        }
        if status != StatusCode::OK {
            return status.into_response();
        }
        Json(document).into_response()
    }

    async fn mock_issuer(document: serde_json::Value) -> (String, Arc<Mutex<MockJwks>>) {
        let state = Arc::new(Mutex::new(MockJwks {
            document,
            status: StatusCode::OK,
            calls: 0,
            delay: Duration::ZERO,
        }));
        let app = Router::new()
            .route("/jwks", get(jwks_handler))
            .with_state(state.clone());
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("mock listener binds");
        let issuer = format!("http://{}", listener.local_addr().expect("mock address"));
        tokio::spawn(async move {
            axum::serve(listener, app).await.expect("mock server runs");
        });
        (issuer, state)
    }

    fn signing_key(seed: u8) -> SigningKey {
        SigningKey::from_bytes(&[seed; 32])
    }

    fn jwks_document(kid: &str, key: &SigningKey) -> serde_json::Value {
        json!({
            "keys": [{
                "kid": kid,
                "kty": "OKP",
                "crv": "Ed25519",
                "alg": "EdDSA",
                "use": "sig",
                "x": URL_SAFE_NO_PAD.encode(key.verifying_key().to_bytes()),
            }]
        })
    }

    fn token(kid: &str, key: &SigningKey, issuer: &str, audience: &str) -> String {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time")
            .as_secs() as i64;
        signed_token(
            key,
            json!({ "alg": "EdDSA", "kid": kid }),
            json!({
                "sub": "user-1",
                "sid": "session-1",
                "iss": &issuer,
                "aud": audience,
                "amr": ["webauthn"],
                "typ": "access",
                "iat": now,
                "exp": now + 900,
            }),
        )
    }

    fn signed_token(
        key: &SigningKey,
        header: serde_json::Value,
        claims: serde_json::Value,
    ) -> String {
        let header = URL_SAFE_NO_PAD.encode(header.to_string());
        let payload = URL_SAFE_NO_PAD.encode(claims.to_string());
        let input = format!("{header}.{payload}");
        let signature = URL_SAFE_NO_PAD.encode(key.sign(input.as_bytes()).to_bytes());
        format!("{input}.{signature}")
    }

    fn policy() -> JwksCachePolicy {
        JwksCachePolicy {
            refresh_after: Duration::from_secs(300),
            max_stale: Duration::from_secs(900),
            poll_interval: Duration::from_secs(60),
        }
    }

    #[tokio::test]
    async fn layer_injects_a_verified_principal() {
        let key = signing_key(1);
        let (issuer, _) = mock_issuer(jwks_document("current", &key)).await;
        let layer = AuthMiniLayer::from_issuer(&issuer, "api.example.com", policy())
            .await
            .expect("jwks warms");
        let app = Router::new()
            .route(
                "/private",
                get(
                    |Extension(principal): Extension<AuthMiniPrincipal>| async move {
                        principal.subject
                    },
                ),
            )
            .route_layer(layer);
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/private")
                    .header(
                        header::AUTHORIZATION,
                        format!(
                            "Bearer {}",
                            token("current", &key, &issuer, "api.example.com")
                        ),
                    )
                    .body(Body::empty())
                    .expect("request builds"),
            )
            .await
            .expect("request completes");

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn background_warmup_fails_closed_until_the_first_jwks_fetch_succeeds() {
        let key = signing_key(1);
        let (issuer, state) = mock_issuer(jwks_document("current", &key)).await;
        state.lock().await.delay = Duration::from_millis(50);
        let verifier = AuthMiniLayer::from_issuer_background(&issuer, "api.example.com", policy())
            .expect("background warmup starts")
            .verifier();
        let access_token = token("current", &key, &issuer, "api.example.com");

        assert!(matches!(
            verifier.verify(&access_token).await,
            Err(AuthMiniError::JwksUnavailable)
        ));

        tokio::time::timeout(Duration::from_secs(1), async {
            loop {
                if verifier.verify(&access_token).await.is_ok() {
                    break;
                }
                sleep(Duration::from_millis(5)).await;
            }
        })
        .await
        .expect("background warmup completes");
        assert_eq!(state.lock().await.calls, 1);
    }

    #[tokio::test]
    async fn unknown_kid_forces_a_refresh_for_key_rotation() {
        let current = signing_key(1);
        let next = signing_key(2);
        let (issuer, state) = mock_issuer(jwks_document("current", &current)).await;
        let layer = AuthMiniLayer::from_issuer(&issuer, "api.example.com", policy())
            .await
            .expect("jwks warms");
        {
            let mut state = state.lock().await;
            state.document = jwks_document("next", &next);
        }
        let app = Router::new()
            .route("/private", get(|| async { "ok" }))
            .route_layer(layer.clone());
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/private")
                    .header(
                        header::AUTHORIZATION,
                        format!(
                            "Bearer {}",
                            token("next", &next, &issuer, "api.example.com")
                        ),
                    )
                    .body(Body::empty())
                    .expect("request builds"),
            )
            .await
            .expect("request completes");

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(state.lock().await.calls, 2);
    }

    #[tokio::test]
    async fn concurrent_unknown_kid_requests_share_one_rotation_refresh() {
        let current = signing_key(1);
        let next = signing_key(2);
        let (issuer, state) = mock_issuer(jwks_document("current", &current)).await;
        let layer = AuthMiniLayer::from_issuer(&issuer, "api.example.com", policy())
            .await
            .expect("jwks warms");
        {
            let mut state = state.lock().await;
            state.document = jwks_document("next", &next);
            state.delay = Duration::from_millis(25);
        }
        let token = token("next", &next, &issuer, "api.example.com");
        let mut requests = tokio::task::JoinSet::new();
        for _ in 0..16 {
            let verifier = layer.verifier();
            let token = token.clone();
            requests.spawn(async move { verifier.verify(&token).await });
        }
        while let Some(result) = requests.join_next().await {
            assert!(result.expect("request task joins").is_ok());
        }

        assert_eq!(state.lock().await.calls, 2);
    }

    #[tokio::test]
    async fn stale_known_key_survives_a_failed_background_refresh() {
        let key = signing_key(1);
        let (issuer, state) = mock_issuer(jwks_document("current", &key)).await;
        let layer = AuthMiniLayer::from_issuer(
            &issuer,
            "api.example.com",
            JwksCachePolicy {
                refresh_after: Duration::ZERO,
                max_stale: Duration::from_secs(900),
                poll_interval: Duration::from_secs(60),
            },
        )
        .await
        .expect("jwks warms");
        state.lock().await.status = StatusCode::BAD_GATEWAY;
        let app = Router::new()
            .route("/private", get(|| async { "ok" }))
            .route_layer(layer.clone());
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/private")
                    .header(
                        header::AUTHORIZATION,
                        format!(
                            "Bearer {}",
                            token("current", &key, &issuer, "api.example.com")
                        ),
                    )
                    .body(Body::empty())
                    .expect("request builds"),
            )
            .await
            .expect("request completes");

        assert_eq!(response.status(), StatusCode::OK);
        for _ in 0..4 {
            tokio::task::yield_now().await;
        }
        for _ in 0..8 {
            assert!(layer
                .verifier()
                .verify(&token("current", &key, &issuer, "api.example.com"))
                .await
                .is_ok());
        }
        assert_eq!(state.lock().await.calls, 2);
    }

    #[tokio::test(start_paused = true)]
    async fn expired_jwks_cache_rejects_when_refresh_fails() {
        let key = signing_key(1);
        let (issuer, state) = mock_issuer(jwks_document("current", &key)).await;
        let layer = AuthMiniLayer::from_issuer(
            &issuer,
            "api.example.com",
            JwksCachePolicy {
                refresh_after: Duration::ZERO,
                max_stale: Duration::ZERO,
                poll_interval: Duration::from_secs(60),
            },
        )
        .await
        .expect("jwks warms");
        state.lock().await.status = StatusCode::BAD_GATEWAY;
        advance(Duration::from_secs(1)).await;
        let app = Router::new()
            .route("/private", get(|| async { "ok" }))
            .route_layer(layer);
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/private")
                    .header(
                        header::AUTHORIZATION,
                        format!(
                            "Bearer {}",
                            token("current", &key, &issuer, "api.example.com")
                        ),
                    )
                    .body(Body::empty())
                    .expect("request builds"),
            )
            .await
            .expect("request completes");

        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    }

    #[tokio::test(start_paused = true)]
    async fn poller_refreshes_rotated_jwks_before_the_next_request() {
        let current = signing_key(1);
        let next = signing_key(2);
        let (issuer, state) = mock_issuer(jwks_document("current", &current)).await;
        let layer = AuthMiniLayer::from_issuer(
            &issuer,
            "api.example.com",
            JwksCachePolicy {
                refresh_after: Duration::ZERO,
                max_stale: Duration::from_secs(900),
                poll_interval: Duration::from_secs(60),
            },
        )
        .await
        .expect("jwks warms");
        state.lock().await.document = jwks_document("next", &next);
        tokio::task::yield_now().await;
        advance(Duration::from_secs(60)).await;
        for _ in 0..8 {
            tokio::task::yield_now().await;
        }
        let app = Router::new()
            .route("/private", get(|| async { "ok" }))
            .route_layer(layer);
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/private")
                    .header(
                        header::AUTHORIZATION,
                        format!(
                            "Bearer {}",
                            token("next", &next, &issuer, "api.example.com")
                        ),
                    )
                    .body(Body::empty())
                    .expect("request builds"),
            )
            .await
            .expect("request completes");

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(state.lock().await.calls, 2);
    }

    #[tokio::test]
    async fn rejects_the_wrong_issuer_or_audience() {
        let key = signing_key(1);
        let (issuer, _) = mock_issuer(jwks_document("current", &key)).await;
        let layer = AuthMiniLayer::from_issuer(&issuer, "api.example.com", policy())
            .await
            .expect("jwks warms");
        let app = Router::new()
            .route("/private", get(|| async { "ok" }))
            .route_layer(layer);
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/private")
                    .header(
                        header::AUTHORIZATION,
                        format!(
                            "Bearer {}",
                            token("current", &key, &issuer, "other.example.com")
                        ),
                    )
                    .body(Body::empty())
                    .expect("request builds"),
            )
            .await
            .expect("request completes");

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn rejects_tampered_and_critical_access_tokens() {
        let key = signing_key(1);
        let (issuer, _) = mock_issuer(jwks_document("current", &key)).await;
        let verifier = AuthMiniLayer::from_issuer(&issuer, "api.example.com", policy())
            .await
            .expect("jwks warms")
            .verifier();
        let mut tampered = token("current", &key, &issuer, "api.example.com");
        tampered.push('x');
        assert!(matches!(
            verifier.verify(&tampered).await,
            Err(AuthMiniError::InvalidToken)
        ));

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time")
            .as_secs() as i64;
        let critical = signed_token(
            &key,
            json!({ "alg": "EdDSA", "kid": "current", "crit": ["b64"] }),
            json!({
                "sub": "user-1",
                "sid": "session-1",
                "iss": &issuer,
                "aud": "api.example.com",
                "amr": ["webauthn"],
                "typ": "access",
                "iat": now,
                "exp": now + 900,
            }),
        );
        assert!(matches!(
            verifier.verify(&critical).await,
            Err(AuthMiniError::InvalidToken)
        ));

        let wrong_algorithm = signed_token(
            &key,
            json!({ "alg": "none", "kid": "current" }),
            json!({
                "sub": "user-1",
                "sid": "session-1",
                "iss": &issuer,
                "aud": "api.example.com",
                "amr": ["webauthn"],
                "typ": "access",
                "iat": now,
                "exp": now + 900,
            }),
        );
        assert!(matches!(
            verifier.verify(&wrong_algorithm).await,
            Err(AuthMiniError::InvalidToken)
        ));

        for header in [
            json!({ "alg": "EdDSA", "kid": "current", "crit": null }),
            json!({ "alg": "EdDSA", "kid": "current", "b64": false }),
        ] {
            let token = signed_token(
                &key,
                header,
                json!({
                    "sub": "user-1",
                    "sid": "session-1",
                    "iss": &issuer,
                    "aud": "api.example.com",
                    "amr": ["webauthn"],
                    "typ": "access",
                    "iat": now,
                    "exp": now + 900,
                }),
            );
            assert!(matches!(
                verifier.verify(&token).await,
                Err(AuthMiniError::InvalidToken)
            ));
        }

        let invalid_not_before = signed_token(
            &key,
            json!({ "alg": "EdDSA", "kid": "current" }),
            json!({
                "sub": "user-1",
                "sid": "session-1",
                "iss": &issuer,
                "aud": "api.example.com",
                "amr": ["webauthn"],
                "typ": "access",
                "iat": now,
                "exp": now + 900,
                "nbf": "future",
            }),
        );
        assert!(matches!(
            verifier.verify(&invalid_not_before).await,
            Err(AuthMiniError::InvalidToken)
        ));
    }

    #[tokio::test]
    async fn rejects_lifetime_arithmetic_overflow() {
        let key = signing_key(1);
        let (issuer, _) = mock_issuer(jwks_document("current", &key)).await;
        let verifier = AuthMiniLayer::from_issuer(&issuer, "api.example.com", policy())
            .await
            .expect("jwks warms")
            .verifier();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time")
            .as_secs() as i64;
        let overflowing = signed_token(
            &key,
            json!({ "alg": "EdDSA", "kid": "current" }),
            json!({
                "sub": "user-1",
                "sid": "session-1",
                "iss": issuer,
                "aud": "api.example.com",
                "amr": ["webauthn"],
                "typ": "access",
                "iat": i64::MIN,
                "exp": now + 1,
            }),
        );

        assert!(matches!(
            verifier.verify(&overflowing).await,
            Err(AuthMiniError::InvalidToken)
        ));
    }

    #[tokio::test]
    async fn rejects_redirected_or_unusable_jwks() {
        let app = Router::new().route("/jwks", get(|| async { Redirect::temporary("/keys") }));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("mock listener binds");
        let issuer = format!("http://{}", listener.local_addr().expect("mock address"));
        tokio::spawn(async move {
            axum::serve(listener, app).await.expect("mock server runs");
        });
        assert!(
            AuthMiniLayer::from_issuer(&issuer, "api.example.com", policy())
                .await
                .is_err()
        );

        let key = signing_key(1);
        let duplicated = json!({
            "keys": [
                {
                    "kid": "current",
                    "kty": "OKP",
                    "crv": "Ed25519",
                    "alg": "EdDSA",
                    "use": "sig",
                    "x": URL_SAFE_NO_PAD.encode(key.verifying_key().to_bytes()),
                },
                {
                    "kid": "current",
                    "kty": "OKP",
                    "crv": "Ed25519",
                    "alg": "EdDSA",
                    "use": "sig",
                    "x": URL_SAFE_NO_PAD.encode(signing_key(2).verifying_key().to_bytes()),
                }
            ]
        });
        let (issuer, _) = mock_issuer(duplicated).await;
        assert!(
            AuthMiniLayer::from_issuer(&issuer, "api.example.com", policy())
                .await
                .is_err()
        );

        let invalid = json!({
            "keys": [{
                "kid": "",
                "kty": "OKP",
                "crv": "Ed25519",
                "alg": "EdDSA",
                "use": "sig",
                "x": URL_SAFE_NO_PAD.encode(key.verifying_key().to_bytes()),
            }]
        });
        let (issuer, _) = mock_issuer(invalid).await;
        assert!(
            AuthMiniLayer::from_issuer(&issuer, "api.example.com", policy())
                .await
                .is_err()
        );
    }

    #[test]
    fn accepts_only_exact_https_or_numeric_loopback_issuers() {
        assert!(normalize_issuer("https://auth.example.com").is_ok());
        assert!(normalize_issuer("http://127.0.0.1:7777").is_ok());
        assert!(normalize_issuer("http://[::1]:7777").is_ok());
        assert!(normalize_issuer("http://localhost:7777").is_err());
        assert!(normalize_issuer("http://192.0.2.1:7777").is_err());
        assert!(normalize_issuer("https://auth.example.com/tenant").is_err());
        assert!(normalize_issuer("https://auth.example.com?tenant=one").is_err());
    }
}

#[cfg(test)]
mod multi_audience_tests {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};
    use serde_json::json;

    #[test]
    fn principal_accepts_membership_in_a_multi_audience_claim() {
        let key = SigningKey::from_bytes(&[42; 32]);
        let header = json!({"alg":"EdDSA","kid":"test"});
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_secs() as i64;
        let payload = json!({"sub":"user","sid":"session","iss":"https://auth.example.com","aud":["1ex.ntnl.io","linkit.ntnl.io"],"typ":"access","iat":now,"exp":now+60,"amr":["email_otp"]});
        let h = URL_SAFE_NO_PAD.encode(serde_json::to_vec(&header).expect("header"));
        let p = URL_SAFE_NO_PAD.encode(serde_json::to_vec(&payload).expect("payload"));
        let signature = key.sign(format!("{h}.{p}").as_bytes());
        let token = format!("{h}.{p}.{}", URL_SAFE_NO_PAD.encode(signature.to_bytes()));
        let parsed = ParsedToken::parse(&token).expect("token parses");
        let principal = parsed
            .principal("https://auth.example.com", &["linkit.ntnl.io".to_owned()])
            .expect("linkit audience accepted");
        assert_eq!(principal.audience, "linkit.ntnl.io");
        assert_eq!(principal.audiences, vec!["1ex.ntnl.io", "linkit.ntnl.io"]);
        let parsed = ParsedToken::parse(&token).expect("token parses");
        assert!(parsed
            .principal("https://auth.example.com", &["other.ntnl.io".to_owned()])
            .is_err());
    }
}
