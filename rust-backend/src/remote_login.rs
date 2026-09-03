use chrono::{Duration, SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::audience::normalize_audiences;
use crate::session::{hash_value, mint_session_tokens_for_audience, TokenPair};

const REMOTE_LOGIN_SECONDS: i64 = 300;

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub(crate) struct StartRequest {
    pub(crate) redirect_uri: Option<String>,
    pub(crate) aud: Option<String>,
    pub(crate) audiences: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub(crate) struct ClaimRequest {
    pub(crate) confirmation_code: String,
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub(crate) struct ExchangeRequest {
    pub(crate) request_id: String,
    pub(crate) exchange_code: String,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum RemoteLoginError {
    InvalidRequest,
    Unavailable,
    Database,
}

pub(crate) fn parse_start_request(body: &str) -> Result<StartRequest, RemoteLoginError> {
    let request: StartRequest =
        serde_json::from_str(body).map_err(|_| RemoteLoginError::InvalidRequest)?;
    if request.aud.is_some() && request.audiences.is_some() {
        return Err(RemoteLoginError::InvalidRequest);
    }
    Ok(request)
}

pub(crate) fn parse_claim_request(body: &str) -> Result<ClaimRequest, RemoteLoginError> {
    let request: ClaimRequest =
        serde_json::from_str(body).map_err(|_| RemoteLoginError::InvalidRequest)?;
    if is_confirmation_code(&request.confirmation_code) {
        return Ok(ClaimRequest {
            confirmation_code: request.confirmation_code.to_ascii_uppercase(),
        });
    }
    Err(RemoteLoginError::InvalidRequest)
}

pub(crate) fn parse_exchange_request(body: &str) -> Result<ExchangeRequest, RemoteLoginError> {
    let request: ExchangeRequest =
        serde_json::from_str(body).map_err(|_| RemoteLoginError::InvalidRequest)?;
    if is_uuid_like(&request.request_id) && is_exchange_code(&request.exchange_code) {
        return Ok(request);
    }
    Err(RemoteLoginError::InvalidRequest)
}

pub(crate) fn start(
    connection: &Connection,
    redirect_uri: Option<&str>,
    audiences: &[String],
) -> Result<Value, RemoteLoginError> {
    let audiences = normalize_audiences(audiences).map_err(|_| RemoteLoginError::InvalidRequest)?;
    let request_id = random_uuid(connection)?;
    let exchange_code = random_hex(connection, 32)?;
    let confirmation_code = random_hex(connection, 4)?.to_ascii_uppercase();
    let expires_at = expires_at();
    let audience = serde_json::to_string(&audiences).map_err(|_| RemoteLoginError::Database)?;
    connection
        .execute(
            "INSERT INTO remote_login_requests
             (id, exchange_code_hash, confirmation_code_hash, redirect_uri, audience, status, expires_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6)",
            params![
                request_id,
                hash_value(&exchange_code),
                hash_value(&confirmation_code),
                redirect_uri,
                audience,
                expires_at,
            ],
        )
        .map_err(|_| RemoteLoginError::Database)?;

    Ok(json!({
        "request_id": request_id,
        "exchange_code": exchange_code,
        "confirmation_code": confirmation_code,
        "expires_at": expires_at,
    }))
}

pub(crate) fn claim(
    connection: &Connection,
    user_id: &str,
    confirmation_code: &str,
) -> Result<Value, RemoteLoginError> {
    let now = now_text();
    let request_id = connection
        .query_row(
            "SELECT id FROM remote_login_requests
             WHERE confirmation_code_hash=?1
               AND status='pending'
               AND approved_user_id IS NULL
               AND expires_at > ?2
             LIMIT 1",
            params![hash_value(confirmation_code), now],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|_| RemoteLoginError::Database)?
        .ok_or(RemoteLoginError::Unavailable)?;
    let changed = connection
        .execute(
            "UPDATE remote_login_requests
             SET approved_user_id=?1
             WHERE id=?2
               AND confirmation_code_hash=?3
               AND status='pending'
               AND approved_user_id IS NULL
               AND expires_at > ?4",
            params![user_id, request_id, hash_value(confirmation_code), now],
        )
        .map_err(|_| RemoteLoginError::Database)?;
    if changed != 1 {
        return Err(RemoteLoginError::Unavailable);
    }
    request_summary(connection, &request_id, user_id)
}

pub(crate) fn list_pending(
    connection: &Connection,
    user_id: &str,
) -> Result<Value, RemoteLoginError> {
    let now = now_text();
    connection
        .execute(
            "UPDATE remote_login_requests SET status='expired'
             WHERE status='pending' AND expires_at <= ?1",
            [&now],
        )
        .map_err(|_| RemoteLoginError::Database)?;
    let mut statement = connection
        .prepare(
            "SELECT id, redirect_uri, audience, expires_at, created_at
             FROM remote_login_requests
             WHERE approved_user_id=?1 AND status='pending' AND expires_at > ?2
             ORDER BY created_at ASC, id ASC",
        )
        .map_err(|_| RemoteLoginError::Database)?;
    let requests = statement
        .query_map(params![user_id, now], |row| {
            Ok(json!({
                "request_id": row.get::<_, String>(0)?,
                "redirect_uri": row.get::<_, Option<String>>(1)?,
                "audiences": parse_audiences(row.get::<_, String>(2)?),
                "expires_at": row.get::<_, String>(3)?,
                "created_at": row.get::<_, String>(4)?,
            }))
        })
        .map_err(|_| RemoteLoginError::Database)?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|_| RemoteLoginError::Database)?;
    Ok(json!({ "requests": requests }))
}

pub(crate) fn approve(
    connection: &Connection,
    request_id: &str,
    user_id: &str,
) -> Result<(), RemoteLoginError> {
    let now = now_text();
    let changed = connection
        .execute(
            "UPDATE remote_login_requests
             SET status='approved', approved_at=?1
             WHERE id=?2 AND approved_user_id=?3 AND status='pending' AND expires_at > ?1",
            params![now, request_id, user_id],
        )
        .map_err(|_| RemoteLoginError::Database)?;
    if changed == 1 {
        Ok(())
    } else {
        Err(RemoteLoginError::Unavailable)
    }
}

pub(crate) fn deny(
    connection: &Connection,
    request_id: &str,
    user_id: &str,
) -> Result<(), RemoteLoginError> {
    let now = now_text();
    let changed = connection
        .execute(
            "UPDATE remote_login_requests
             SET status='denied', denied_at=?1
             WHERE id=?2 AND approved_user_id=?3 AND status='pending' AND expires_at > ?1",
            params![now, request_id, user_id],
        )
        .map_err(|_| RemoteLoginError::Database)?;
    if changed == 1 {
        Ok(())
    } else {
        Err(RemoteLoginError::Unavailable)
    }
}

pub(crate) fn exchange(
    connection: &mut Connection,
    request_id: &str,
    exchange_code: &str,
    issuer: &str,
    ip: Option<&str>,
    user_agent: Option<&str>,
) -> Result<TokenPair, RemoteLoginError> {
    let now = now_text();
    let transaction = connection
        .transaction()
        .map_err(|_| RemoteLoginError::Database)?;
    let request = transaction
        .query_row(
            "SELECT approved_user_id, audience
             FROM remote_login_requests
             WHERE id=?1
               AND exchange_code_hash=?2
               AND status='approved'
               AND expires_at > ?3",
            params![request_id, hash_value(exchange_code), now],
            |row| Ok((row.get::<_, Option<String>>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()
        .map_err(|_| RemoteLoginError::Database)?;
    let Some((Some(user_id), audience)) = request else {
        return Err(RemoteLoginError::Unavailable);
    };
    let consumed = transaction
        .execute(
            "UPDATE remote_login_requests
             SET status='consumed', consumed_at=?1
             WHERE id=?2
               AND exchange_code_hash=?3
               AND status='approved'
               AND expires_at > ?1",
            params![now, request_id, hash_value(exchange_code)],
        )
        .map_err(|_| RemoteLoginError::Database)?;
    if consumed != 1 {
        return Err(RemoteLoginError::Unavailable);
    }
    let audiences = parse_audiences(audience).ok_or(RemoteLoginError::Database)?;
    let pair = mint_session_tokens_for_audience(
        &transaction,
        &user_id,
        "agent_approval",
        issuer,
        &audiences,
        ip,
        user_agent,
    )
    .map_err(|_| RemoteLoginError::Database)?;
    transaction
        .commit()
        .map_err(|_| RemoteLoginError::Database)?;
    Ok(pair)
}

fn request_summary(
    connection: &Connection,
    request_id: &str,
    user_id: &str,
) -> Result<Value, RemoteLoginError> {
    connection
        .query_row(
            "SELECT id, redirect_uri, audience, expires_at, created_at
             FROM remote_login_requests
             WHERE id=?1 AND approved_user_id=?2 AND status='pending'",
            params![request_id, user_id],
            |row| {
                Ok(json!({
                    "request_id": row.get::<_, String>(0)?,
                    "redirect_uri": row.get::<_, Option<String>>(1)?,
                    "audiences": parse_audiences(row.get::<_, String>(2)?),
                    "expires_at": row.get::<_, String>(3)?,
                    "created_at": row.get::<_, String>(4)?,
                }))
            },
        )
        .map_err(|_| RemoteLoginError::Unavailable)
}

fn parse_audiences(value: String) -> Option<Vec<String>> {
    serde_json::from_str(&value).ok()
}

fn random_uuid(connection: &Connection) -> Result<String, RemoteLoginError> {
    connection
        .query_row(
            "SELECT lower(hex(randomblob(4))) || '-' ||
                    lower(hex(randomblob(2))) || '-' ||
                    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
                    substr('89ab', (random() & 3) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
                    lower(hex(randomblob(6)))",
            [],
            |row| row.get(0),
        )
        .map_err(|_| RemoteLoginError::Database)
}

fn random_hex(connection: &Connection, bytes: usize) -> Result<String, RemoteLoginError> {
    let sql = format!("SELECT lower(hex(randomblob({bytes})))");
    connection
        .query_row(&sql, [], |row| row.get(0))
        .map_err(|_| RemoteLoginError::Database)
}

fn is_confirmation_code(value: &str) -> bool {
    value.len() == 8 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn is_exchange_code(value: &str) -> bool {
    value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn is_uuid_like(value: &str) -> bool {
    value.len() == 36
}

fn expires_at() -> String {
    (Utc::now() + Duration::seconds(REMOTE_LOGIN_SECONDS))
        .to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn now_text() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicUsize, Ordering};

    use super::*;
    use crate::db::initialize_runtime_database;
    use crate::jwks::verify_access_token;

    #[test]
    fn approved_request_exchanges_once_for_standard_session_tokens() {
        let path = std::env::temp_dir().join(format!("remote-login-{}.sqlite3", unique_suffix()));
        initialize_runtime_database(&path).expect("database initializes");
        let mut connection = Connection::open(&path).expect("database opens");
        connection
            .execute(
                "INSERT INTO users (id, email, email_verified_at) VALUES ('user-1', 'user@example.com', ?1)",
                [now_text()],
            )
            .expect("user inserts");
        connection
            .execute(
                "UPDATE app_meta SET issuer='https://auth.example.com' WHERE id='APP'",
                [],
            )
            .expect("issuer updates");
        let started = start(
            &connection,
            Some("https://app.example.com/callback"),
            &["app.example.com".to_string()],
        )
        .expect("request starts");
        let request_id = started["request_id"].as_str().expect("request id");
        let confirmation_code = started["confirmation_code"]
            .as_str()
            .expect("confirmation code");
        let exchange_code = started["exchange_code"].as_str().expect("exchange code");
        assert!(connection
            .query_row(
                "SELECT exchange_code_hash FROM remote_login_requests WHERE id=?1",
                [request_id],
                |row| row.get::<_, String>(0),
            )
            .expect("exchange code hash reads")
            .ne(exchange_code));

        claim(&connection, "user-1", confirmation_code).expect("request claims");
        approve(&connection, request_id, "user-1").expect("request approves");
        let pair = exchange(
            &mut connection,
            request_id,
            exchange_code,
            "https://auth.example.com",
            None,
            None,
        )
        .expect("request exchanges");
        let payload =
            verify_access_token(&connection, &pair.access_token).expect("access token verifies");
        assert_eq!(payload["sub"], "user-1");
        assert_eq!(payload["aud"], "app.example.com");
        assert!(exchange(
            &mut connection,
            request_id,
            exchange_code,
            "https://auth.example.com",
            None,
            None,
        )
        .is_err());
        assert!(!pair.refresh_token.is_empty());
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn expired_request_never_exchanges() {
        let path = std::env::temp_dir().join(format!("remote-login-{}.sqlite3", unique_suffix()));
        initialize_runtime_database(&path).expect("database initializes");
        let mut connection = Connection::open(&path).expect("database opens");
        connection
            .execute("INSERT INTO users (id) VALUES ('user-1')", [])
            .expect("user inserts");
        let started = start(&connection, None, &["auth.example.com".to_string()]).expect("starts");
        let request_id = started["request_id"].as_str().expect("request id");
        let confirmation_code = started["confirmation_code"]
            .as_str()
            .expect("confirmation code");
        let exchange_code = started["exchange_code"].as_str().expect("exchange code");
        claim(&connection, "user-1", confirmation_code).expect("claims");
        approve(&connection, request_id, "user-1").expect("approves");
        connection
            .execute(
                "UPDATE remote_login_requests SET expires_at='2000-01-01T00:00:00.000Z' WHERE id=?1",
                [request_id],
            )
            .expect("request expires");
        assert!(exchange(
            &mut connection,
            request_id,
            exchange_code,
            "https://auth.example.com",
            None,
            None,
        )
        .is_err());
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn denied_request_never_exchanges() {
        let path = std::env::temp_dir().join(format!("remote-login-{}.sqlite3", unique_suffix()));
        initialize_runtime_database(&path).expect("database initializes");
        let mut connection = Connection::open(&path).expect("database opens");
        connection
            .execute("INSERT INTO users (id) VALUES ('user-1')", [])
            .expect("user inserts");
        let started = start(&connection, None, &["auth.example.com".to_string()]).expect("starts");
        let request_id = started["request_id"].as_str().expect("request id");
        let confirmation_code = started["confirmation_code"]
            .as_str()
            .expect("confirmation code");
        let exchange_code = started["exchange_code"].as_str().expect("exchange code");
        claim(&connection, "user-1", confirmation_code).expect("claims");
        deny(&connection, request_id, "user-1").expect("denies");
        assert!(exchange(
            &mut connection,
            request_id,
            exchange_code,
            "https://auth.example.com",
            None,
            None,
        )
        .is_err());
        let _ = std::fs::remove_file(path);
    }

    fn unique_suffix() -> String {
        static NEXT: AtomicUsize = AtomicUsize::new(0);
        format!(
            "{}-{}-{}",
            std::process::id(),
            Utc::now().timestamp_nanos_opt().unwrap_or_default(),
            NEXT.fetch_add(1, Ordering::Relaxed),
        )
    }
}
