use chrono::{Duration, SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::Deserialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::jwks::sign_access_token;

const ACCESS_TOKEN_SECONDS: i64 = 900;
const REFRESH_TOKEN_SECONDS: i64 = 2_592_000;

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub(crate) struct RefreshRequest {
    pub(crate) session_id: String,
    pub(crate) refresh_token: String,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum SessionError {
    InvalidAccessToken,
    InsufficientAuthenticationMethod,
    SessionInvalidated,
    SessionSuperseded,
    PeerLogoutSelfTarget,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) struct TokenPair {
    pub(crate) session_id: String,
    pub(crate) access_token: String,
    pub(crate) refresh_token: String,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) struct AuthContext {
    pub(crate) user_id: String,
    pub(crate) session_id: String,
    pub(crate) auth_method: String,
}

pub(crate) fn parse_refresh_request(body: &str) -> Result<RefreshRequest, serde_json::Error> {
    let request: RefreshRequest = serde_json::from_str(body)?;

    if is_uuid_like(&request.session_id) && !request.refresh_token.is_empty() {
        return Ok(request);
    }

    Err(serde_json::Error::io(std::io::Error::new(
        std::io::ErrorKind::InvalidInput,
        "invalid refresh request",
    )))
}

pub(crate) fn mint_session_tokens(
    connection: &Connection,
    user_id: &str,
    auth_method: &str,
    issuer: &str,
    ip: Option<&str>,
    user_agent: Option<&str>,
) -> rusqlite::Result<TokenPair> {
    let session_id = random_uuid(connection)?;
    let refresh_token = random_token(connection)?;
    let refresh_token_hash = hash_value(&refresh_token);
    let expires_at = (Utc::now() + Duration::seconds(REFRESH_TOKEN_SECONDS))
        .to_rfc3339_opts(SecondsFormat::Millis, true);

    connection.execute(
        "INSERT INTO sessions (id, user_id, refresh_token_hash, auth_method, ip, user_agent, expires_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![session_id, user_id, refresh_token_hash, auth_method, ip, user_agent, expires_at],
    )?;

    let access_token = sign_access_token(connection, user_id, &session_id, issuer, auth_method)?;

    Ok(TokenPair {
        session_id,
        access_token,
        refresh_token,
    })
}

pub(crate) fn refresh_session_tokens(
    connection: &Connection,
    request: &RefreshRequest,
    issuer: &str,
) -> Result<TokenPair, SessionError> {
    let now = now_text();
    let Some(session) = get_session(connection, &request.session_id)
        .map_err(|_| SessionError::SessionInvalidated)?
    else {
        return Err(SessionError::SessionInvalidated);
    };

    if session.expires_at <= now {
        return Err(SessionError::SessionInvalidated);
    }

    if session.refresh_token_hash != hash_value(&request.refresh_token) {
        return Err(SessionError::SessionSuperseded);
    }

    let refresh_token = random_token(connection).map_err(|_| SessionError::SessionInvalidated)?;
    let refresh_token_hash = hash_value(&refresh_token);
    let expires_at = (Utc::now() + Duration::seconds(REFRESH_TOKEN_SECONDS))
        .to_rfc3339_opts(SecondsFormat::Millis, true);
    let changed = connection
        .execute(
            "UPDATE sessions SET refresh_token_hash = ?1, expires_at = ?2
             WHERE id = ?3 AND refresh_token_hash = ?4 AND expires_at > ?5",
            params![
                refresh_token_hash,
                expires_at,
                request.session_id,
                session.refresh_token_hash,
                now,
            ],
        )
        .map_err(|_| SessionError::SessionInvalidated)?;

    if changed == 0 {
        return Err(SessionError::SessionSuperseded);
    }

    let access_token = sign_access_token(
        connection,
        &session.user_id,
        &session.id,
        issuer,
        &session.auth_method,
    )
    .map_err(|_| SessionError::SessionInvalidated)?;

    Ok(TokenPair {
        session_id: session.id,
        access_token,
        refresh_token,
    })
}

pub(crate) fn authenticate_access_token(
    connection: &Connection,
    token: &str,
) -> Result<AuthContext, SessionError> {
    let payload = crate::jwks::verify_access_token(connection, token)
        .map_err(|_| SessionError::InvalidAccessToken)?;
    let user_id = payload
        .get("sub")
        .and_then(Value::as_str)
        .ok_or(SessionError::InvalidAccessToken)?;
    let session_id = payload
        .get("sid")
        .and_then(Value::as_str)
        .ok_or(SessionError::InvalidAccessToken)?;
    let Some(session) =
        get_session(connection, session_id).map_err(|_| SessionError::InvalidAccessToken)?
    else {
        return Err(SessionError::InvalidAccessToken);
    };

    if session.expires_at <= now_text() || session.user_id != user_id {
        return Err(SessionError::InvalidAccessToken);
    }

    Ok(AuthContext {
        user_id: user_id.to_string(),
        session_id: session_id.to_string(),
        auth_method: session.auth_method,
    })
}

pub(crate) fn require_passkey_management_auth(auth: &AuthContext) -> Result<(), SessionError> {
    if auth.auth_method == "email_otp" || auth.auth_method == "webauthn" {
        return Ok(());
    }

    Err(SessionError::InsufficientAuthenticationMethod)
}

pub(crate) fn logout_session(connection: &Connection, session_id: &str) -> rusqlite::Result<()> {
    connection.execute(
        "UPDATE sessions SET expires_at = ?1 WHERE id = ?2 AND expires_at > ?1",
        params![now_text(), session_id],
    )?;

    Ok(())
}

pub(crate) fn logout_peer_session(
    connection: &Connection,
    auth: &AuthContext,
    target_session_id: &str,
) -> Result<(), SessionError> {
    if target_session_id == auth.session_id {
        return Err(SessionError::PeerLogoutSelfTarget);
    }

    connection
        .execute(
            "UPDATE sessions SET expires_at = ?1
             WHERE id = ?2 AND user_id = ?3 AND expires_at > ?1 AND id <> ?4",
            params![now_text(), target_session_id, auth.user_id, auth.session_id],
        )
        .map_err(|_| SessionError::SessionInvalidated)?;

    Ok(())
}

pub(crate) fn current_user_response(
    connection: &Connection,
    auth: &AuthContext,
) -> Result<Value, SessionError> {
    let user = connection
        .query_row(
            "SELECT id, email FROM users WHERE id = ?1 LIMIT 1",
            [&auth.user_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?)),
        )
        .optional()
        .map_err(|_| SessionError::InvalidAccessToken)?;
    let Some((user_id, email)) = user else {
        return Err(SessionError::InvalidAccessToken);
    };

    let active_sessions =
        list_active_sessions(connection, &user_id).map_err(|_| SessionError::InvalidAccessToken)?;

    let webauthn_credentials = list_webauthn_credentials(connection, &user_id)
        .map_err(|_| SessionError::InvalidAccessToken)?;
    let ed25519_credentials = list_ed25519_credentials(connection, &user_id)
        .map_err(|_| SessionError::InvalidAccessToken)?;

    Ok(json!({
        "user_id": user_id,
        "email": email,
        "webauthn_credentials": webauthn_credentials,
        "ed25519_credentials": ed25519_credentials,
        "active_sessions": active_sessions,
    }))
}

fn list_webauthn_credentials(
    connection: &Connection,
    user_id: &str,
) -> rusqlite::Result<Vec<Value>> {
    let mut statement = connection.prepare(
        "SELECT credential_id, rp_id, last_used_at, created_at
         FROM webauthn_credentials WHERE user_id = ?1 ORDER BY created_at ASC, credential_id ASC",
    )?;
    let rows = statement.query_map([user_id], |row| {
        Ok(json!({
            "id": row.get::<_, String>(0)?,
            "credential_id": row.get::<_, String>(0)?,
            "transports": [],
            "rp_id": row.get::<_, String>(1)?,
            "last_used_at": row.get::<_, Option<String>>(2)?,
            "created_at": row.get::<_, String>(3)?,
        }))
    })?;

    rows.collect()
}

fn list_ed25519_credentials(
    connection: &Connection,
    user_id: &str,
) -> rusqlite::Result<Vec<Value>> {
    let mut statement = connection.prepare(
        "SELECT id, name, public_key, last_used_at, created_at
         FROM ed25519_credentials WHERE user_id = ?1 ORDER BY created_at ASC, id ASC",
    )?;
    let rows = statement.query_map([user_id], |row| {
        Ok(json!({
            "id": row.get::<_, String>(0)?,
            "name": row.get::<_, String>(1)?,
            "public_key": row.get::<_, String>(2)?,
            "last_used_at": row.get::<_, Option<String>>(3)?,
            "created_at": row.get::<_, String>(4)?,
        }))
    })?;

    rows.collect()
}

fn list_active_sessions(connection: &Connection, user_id: &str) -> rusqlite::Result<Vec<Value>> {
    let now = now_text();
    let mut statement = connection.prepare(
        "SELECT id, auth_method, ip, user_agent, expires_at, created_at
         FROM sessions WHERE user_id = ?1 AND expires_at > ?2 ORDER BY created_at ASC, id ASC",
    )?;
    let rows = statement.query_map(params![user_id, now], |row| {
        Ok(json!({
            "id": row.get::<_, String>(0)?,
            "auth_method": row.get::<_, String>(1)?,
            "ip": row.get::<_, Option<String>>(2)?,
            "user_agent": row.get::<_, Option<String>>(3)?,
            "expires_at": row.get::<_, String>(4)?,
            "created_at": row.get::<_, String>(5)?,
        }))
    })?;

    rows.collect()
}

#[derive(Debug, PartialEq, Eq)]
struct SessionRow {
    id: String,
    user_id: String,
    refresh_token_hash: String,
    auth_method: String,
    expires_at: String,
}

fn get_session(connection: &Connection, session_id: &str) -> rusqlite::Result<Option<SessionRow>> {
    connection
        .query_row(
            "SELECT id, user_id, refresh_token_hash, auth_method, expires_at
             FROM sessions WHERE id = ?1 LIMIT 1",
            [session_id],
            |row| {
                Ok(SessionRow {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    refresh_token_hash: row.get(2)?,
                    auth_method: row.get(3)?,
                    expires_at: row.get(4)?,
                })
            },
        )
        .optional()
}

pub(crate) fn token_json(pair: TokenPair) -> Value {
    json!({
        "session_id": pair.session_id,
        "access_token": pair.access_token,
        "token_type": "Bearer",
        "expires_in": ACCESS_TOKEN_SECONDS,
        "refresh_token": pair.refresh_token,
    })
}

pub(crate) fn hash_value(value: &str) -> String {
    let digest = Sha256::digest(value.as_bytes());
    digest.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn random_uuid(connection: &Connection) -> rusqlite::Result<String> {
    connection.query_row(
        "SELECT lower(hex(randomblob(4))) || '-' ||
                lower(hex(randomblob(2))) || '-' ||
                '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
                substr('89ab', (random() & 3) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
                lower(hex(randomblob(6)))",
        [],
        |row| row.get(0),
    )
}

fn random_token(connection: &Connection) -> rusqlite::Result<String> {
    connection.query_row("SELECT lower(hex(randomblob(32)))", [], |row| row.get(0))
}

fn now_text() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn is_uuid_like(value: &str) -> bool {
    value.len() == 36
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_refresh_request_contract() {
        let request = parse_refresh_request(
            r#"{"session_id":"00000000-0000-4000-8000-000000000000","refresh_token":"token"}"#,
        )
        .expect("refresh request parses");

        assert_eq!(request.session_id, "00000000-0000-4000-8000-000000000000");
        assert_eq!(request.refresh_token, "token");
    }

    #[test]
    fn rejects_unknown_refresh_request_fields() {
        parse_refresh_request(
            r#"{"session_id":"00000000-0000-4000-8000-000000000000","refresh_token":"token","extra":true}"#,
        )
        .expect_err("unknown fields are rejected");
    }

    #[test]
    fn current_user_response_includes_user_credentials() {
        let connection = Connection::open_in_memory().expect("database opens");
        create_me_response_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email) VALUES ('user-1', 'user@example.com')",
                [],
            )
            .expect("user inserts");
        connection
            .execute(
                "INSERT INTO webauthn_credentials
                 (credential_id, user_id, passkey_json, rp_id, created_at)
                 VALUES ('credential-1', 'user-1', '{}', 'example.com', '2026-01-01T00:00:00.000Z')",
                [],
            )
            .expect("webauthn credential inserts");
        connection
            .execute(
                "INSERT INTO ed25519_credentials
                 (id, user_id, name, public_key, last_used_at, created_at)
                 VALUES ('ed25519-1', 'user-1', 'Laptop', 'ed-public-key', '2026-01-02T00:00:00.000Z', '2026-01-01T00:00:00.000Z')",
                [],
            )
            .expect("ed25519 credential inserts");

        let response = current_user_response(
            &connection,
            &AuthContext {
                user_id: "user-1".to_string(),
                session_id: "session-1".to_string(),
                auth_method: "email_otp".to_string(),
            },
        )
        .expect("current user response builds");

        assert_eq!(response["webauthn_credentials"][0]["id"], "credential-1");
        assert_eq!(
            response["webauthn_credentials"][0]["credential_id"],
            "credential-1"
        );
        assert_eq!(response["webauthn_credentials"][0]["transports"], json!([]));
        assert_eq!(response["ed25519_credentials"][0]["name"], "Laptop");
        assert_eq!(
            response["ed25519_credentials"][0]["public_key"],
            "ed-public-key"
        );
    }

    fn create_me_response_schema(connection: &Connection) {
        connection
            .execute_batch(
                "CREATE TABLE users (
                    id TEXT PRIMARY KEY,
                    email TEXT,
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
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                 );
                 CREATE TABLE webauthn_credentials (
                    credential_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    passkey_json TEXT NOT NULL,
                    rp_id TEXT NOT NULL,
                    last_used_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                 );
                 CREATE TABLE ed25519_credentials (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    public_key TEXT NOT NULL,
                    last_used_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                 );",
            )
            .expect("me response schema exists");
    }
}
