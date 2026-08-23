use std::fs;
use std::io;
use std::net::{IpAddr, SocketAddr};
use std::sync::{Arc, Mutex, OnceLock};

use axum::body::{to_bytes, Body};
use axum::extract::{ConnectInfo, Request as AxumRequest, State};
use axum::http::{HeaderValue, StatusCode};
use axum::response::Response as AxumResponse;
use axum::routing::any;
use axum::Router;
use tokio::sync::Semaphore;

use crate::audience::resolve_audiences;
use crate::config::Config;
use crate::db::{initialize_runtime_database, read_app_issuer};
use crate::ed25519::{
    create_credential as create_ed25519_credential, delete_credential as delete_ed25519_credential,
    list_credentials as list_ed25519_credentials, parse_credential_create_request,
    parse_credential_update_request, parse_start_authentication_request,
    parse_verify_authentication_request, start_authentication as start_ed25519_authentication,
    update_credential as update_ed25519_credential,
    verify_authentication as verify_ed25519_authentication, VerifyAuthenticationError,
};
use crate::email_start::{parse_email_start_request, start_email_auth, EmailStartError};
use crate::email_verify::{
    consume_email_verify_otp, parse_email_verify_request, EmailVerifyOutcome,
};
use crate::jwks::{list_admin_keys, list_public_keys, rotate_keys};
use crate::openapi::{read_openapi_json, read_openapi_yaml};
use crate::resources::ResourceMonitor;
#[cfg(test)]
use crate::session::mint_session_tokens;
use crate::session::{
    authenticate_access_token, authorize_passkey_registration, current_user_response,
    logout_peer_session, logout_session, mint_session_tokens_for_audience, parse_refresh_request,
    refresh_session_tokens, require_admin_auth, require_passkey_management_auth,
    require_self_audience, token_json, SessionError,
};
use crate::setup::{
    apply_admin_config, apply_admin_setup, parse_admin_config_request, parse_admin_setup_request,
    read_admin_setup, SetupError,
};
use crate::web_assets::{match_web_asset, WebAsset};
use crate::webauthn::{
    authentication_options as webauthn_authentication_options,
    authentication_verify as webauthn_authentication_verify,
    delete_credential as delete_webauthn_credential, parse_authentication_verify_request,
    parse_options_request, parse_register_verify_request,
    register_options as webauthn_register_options, register_verify as webauthn_register_verify,
    AuthenticationOptionsError, AuthenticationVerifyError, RegisterOptionsError,
    RegisterVerifyError,
};

const CORS_ALLOW_METHODS: &str = "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS";
const CORS_ALLOW_HEADERS: &str = "*";

fn resource_monitor() -> &'static Mutex<ResourceMonitor> {
    static MONITOR: OnceLock<Mutex<ResourceMonitor>> = OnceLock::new();
    MONITOR.get_or_init(|| Mutex::new(ResourceMonitor::new()))
}

pub async fn run_server(config: Config) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(database) = &config.database {
        initialize_runtime_database(&database.db_path)?;
    }

    let listener = tokio::net::TcpListener::bind((config.host.as_str(), config.port)).await?;
    eprintln!(
        "auth-mini rust backend listening on {}:{}",
        config.host, config.port
    );

    axum::serve(
        listener,
        router(config).into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .map_err(Into::into)
}

#[derive(Clone)]
struct AppState {
    config: Arc<Config>,
    blocking_gate: Arc<Semaphore>,
}

fn router(config: Config) -> Router {
    Router::new()
        .route("/healthz", any(axum_request))
        .route("/openapi.yaml", any(axum_request))
        .route("/openapi.json", any(axum_request))
        .route("/admin/setup", any(axum_request))
        .route("/admin/config", any(axum_request))
        .route("/admin/users", any(axum_request))
        .route("/admin/jwks", any(axum_request))
        .route("/admin/jwks/rotate", any(axum_request))
        .route("/admin/database", any(axum_request))
        .route("/admin/resources", any(axum_request))
        .route("/email/start", any(axum_request))
        .route("/email/verify", any(axum_request))
        .route("/session/refresh", any(axum_request))
        .route("/session/logout", any(axum_request))
        .route("/session/{session_id}/logout", any(axum_request))
        .route("/ed25519/credentials", any(axum_request))
        .route("/ed25519/credentials/{credential_id}", any(axum_request))
        .route("/ed25519/start", any(axum_request))
        .route("/ed25519/verify", any(axum_request))
        .route("/webauthn/register/options", any(axum_request))
        .route("/webauthn/register/verify", any(axum_request))
        .route("/webauthn/authenticate/options", any(axum_request))
        .route("/webauthn/authenticate/verify", any(axum_request))
        .route("/me", any(axum_request))
        .route("/jwks", any(axum_request))
        .route("/web", any(axum_request))
        .route("/web/{*path}", any(axum_request))
        .fallback(any(axum_request))
        .with_state(AppState {
            config: Arc::new(config),
            blocking_gate: Arc::new(Semaphore::new(1)),
        })
}

async fn axum_request(
    State(state): State<AppState>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    request: AxumRequest,
) -> AxumResponse {
    let (parts, body) = request.into_parts();
    let body = match to_bytes(body, usize::MAX).await {
        Ok(body) => body,
        Err(_) => return axum_json_error(StatusCode::BAD_REQUEST, "invalid_request"),
    };
    let mut headers = parts
        .headers
        .iter()
        .filter_map(|(name, value)| {
            value
                .to_str()
                .ok()
                .map(|value| (name.as_str().to_string(), value.to_string()))
        })
        .collect::<Vec<_>>();
    headers.push((
        "x-auth-mini-peer-loopback".to_string(),
        peer.ip().is_loopback().to_string(),
    ));
    headers.push(("x-auth-mini-peer-ip".to_string(), peer.ip().to_string()));
    let request = Request {
        method: parts.method.to_string(),
        path: parts
            .uri
            .path_and_query()
            .map(|value| value.as_str().to_string())
            .unwrap_or_else(|| parts.uri.path().to_string()),
        headers,
        body: String::from_utf8_lossy(&body).into_owned(),
    };
    let config = state.config;
    let permit = match state.blocking_gate.acquire_owned().await {
        Ok(permit) => permit,
        Err(_) => return axum_json_error(StatusCode::INTERNAL_SERVER_ERROR, "internal_error"),
    };

    match tokio::task::spawn_blocking(move || {
        let _permit = permit;
        route_request(&request, &config)
    })
    .await
    {
        Ok(Ok(response)) => response.into_axum(),
        Ok(Err(_)) | Err(_) => axum_json_error(StatusCode::INTERNAL_SERVER_ERROR, "internal_error"),
    }
}

fn axum_json_error(status: StatusCode, error: &str) -> AxumResponse {
    let mut response = AxumResponse::new(Body::from(format!(r#"{{"error":"{error}"}}"#)));
    *response.status_mut() = status;
    response.headers_mut().insert(
        "content-type",
        HeaderValue::from_static("application/json; charset=utf-8"),
    );
    response
}

fn route_request(request: &Request, config: &Config) -> io::Result<Response> {
    if request.method == "OPTIONS"
        && request.header("Origin").is_some()
        && request.header("Access-Control-Request-Method").is_some()
    {
        return Ok(Response::empty(204).with_cors(true));
    }

    if request.method == "GET" && request.path == "/healthz" {
        return Ok(cors(request, Response::text(200, "ok")));
    }

    if request.method == "GET" && request.path == "/openapi.yaml" {
        let body = read_openapi_yaml();
        return Ok(cors(
            request,
            Response::new(200, "application/yaml; charset=utf-8", body),
        ));
    }

    if request.method == "GET" && request.path == "/openapi.json" {
        let body = read_openapi_json()?;
        return Ok(cors(request, Response::json_value(200, body)));
    }

    if request.method == "GET" && request.path == "/admin/setup" {
        return handle_admin_setup_get(request, config).map(|response| cors(request, response));
    }

    if request.method == "PUT" && request.path == "/admin/setup" {
        return handle_admin_setup_put(request, config).map(|response| cors(request, response));
    }

    if request.method == "GET" && request.path == "/admin/config" {
        return handle_admin_config_get(request, config).map(|response| cors(request, response));
    }

    if request.method == "PUT" && request.path == "/admin/config" {
        return handle_admin_config_put(request, config).map(|response| cors(request, response));
    }

    if request.method == "GET" && request.path == "/admin/users" {
        return handle_admin_users(request, config).map(|response| cors(request, response));
    }

    if request.method == "GET" && request.path == "/admin/jwks" {
        return handle_admin_jwks(request, config).map(|response| cors(request, response));
    }

    if request.method == "POST" && request.path == "/admin/jwks/rotate" {
        return handle_admin_jwks_rotate(request, config).map(|response| cors(request, response));
    }

    if request.method == "GET" && request.path == "/admin/database" {
        return handle_admin_database(request, config).map(|response| cors(request, response));
    }

    if request.method == "GET" && request.path == "/admin/resources" {
        return handle_admin_resources(request, config).map(|response| cors(request, response));
    }

    if request.method == "GET" {
        if let Some(response) = handle_web_asset(request) {
            return Ok(response);
        }
    }

    if request.method == "POST" && request.path == "/email/start" {
        return handle_email_start(request, config).map(|response| cors(request, response));
    }

    if request.method == "POST" && request.path == "/email/verify" {
        return handle_email_verify(request, config).map(|response| cors(request, response));
    }

    if request.method == "POST" && request.path == "/session/refresh" {
        return handle_session_refresh(request, config).map(|response| cors(request, response));
    }

    if request.method == "POST" && request.path == "/session/logout" {
        return handle_session_logout(request, config).map(|response| cors(request, response));
    }

    if request.method == "POST"
        && request.path.starts_with("/session/")
        && request.path.ends_with("/logout")
    {
        return handle_peer_session_logout(request, config).map(|response| cors(request, response));
    }

    if request.method == "GET" && request.path == "/ed25519/credentials" {
        return handle_ed25519_credentials(request, config).map(|response| cors(request, response));
    }

    if request.method == "POST" && request.path == "/ed25519/credentials" {
        return handle_ed25519_credential_create(request, config)
            .map(|response| cors(request, response));
    }

    if request.method == "POST" && request.path == "/ed25519/start" {
        return handle_ed25519_start(request, config).map(|response| cors(request, response));
    }

    if request.method == "POST" && request.path == "/ed25519/verify" {
        return handle_ed25519_verify(request, config).map(|response| cors(request, response));
    }

    if request.method == "POST" && request.path == "/webauthn/register/options" {
        return handle_webauthn_register_options(request, config)
            .map(|response| cors(request, response));
    }

    if request.method == "POST" && request.path == "/webauthn/register/verify" {
        return handle_webauthn_register_verify(request, config)
            .map(|response| cors(request, response));
    }

    if request.method == "POST" && request.path == "/webauthn/authenticate/options" {
        return handle_webauthn_authentication_options(request, config)
            .map(|response| cors(request, response));
    }

    if request.method == "POST" && request.path == "/webauthn/authenticate/verify" {
        return handle_webauthn_authentication_verify(request, config)
            .map(|response| cors(request, response));
    }

    if request.method == "PATCH" && ed25519_credential_id(request).is_some() {
        return handle_ed25519_credential_update(request, config)
            .map(|response| cors(request, response));
    }

    if request.method == "DELETE" && ed25519_credential_id(request).is_some() {
        return handle_ed25519_credential_delete(request, config)
            .map(|response| cors(request, response));
    }

    if request.method == "DELETE" && webauthn_credential_id(request).is_some() {
        return handle_webauthn_credential_delete(request, config)
            .map(|response| cors(request, response));
    }

    if request.method == "GET" && request.path == "/me" {
        return handle_me(request, config).map(|response| cors(request, response));
    }

    if request.method == "GET" && request.path == "/jwks" {
        return handle_jwks(config).map(|response| cors(request, response));
    }

    Ok(cors(request, Response::json_error(404, "not_found")))
}

fn handle_web_asset(request: &Request) -> Option<Response> {
    match match_web_asset(&request.path)? {
        WebAsset::Redirect => Some(Response::redirect(308, "/web/")),
        WebAsset::Body {
            content_type,
            cache_control,
            body,
        } => Some(
            Response::bytes(200, content_type, body).with_header("cache-control", cache_control),
        ),
        WebAsset::MissingAsset => Some(Response::json_error(404, "not_found")),
    }
}

fn handle_admin_setup_get(request: &Request, config: &Config) -> io::Result<Response> {
    let connection = match admin_setup_connection(request, config)? {
        AdminSetupAccess::Allowed(connection) => connection,
        AdminSetupAccess::Forbidden => {
            return Ok(Response::json_error(403, "admin_setup_forbidden"))
        }
        AdminSetupAccess::NoDatabase => return Ok(Response::json_error(501, "not_implemented")),
    };

    match read_admin_setup(&connection) {
        Ok(state) => Ok(Response::json_value(
            200,
            serde_json::to_value(state).map_err(io::Error::other)?,
        )),
        Err(SetupError::AlreadyInitialized) => Ok(Response::json_error(409, "already_initialized")),
        Err(SetupError::InvalidRequest) => Ok(Response::json_error(400, "invalid_request")),
        Err(SetupError::Database) => Ok(Response::json_error(500, "internal_error")),
    }
}

fn handle_admin_setup_put(request: &Request, config: &Config) -> io::Result<Response> {
    let parsed = match parse_admin_setup_request(&request.body) {
        Ok(parsed) => parsed,
        Err(SetupError::AlreadyInitialized) => {
            return Ok(Response::json_error(409, "already_initialized"))
        }
        Err(SetupError::InvalidRequest) => return Ok(Response::json_error(400, "invalid_request")),
        Err(SetupError::Database) => return Ok(Response::json_error(500, "internal_error")),
    };
    let connection = match admin_setup_connection(request, config)? {
        AdminSetupAccess::Allowed(connection) => connection,
        AdminSetupAccess::Forbidden => {
            return Ok(Response::json_error(403, "admin_setup_forbidden"))
        }
        AdminSetupAccess::NoDatabase => return Ok(Response::json_error(501, "not_implemented")),
    };

    match apply_admin_setup(&connection, &parsed) {
        Ok(state) => Ok(Response::json_value(
            200,
            serde_json::to_value(state).map_err(io::Error::other)?,
        )),
        Err(SetupError::AlreadyInitialized) => Ok(Response::json_error(409, "already_initialized")),
        Err(SetupError::InvalidRequest) => Ok(Response::json_error(400, "invalid_request")),
        Err(SetupError::Database) => Ok(Response::json_error(500, "internal_error")),
    }
}

fn handle_admin_config_get(request: &Request, config: &Config) -> io::Result<Response> {
    let Some((connection, auth)) = authenticated_connection(request, config)? else {
        return Ok(Response::json_error(401, "invalid_access_token"));
    };
    if require_admin_auth(&connection, &auth).is_err() {
        return Ok(Response::json_error(403, "admin_required"));
    }

    match read_admin_setup(&connection) {
        Ok(state) => Ok(Response::json_value(
            200,
            serde_json::to_value(state).map_err(io::Error::other)?,
        )),
        Err(_) => Ok(Response::json_error(500, "internal_error")),
    }
}

fn handle_admin_config_put(request: &Request, config: &Config) -> io::Result<Response> {
    let parsed = match parse_admin_config_request(&request.body) {
        Ok(parsed) => parsed,
        Err(_) => return Ok(Response::json_error(400, "invalid_request")),
    };
    let Some((connection, auth)) = authenticated_connection(request, config)? else {
        return Ok(Response::json_error(401, "invalid_access_token"));
    };
    if require_admin_auth(&connection, &auth).is_err() {
        return Ok(Response::json_error(403, "admin_required"));
    }

    match apply_admin_config(&connection, &parsed) {
        Ok(state) => Ok(Response::json_value(
            200,
            serde_json::to_value(state).map_err(io::Error::other)?,
        )),
        Err(SetupError::InvalidRequest) => Ok(Response::json_error(400, "invalid_request")),
        Err(_) => Ok(Response::json_error(500, "internal_error")),
    }
}

fn handle_admin_users(request: &Request, config: &Config) -> io::Result<Response> {
    let Some((connection, auth)) = authenticated_connection(request, config)? else {
        return Ok(Response::json_error(401, "invalid_access_token"));
    };
    if require_admin_auth(&connection, &auth).is_err() {
        return Ok(Response::json_error(403, "admin_required"));
    }

    let mut statement = connection
        .prepare(
            "SELECT
                users.id,
                users.email,
                users.email_verified_at,
                users.created_at,
                COUNT(DISTINCT sessions.id),
                COUNT(DISTINCT webauthn_credentials.credential_id),
                COUNT(DISTINCT ed25519_credentials.id)
             FROM users
             LEFT JOIN sessions ON sessions.user_id = users.id AND sessions.expires_at > CURRENT_TIMESTAMP
             LEFT JOIN webauthn_credentials ON webauthn_credentials.user_id = users.id
             LEFT JOIN ed25519_credentials ON ed25519_credentials.user_id = users.id
             GROUP BY users.id
             ORDER BY users.created_at DESC, users.id ASC",
        )
        .map_err(io::Error::other)?;
    let rows = statement
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "email": row.get::<_, Option<String>>(1)?,
                "email_verified_at": row.get::<_, Option<String>>(2)?,
                "created_at": row.get::<_, String>(3)?,
                "active_session_count": row.get::<_, i64>(4)?,
                "passkey_count": row.get::<_, i64>(5)?,
                "ed25519_count": row.get::<_, i64>(6)?,
            }))
        })
        .map_err(io::Error::other)?;
    let users = rows
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(io::Error::other)?;

    Ok(Response::json_value(
        200,
        serde_json::json!({ "users": users }),
    ))
}

fn handle_admin_jwks(request: &Request, config: &Config) -> io::Result<Response> {
    let Some((connection, auth)) = authenticated_connection(request, config)? else {
        return Ok(Response::json_error(401, "invalid_access_token"));
    };
    if require_admin_auth(&connection, &auth).is_err() {
        return Ok(Response::json_error(403, "admin_required"));
    }

    list_admin_keys(&connection)
        .map(|body| Response::json_value(200, body))
        .map_err(io::Error::other)
}

fn handle_admin_jwks_rotate(request: &Request, config: &Config) -> io::Result<Response> {
    let Some((mut connection, auth)) = authenticated_connection(request, config)? else {
        return Ok(Response::json_error(401, "invalid_access_token"));
    };
    if require_admin_auth(&connection, &auth).is_err() {
        return Ok(Response::json_error(403, "admin_required"));
    }

    rotate_keys(&mut connection)
        .map(|body| Response::json_value(200, body))
        .map_err(io::Error::other)
}

fn handle_admin_database(request: &Request, config: &Config) -> io::Result<Response> {
    let Some((connection, auth)) = authenticated_connection(request, config)? else {
        return Ok(Response::json_error(401, "invalid_access_token"));
    };
    if require_admin_auth(&connection, &auth).is_err() {
        return Ok(Response::json_error(403, "admin_required"));
    }
    if config.database.is_none() {
        return Ok(Response::json_error(501, "not_implemented"));
    }
    let export_path = std::env::temp_dir().join(format!(
        "auth-mini-export-{}-{}.sqlite",
        std::process::id(),
        auth.session_id
    ));
    let _ = fs::remove_file(&export_path);
    connection
        .execute(
            "VACUUM INTO ?1",
            [export_path
                .to_str()
                .ok_or_else(|| io::Error::other("invalid export path"))?],
        )
        .map_err(io::Error::other)?;
    let bytes = fs::read(&export_path).map_err(io::Error::other)?;
    fs::remove_file(export_path).map_err(io::Error::other)?;

    Ok(Response::bytes(200, "application/octet-stream", bytes))
}

fn handle_admin_resources(request: &Request, config: &Config) -> io::Result<Response> {
    let Some((connection, auth)) = authenticated_connection(request, config)? else {
        return Ok(Response::json_error(401, "invalid_access_token"));
    };
    if require_admin_auth(&connection, &auth).is_err() {
        return Ok(Response::json_error(403, "admin_required"));
    }
    let Some(database) = &config.database else {
        return Ok(Response::json_error(501, "not_implemented"));
    };
    let snapshot = resource_monitor()
        .lock()
        .map_err(|_| io::Error::other("resource monitor unavailable"))?
        .sample(&database.db_path, &connection)?;

    Ok(Response::json_value(
        200,
        serde_json::to_value(snapshot).map_err(io::Error::other)?,
    ))
}

fn admin_setup_connection(request: &Request, config: &Config) -> io::Result<AdminSetupAccess> {
    if request.header("x-auth-mini-peer-loopback").as_deref() != Some("true") {
        return Ok(AdminSetupAccess::Forbidden);
    }
    let Some(database) = &config.database else {
        return Ok(AdminSetupAccess::NoDatabase);
    };

    rusqlite::Connection::open(&database.db_path)
        .map(AdminSetupAccess::Allowed)
        .map_err(io::Error::other)
}

enum AdminSetupAccess {
    Allowed(rusqlite::Connection),
    Forbidden,
    NoDatabase,
}

fn handle_email_start(request: &Request, config: &Config) -> io::Result<Response> {
    let parsed = match parse_email_start_request(&request.body) {
        Ok(parsed) => parsed,
        Err(_) => return Ok(Response::json_error(400, "invalid_request")),
    };
    let Some(database) = &config.database else {
        return Ok(Response::json_error(503, "smtp_not_configured"));
    };

    match start_email_auth(&database.db_path, &parsed) {
        Ok(()) => Ok(Response::json_value(200, serde_json::json!({ "ok": true }))),
        Err(EmailStartError::SmtpNotConfigured) => {
            Ok(Response::json_error(503, "smtp_not_configured"))
        }
        Err(EmailStartError::SmtpTemporarilyUnavailable) => {
            Ok(Response::json_error(503, "smtp_temporarily_unavailable"))
        }
        Err(EmailStartError::Database) => Err(io::Error::other("email start database error")),
    }
}

fn handle_email_verify(request: &Request, config: &Config) -> io::Result<Response> {
    let parsed = match parse_email_verify_request(&request.body) {
        Ok(parsed) => parsed,
        Err(_) => return Ok(Response::json_error(400, "invalid_request")),
    };

    let Some(database) = &config.database else {
        return Ok(Response::json_error(501, "not_implemented"));
    };
    let connection = rusqlite::Connection::open(&database.db_path).map_err(io::Error::other)?;
    let issuer = read_app_issuer(&connection).map_err(io::Error::other)?;
    let audiences = match resolve_audiences(
        &issuer,
        parsed.redirect_uri.as_deref(),
        parsed.aud.as_deref(),
        parsed.audiences.as_deref(),
    ) {
        Ok(audience) => audience,
        Err(_) => return Ok(Response::json_error(400, "invalid_request")),
    };

    match consume_email_verify_otp(&database.db_path, &parsed).map_err(io::Error::other)? {
        EmailVerifyOutcome::InvalidOtp => Ok(Response::json_error(401, "invalid_email_otp")),
        EmailVerifyOutcome::OtpConsumed { user_id } => {
            let pair = mint_session_tokens_for_audience(
                &connection,
                &user_id,
                "email_otp",
                &issuer,
                &audiences,
                request.client_ip().as_deref(),
                request.header("User-Agent").as_deref(),
            )
            .map_err(io::Error::other)?;

            Ok(Response::json_value(200, token_json(pair)))
        }
    }
}

fn handle_session_refresh(request: &Request, config: &Config) -> io::Result<Response> {
    let parsed = match parse_refresh_request(&request.body) {
        Ok(parsed) => parsed,
        Err(_) => return Ok(Response::json_error(400, "invalid_request")),
    };
    let Some(database) = &config.database else {
        return Ok(Response::json_error(501, "not_implemented"));
    };
    let connection = rusqlite::Connection::open(&database.db_path).map_err(io::Error::other)?;
    let issuer = read_app_issuer(&connection).map_err(io::Error::other)?;

    match refresh_session_tokens(&connection, &parsed, &issuer) {
        Ok(pair) => Ok(Response::json_value(200, token_json(pair))),
        Err(SessionError::SessionSuperseded) => Ok(Response::json_error(401, "session_superseded")),
        Err(_) => Ok(Response::json_error(401, "session_invalidated")),
    }
}

fn handle_session_logout(request: &Request, config: &Config) -> io::Result<Response> {
    let Some((connection, auth)) = authenticated_session_connection(request, config)? else {
        return Ok(Response::json_error(401, "invalid_access_token"));
    };
    logout_session(&connection, &auth.session_id).map_err(io::Error::other)?;

    Ok(Response::json_value(200, serde_json::json!({ "ok": true })))
}

fn handle_peer_session_logout(request: &Request, config: &Config) -> io::Result<Response> {
    let Some((connection, auth)) = authenticated_connection(request, config)? else {
        return Ok(Response::json_error(401, "invalid_access_token"));
    };
    if require_passkey_management_auth(&auth).is_err() {
        return Ok(Response::json_error(
            403,
            "insufficient_authentication_method",
        ));
    }
    let target = request
        .path
        .strip_prefix("/session/")
        .and_then(|path| path.strip_suffix("/logout"))
        .unwrap_or_default();

    match logout_peer_session(&connection, &auth, target) {
        Ok(()) => Ok(Response::json_value(200, serde_json::json!({ "ok": true }))),
        Err(SessionError::PeerLogoutSelfTarget) => Ok(Response::json_error(400, "invalid_request")),
        Err(_) => Ok(Response::json_error(401, "session_invalidated")),
    }
}

fn handle_ed25519_credentials(request: &Request, config: &Config) -> io::Result<Response> {
    let Some((connection, auth)) = authenticated_connection(request, config)? else {
        return Ok(Response::json_error(401, "invalid_access_token"));
    };
    if require_passkey_management_auth(&auth).is_err() {
        return Ok(Response::json_error(
            403,
            "insufficient_authentication_method",
        ));
    }
    let body = list_ed25519_credentials(&connection, &auth.user_id).map_err(io::Error::other)?;

    Ok(Response::json_value(200, body))
}

fn handle_ed25519_credential_create(request: &Request, config: &Config) -> io::Result<Response> {
    let parsed = match parse_credential_create_request(&request.body) {
        Ok(parsed) => parsed,
        Err(_) => return Ok(Response::json_error(400, "invalid_ed25519_credential")),
    };
    let Some((connection, auth)) = authenticated_connection(request, config)? else {
        return Ok(Response::json_error(401, "invalid_access_token"));
    };
    if require_passkey_management_auth(&auth).is_err() {
        return Ok(Response::json_error(
            403,
            "insufficient_authentication_method",
        ));
    }
    let body =
        create_ed25519_credential(&connection, &auth.user_id, &parsed).map_err(io::Error::other)?;
    let Some(body) = body else {
        return Ok(Response::json_error(400, "invalid_ed25519_credential"));
    };

    Ok(Response::json_value(200, body))
}

fn handle_ed25519_credential_update(request: &Request, config: &Config) -> io::Result<Response> {
    let parsed = match parse_credential_update_request(&request.body) {
        Ok(parsed) => parsed,
        Err(_) => return Ok(Response::json_error(400, "invalid_request")),
    };
    let Some((connection, auth)) = authenticated_connection(request, config)? else {
        return Ok(Response::json_error(401, "invalid_access_token"));
    };
    if require_passkey_management_auth(&auth).is_err() {
        return Ok(Response::json_error(
            403,
            "insufficient_authentication_method",
        ));
    }
    let credential_id = ed25519_credential_id(request).expect("route ensures credential id");
    let credential = update_ed25519_credential(&connection, credential_id, &auth.user_id, &parsed)
        .map_err(io::Error::other)?;

    match credential {
        Some(body) => Ok(Response::json_value(200, body)),
        None => Ok(Response::json_error(404, "credential_not_found")),
    }
}

fn handle_ed25519_credential_delete(request: &Request, config: &Config) -> io::Result<Response> {
    let Some((connection, auth)) = authenticated_connection(request, config)? else {
        return Ok(Response::json_error(401, "invalid_access_token"));
    };
    if require_passkey_management_auth(&auth).is_err() {
        return Ok(Response::json_error(
            403,
            "insufficient_authentication_method",
        ));
    }
    let credential_id = ed25519_credential_id(request).expect("route ensures credential id");
    let deleted = delete_ed25519_credential(&connection, credential_id, &auth.user_id)
        .map_err(io::Error::other)?;

    if deleted {
        return Ok(Response::json_value(200, serde_json::json!({ "ok": true })));
    }

    Ok(Response::json_error(404, "credential_not_found"))
}

fn handle_webauthn_credential_delete(request: &Request, config: &Config) -> io::Result<Response> {
    let Some((connection, auth)) = authenticated_connection(request, config)? else {
        return Ok(Response::json_error(401, "invalid_access_token"));
    };
    if require_passkey_management_auth(&auth).is_err() {
        return Ok(Response::json_error(
            403,
            "insufficient_authentication_method",
        ));
    }
    let credential_id = webauthn_credential_id(request).expect("route ensures credential id");
    let deleted = delete_webauthn_credential(&connection, credential_id, &auth.user_id)
        .map_err(io::Error::other)?;

    if deleted {
        return Ok(Response::json_value(200, serde_json::json!({ "ok": true })));
    }

    Ok(Response::json_error(404, "credential_not_found"))
}

fn handle_webauthn_register_options(request: &Request, config: &Config) -> io::Result<Response> {
    let Some((connection, auth)) = authenticated_connection(request, config)? else {
        return Ok(Response::json_error(401, "invalid_access_token"));
    };
    match authorize_passkey_registration(&connection, &auth) {
        Ok(_) => {}
        Err(SessionError::InsufficientAuthenticationMethod) => {
            return Ok(Response::json_error(
                403,
                "insufficient_authentication_method",
            ));
        }
        Err(_) => return Ok(Response::json_error(401, "invalid_access_token")),
    }
    let parsed = match parse_options_request(&request.body) {
        Ok(parsed) => parsed,
        Err(_) => return Ok(Response::json_error(400, "invalid_request")),
    };

    match webauthn_register_options(&connection, &auth.user_id, &parsed) {
        Ok(body) => Ok(Response::json_value(200, body)),
        Err(RegisterOptionsError::Request) => Ok(Response::json_error(400, "invalid_request")),
        Err(RegisterOptionsError::WebauthnRegistration) => {
            Ok(Response::json_error(400, "invalid_webauthn_registration"))
        }
        Err(RegisterOptionsError::AccessToken) => {
            Ok(Response::json_error(401, "invalid_access_token"))
        }
    }
}

fn handle_webauthn_register_verify(request: &Request, config: &Config) -> io::Result<Response> {
    let Some((connection, auth)) = authenticated_connection(request, config)? else {
        return Ok(Response::json_error(401, "invalid_access_token"));
    };
    let authorization = match authorize_passkey_registration(&connection, &auth) {
        Ok(authorization) => authorization,
        Err(SessionError::InsufficientAuthenticationMethod) => {
            return Ok(Response::json_error(
                403,
                "insufficient_authentication_method",
            ));
        }
        Err(_) => return Ok(Response::json_error(401, "invalid_access_token")),
    };
    let parsed = match parse_register_verify_request(&request.body) {
        Ok(parsed) => parsed,
        Err(_) => return Ok(Response::json_error(400, "invalid_request")),
    };

    match webauthn_register_verify(&connection, &auth.user_id, &parsed, authorization) {
        Ok(body) => Ok(Response::json_value(200, body)),
        Err(RegisterVerifyError::InsufficientAuthenticationMethod) => Ok(Response::json_error(
            403,
            "insufficient_authentication_method",
        )),
        Err(RegisterVerifyError::InvalidWebauthnRegistration) => {
            Ok(Response::json_error(400, "invalid_webauthn_registration"))
        }
    }
}

fn handle_webauthn_authentication_options(
    request: &Request,
    config: &Config,
) -> io::Result<Response> {
    let parsed = match parse_options_request(&request.body) {
        Ok(parsed) => parsed,
        Err(_) => return Ok(Response::json_error(400, "invalid_request")),
    };
    let Some(database) = &config.database else {
        return Ok(Response::json_error(501, "not_implemented"));
    };
    let connection = rusqlite::Connection::open(&database.db_path).map_err(io::Error::other)?;

    match webauthn_authentication_options(&connection, &parsed) {
        Ok(body) => Ok(Response::json_value(200, body)),
        Err(AuthenticationOptionsError::InvalidRequest) => {
            Ok(Response::json_error(400, "invalid_request"))
        }
        Err(AuthenticationOptionsError::InvalidWebauthnAuthentication) => {
            Ok(Response::json_error(400, "invalid_webauthn_authentication"))
        }
    }
}

fn handle_webauthn_authentication_verify(
    request: &Request,
    config: &Config,
) -> io::Result<Response> {
    let parsed = match parse_authentication_verify_request(&request.body) {
        Ok(parsed) => parsed,
        Err(_) => return Ok(Response::json_error(400, "invalid_request")),
    };
    let Some(database) = &config.database else {
        return Ok(Response::json_error(501, "not_implemented"));
    };
    let connection = rusqlite::Connection::open(&database.db_path).map_err(io::Error::other)?;
    let issuer = read_app_issuer(&connection).map_err(io::Error::other)?;
    let audiences = match resolve_audiences(
        &issuer,
        parsed.redirect_uri.as_deref(),
        parsed.aud.as_deref(),
        parsed.audiences.as_deref(),
    ) {
        Ok(audience) => audience,
        Err(_) => return Ok(Response::json_error(400, "invalid_request")),
    };

    match webauthn_authentication_verify(&connection, &parsed) {
        Ok(outcome) => {
            let pair = mint_session_tokens_for_audience(
                &connection,
                &outcome.user_id,
                "webauthn",
                &issuer,
                &audiences,
                request.client_ip().as_deref(),
                request.header("User-Agent").as_deref(),
            )
            .map_err(io::Error::other)?;

            Ok(Response::json_value(200, token_json(pair)))
        }
        Err(AuthenticationVerifyError::InvalidWebauthnAuthentication) => {
            Ok(Response::json_error(400, "invalid_webauthn_authentication"))
        }
    }
}

fn handle_ed25519_start(request: &Request, config: &Config) -> io::Result<Response> {
    let parsed = match parse_start_authentication_request(&request.body) {
        Ok(parsed) => parsed,
        Err(_) => return Ok(Response::json_error(400, "invalid_request")),
    };
    let Some(database) = &config.database else {
        return Ok(Response::json_error(501, "not_implemented"));
    };
    let connection = rusqlite::Connection::open(&database.db_path).map_err(io::Error::other)?;
    let challenge = start_ed25519_authentication(&connection, &parsed).map_err(io::Error::other)?;

    match challenge {
        Some(body) => Ok(Response::json_value(200, body)),
        None => Ok(Response::json_error(400, "invalid_ed25519_authentication")),
    }
}

fn handle_ed25519_verify(request: &Request, config: &Config) -> io::Result<Response> {
    let parsed = match parse_verify_authentication_request(&request.body) {
        Ok(parsed) => parsed,
        Err(_) => return Ok(Response::json_error(400, "invalid_request")),
    };
    let Some(database) = &config.database else {
        return Ok(Response::json_error(501, "not_implemented"));
    };
    let mut connection = rusqlite::Connection::open(&database.db_path).map_err(io::Error::other)?;
    let issuer = read_app_issuer(&connection).map_err(io::Error::other)?;
    let audiences = match resolve_audiences(
        &issuer,
        parsed.redirect_uri.as_deref(),
        parsed.aud.as_deref(),
        parsed.audiences.as_deref(),
    ) {
        Ok(audience) => audience,
        Err(_) => return Ok(Response::json_error(400, "invalid_request")),
    };

    match verify_ed25519_authentication(
        &mut connection,
        &parsed,
        &issuer,
        &audiences,
        request.client_ip().as_deref(),
        request.header("User-Agent").as_deref(),
    ) {
        Ok(pair) => Ok(Response::json_value(200, token_json(pair))),
        Err(VerifyAuthenticationError::InvalidEd25519Authentication) => {
            Ok(Response::json_error(400, "invalid_ed25519_authentication"))
        }
        Err(VerifyAuthenticationError::Database) => Ok(Response::json_error(500, "internal_error")),
    }
}

fn handle_me(request: &Request, config: &Config) -> io::Result<Response> {
    let Some((connection, auth)) = authenticated_connection(request, config)? else {
        return Ok(Response::json_error(401, "invalid_access_token"));
    };

    match current_user_response(&connection, &auth) {
        Ok(value) => Ok(Response::json_value(200, value)),
        Err(_) => Ok(Response::json_error(401, "invalid_access_token")),
    }
}

fn handle_jwks(config: &Config) -> io::Result<Response> {
    let Some(database) = &config.database else {
        return Ok(Response::json_error(501, "not_implemented"));
    };
    let connection = rusqlite::Connection::open(&database.db_path).map_err(io::Error::other)?;
    let body = list_public_keys(&connection).map_err(io::Error::other)?;

    Ok(Response::json_value(200, body))
}

fn authenticated_connection(
    request: &Request,
    config: &Config,
) -> io::Result<Option<(rusqlite::Connection, crate::session::AuthContext)>> {
    let Some((connection, auth)) = authenticated_session_connection(request, config)? else {
        return Ok(None);
    };
    if require_self_audience(&connection, &auth).is_err() {
        return Ok(None);
    }

    Ok(Some((connection, auth)))
}

fn authenticated_session_connection(
    request: &Request,
    config: &Config,
) -> io::Result<Option<(rusqlite::Connection, crate::session::AuthContext)>> {
    let Some(database) = &config.database else {
        return Ok(None);
    };
    let Some(token) = bearer_token(request) else {
        return Ok(None);
    };
    let connection = rusqlite::Connection::open(&database.db_path).map_err(io::Error::other)?;
    let auth = match authenticate_access_token(&connection, &token) {
        Ok(auth) => auth,
        Err(_) => return Ok(None),
    };

    Ok(Some((connection, auth)))
}

fn bearer_token(request: &Request) -> Option<String> {
    request
        .header("Authorization")
        .and_then(|header| header.strip_prefix("Bearer ").map(str::to_string))
}

fn ed25519_credential_id(request: &Request) -> Option<&str> {
    let credential_id = request.path.strip_prefix("/ed25519/credentials/")?;

    if !credential_id.is_empty() && !credential_id.contains('/') {
        return Some(credential_id);
    }

    None
}

fn webauthn_credential_id(request: &Request) -> Option<&str> {
    let credential_id = request.path.strip_prefix("/webauthn/credentials/")?;

    if !credential_id.is_empty() && !credential_id.contains('/') {
        return Some(credential_id);
    }

    None
}

#[derive(Debug, PartialEq, Eq)]
struct Request {
    method: String,
    path: String,
    headers: Vec<(String, String)>,
    body: String,
}

impl Request {
    fn header(&self, name: &str) -> Option<String> {
        self.headers
            .iter()
            .find(|(key, _)| key.eq_ignore_ascii_case(name))
            .map(|(_, value)| value.clone())
    }

    fn client_ip(&self) -> Option<String> {
        if self.header("x-auth-mini-peer-loopback").as_deref() == Some("true") {
            if let Some(ip) = self.proxy_client_ip() {
                return Some(ip);
            }
        }

        self.header("x-auth-mini-peer-ip")
    }

    fn proxy_client_ip(&self) -> Option<String> {
        self.header("CF-Connecting-IP")
            .or_else(|| self.header("True-Client-IP"))
            .and_then(|value| single_ip(&value))
            .or_else(|| {
                self.header("X-Forwarded-For")
                    .and_then(|value| first_forwarded_ip(&value))
            })
    }
}

fn single_ip(value: &str) -> Option<String> {
    value.trim().parse::<IpAddr>().ok().map(|ip| ip.to_string())
}

fn first_forwarded_ip(value: &str) -> Option<String> {
    value
        .split(',')
        .next()
        .map(str::trim)
        .and_then(|candidate| candidate.parse::<IpAddr>().ok())
        .map(|ip| ip.to_string())
}

#[derive(Debug, PartialEq, Eq)]
struct Response {
    status: u16,
    content_type: &'static str,
    headers: Vec<(&'static str, &'static str)>,
    body: Vec<u8>,
}

impl Response {
    fn new(status: u16, content_type: &'static str, body: String) -> Self {
        Self::bytes(status, content_type, body.into_bytes())
    }

    fn bytes(status: u16, content_type: &'static str, body: Vec<u8>) -> Self {
        Self {
            status,
            content_type,
            headers: Vec::new(),
            body,
        }
    }

    fn redirect(status: u16, location: &'static str) -> Self {
        Self::empty(status).with_header("location", location)
    }

    fn empty(status: u16) -> Self {
        Self::new(status, "text/plain; charset=utf-8", String::new())
    }

    fn json_value(status: u16, value: serde_json::Value) -> Self {
        Self::new(status, "application/json; charset=utf-8", value.to_string())
    }

    fn text(status: u16, body: &str) -> Self {
        Self::new(status, "text/plain; charset=utf-8", body.to_string())
    }

    fn json_error(status: u16, error: &str) -> Self {
        Self::new(
            status,
            "application/json; charset=utf-8",
            format!(r#"{{"error":"{error}"}}"#),
        )
    }

    fn into_axum(self) -> AxumResponse {
        let body_length = self.body.len().to_string();
        let mut response = AxumResponse::new(Body::from(self.body));
        *response.status_mut() =
            StatusCode::from_u16(self.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        response
            .headers_mut()
            .insert("content-type", HeaderValue::from_static(self.content_type));
        if let Ok(value) = HeaderValue::try_from(body_length) {
            response.headers_mut().insert("content-length", value);
        }
        for (name, value) in self.headers {
            response
                .headers_mut()
                .insert(name, HeaderValue::from_static(value));
        }
        response
    }

    #[cfg(test)]
    fn body_text(&self) -> String {
        String::from_utf8_lossy(&self.body).into_owned()
    }

    fn with_header(mut self, name: &'static str, value: &'static str) -> Self {
        self.headers.push((name, value));
        self
    }

    fn with_cors(mut self, include_preflight: bool) -> Self {
        self.headers.push(("access-control-allow-origin", "*"));
        if include_preflight {
            self.headers
                .push(("access-control-allow-methods", CORS_ALLOW_METHODS));
            self.headers
                .push(("access-control-allow-headers", CORS_ALLOW_HEADERS));
        }
        self
    }
}

fn cors(request: &Request, response: Response) -> Response {
    if request.header("Origin").is_some() {
        return response.with_cors(false);
    }

    response
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use crate::db::initialize_runtime_database;
    use axum::body::Body;
    use axum::http::{header, Request as AxumRequest};
    use rusqlite::Connection;
    use tower::ServiceExt;

    use super::*;

    #[test]
    fn client_ip_uses_direct_peer_ip() {
        let request = Request {
            method: "POST".to_string(),
            path: "/email/verify".to_string(),
            headers: vec![(
                "x-auth-mini-peer-ip".to_string(),
                "198.51.100.20".to_string(),
            )],
            body: String::new(),
        };

        assert_eq!(request.client_ip().as_deref(), Some("198.51.100.20"));
    }

    #[test]
    fn client_ip_prefers_cloudflare_connecting_ip_from_loopback_peer() {
        let request = Request {
            method: "POST".to_string(),
            path: "/email/verify".to_string(),
            headers: vec![
                ("x-auth-mini-peer-loopback".to_string(), "true".to_string()),
                ("x-auth-mini-peer-ip".to_string(), "127.0.0.1".to_string()),
                ("CF-Connecting-IP".to_string(), "203.0.113.44".to_string()),
                ("X-Forwarded-For".to_string(), "198.51.100.10".to_string()),
            ],
            body: String::new(),
        };

        assert_eq!(request.client_ip().as_deref(), Some("203.0.113.44"));
    }

    #[test]
    fn client_ip_uses_forwarded_for_from_loopback_peer() {
        let request = Request {
            method: "POST".to_string(),
            path: "/email/verify".to_string(),
            headers: vec![
                ("x-auth-mini-peer-loopback".to_string(), "true".to_string()),
                ("x-auth-mini-peer-ip".to_string(), "127.0.0.1".to_string()),
                (
                    "X-Forwarded-For".to_string(),
                    "203.0.113.45, 198.51.100.10".to_string(),
                ),
            ],
            body: String::new(),
        };

        assert_eq!(request.client_ip().as_deref(), Some("203.0.113.45"));
    }

    #[test]
    fn client_ip_falls_back_to_peer_when_proxy_headers_are_invalid() {
        let request = Request {
            method: "POST".to_string(),
            path: "/email/verify".to_string(),
            headers: vec![
                ("x-auth-mini-peer-loopback".to_string(), "true".to_string()),
                ("x-auth-mini-peer-ip".to_string(), "127.0.0.1".to_string()),
                ("CF-Connecting-IP".to_string(), "unknown".to_string()),
                ("X-Forwarded-For".to_string(), "unknown".to_string()),
            ],
            body: String::new(),
        };

        assert_eq!(request.client_ip().as_deref(), Some("127.0.0.1"));
    }

    #[test]
    fn serves_health_response() {
        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/healthz".to_string(),
                headers: Vec::new(),
                body: String::new(),
            },
            &no_database_config(),
        )
        .expect("health response builds");

        assert_eq!(response, Response::text(200, "ok"));
    }

    #[test]
    fn serves_embedded_openapi_yaml() {
        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/openapi.yaml".to_string(),
                headers: Vec::new(),
                body: String::new(),
            },
            &no_database_config(),
        )
        .expect("openapi yaml response builds");

        assert_eq!(response.status, 200);
        assert_eq!(response.content_type, "application/yaml; charset=utf-8");
        assert!(response.body_text().contains("title: auth-mini HTTP API"));
    }

    #[test]
    fn serves_openapi_json_contract() {
        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/openapi.json".to_string(),
                headers: Vec::new(),
                body: String::new(),
            },
            &Config::default(),
        )
        .expect("json response builds");
        let document: serde_json::Value =
            serde_json::from_str(&response.body_text()).expect("openapi json parses");

        assert_eq!(response.status, 200);
        assert_eq!(document["openapi"], "3.1.0");
        assert!(document["paths"].is_object());
        assert!(document["components"].is_object());
    }

    #[test]
    fn redirects_web_root_to_trailing_slash() {
        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/web".to_string(),
                headers: Vec::new(),
                body: String::new(),
            },
            &no_database_config(),
        )
        .expect("web redirect response builds");

        assert_eq!(response.status, 308);
        assert_eq!(response.headers, vec![("location", "/web/")]);
    }

    #[test]
    fn serves_embedded_web_index_without_long_cache() {
        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/web/?source=test".to_string(),
                headers: Vec::new(),
                body: String::new(),
            },
            &no_database_config(),
        )
        .expect("web index response builds");

        assert_eq!(response.status, 200);
        assert_eq!(response.content_type, "text/html; charset=utf-8");
        assert!(response.headers.contains(&("cache-control", "no-cache")));
        assert!(response.body_text().contains(r#"src="/web/assets/"#));
        assert!(response.body_text().contains(r#"id="root""#));
    }

    #[test]
    fn serves_embedded_web_asset_with_mime_and_immutable_cache() {
        let index = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/web/".to_string(),
                headers: Vec::new(),
                body: String::new(),
            },
            &no_database_config(),
        )
        .expect("web index response builds");
        let index_body = index.body_text();
        let asset_path = index_body
            .split('"')
            .find(|part| part.starts_with("/web/assets/") && part.ends_with(".css"))
            .expect("index references css asset");
        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: format!("{asset_path}?v=1"),
                headers: Vec::new(),
                body: String::new(),
            },
            &no_database_config(),
        )
        .expect("web asset response builds");

        assert_eq!(response.status, 200);
        assert_eq!(response.content_type, "text/css; charset=utf-8");
        assert!(response
            .headers
            .contains(&("cache-control", "public, max-age=31536000, immutable",)));
        assert!(
            response.body_text().contains("@tailwind") || response.body_text().contains(":root")
        );
    }

    #[test]
    fn serves_web_index_for_spa_fallback_but_not_missing_assets() {
        let fallback = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/web/setup".to_string(),
                headers: Vec::new(),
                body: String::new(),
            },
            &no_database_config(),
        )
        .expect("web fallback response builds");
        let missing_asset = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/web/assets/missing.js".to_string(),
                headers: Vec::new(),
                body: String::new(),
            },
            &no_database_config(),
        )
        .expect("web missing asset response builds");

        assert_eq!(fallback.status, 200);
        assert!(fallback.body_text().contains(r#"id="root""#));
        assert_eq!(missing_asset, Response::json_error(404, "not_found"));
    }

    #[test]
    fn public_openapi_routes_are_registered() {
        let routes = [
            ("POST", "/email/start", r#"{"email":"user@example.com"}"#),
            (
                "POST",
                "/email/verify",
                r#"{"email":"user@example.com","code":"123456"}"#,
            ),
            ("GET", "/me", ""),
            (
                "POST",
                "/session/refresh",
                r#"{"session_id":"session-1","refresh_token":"token-1"}"#,
            ),
            ("POST", "/session/logout", ""),
            ("POST", "/session/session-1/logout", ""),
            (
                "POST",
                "/ed25519/start",
                r#"{"public_key":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}"#,
            ),
            (
                "POST",
                "/ed25519/verify",
                r#"{"request_id":"00000000-0000-4000-8000-000000000000","signature":"signature"}"#,
            ),
            ("GET", "/ed25519/credentials", ""),
            (
                "POST",
                "/ed25519/credentials",
                r#"{"name":"Laptop","public_key":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}"#,
            ),
            (
                "PATCH",
                "/ed25519/credentials/credential-1",
                r#"{"name":"Laptop"}"#,
            ),
            ("DELETE", "/ed25519/credentials/credential-1", ""),
            ("POST", "/webauthn/register/options", r#"{}"#),
            (
                "POST",
                "/webauthn/register/verify",
                r#"{"request_id":"00000000-0000-4000-8000-000000000000","credential":{"id":"credential","rawId":"credential","type":"public-key","response":{"clientDataJSON":"client","attestationObject":"attestation"}}}"#,
            ),
            ("POST", "/webauthn/authenticate/options", r#"{}"#),
            (
                "POST",
                "/webauthn/authenticate/verify",
                r#"{"request_id":"00000000-0000-4000-8000-000000000000","credential":{"id":"credential","rawId":"credential","type":"public-key","response":{"clientDataJSON":"client","authenticatorData":"authenticator","signature":"signature"}}}"#,
            ),
            ("DELETE", "/webauthn/credentials/credential-1", ""),
            ("GET", "/jwks", ""),
            ("GET", "/openapi.yaml", ""),
            ("GET", "/openapi.json", ""),
        ];

        for (method, path, body) in routes {
            let response = route_request(
                &Request {
                    method: method.to_string(),
                    path: path.to_string(),
                    headers: Vec::new(),
                    body: body.to_string(),
                },
                &no_database_config(),
            )
            .expect("route response builds");

            assert_ne!(response.status, 404, "{method} {path} must be registered");
        }
    }

    #[test]
    fn email_start_returns_smtp_not_configured_for_valid_request_without_mailer() {
        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/email/start".to_string(),
                headers: Vec::new(),
                body: r#"{"email":"user@example.com"}"#.to_string(),
            },
            &no_database_config(),
        )
        .expect("email start response builds");

        assert_eq!(response, Response::json_error(503, "smtp_not_configured"));
    }

    #[test]
    fn admin_setup_put_creates_admin_user_and_key() {
        let db_path = test_db_path("http-admin-setup");
        initialize_runtime_database(&db_path).expect("database initializes");
        let config = Config {
            database: Some(crate::DatabaseConfig { db_path }),
            ..Config::default()
        };
        let headers = vec![("x-auth-mini-peer-loopback".to_string(), "true".to_string())];

        let put = route_request(
            &Request {
                method: "PUT".to_string(),
                path: "/admin/setup".to_string(),
                headers: headers.clone(),
                body: r#"{"admin_ed25519":{"name":"Admin key","public_key":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}}"#
                    .to_string(),
            },
            &config,
        )
        .expect("admin setup put response builds");

        assert_eq!(put.status, 200);
        assert!(put.body_text().contains("admin_user_id"));
        assert!(put.body_text().contains("Admin key"));

        let get = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/admin/setup".to_string(),
                headers,
                body: String::new(),
            },
            &config,
        )
        .expect("admin setup get response builds");

        assert_eq!(get.status, 200);
        assert!(get.body_text().contains("admin_ed25519"));
    }

    #[test]
    fn admin_setup_rejects_non_loopback_requests() {
        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/admin/setup".to_string(),
                headers: Vec::new(),
                body: String::new(),
            },
            &Config::default(),
        )
        .expect("admin setup response builds");

        assert_eq!(response, Response::json_error(403, "admin_setup_forbidden"));
    }

    #[test]
    fn email_start_rejects_invalid_request_over_http_boundary() {
        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/email/start".to_string(),
                headers: Vec::new(),
                body: r#"{"email":"missing-domain@"}"#.to_string(),
            },
            &no_database_config(),
        )
        .expect("email start response builds");

        assert_eq!(response.status, 400);
        assert_eq!(response.body_text(), r#"{"error":"invalid_request"}"#);
    }

    #[test]
    fn email_verify_without_database_keeps_not_implemented_boundary() {
        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/email/verify".to_string(),
                headers: Vec::new(),
                body: r#"{"email":"user@example.com","code":"123456","redirect_uri":"https://portal.example.com/callback"}"#.to_string(),
            },
            &no_database_config(),
        )
        .expect("email verify response builds");

        assert_eq!(response, Response::json_error(501, "not_implemented"));
    }

    #[test]
    fn email_verify_consumes_otp_and_returns_session_tokens() {
        let db_path = test_db_path("http-consumes-email-otp");
        let connection = Connection::open(&db_path).expect("database opens");
        connection
            .execute_batch(
                "CREATE TABLE email_otps (
                    email TEXT PRIMARY KEY,
                    code_hash TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    consumed_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE,
                    email_verified_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE app_meta (
                    id TEXT PRIMARY KEY CHECK (id = 'APP'),
                    issuer TEXT NOT NULL,
                    rp_id TEXT NOT NULL DEFAULT 'localhost',
                    admin_user_id TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                INSERT INTO app_meta (id, issuer) VALUES ('APP', 'https://auth.example.com');
                CREATE TABLE sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    refresh_token_hash TEXT NOT NULL,
                    auth_method TEXT NOT NULL,
                    audience TEXT NOT NULL DEFAULT '',
                    ip TEXT,
                    user_agent TEXT,
                    expires_at TEXT NOT NULL,
                    revoked_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE jwks_keys (
                    id TEXT PRIMARY KEY CHECK (id IN ('CURRENT', 'STANDBY')),
                    kid TEXT NOT NULL UNIQUE,
                    alg TEXT NOT NULL,
                    public_jwk TEXT NOT NULL,
                    private_jwk TEXT NOT NULL
                );",
            )
            .expect("email_otps table exists");
        connection
            .execute(
                "INSERT INTO email_otps (email, code_hash, expires_at) VALUES (?1, ?2, ?3)",
                (
                    "user@example.com",
                    "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
                    "9999-01-01T00:00:00.000Z",
                ),
            )
            .expect("email otp inserted");
        drop(connection);
        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/email/verify".to_string(),
                headers: vec![
                    ("User-Agent".to_string(), "EmailAgent/1.0".to_string()),
                    (
                        "x-auth-mini-peer-ip".to_string(),
                        "198.51.100.20".to_string(),
                    ),
                ],
                body: r#"{"email":"user@example.com","code":"123456","redirect_uri":"https://portal.example.com/callback"}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path: db_path.clone(),
                }),
                ..Config::default()
            },
        )
        .expect("email verify response builds");

        let connection = Connection::open(db_path).expect("database opens");
        let consumed_at: Option<String> = connection
            .query_row(
                "SELECT consumed_at FROM email_otps WHERE email = ?1",
                ["user@example.com"],
                |row| row.get(0),
            )
            .expect("consumed_at reads");
        let user_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM users WHERE email = ?1 AND email_verified_at IS NOT NULL",
                ["user@example.com"],
                |row| row.get(0),
            )
            .expect("user count reads");
        let session_context: (Option<String>, Option<String>, String) = connection
            .query_row(
                "SELECT ip, user_agent, audience FROM sessions LIMIT 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("session context reads");
        let body: serde_json::Value =
            serde_json::from_str(&response.body_text()).expect("token response parses");
        let payload = crate::jwks::verify_access_token(
            &connection,
            body["access_token"].as_str().expect("access token exists"),
        )
        .expect("email access token verifies");

        assert_eq!(response.status, 200);
        assert!(response.body_text().contains("access_token"));
        assert!(response.body_text().contains("refresh_token"));
        assert!(consumed_at.is_some());
        assert_eq!(user_count, 1);
        assert_eq!(session_context.0.as_deref(), Some("198.51.100.20"));
        assert_eq!(session_context.1.as_deref(), Some("EmailAgent/1.0"));
        assert_eq!(session_context.2, "[\"portal.example.com\"]");
        assert_eq!(payload["aud"], "portal.example.com");
    }

    #[test]
    fn refreshes_session_tokens_over_http_boundary() {
        let db_path = test_db_path("http-refresh-session");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        let pair = mint_session_tokens_for_audience(
            &connection,
            "user-1",
            "email_otp",
            "https://app.example.com",
            &["api.example.com".to_owned()],
            None,
            None,
        )
        .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/session/refresh".to_string(),
                headers: Vec::new(),
                body: format!(
                    r#"{{"session_id":"{}","refresh_token":"{}"}}"#,
                    pair.session_id, pair.refresh_token
                ),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path: db_path.clone(),
                }),
                ..Config::default()
            },
        )
        .expect("refresh response builds");

        assert_eq!(response.status, 200);
        assert!(response.body_text().contains("access_token"));
        assert!(!response.body_text().contains(&pair.refresh_token));
        let body: serde_json::Value =
            serde_json::from_str(&response.body_text()).expect("refresh response parses");
        let connection = Connection::open(&db_path).expect("database reopens");
        let payload = crate::jwks::verify_access_token(
            &connection,
            body["access_token"].as_str().expect("access token exists"),
        )
        .expect("refreshed access token verifies");
        assert_eq!(payload["aud"], "api.example.com");
    }

    #[test]
    fn external_audience_cannot_use_self_apis_but_can_logout_current_session() {
        let db_path = test_db_path("external-audience-self-api-boundary");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        let pair = mint_session_tokens_for_audience(
            &connection,
            "user-1",
            "email_otp",
            "https://app.example.com",
            &["api.example.com".to_owned()],
            None,
            None,
        )
        .expect("external session minted");
        drop(connection);
        let config = Config {
            database: Some(crate::DatabaseConfig { db_path }),
            ..Config::default()
        };
        let authorization = (
            "Authorization".to_string(),
            format!("Bearer {}", pair.access_token),
        );

        for (method, path) in [
            ("GET", "/me"),
            ("GET", "/ed25519/credentials"),
            ("GET", "/admin/jwks"),
        ] {
            let response = route_request(
                &Request {
                    method: method.to_string(),
                    path: path.to_string(),
                    headers: vec![authorization.clone()],
                    body: String::new(),
                },
                &config,
            )
            .expect("self API response builds");
            assert_eq!(response.status, 401, "{path}");
        }

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/session/logout".to_string(),
                headers: vec![authorization],
                body: String::new(),
            },
            &config,
        )
        .expect("logout response builds");
        assert_eq!(response.status, 200);
    }

    #[test]
    fn returns_current_user_from_bearer_token() {
        let db_path = test_db_path("http-me");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/me".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: String::new(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("me response builds");

        assert_eq!(response.status, 200);
        assert!(response.body_text().contains("user@example.com"));
        assert!(response.body_text().contains("active_sessions"));
    }

    #[test]
    fn rejects_peer_logout_without_passkey_management_auth() {
        let db_path = test_db_path("http-peer-logout-rejects-ed25519");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        let pair = mint_session_tokens(&connection, "user-1", "ed25519", "auth-mini", None, None)
            .expect("session minted");
        let peer_pair =
            mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
                .expect("peer session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: format!("/session/{}/logout", peer_pair.session_id),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: String::new(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("peer logout response builds");

        assert_eq!(
            response,
            Response::json_error(403, "insufficient_authentication_method")
        );
    }

    #[test]
    fn rejects_peer_logout_of_current_session_as_invalid_request() {
        let db_path = test_db_path("http-peer-logout-self-target");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: format!("/session/{}/logout", pair.session_id),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: String::new(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("peer logout response builds");

        assert_eq!(response, Response::json_error(400, "invalid_request"));
    }

    #[test]
    fn creates_ed25519_credential_over_http_boundary() {
        let db_path = test_db_path("http-ed25519-credential-create");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/ed25519/credentials".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: r#"{"name":"Laptop","public_key":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}"#
                    .to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path,
                }),
                ..Config::default()
            },
        )
        .expect("ed25519 credential create response builds");
        let body: serde_json::Value =
            serde_json::from_str(&response.body_text()).expect("credential response parses");

        assert_eq!(response.status, 200);
        assert_eq!(body["name"], "Laptop");
        assert_eq!(
            body["public_key"],
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        );
        assert_eq!(body["last_used_at"], serde_json::Value::Null);
    }

    #[test]
    fn rejects_duplicate_ed25519_public_key_over_http_boundary() {
        let db_path = test_db_path("http-ed25519-credential-create-duplicate");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        connection
            .execute(
                "INSERT INTO ed25519_credentials
                 (id, user_id, name, public_key, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                (
                    "credential-1",
                    "user-1",
                    "Existing",
                    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                    "2026-01-01T00:00:00.000Z",
                ),
            )
            .expect("credential inserted");
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/ed25519/credentials".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: r#"{"name":"Duplicate","public_key":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}"#
                    .to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("ed25519 credential create response builds");

        assert_eq!(
            response,
            Response::json_error(400, "invalid_ed25519_credential")
        );
    }

    #[test]
    fn starts_ed25519_authentication_over_http_boundary() {
        let db_path = test_db_path("http-ed25519-start");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        connection
            .execute(
                "INSERT INTO ed25519_credentials
                 (id, user_id, name, public_key, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                (
                    "00000000-0000-4000-8000-000000000000",
                    "user-1",
                    "Laptop",
                    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                    "2026-01-01T00:00:00.000Z",
                ),
            )
            .expect("credential inserted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/ed25519/start".to_string(),
                headers: Vec::new(),
                body: r#"{"public_key":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("ed25519 start response builds");
        let body: serde_json::Value =
            serde_json::from_str(&response.body_text()).expect("start response parses");

        assert_eq!(response.status, 200);
        assert_eq!(body["request_id"].as_str().expect("request id").len(), 36);
        assert_eq!(body["challenge"].as_str().expect("challenge").len(), 64);
    }

    #[test]
    fn rejects_unknown_ed25519_start_credential_over_http_boundary() {
        let db_path = test_db_path("http-ed25519-start-unknown");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/ed25519/start".to_string(),
                headers: Vec::new(),
                body: r#"{"public_key":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("ed25519 start response builds");

        assert_eq!(
            response,
            Response::json_error(400, "invalid_ed25519_authentication")
        );
    }

    #[test]
    fn ed25519_verify_route_reaches_not_implemented_without_database() {
        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/ed25519/verify".to_string(),
                headers: Vec::new(),
                body: r#"{"request_id":"00000000-0000-4000-8000-000000000000","signature":"signature"}"#
                    .to_string(),
            },
            &no_database_config(),
        )
        .expect("ed25519 verify response builds");

        assert_eq!(response, Response::json_error(501, "not_implemented"));
    }

    #[test]
    fn ed25519_verify_rejects_invalid_request_over_http_boundary() {
        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/ed25519/verify".to_string(),
                headers: Vec::new(),
                body: r#"{"request_id":"00000000-0000-4000-8000-000000000000","signature":"signature","extra":true}"#
                    .to_string(),
            },
            &Config::default(),
        )
        .expect("ed25519 verify response builds");

        assert_eq!(response, Response::json_error(400, "invalid_request"));
    }

    #[test]
    fn returns_ed25519_credentials_over_http_boundary() {
        let db_path = test_db_path("http-ed25519-credentials");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        connection
            .execute(
                "INSERT INTO ed25519_credentials
                 (id, user_id, name, public_key, last_used_at, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                (
                    "credential-1",
                    "user-1",
                    "Laptop",
                    "public-key",
                    Some("2026-01-02T00:00:00.000Z"),
                    "2026-01-01T00:00:00.000Z",
                ),
            )
            .expect("credential inserted");
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/ed25519/credentials".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: String::new(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("ed25519 credentials response builds");
        let body: serde_json::Value =
            serde_json::from_str(&response.body_text()).expect("credentials response parses");

        assert_eq!(response.status, 200);
        assert_eq!(body[0]["id"], "credential-1");
        assert_eq!(body[0]["name"], "Laptop");
        assert_eq!(body[0]["public_key"], "public-key");
    }

    #[test]
    fn updates_ed25519_credential_over_http_boundary() {
        let db_path = test_db_path("http-ed25519-credential-update");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        connection
            .execute(
                "INSERT INTO ed25519_credentials
                 (id, user_id, name, public_key, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                (
                    "credential-1",
                    "user-1",
                    "Laptop",
                    "public-key",
                    "2026-01-01T00:00:00.000Z",
                ),
            )
            .expect("credential inserted");
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "PATCH".to_string(),
                path: "/ed25519/credentials/credential-1".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: r#"{"name":"Renamed laptop"}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("ed25519 credential update response builds");
        let body: serde_json::Value =
            serde_json::from_str(&response.body_text()).expect("credential response parses");

        assert_eq!(response.status, 200);
        assert_eq!(body["id"], "credential-1");
        assert_eq!(body["name"], "Renamed laptop");
        assert_eq!(body["public_key"], "public-key");
    }

    #[test]
    fn deletes_ed25519_credential_over_http_boundary() {
        let db_path = test_db_path("http-ed25519-credential-delete");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        connection
            .execute(
                "INSERT INTO ed25519_credentials
                 (id, user_id, name, public_key, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                (
                    "credential-1",
                    "user-1",
                    "Laptop",
                    "public-key",
                    "2026-01-01T00:00:00.000Z",
                ),
            )
            .expect("credential inserted");
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "DELETE".to_string(),
                path: "/ed25519/credentials/credential-1".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: String::new(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("ed25519 credential delete response builds");

        assert_eq!(
            response,
            Response::json_value(200, serde_json::json!({ "ok": true }))
        );
    }

    #[test]
    fn delete_ed25519_credential_returns_not_found_for_other_user() {
        let db_path = test_db_path("http-ed25519-credential-delete-not-found");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        connection
            .execute(
                "INSERT INTO ed25519_credentials
                 (id, user_id, name, public_key, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                (
                    "credential-1",
                    "user-2",
                    "Tablet",
                    "public-key",
                    "2026-01-01T00:00:00.000Z",
                ),
            )
            .expect("credential inserted");
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "DELETE".to_string(),
                path: "/ed25519/credentials/credential-1".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: String::new(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("ed25519 credential delete response builds");

        assert_eq!(response, Response::json_error(404, "credential_not_found"));
    }

    #[test]
    fn deletes_webauthn_credential_over_http_boundary() {
        let db_path = test_db_path("http-webauthn-credential-delete");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        connection
            .execute(
                "INSERT INTO webauthn_credentials
                 (credential_id, user_id, passkey_json, rp_id, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                (
                    "credential-1",
                    "user-1",
                    "{}",
                    "app.example.com",
                    "2026-01-01T00:00:00.000Z",
                ),
            )
            .expect("credential inserted");
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "DELETE".to_string(),
                path: "/webauthn/credentials/credential-1".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: String::new(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path: db_path.clone(),
                }),
                ..Config::default()
            },
        )
        .expect("webauthn credential delete response builds");
        let connection = Connection::open(db_path).expect("database opens");
        let remaining: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM webauthn_credentials WHERE credential_id = ?1",
                ["credential-1"],
                |row| row.get(0),
            )
            .expect("credential count reads");

        assert_eq!(
            response,
            Response::json_value(200, serde_json::json!({ "ok": true }))
        );
        assert_eq!(remaining, 0);
    }

    #[test]
    fn delete_webauthn_credential_returns_not_found_for_other_user() {
        let db_path = test_db_path("http-webauthn-credential-delete-not-found");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        connection
            .execute(
                "INSERT INTO webauthn_credentials
                 (credential_id, user_id, passkey_json, rp_id, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                (
                    "credential-1",
                    "user-2",
                    "{}",
                    "app.example.com",
                    "2026-01-01T00:00:00.000Z",
                ),
            )
            .expect("credential inserted");
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "DELETE".to_string(),
                path: "/webauthn/credentials/credential-1".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: String::new(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("webauthn credential delete response builds");

        assert_eq!(response, Response::json_error(404, "credential_not_found"));
    }

    #[test]
    fn rejects_webauthn_credential_delete_without_passkey_management_auth() {
        let db_path = test_db_path("http-webauthn-credential-delete-rejects-auth-method");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        let pair = mint_session_tokens(&connection, "user-1", "ed25519", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "DELETE".to_string(),
                path: "/webauthn/credentials/credential-1".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: String::new(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("webauthn credential delete response builds");

        assert_eq!(
            response,
            Response::json_error(403, "insufficient_authentication_method")
        );
    }

    #[test]
    fn creates_webauthn_register_options_over_http_boundary() {
        let db_path = test_db_path("http-webauthn-register-options");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/register/options".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: r#"{}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path: db_path.clone(),
                }),
                ..Config::default()
            },
        )
        .expect("webauthn register options response builds");
        let body: serde_json::Value =
            serde_json::from_str(&response.body_text()).expect("options response parses");
        let connection = Connection::open(db_path).expect("database opens");
        let stored: (String, String, String, String) = connection
            .query_row(
                "SELECT type, rp_id, rp_name, origin FROM webauthn_challenges WHERE request_id = ?1",
                [body["request_id"].as_str().expect("request id")],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .expect("challenge reads");

        assert_eq!(response.status, 200);
        assert_eq!(body["publicKey"]["rp"]["id"], "example.com");
        assert_eq!(body["publicKey"]["user"]["name"], "user@example.com");
        assert_eq!(
            body["publicKey"]["authenticatorSelection"],
            serde_json::json!({
                "residentKey": "required",
                "requireResidentKey": true,
                "userVerification": "required"
            })
        );
        assert_eq!(
            body["publicKey"]["extensions"],
            serde_json::json!({ "credProps": true })
        );
        assert_eq!(
            stored,
            (
                "register".to_string(),
                "example.com".to_string(),
                "auth-mini".to_string(),
                "https://app.example.com".to_string()
            )
        );
    }

    #[test]
    fn rejects_webauthn_register_options_without_access_token() {
        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/register/options".to_string(),
                headers: vec![],
                body: r#"{}"#.to_string(),
            },
            &Config::default(),
        )
        .expect("webauthn register options response builds");

        assert_eq!(response.status, 401);
        assert_eq!(response.body_text(), r#"{"error":"invalid_access_token"}"#);
    }

    #[test]
    fn creates_first_webauthn_register_options_for_ed25519_admin_without_email() {
        let db_path = test_db_path("http-webauthn-register-options-first-ed25519");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email) VALUES (?1, NULL)",
                ["admin-user"],
            )
            .expect("admin user inserted");
        connection
            .execute(
                "UPDATE app_meta SET admin_user_id = 'admin-user' WHERE id = 'APP'",
                [],
            )
            .expect("admin user configured");
        let pair = mint_session_tokens(
            &connection,
            "admin-user",
            "ed25519",
            "auth-mini",
            None,
            None,
        )
        .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/register/options".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: r#"{}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("webauthn register options response builds");
        let body: serde_json::Value =
            serde_json::from_str(&response.body_text()).expect("options response parses");

        assert_eq!(response.status, 200);
        assert_eq!(body["publicKey"]["user"]["name"], "admin-user");
    }

    #[test]
    fn rejects_webauthn_register_options_for_ed25519_user_with_passkey() {
        let db_path = test_db_path("http-webauthn-register-options-rejects-auth-method");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        connection
            .execute(
                "INSERT INTO webauthn_credentials
                 (credential_id, user_id, passkey_json, rp_id)
                 VALUES ('existing-passkey', 'user-1', '{}', 'example.com')",
                [],
            )
            .expect("passkey inserted");
        let pair = mint_session_tokens(&connection, "user-1", "ed25519", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/register/options".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: r#"{}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("webauthn register options response builds");

        assert_eq!(response.status, 403);
        assert_eq!(
            response.body_text(),
            r#"{"error":"insufficient_authentication_method"}"#
        );
    }

    #[test]
    fn rejects_webauthn_register_verify_for_ed25519_user_with_passkey() {
        let db_path = test_db_path("http-webauthn-register-verify-rejects-second-ed25519");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        connection
            .execute(
                "INSERT INTO webauthn_credentials
                 (credential_id, user_id, passkey_json, rp_id)
                 VALUES ('existing-passkey', 'user-1', '{}', 'example.com')",
                [],
            )
            .expect("passkey inserted");
        let pair = mint_session_tokens(&connection, "user-1", "ed25519", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/register/verify".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: register_verify_body(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("webauthn register verify response builds");

        assert_eq!(response.status, 403);
        assert_eq!(
            response.body_text(),
            r#"{"error":"insufficient_authentication_method"}"#
        );
    }

    #[test]
    fn webauthn_register_verify_rejects_legacy_state_without_consuming_challenge() {
        let db_path = test_db_path("http-webauthn-register-verify-legacy-state");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        connection
            .execute(
                "INSERT INTO webauthn_challenges
                 (request_id, type, state_json, user_id, expires_at, rp_id, origin)
                 VALUES (?1, 'register', ?2, ?3, ?4, ?5, ?6)",
                (
                    "00000000-0000-4000-8000-000000000000",
                    "challenge",
                    "user-1",
                    "9999-01-01T00:00:00.000Z",
                    "example.com",
                    "https://app.example.com",
                ),
            )
            .expect("challenge inserted");
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/register/verify".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: register_verify_body(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path: db_path.clone(),
                }),
                ..Config::default()
            },
        )
        .expect("webauthn register verify response builds");
        let connection = Connection::open(db_path).expect("database opens");
        let consumed_at: Option<String> = connection
            .query_row(
                "SELECT consumed_at FROM webauthn_challenges WHERE request_id = ?1",
                ["00000000-0000-4000-8000-000000000000"],
                |row| row.get(0),
            )
            .expect("consumed_at reads");

        assert_eq!(response.status, 400);
        assert_eq!(
            response.body_text(),
            r#"{"error":"invalid_webauthn_registration"}"#
        );
        assert!(consumed_at.is_none());
    }

    #[test]
    fn webauthn_register_verify_rejects_explicit_false_cred_props_without_side_effects() {
        for (case_name, client_extension_results) in [
            (
                "false",
                Some(serde_json::json!({ "credProps": { "rk": false } })),
            ),
            (
                "false-with-other-results",
                Some(serde_json::json!({
                    "credProps": { "rk": false },
                    "other": true
                })),
            ),
        ] {
            let db_path = test_db_path(&format!(
                "http-webauthn-register-verify-cred-props-{case_name}"
            ));
            let connection = Connection::open(&db_path).expect("database opens");
            create_auth_schema(&connection);
            connection
                .execute(
                    "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                    ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
                )
                .expect("user inserted");
            connection
                .execute(
                    "INSERT INTO webauthn_challenges
                     (request_id, type, state_json, user_id, expires_at, rp_id, origin)
                     VALUES (?1, 'register', ?2, ?3, ?4, ?5, ?6)",
                    (
                        "00000000-0000-4000-8000-000000000000",
                        "state-not-reached",
                        "user-1",
                        "9999-01-01T00:00:00.000Z",
                        "example.com",
                        "https://app.example.com",
                    ),
                )
                .expect("challenge inserted");
            connection
                .execute(
                    "INSERT INTO webauthn_credentials
                     (credential_id, user_id, passkey_json, rp_id, last_used_at, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    (
                        "existing-credential",
                        "user-1",
                        r#"{"existing":true}"#,
                        "example.com",
                        "2026-01-02T00:00:00.000Z",
                        "2026-01-01T00:00:00.000Z",
                    ),
                )
                .expect("existing credential inserted");
            let before: (String, String, String, String, Option<String>, String) = connection
                .query_row(
                    "SELECT credential_id, user_id, passkey_json, rp_id, last_used_at, created_at
                     FROM webauthn_credentials WHERE credential_id = 'existing-credential'",
                    [],
                    |row| {
                        Ok((
                            row.get(0)?,
                            row.get(1)?,
                            row.get(2)?,
                            row.get(3)?,
                            row.get(4)?,
                            row.get(5)?,
                        ))
                    },
                )
                .expect("existing credential snapshot reads");
            let pair =
                mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
                    .expect("session minted");
            drop(connection);

            let response = route_request(
                &Request {
                    method: "POST".to_string(),
                    path: "/webauthn/register/verify".to_string(),
                    headers: vec![(
                        "Authorization".to_string(),
                        format!("Bearer {}", pair.access_token),
                    )],
                    body: register_verify_body_with_extension_results(client_extension_results),
                },
                &Config {
                    database: Some(crate::DatabaseConfig {
                        db_path: db_path.clone(),
                    }),
                    ..Config::default()
                },
            )
            .expect("webauthn register verify response builds");
            let connection = Connection::open(db_path).expect("database opens");
            let consumed_at: Option<String> = connection
                .query_row(
                    "SELECT consumed_at FROM webauthn_challenges WHERE request_id = ?1",
                    ["00000000-0000-4000-8000-000000000000"],
                    |row| row.get(0),
                )
                .expect("consumed_at reads");
            let after: (String, String, String, String, Option<String>, String) = connection
                .query_row(
                    "SELECT credential_id, user_id, passkey_json, rp_id, last_used_at, created_at
                     FROM webauthn_credentials WHERE credential_id = 'existing-credential'",
                    [],
                    |row| {
                        Ok((
                            row.get(0)?,
                            row.get(1)?,
                            row.get(2)?,
                            row.get(3)?,
                            row.get(4)?,
                            row.get(5)?,
                        ))
                    },
                )
                .expect("existing credential reads");
            let credential_count: i64 = connection
                .query_row("SELECT COUNT(*) FROM webauthn_credentials", [], |row| {
                    row.get(0)
                })
                .expect("credential count reads");

            assert_eq!(response.status, 400, "case: {case_name}");
            assert_eq!(
                response.body_text(),
                r#"{"error":"invalid_webauthn_registration"}"#,
                "case: {case_name}"
            );
            assert!(consumed_at.is_none(), "case: {case_name}");
            assert_eq!(after, before, "case: {case_name}");
            assert_eq!(credential_count, 1, "case: {case_name}");
        }
    }

    #[test]
    fn webauthn_register_verify_rejects_invalid_request_over_http_boundary() {
        let db_path = test_db_path("http-webauthn-register-verify-invalid-request");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/register/verify".to_string(),
                headers: vec![
                    (
                        "Authorization".to_string(),
                        format!("Bearer {}", pair.access_token),
                    ),
                ],
                body: r#"{"request_id":"00000000-0000-4000-8000-000000000000","credential":{"id":"credential-id","rawId":"raw-id","type":"public-key","response":{"clientDataJSON":"client-data","attestationObject":"attestation"}},"extra":true}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path,
                }),
                ..Config::default()
            },
        )
        .expect("webauthn register verify response builds");

        assert_eq!(response.status, 400);
        assert_eq!(response.body_text(), r#"{"error":"invalid_request"}"#);
    }

    #[test]
    fn webauthn_register_verify_rejects_missing_access_token() {
        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/register/verify".to_string(),
                headers: vec![],
                body: register_verify_body(),
            },
            &Config::default(),
        )
        .expect("webauthn register verify response builds");

        assert_eq!(response.status, 401);
        assert_eq!(response.body_text(), r#"{"error":"invalid_access_token"}"#);
    }

    #[test]
    fn webauthn_register_verify_rejects_missing_challenge_over_http_boundary() {
        let db_path = test_db_path("http-webauthn-register-verify-missing-challenge");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/register/verify".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: register_verify_body(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("webauthn register verify response builds");

        assert_eq!(response.status, 400);
        assert_eq!(
            response.body_text(),
            r#"{"error":"invalid_webauthn_registration"}"#
        );
    }

    #[test]
    fn rejects_invalid_webauthn_register_options_request_over_http_boundary() {
        let db_path = test_db_path("http-webauthn-register-options-invalid-request");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/register/options".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: r#"{"extra":true}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("webauthn register options response builds");

        assert_eq!(response.status, 400);
        assert_eq!(response.body_text(), r#"{"error":"invalid_request"}"#);
    }

    #[test]
    fn creates_webauthn_authentication_options_over_http_boundary() {
        let db_path = test_db_path("http-webauthn-authentication-options");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/authenticate/options".to_string(),
                headers: vec![],
                body: r#"{}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path: db_path.clone(),
                }),
                ..Config::default()
            },
        )
        .expect("webauthn authentication options response builds");
        let body: serde_json::Value =
            serde_json::from_str(&response.body_text()).expect("options response parses");
        let connection = Connection::open(db_path).expect("database opens");
        let stored: (String, Option<String>, String, String, String) = connection
            .query_row(
                "SELECT type, user_id, rp_id, rp_name, origin FROM webauthn_challenges WHERE request_id = ?1",
                [body["request_id"].as_str().expect("request id")],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
            )
            .expect("challenge reads");

        assert_eq!(response.status, 200);
        assert_eq!(body["publicKey"]["rpId"], "example.com");
        assert_eq!(body["publicKey"]["timeout"], 300000);
        assert_eq!(body["publicKey"]["userVerification"], "required");
        assert!(body["publicKey"].get("allowCredentials").is_none());
        assert_eq!(stored.0, "authenticate");
        assert_eq!(stored.1, None);
        assert_eq!(stored.2, "example.com");
        assert_eq!(stored.3, "auth-mini");
        assert_eq!(stored.4, "https://app.example.com");
    }

    #[test]
    fn rejects_webauthn_authentication_options_for_invalid_stored_rp_id() {
        let db_path = test_db_path("http-webauthn-authentication-options-bad-origin");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute("UPDATE app_meta SET rp_id = 'login.example.com'", [])
            .expect("app meta updates");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/authenticate/options".to_string(),
                headers: vec![],
                body: r#"{}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("webauthn authentication options response builds");

        assert_eq!(response.status, 400);
        assert_eq!(
            response.body_text(),
            r#"{"error":"invalid_webauthn_authentication"}"#
        );
    }

    #[test]
    fn webauthn_authentication_verify_rejects_legacy_state_without_side_effects() {
        let db_path = test_db_path("http-webauthn-authentication-verify-legacy-state");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO webauthn_challenges
                 (request_id, type, state_json, user_id, expires_at, rp_id, origin)
                 VALUES (?1, 'authenticate', ?2, NULL, ?3, ?4, ?5)",
                (
                    "00000000-0000-4000-8000-000000000000",
                    "challenge",
                    "9999-01-01T00:00:00.000Z",
                    "example.com",
                    "https://app.example.com",
                ),
            )
            .expect("challenge inserted");
        connection
            .execute(
                "INSERT INTO webauthn_credentials
                 (credential_id, user_id, passkey_json, rp_id, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                (
                    "credential-id",
                    "user-1",
                    "{}",
                    "example.com",
                    "2026-01-01T00:00:00.000Z",
                ),
            )
            .expect("credential inserted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/authenticate/verify".to_string(),
                headers: vec![],
                body: authentication_verify_body(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path: db_path.clone(),
                }),
                ..Config::default()
            },
        )
        .expect("webauthn authentication verify response builds");
        let connection = Connection::open(db_path).expect("database opens");
        let stored: (Option<String>, Option<String>) = connection
            .query_row(
                "SELECT c.consumed_at, p.last_used_at
                 FROM webauthn_challenges c, webauthn_credentials p
                 WHERE c.request_id = ?1 AND p.credential_id = ?2",
                ["00000000-0000-4000-8000-000000000000", "credential-id"],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("side effects read");

        assert_eq!(response.status, 400);
        assert_eq!(
            response.body_text(),
            r#"{"error":"invalid_webauthn_authentication"}"#
        );
        assert_eq!(stored, (None, None));
    }

    #[test]
    fn webauthn_authentication_verify_rejects_invalid_request_over_http_boundary() {
        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/authenticate/verify".to_string(),
                headers: vec![],
                body: r#"{"request_id":"00000000-0000-4000-8000-000000000000","credential":{"id":"credential-id","rawId":"raw-id","type":"public-key","response":{"clientDataJSON":"client-data","authenticatorData":"auth-data","signature":"signature"}},"extra":true}"#.to_string(),
            },
            &Config::default(),
        )
        .expect("webauthn authentication verify response builds");

        assert_eq!(response.status, 400);
        assert_eq!(response.body_text(), r#"{"error":"invalid_request"}"#);
    }

    #[test]
    fn webauthn_authentication_verify_rejects_missing_challenge_over_http_boundary() {
        let db_path = test_db_path("http-webauthn-authentication-verify-missing-challenge");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/authenticate/verify".to_string(),
                headers: vec![],
                body: authentication_verify_body(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("webauthn authentication verify response builds");

        assert_eq!(response.status, 400);
        assert_eq!(
            response.body_text(),
            r#"{"error":"invalid_webauthn_authentication"}"#
        );
    }

    #[test]
    fn rejects_ed25519_credentials_without_passkey_management_auth() {
        let db_path = test_db_path("http-ed25519-credentials-rejects-auth-method");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES (?1, ?2, ?3)",
                ("user-1", "user@example.com", "2026-01-01T00:00:00.000Z"),
            )
            .expect("user inserted");
        let pair = mint_session_tokens(&connection, "user-1", "ed25519", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/ed25519/credentials".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: String::new(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("ed25519 credentials response builds");

        assert_eq!(
            response,
            Response::json_error(403, "insufficient_authentication_method")
        );
    }

    #[test]
    fn serves_jwks_over_http_boundary() {
        let db_path = test_db_path("http-jwks");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        drop(connection);

        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/jwks".to_string(),
                headers: Vec::new(),
                body: String::new(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("jwks response builds");

        assert_eq!(response.status, 200);
        assert!(response.body_text().contains("\"keys\""));
        assert!(!response.body_text().contains("\"d\""));
    }

    #[test]
    fn serves_admin_jwk_slots_with_admin_auth() {
        let db_path = test_db_path("http-admin-jwks");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        let pair = mint_session_tokens(
            &connection,
            "admin-user",
            "email_otp",
            "auth-mini",
            None,
            None,
        )
        .expect("session tokens mint");
        connection
            .execute(
                "UPDATE app_meta SET admin_user_id = 'admin-user' WHERE id = 'APP'",
                [],
            )
            .expect("admin user configured");
        drop(connection);

        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/admin/jwks".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: String::new(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("admin jwks response builds");

        assert_eq!(response.status, 200);
        assert!(response.body_text().contains("\"slot\":\"CURRENT\""));
        assert!(response.body_text().contains("\"slot\":\"STANDBY\""));
        assert!(!response.body_text().contains("\"d\""));
    }

    #[test]
    fn serves_system_resources_only_to_the_administrator() {
        let db_path = test_db_path("http-admin-resources");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        let admin_pair = mint_session_tokens(
            &connection,
            "admin-user",
            "email_otp",
            "auth-mini",
            None,
            None,
        )
        .expect("session tokens mint");
        let user_pair =
            mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
                .expect("user session tokens mint");
        connection
            .execute(
                "UPDATE app_meta SET admin_user_id = 'admin-user' WHERE id = 'APP'",
                [],
            )
            .expect("admin user configured");
        drop(connection);
        let config = Config {
            database: Some(crate::DatabaseConfig { db_path }),
            ..Config::default()
        };

        let forbidden = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/admin/resources".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", user_pair.access_token),
                )],
                body: String::new(),
            },
            &config,
        )
        .expect("non-admin resource response builds");
        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/admin/resources".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", admin_pair.access_token),
                )],
                body: String::new(),
            },
            &config,
        )
        .expect("admin resource response builds");

        assert_eq!(forbidden, Response::json_error(403, "admin_required"));
        assert_eq!(response.status, 200);
        assert!(response.body_text().contains("\"cpu\""));
        assert!(response.body_text().contains("\"memory\""));
        assert!(response.body_text().contains("\"sqlite\""));
    }

    #[test]
    fn admin_jwk_rotate_requires_admin_auth() {
        let db_path = test_db_path("http-admin-jwks-auth");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
            .expect("session tokens mint");
        connection
            .execute(
                "UPDATE app_meta SET admin_user_id = 'admin-user' WHERE id = 'APP'",
                [],
            )
            .expect("admin user configured");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/admin/jwks/rotate".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: String::new(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("admin jwks rotate response builds");

        assert_eq!(response, Response::json_error(403, "admin_required"));
    }

    #[test]
    fn rotates_admin_jwks_over_http_boundary() {
        let db_path = test_db_path("http-admin-jwks-rotate");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        let pair = mint_session_tokens(
            &connection,
            "admin-user",
            "email_otp",
            "auth-mini",
            None,
            None,
        )
        .expect("session tokens mint");
        connection
            .execute(
                "UPDATE app_meta SET admin_user_id = 'admin-user' WHERE id = 'APP'",
                [],
            )
            .expect("admin user configured");
        crate::jwks::bootstrap_keys(&connection).expect("keys bootstrap");
        let standby_kid: String = connection
            .query_row(
                "SELECT kid FROM jwks_keys WHERE id = 'STANDBY'",
                [],
                |row| row.get(0),
            )
            .expect("standby kid reads");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/admin/jwks/rotate".to_string(),
                headers: vec![(
                    "Authorization".to_string(),
                    format!("Bearer {}", pair.access_token),
                )],
                body: String::new(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path: db_path.clone(),
                }),
                ..Config::default()
            },
        )
        .expect("admin jwks rotate response builds");
        let connection = Connection::open(&db_path).expect("database opens");
        let current_kid: String = connection
            .query_row(
                "SELECT kid FROM jwks_keys WHERE id = 'CURRENT'",
                [],
                |row| row.get(0),
            )
            .expect("current kid reads");

        assert_eq!(response.status, 200);
        assert_eq!(current_kid, standby_kid);
        assert!(!response.body_text().contains("\"d\""));
    }

    #[test]
    fn applies_wildcard_cors_to_preflight_and_normal_responses() {
        let preflight = route_request(
            &Request {
                method: "OPTIONS".to_string(),
                path: "/email/start".to_string(),
                headers: vec![
                    ("Origin".to_string(), "https://app.example.com".to_string()),
                    (
                        "Access-Control-Request-Method".to_string(),
                        "POST".to_string(),
                    ),
                ],
                body: String::new(),
            },
            &Config::default(),
        )
        .expect("preflight builds");
        let normal = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/healthz".to_string(),
                headers: vec![("Origin".to_string(), "https://app.example.com".to_string())],
                body: String::new(),
            },
            &Config::default(),
        )
        .expect("normal cors builds");

        assert_eq!(preflight.status, 204);
        assert!(preflight
            .headers
            .contains(&("access-control-allow-methods", CORS_ALLOW_METHODS)));
        assert!(preflight
            .headers
            .contains(&("access-control-allow-headers", CORS_ALLOW_HEADERS)));
        assert!(normal
            .headers
            .contains(&("access-control-allow-origin", "*")));
    }

    #[test]
    fn rejects_invalid_email_verify_otp_over_http_boundary() {
        let db_path = test_db_path("http-rejects-email-otp");
        let connection = Connection::open(&db_path).expect("database opens");
        connection
            .execute_batch(
                "CREATE TABLE email_otps (
                    email TEXT PRIMARY KEY,
                    code_hash TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    consumed_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE,
                    email_verified_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE app_meta (
                    id TEXT PRIMARY KEY CHECK (id = 'APP'),
                    issuer TEXT NOT NULL
                );
                INSERT INTO app_meta (id, issuer)
                VALUES ('APP', 'https://auth.example.com');",
            )
            .expect("email_otps table exists");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/email/verify".to_string(),
                headers: Vec::new(),
                body: r#"{"email":"missing@example.com","code":"123456"}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig { db_path }),
                ..Config::default()
            },
        )
        .expect("email verify response builds");

        assert_eq!(response, Response::json_error(401, "invalid_email_otp"));
    }

    #[test]
    fn rejects_invalid_email_verify_request_over_http_boundary() {
        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/email/verify".to_string(),
                headers: Vec::new(),
                body: r#"{"email":"user@example.com","code":"12345"}"#.to_string(),
            },
            &Config::default(),
        )
        .expect("email verify response builds");

        assert_eq!(response, Response::json_error(400, "invalid_request"));
    }

    #[test]
    fn converts_response_to_axum() {
        let response = Response::text(200, "ok").into_axum();

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(response.headers()["content-length"], "2");
        assert_eq!(
            response.headers()["content-type"],
            "text/plain; charset=utf-8"
        );
    }

    #[tokio::test]
    async fn axum_router_preserves_health_and_preflight_contracts() {
        let app = router(no_database_config());
        let peer = ConnectInfo(
            "127.0.0.1:40000"
                .parse::<SocketAddr>()
                .expect("peer parses"),
        );
        let mut health_request = AxumRequest::builder()
            .method("GET")
            .uri("/healthz")
            .body(Body::empty())
            .expect("health request builds");
        health_request.extensions_mut().insert(peer);
        let health = app
            .clone()
            .oneshot(health_request)
            .await
            .expect("health response returns");
        assert_eq!(health.status(), StatusCode::OK);

        let mut preflight_request = AxumRequest::builder()
            .method("OPTIONS")
            .uri("/anything")
            .header(header::ORIGIN, "https://app.example.com")
            .header(header::ACCESS_CONTROL_REQUEST_METHOD, "POST")
            .body(Body::empty())
            .expect("preflight request builds");
        preflight_request.extensions_mut().insert(peer);
        let preflight = app
            .oneshot(preflight_request)
            .await
            .expect("preflight response returns");
        assert_eq!(preflight.status(), StatusCode::NO_CONTENT);
        assert_eq!(preflight.headers()["access-control-allow-origin"], "*");
    }

    fn test_db_path(name: &str) -> PathBuf {
        let directory = PathBuf::from("target/test-dbs");
        std::fs::create_dir_all(&directory).expect("test db directory exists");

        directory.join(format!("{name}-{}.sqlite", std::process::id()))
    }

    fn create_auth_schema(connection: &Connection) {
        connection
            .execute_batch(
                "CREATE TABLE users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE,
                    email_verified_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    refresh_token_hash TEXT NOT NULL,
                    auth_method TEXT NOT NULL,
                    audience TEXT NOT NULL DEFAULT '',
                    ip TEXT,
                    user_agent TEXT,
                    expires_at TEXT NOT NULL,
                    revoked_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE app_meta (
                    id TEXT PRIMARY KEY CHECK (id = 'APP'),
                    issuer TEXT NOT NULL,
                    rp_id TEXT NOT NULL,
                    brand_name TEXT NOT NULL DEFAULT 'auth-mini',
                    brand_background_image TEXT NOT NULL DEFAULT '',
                    admin_user_id TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE jwks_keys (
                    id TEXT PRIMARY KEY CHECK (id IN ('CURRENT', 'STANDBY')),
                    kid TEXT NOT NULL UNIQUE,
                    alg TEXT NOT NULL,
                    public_jwk TEXT NOT NULL,
                    private_jwk TEXT NOT NULL
                );
                CREATE TABLE webauthn_credentials (
                    credential_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    passkey_json TEXT NOT NULL,
                    rp_id TEXT NOT NULL,
                    last_used_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE webauthn_challenges (
                    request_id TEXT PRIMARY KEY,
                    type TEXT NOT NULL CHECK (type IN ('register', 'authenticate')),
                    state_json TEXT NOT NULL,
                    user_id TEXT,
                    expires_at TEXT NOT NULL,
                    rp_id TEXT NOT NULL,
                    rp_name TEXT NOT NULL DEFAULT 'auth-mini',
                    origin TEXT NOT NULL,
                    consumed_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE ed25519_credentials (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    public_key TEXT NOT NULL,
                    last_used_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE ed25519_challenges (
                    request_id TEXT PRIMARY KEY,
                    credential_id TEXT NOT NULL,
                    challenge TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    consumed_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .expect("auth schema exists");
        connection
            .execute(
                "INSERT OR IGNORE INTO app_meta (id, issuer, rp_id) VALUES ('APP', 'https://app.example.com', 'example.com')",
                [],
            )
            .expect("app meta exists");
    }

    fn no_database_config() -> Config {
        Config {
            database: None,
            ..Config::default()
        }
    }

    fn register_verify_body() -> String {
        register_verify_body_with_extension_results(Some(
            serde_json::json!({ "credProps": { "rk": true } }),
        ))
    }

    fn register_verify_body_with_extension_results(
        client_extension_results: Option<serde_json::Value>,
    ) -> String {
        let mut credential = serde_json::json!({
            "id": "credential-id",
            "rawId": "raw-id",
            "type": "public-key",
            "response": {
                "clientDataJSON": "client-data",
                "attestationObject": "attestation"
            }
        });

        if let Some(results) = client_extension_results {
            credential["clientExtensionResults"] = results;
        }

        serde_json::json!({
            "request_id": "00000000-0000-4000-8000-000000000000",
            "credential": credential
        })
        .to_string()
    }

    fn authentication_verify_body() -> String {
        r#"{"request_id":"00000000-0000-4000-8000-000000000000","credential":{"id":"credential-id","rawId":"raw-id","type":"public-key","response":{"clientDataJSON":"client-data","authenticatorData":"auth-data","signature":"signature"}}}"#.to_string()
    }
}
