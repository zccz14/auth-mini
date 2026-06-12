use std::io::{self, BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};

use crate::config::Config;
use crate::db::initialize_runtime_database;
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
use crate::jwks::list_public_keys;
use crate::openapi::{read_openapi_json, read_openapi_yaml};
use crate::session::{
    authenticate_access_token, current_user_response, logout_peer_session, logout_session,
    mint_session_tokens, parse_refresh_request, refresh_session_tokens,
    require_passkey_management_auth, token_json, SessionError,
};
use crate::webauthn::{
    authentication_options as webauthn_authentication_options,
    authentication_verify as webauthn_authentication_verify,
    delete_credential as delete_webauthn_credential, parse_authentication_verify_request,
    parse_options_request, parse_register_verify_request,
    register_options as webauthn_register_options, register_verify as webauthn_register_verify,
    AuthenticationOptionsError, AuthenticationVerifyError, RegisterOptionsError,
    RegisterVerifyError,
};

pub fn run_server(config: Config) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(database) = &config.database {
        initialize_runtime_database(&database.db_path)?;
    }

    let listener = TcpListener::bind((config.host.as_str(), config.port))?;
    eprintln!(
        "auth-mini rust backend listening on {}:{}",
        config.host, config.port
    );

    for stream in listener.incoming() {
        handle_connection(stream?, &config)?;
    }

    Ok(())
}

fn handle_connection(mut stream: TcpStream, config: &Config) -> io::Result<()> {
    let request = read_request(&mut stream)?;
    let response = route_request(&request, config)?;
    stream.write_all(&response.to_http_bytes())
}

fn read_request(stream: &mut TcpStream) -> io::Result<Request> {
    let mut reader = BufReader::new(stream);
    let mut request_line = String::new();
    reader.read_line(&mut request_line)?;
    let mut content_length = 0;
    let mut headers = Vec::new();

    loop {
        let mut line = String::new();
        reader.read_line(&mut line)?;
        if line == "\r\n" || line == "\n" || line.is_empty() {
            break;
        }

        if let Some((name, value)) = line.split_once(':') {
            headers.push((name.trim().to_string(), value.trim().to_string()));
            if name.eq_ignore_ascii_case("content-length") {
                content_length = value.trim().parse().map_err(|_| {
                    io::Error::new(io::ErrorKind::InvalidInput, "invalid content-length")
                })?;
            }
        }
    }

    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or_default().to_string();
    let path = parts.next().unwrap_or_default().to_string();
    let mut body = vec![0; content_length];
    reader.read_exact(&mut body)?;

    Ok(Request {
        method,
        path,
        headers,
        body: String::from_utf8_lossy(&body).into_owned(),
    })
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
        let body = read_openapi_yaml(&config.openapi_path)?;
        return Ok(cors(
            request,
            Response::new(200, "application/yaml; charset=utf-8", body),
        ));
    }

    if request.method == "GET" && request.path == "/openapi.json" {
        let body = read_openapi_json(&config.openapi_path)?;
        return Ok(cors(request, Response::json_value(200, body)));
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

    match consume_email_verify_otp(&database.db_path, &parsed).map_err(io::Error::other)? {
        EmailVerifyOutcome::InvalidOtp => Ok(Response::json_error(401, "invalid_email_otp")),
        EmailVerifyOutcome::OtpConsumed { user_id } => {
            let connection =
                rusqlite::Connection::open(&database.db_path).map_err(io::Error::other)?;
            let pair = mint_session_tokens(
                &connection,
                &user_id,
                "email_otp",
                &config.issuer,
                None,
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

    match refresh_session_tokens(&connection, &parsed, &config.issuer) {
        Ok(pair) => Ok(Response::json_value(200, token_json(pair))),
        Err(SessionError::SessionSuperseded) => Ok(Response::json_error(401, "session_superseded")),
        Err(_) => Ok(Response::json_error(401, "session_invalidated")),
    }
}

fn handle_session_logout(request: &Request, config: &Config) -> io::Result<Response> {
    let Some((connection, auth)) = authenticated_connection(request, config)? else {
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
    if require_passkey_management_auth(&auth).is_err() {
        return Ok(Response::json_error(
            403,
            "insufficient_authentication_method",
        ));
    }
    let parsed = match parse_options_request(&request.body) {
        Ok(parsed) => parsed,
        Err(_) => return Ok(Response::json_error(400, "invalid_request")),
    };
    let Some(origin) = options_request_origin(request) else {
        return Ok(Response::json_error(400, "invalid_webauthn_registration"));
    };

    match webauthn_register_options(&connection, &auth.user_id, &parsed, &origin) {
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
    if require_passkey_management_auth(&auth).is_err() {
        return Ok(Response::json_error(
            403,
            "insufficient_authentication_method",
        ));
    }
    let parsed = match parse_register_verify_request(&request.body) {
        Ok(parsed) => parsed,
        Err(_) => return Ok(Response::json_error(400, "invalid_request")),
    };
    let Some(origin) = options_request_origin(request) else {
        return Ok(Response::json_error(400, "invalid_webauthn_registration"));
    };

    match webauthn_register_verify(&connection, &auth.user_id, &parsed, &origin) {
        Ok(body) => Ok(Response::json_value(200, body)),
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
    let Some(origin) = options_request_origin(request) else {
        return Ok(Response::json_error(400, "invalid_webauthn_authentication"));
    };
    let connection = rusqlite::Connection::open(&database.db_path).map_err(io::Error::other)?;

    match webauthn_authentication_options(&connection, &parsed, &origin) {
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
    let Some(origin) = options_request_origin(request) else {
        return Ok(Response::json_error(400, "invalid_webauthn_authentication"));
    };
    let connection = rusqlite::Connection::open(&database.db_path).map_err(io::Error::other)?;

    match webauthn_authentication_verify(&connection, &parsed, &origin) {
        Ok(outcome) => {
            let pair = mint_session_tokens(
                &connection,
                &outcome.user_id,
                "webauthn",
                &config.issuer,
                None,
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

    match verify_ed25519_authentication(
        &mut connection,
        &parsed,
        &config.issuer,
        None,
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

fn options_request_origin(request: &Request) -> Option<String> {
    if let Some(origin) = request.header("Origin") {
        return Some(origin);
    }

    if request.path.starts_with("http://") || request.path.starts_with("https://") {
        let (scheme, rest) = request.path.split_once("://")?;
        let host = rest.split('/').next()?;

        if !host.is_empty() {
            return Some(format!("{scheme}://{host}"));
        }
    }

    request.header("Host").map(|host| format!("http://{host}"))
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
}

#[derive(Debug, PartialEq, Eq)]
struct Response {
    status: u16,
    content_type: &'static str,
    headers: Vec<(&'static str, &'static str)>,
    body: String,
}

impl Response {
    fn new(status: u16, content_type: &'static str, body: String) -> Self {
        Self {
            status,
            content_type,
            headers: Vec::new(),
            body,
        }
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

    fn to_http_bytes(&self) -> Vec<u8> {
        let reason = reason_phrase(self.status);
        let mut headers = format!(
            "HTTP/1.1 {} {}\r\ncontent-type: {}\r\ncontent-length: {}\r\nconnection: close\r\n\r\n",
            self.status,
            reason,
            self.content_type,
            self.body.len()
        );
        for (name, value) in &self.headers {
            let insert_at = headers.len() - 2;
            headers.insert_str(insert_at, &format!("{name}: {value}\r\n"));
        }
        [headers.as_bytes(), self.body.as_bytes()].concat()
    }

    fn with_cors(mut self, include_preflight: bool) -> Self {
        self.headers.push(("access-control-allow-origin", "*"));
        if include_preflight {
            self.headers.push((
                "access-control-allow-methods",
                "GET, POST, PATCH, DELETE, OPTIONS",
            ));
            self.headers.push((
                "access-control-allow-headers",
                "Authorization, Content-Type",
            ));
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

fn reason_phrase(status: u16) -> &'static str {
    match status {
        200 => "OK",
        204 => "No Content",
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        503 => "Service Unavailable",
        501 => "Not Implemented",
        _ => "Internal Server Error",
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use rusqlite::Connection;

    use super::*;

    #[test]
    fn serves_health_response() {
        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/healthz".to_string(),
                headers: Vec::new(),
                body: String::new(),
            },
            &Config::default(),
        )
        .expect("health response builds");

        assert_eq!(response, Response::text(200, "ok"));
    }

    #[test]
    fn serves_openapi_yaml_from_configured_path() {
        let config = Config {
            openapi_path: PathBuf::from("../openapi.yaml"),
            ..Config::default()
        };
        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/openapi.yaml".to_string(),
                headers: Vec::new(),
                body: String::new(),
            },
            &config,
        )
        .expect("openapi yaml is read");

        assert_eq!(response.status, 200);
        assert_eq!(response.content_type, "application/yaml; charset=utf-8");
        assert!(response.body.contains("title: auth-mini HTTP API"));
    }

    #[test]
    fn serves_openapi_json_contract() {
        let config = Config {
            openapi_path: PathBuf::from("../openapi.yaml"),
            ..Config::default()
        };
        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/openapi.json".to_string(),
                headers: Vec::new(),
                body: String::new(),
            },
            &config,
        )
        .expect("json response builds");
        let document: serde_json::Value =
            serde_json::from_str(&response.body).expect("openapi json parses");

        assert_eq!(response.status, 200);
        assert_eq!(document["openapi"], "3.1.0");
        assert!(document["paths"].is_object());
        assert!(document["components"].is_object());
    }

    #[test]
    fn public_openapi_routes_are_registered() {
        let config = Config {
            openapi_path: PathBuf::from("../openapi.yaml"),
            ..Config::default()
        };
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
                r#"{"credential_id":"00000000-0000-4000-8000-000000000000"}"#,
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
            (
                "POST",
                "/webauthn/register/options",
                r#"{"rp_id":"example.com"}"#,
            ),
            (
                "POST",
                "/webauthn/register/verify",
                r#"{"request_id":"00000000-0000-4000-8000-000000000000","credential":{"id":"credential","rawId":"credential","type":"public-key","response":{"clientDataJSON":"client","attestationObject":"attestation"}}}"#,
            ),
            (
                "POST",
                "/webauthn/authenticate/options",
                r#"{"rp_id":"example.com"}"#,
            ),
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
                &config,
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
            &Config::default(),
        )
        .expect("email start response builds");

        assert_eq!(response, Response::json_error(503, "smtp_not_configured"));
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
            &Config::default(),
        )
        .expect("email start response builds");

        assert_eq!(response.status, 400);
        assert_eq!(response.body, r#"{"error":"invalid_request"}"#);
    }

    #[test]
    fn email_verify_without_database_keeps_not_implemented_boundary() {
        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/email/verify".to_string(),
                headers: Vec::new(),
                body: r#"{"email":"user@example.com","code":"123456"}"#.to_string(),
            },
            &Config::default(),
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
                    email TEXT UNIQUE NOT NULL,
                    email_verified_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    refresh_token_hash TEXT NOT NULL,
                    auth_method TEXT NOT NULL,
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
                headers: vec![("User-Agent".to_string(), "EmailAgent/1.0".to_string())],
                body: r#"{"email":"user@example.com","code":"123456"}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path: db_path.clone(),
                    schema_path: PathBuf::from("../sql/schema.sql"),
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

        assert_eq!(response.status, 200);
        assert!(response.body.contains("access_token"));
        assert!(response.body.contains("refresh_token"));
        assert!(consumed_at.is_some());
        assert_eq!(user_count, 1);
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
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
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
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
                ..Config::default()
            },
        )
        .expect("refresh response builds");

        assert_eq!(response.status, 200);
        assert!(response.body.contains("access_token"));
        assert!(!response.body.contains(&pair.refresh_token));
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
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
                ..Config::default()
            },
        )
        .expect("me response builds");

        assert_eq!(response.status, 200);
        assert!(response.body.contains("user@example.com"));
        assert!(response.body.contains("active_sessions"));
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
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
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
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
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
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
                ..Config::default()
            },
        )
        .expect("ed25519 credential create response builds");
        let body: serde_json::Value =
            serde_json::from_str(&response.body).expect("credential response parses");

        assert_eq!(response.status, 200);
        assert_eq!(body["name"], "Laptop");
        assert_eq!(
            body["public_key"],
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        );
        assert_eq!(body["last_used_at"], serde_json::Value::Null);
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
                    "public-key",
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
                body: r#"{"credential_id":"00000000-0000-4000-8000-000000000000"}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
                ..Config::default()
            },
        )
        .expect("ed25519 start response builds");
        let body: serde_json::Value =
            serde_json::from_str(&response.body).expect("start response parses");

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
                body: r#"{"credential_id":"00000000-0000-4000-8000-000000000000"}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
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
            &Config::default(),
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
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
                ..Config::default()
            },
        )
        .expect("ed25519 credentials response builds");
        let body: serde_json::Value =
            serde_json::from_str(&response.body).expect("credentials response parses");

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
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
                ..Config::default()
            },
        )
        .expect("ed25519 credential update response builds");
        let body: serde_json::Value =
            serde_json::from_str(&response.body).expect("credential response parses");

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
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
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
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
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
                    schema_path: PathBuf::from("../sql/schema.sql"),
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
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
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
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
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
        connection
            .execute(
                "INSERT INTO allowed_origins (origin) VALUES (?1)",
                ["https://app.example.com"],
            )
            .expect("origin inserted");
        let pair = mint_session_tokens(&connection, "user-1", "email_otp", "auth-mini", None, None)
            .expect("session minted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/register/options".to_string(),
                headers: vec![
                    (
                        "Authorization".to_string(),
                        format!("Bearer {}", pair.access_token),
                    ),
                    ("Origin".to_string(), "https://app.example.com".to_string()),
                ],
                body: r#"{"rp_id":"EXAMPLE.COM."}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path: db_path.clone(),
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
                ..Config::default()
            },
        )
        .expect("webauthn register options response builds");
        let body: serde_json::Value =
            serde_json::from_str(&response.body).expect("options response parses");
        let connection = Connection::open(db_path).expect("database opens");
        let stored: (String, String, String) = connection
            .query_row(
                "SELECT type, rp_id, origin FROM webauthn_challenges WHERE request_id = ?1",
                [body["request_id"].as_str().expect("request id")],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("challenge reads");

        assert_eq!(response.status, 200);
        assert_eq!(body["publicKey"]["rp"]["id"], "example.com");
        assert_eq!(body["publicKey"]["user"]["name"], "user@example.com");
        assert_eq!(
            stored,
            (
                "register".to_string(),
                "example.com".to_string(),
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
                headers: vec![("Origin".to_string(), "https://app.example.com".to_string())],
                body: r#"{"rp_id":"app.example.com"}"#.to_string(),
            },
            &Config::default(),
        )
        .expect("webauthn register options response builds");

        assert_eq!(response.status, 401);
        assert_eq!(response.body, r#"{"error":"invalid_access_token"}"#);
    }

    #[test]
    fn rejects_webauthn_register_options_without_passkey_management_auth() {
        let db_path = test_db_path("http-webauthn-register-options-rejects-auth-method");
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
                method: "POST".to_string(),
                path: "/webauthn/register/options".to_string(),
                headers: vec![
                    (
                        "Authorization".to_string(),
                        format!("Bearer {}", pair.access_token),
                    ),
                    ("Origin".to_string(), "https://app.example.com".to_string()),
                ],
                body: r#"{"rp_id":"app.example.com"}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
                ..Config::default()
            },
        )
        .expect("webauthn register options response builds");

        assert_eq!(response.status, 403);
        assert_eq!(
            response.body,
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
                "INSERT INTO allowed_origins (origin) VALUES (?1)",
                ["https://app.example.com"],
            )
            .expect("origin inserted");
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
                headers: vec![
                    (
                        "Authorization".to_string(),
                        format!("Bearer {}", pair.access_token),
                    ),
                    ("Origin".to_string(), "https://app.example.com".to_string()),
                ],
                body: register_verify_body(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path: db_path.clone(),
                    schema_path: PathBuf::from("../sql/schema.sql"),
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
            response.body,
            r#"{"error":"invalid_webauthn_registration"}"#
        );
        assert!(consumed_at.is_none());
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
                    ("Origin".to_string(), "https://app.example.com".to_string()),
                ],
                body: r#"{"request_id":"00000000-0000-4000-8000-000000000000","credential":{"id":"credential-id","rawId":"raw-id","type":"public-key","response":{"clientDataJSON":"client-data","attestationObject":"attestation"}},"extra":true}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
                ..Config::default()
            },
        )
        .expect("webauthn register verify response builds");

        assert_eq!(response.status, 400);
        assert_eq!(response.body, r#"{"error":"invalid_request"}"#);
    }

    #[test]
    fn webauthn_register_verify_rejects_missing_access_token() {
        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/register/verify".to_string(),
                headers: vec![("Origin".to_string(), "https://app.example.com".to_string())],
                body: register_verify_body(),
            },
            &Config::default(),
        )
        .expect("webauthn register verify response builds");

        assert_eq!(response.status, 401);
        assert_eq!(response.body, r#"{"error":"invalid_access_token"}"#);
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
                headers: vec![
                    (
                        "Authorization".to_string(),
                        format!("Bearer {}", pair.access_token),
                    ),
                    ("Origin".to_string(), "https://app.example.com".to_string()),
                ],
                body: register_verify_body(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
                ..Config::default()
            },
        )
        .expect("webauthn register verify response builds");

        assert_eq!(response.status, 400);
        assert_eq!(
            response.body,
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
                headers: vec![
                    (
                        "Authorization".to_string(),
                        format!("Bearer {}", pair.access_token),
                    ),
                    ("Origin".to_string(), "https://app.example.com".to_string()),
                ],
                body: r#"{"rp_id":"app.example.com","extra":true}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
                ..Config::default()
            },
        )
        .expect("webauthn register options response builds");

        assert_eq!(response.status, 400);
        assert_eq!(response.body, r#"{"error":"invalid_request"}"#);
    }

    #[test]
    fn creates_webauthn_authentication_options_over_http_boundary() {
        let db_path = test_db_path("http-webauthn-authentication-options");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO allowed_origins (origin) VALUES (?1)",
                ["https://app.example.com"],
            )
            .expect("origin inserted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/authenticate/options".to_string(),
                headers: vec![("Origin".to_string(), "https://app.example.com".to_string())],
                body: r#"{"rp_id":"EXAMPLE.COM."}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path: db_path.clone(),
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
                ..Config::default()
            },
        )
        .expect("webauthn authentication options response builds");
        let body: serde_json::Value =
            serde_json::from_str(&response.body).expect("options response parses");
        let connection = Connection::open(db_path).expect("database opens");
        let stored: (String, Option<String>, String, String) = connection
            .query_row(
                "SELECT type, user_id, rp_id, origin FROM webauthn_challenges WHERE request_id = ?1",
                [body["request_id"].as_str().expect("request id")],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .expect("challenge reads");

        assert_eq!(response.status, 200);
        assert_eq!(body["publicKey"]["rpId"], "example.com");
        assert_eq!(body["publicKey"]["timeout"], 300000);
        assert_eq!(body["publicKey"]["userVerification"], "preferred");
        assert!(body["publicKey"].get("allowCredentials").is_none());
        assert_eq!(stored.0, "authenticate");
        assert_eq!(stored.1, None);
        assert_eq!(stored.2, "example.com");
        assert_eq!(stored.3, "https://app.example.com");
    }

    #[test]
    fn rejects_webauthn_authentication_options_unallowlisted_origin() {
        let db_path = test_db_path("http-webauthn-authentication-options-bad-origin");
        let connection = Connection::open(&db_path).expect("database opens");
        create_auth_schema(&connection);
        connection
            .execute(
                "INSERT INTO allowed_origins (origin) VALUES (?1)",
                ["https://app.example.com"],
            )
            .expect("origin inserted");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/webauthn/authenticate/options".to_string(),
                headers: vec![("Origin".to_string(), "https://evil.example.com".to_string())],
                body: r#"{"rp_id":"example.com"}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
                ..Config::default()
            },
        )
        .expect("webauthn authentication options response builds");

        assert_eq!(response.status, 400);
        assert_eq!(
            response.body,
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
                "INSERT INTO allowed_origins (origin) VALUES (?1)",
                ["https://app.example.com"],
            )
            .expect("origin inserted");
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
                headers: vec![("Origin".to_string(), "https://app.example.com".to_string())],
                body: authentication_verify_body(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path: db_path.clone(),
                    schema_path: PathBuf::from("../sql/schema.sql"),
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
            response.body,
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
                headers: vec![("Origin".to_string(), "https://app.example.com".to_string())],
                body: r#"{"request_id":"00000000-0000-4000-8000-000000000000","credential":{"id":"credential-id","rawId":"raw-id","type":"public-key","response":{"clientDataJSON":"client-data","authenticatorData":"auth-data","signature":"signature"}},"extra":true}"#.to_string(),
            },
            &Config::default(),
        )
        .expect("webauthn authentication verify response builds");

        assert_eq!(response.status, 400);
        assert_eq!(response.body, r#"{"error":"invalid_request"}"#);
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
                headers: vec![("Origin".to_string(), "https://app.example.com".to_string())],
                body: authentication_verify_body(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
                ..Config::default()
            },
        )
        .expect("webauthn authentication verify response builds");

        assert_eq!(response.status, 400);
        assert_eq!(
            response.body,
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
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
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
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
                ..Config::default()
            },
        )
        .expect("jwks response builds");

        assert_eq!(response.status, 200);
        assert!(response.body.contains("\"keys\""));
        assert!(!response.body.contains("\"d\""));
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
        assert!(preflight.headers.contains(&(
            "access-control-allow-methods",
            "GET, POST, PATCH, DELETE, OPTIONS"
        )));
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
                    email TEXT UNIQUE NOT NULL,
                    email_verified_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
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
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
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
    fn serializes_http_response() {
        let bytes = Response::text(200, "ok").to_http_bytes();
        let text = String::from_utf8(bytes).expect("response is utf8");

        assert!(text.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(text.contains("content-length: 2\r\n"));
        assert!(text.ends_with("\r\n\r\nok"));
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
                    email TEXT UNIQUE NOT NULL,
                    email_verified_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    refresh_token_hash TEXT NOT NULL,
                    auth_method TEXT NOT NULL,
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
                    origin TEXT NOT NULL,
                    consumed_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE allowed_origins (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    origin TEXT NOT NULL UNIQUE,
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
    }

    fn register_verify_body() -> String {
        r#"{"request_id":"00000000-0000-4000-8000-000000000000","credential":{"id":"credential-id","rawId":"raw-id","type":"public-key","response":{"clientDataJSON":"client-data","attestationObject":"attestation"}}}"#.to_string()
    }

    fn authentication_verify_body() -> String {
        r#"{"request_id":"00000000-0000-4000-8000-000000000000","credential":{"id":"credential-id","rawId":"raw-id","type":"public-key","response":{"clientDataJSON":"client-data","authenticatorData":"auth-data","signature":"signature"}}}"#.to_string()
    }
}
