use chrono::{Duration, SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::Deserialize;
use serde_json::{json, Value};

const WEBAUTHN_CHALLENGE_SECONDS: i64 = 300;

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub(crate) struct OptionsRequest {
    rp_id: String,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum RegisterOptionsError {
    InvalidRequest,
    InvalidWebauthnRegistration,
    InvalidAccessToken,
}

pub(crate) fn parse_options_request(body: &str) -> Result<OptionsRequest, serde_json::Error> {
    let request: OptionsRequest = serde_json::from_str(body)?;

    if request.rp_id.trim().is_empty() {
        return Err(serde_json::Error::io(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "invalid rp_id",
        )));
    }

    Ok(request)
}

pub(crate) fn register_options(
    connection: &Connection,
    user_id: &str,
    request: &OptionsRequest,
    origin: &str,
) -> Result<Value, RegisterOptionsError> {
    let email = user_email(connection, user_id)?;
    let origin = normalize_allowed_origin(origin)
        .map_err(|_| RegisterOptionsError::InvalidWebauthnRegistration)?;
    let origin_hostname =
        origin_hostname(&origin).ok_or(RegisterOptionsError::InvalidWebauthnRegistration)?;
    let rp_id = normalize_rp_id(&request.rp_id)
        .map_err(|_| RegisterOptionsError::InvalidWebauthnRegistration)?;
    let allowed_origins = list_allowed_origins(connection)?;

    if !allowed_origins.iter().any(|allowed| allowed == &origin) {
        return Err(RegisterOptionsError::InvalidWebauthnRegistration);
    }

    if !is_rp_id_allowed_for_origin(&origin_hostname, &rp_id) {
        return Err(RegisterOptionsError::InvalidWebauthnRegistration);
    }

    if !rp_id_covered_by_allowed_origins(&allowed_origins, &rp_id) {
        return Err(RegisterOptionsError::InvalidWebauthnRegistration);
    }

    let request_id = random_uuid(connection).map_err(|_| RegisterOptionsError::InvalidRequest)?;
    let challenge =
        random_base64url(connection).map_err(|_| RegisterOptionsError::InvalidRequest)?;
    let expires_at = (Utc::now() + Duration::seconds(WEBAUTHN_CHALLENGE_SECONDS))
        .to_rfc3339_opts(SecondsFormat::Millis, true);
    let user_handle = base64url_encode(user_id.as_bytes());
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);

    connection
        .execute(
            "UPDATE webauthn_challenges
             SET consumed_at = ?1
             WHERE type = 'register' AND user_id = ?2 AND consumed_at IS NULL",
            params![now, user_id],
        )
        .map_err(|_| RegisterOptionsError::InvalidRequest)?;
    connection
        .execute(
            "INSERT INTO webauthn_challenges
             (request_id, type, challenge, user_id, expires_at, rp_id, origin)
             VALUES (?1, 'register', ?2, ?3, ?4, ?5, ?6)",
            params![request_id, challenge, user_id, expires_at, rp_id, origin],
        )
        .map_err(|_| RegisterOptionsError::InvalidRequest)?;

    Ok(json!({
        "request_id": request_id,
        "publicKey": {
            "challenge": challenge,
            "rp": { "name": "auth-mini", "id": rp_id },
            "user": { "id": user_handle, "name": email, "displayName": email },
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
    }))
}

pub(crate) fn delete_credential(
    connection: &Connection,
    credential_id: &str,
    user_id: &str,
) -> rusqlite::Result<bool> {
    let result = connection.execute(
        "DELETE FROM webauthn_credentials WHERE id = ?1 AND user_id = ?2",
        params![credential_id, user_id],
    )?;

    Ok(result > 0)
}

fn user_email(connection: &Connection, user_id: &str) -> Result<String, RegisterOptionsError> {
    connection
        .query_row(
            "SELECT email FROM users WHERE id = ?1 LIMIT 1",
            [user_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|_| RegisterOptionsError::InvalidAccessToken)?
        .ok_or(RegisterOptionsError::InvalidAccessToken)
}

fn list_allowed_origins(connection: &Connection) -> Result<Vec<String>, RegisterOptionsError> {
    let mut statement = connection
        .prepare("SELECT origin FROM allowed_origins ORDER BY id ASC")
        .map_err(|_| RegisterOptionsError::InvalidWebauthnRegistration)?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|_| RegisterOptionsError::InvalidWebauthnRegistration)?;
    let mut origins = Vec::new();

    for row in rows {
        let origin = row.map_err(|_| RegisterOptionsError::InvalidWebauthnRegistration)?;
        origins.push(
            normalize_allowed_origin(&origin)
                .map_err(|_| RegisterOptionsError::InvalidWebauthnRegistration)?,
        );
    }

    Ok(origins)
}

fn normalize_allowed_origin(input: &str) -> Result<String, ()> {
    if input == "null" || input.contains('@') || input.contains('?') || input.contains('#') {
        return Err(());
    }
    let (protocol, rest) = input.split_once("://").ok_or(())?;
    let protocol = protocol.to_ascii_lowercase();

    if protocol != "http" && protocol != "https" {
        return Err(());
    }

    if rest.contains('/') || rest.is_empty() {
        return Err(());
    }

    let (hostname, port) = split_host_port(rest)?;
    let hostname = hostname.trim_end_matches('.').to_ascii_lowercase();

    if hostname.is_empty() {
        return Err(());
    }

    let port = match (protocol.as_str(), port) {
        ("http", Some("80")) | ("https", Some("443")) | (_, None) => String::new(),
        (_, Some(value))
            if !value.is_empty() && value.bytes().all(|byte| byte.is_ascii_digit()) =>
        {
            format!(":{value}")
        }
        _ => return Err(()),
    };

    Ok(format!("{protocol}://{hostname}{port}"))
}

fn normalize_rp_id(input: &str) -> Result<String, ()> {
    let trimmed = input.trim().to_ascii_lowercase();
    let rp_id = trimmed.trim_end_matches('.');

    if rp_id.is_empty()
        || rp_id.contains(':')
        || rp_id.contains('/')
        || rp_id.contains('@')
        || rp_id.contains(' ')
        || rp_id.split('.').any(|label| label.is_empty())
        || !rp_id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'.')
    {
        return Err(());
    }

    Ok(rp_id.to_string())
}

fn rp_id_covered_by_allowed_origins(allowed_origins: &[String], rp_id: &str) -> bool {
    allowed_origins.iter().any(|origin| {
        origin_hostname(origin)
            .map(|hostname| is_rp_id_allowed_for_origin(&hostname, rp_id))
            .unwrap_or(false)
    })
}

fn is_rp_id_allowed_for_origin(origin_hostname: &str, rp_id: &str) -> bool {
    if origin_hostname == rp_id {
        return true;
    }

    if is_ip_address(origin_hostname)
        || is_ip_address(rp_id)
        || origin_hostname == "localhost"
        || rp_id == "localhost"
    {
        return false;
    }

    origin_hostname.ends_with(&format!(".{rp_id}"))
}

fn origin_hostname(origin: &str) -> Option<String> {
    let (_, rest) = origin.split_once("://")?;
    split_host_port(rest).ok().map(|(host, _)| host.to_string())
}

fn split_host_port(value: &str) -> Result<(&str, Option<&str>), ()> {
    if value.starts_with('[') {
        return Err(());
    }

    match value.rsplit_once(':') {
        Some((host, port)) => Ok((host, Some(port))),
        None => Ok((value, None)),
    }
}

fn is_ip_address(value: &str) -> bool {
    value.contains(':') || {
        let parts = value.split('.').collect::<Vec<_>>();
        parts.len() == 4
            && parts
                .iter()
                .all(|part| !part.is_empty() && part.bytes().all(|byte| byte.is_ascii_digit()))
    }
}

fn random_uuid(connection: &Connection) -> rusqlite::Result<String> {
    connection.query_row(
        "SELECT lower(hex(randomblob(4))) || '-' ||
                lower(hex(randomblob(2))) || '-' ||
                '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
                substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
                lower(hex(randomblob(6)))",
        [],
        |row| row.get(0),
    )
}

fn random_base64url(connection: &Connection) -> rusqlite::Result<String> {
    let bytes: Vec<u8> = connection.query_row("SELECT randomblob(32)", [], |row| row.get(0))?;

    Ok(base64url_encode(&bytes))
}

fn base64url_encode(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut output = String::new();
    let mut index = 0;

    while index + 3 <= bytes.len() {
        let chunk = ((bytes[index] as u32) << 16)
            | ((bytes[index + 1] as u32) << 8)
            | bytes[index + 2] as u32;
        output.push(ALPHABET[((chunk >> 18) & 0x3f) as usize] as char);
        output.push(ALPHABET[((chunk >> 12) & 0x3f) as usize] as char);
        output.push(ALPHABET[((chunk >> 6) & 0x3f) as usize] as char);
        output.push(ALPHABET[(chunk & 0x3f) as usize] as char);
        index += 3;
    }

    match bytes.len() - index {
        1 => {
            let chunk = (bytes[index] as u32) << 16;
            output.push(ALPHABET[((chunk >> 18) & 0x3f) as usize] as char);
            output.push(ALPHABET[((chunk >> 12) & 0x3f) as usize] as char);
        }
        2 => {
            let chunk = ((bytes[index] as u32) << 16) | ((bytes[index + 1] as u32) << 8);
            output.push(ALPHABET[((chunk >> 18) & 0x3f) as usize] as char);
            output.push(ALPHABET[((chunk >> 12) & 0x3f) as usize] as char);
            output.push(ALPHABET[((chunk >> 6) & 0x3f) as usize] as char);
        }
        _ => {}
    }

    output
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;

    use super::*;

    #[test]
    fn deletes_only_the_owners_credential() {
        let connection = Connection::open_in_memory().expect("database opens");
        connection
            .execute_batch(
                "CREATE TABLE webauthn_credentials (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    credential_id TEXT NOT NULL UNIQUE,
                    public_key TEXT NOT NULL,
                    counter INTEGER NOT NULL DEFAULT 0,
                    transports TEXT NOT NULL DEFAULT '',
                    rp_id TEXT NOT NULL,
                    last_used_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .expect("schema exists");
        connection
            .execute(
                "INSERT INTO webauthn_credentials
                 (id, user_id, credential_id, public_key, rp_id)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                (
                    "credential-1",
                    "user-1",
                    "external-credential-id",
                    "public-key",
                    "app.example.com",
                ),
            )
            .expect("credential inserts");

        let denied = delete_credential(&connection, "credential-1", "user-2")
            .expect("delete query succeeds");
        let allowed = delete_credential(&connection, "credential-1", "user-1")
            .expect("delete query succeeds");

        assert!(!denied);
        assert!(allowed);
    }

    #[test]
    fn normalizes_parent_domain_register_options_and_stores_challenge() {
        let connection = Connection::open_in_memory().expect("database opens");
        create_register_options_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email) VALUES (?1, ?2)",
                ("user-1", "user@example.com"),
            )
            .expect("user inserts");
        connection
            .execute(
                "INSERT INTO allowed_origins (origin) VALUES (?1)",
                ["https://app.example.com"],
            )
            .expect("origin inserts");
        let request = OptionsRequest {
            rp_id: "EXAMPLE.COM.".to_string(),
        };

        let body = register_options(&connection, "user-1", &request, "https://app.example.com")
            .expect("options generate");
        let request_id = body["request_id"].as_str().expect("request id");
        let stored: (String, String, String, Option<String>) = connection
            .query_row(
                "SELECT type, rp_id, origin, consumed_at FROM webauthn_challenges WHERE request_id = ?1",
                [request_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .expect("challenge reads");

        assert_eq!(body["publicKey"]["rp"]["id"], "example.com");
        assert_eq!(body["publicKey"]["user"]["id"], "dXNlci0x");
        assert_eq!(body["publicKey"]["pubKeyCredParams"][0]["alg"], -7);
        assert_eq!(
            stored,
            (
                "register".to_string(),
                "example.com".to_string(),
                "https://app.example.com".to_string(),
                None
            )
        );
    }

    #[test]
    fn second_register_options_consumes_first_unused_registration_challenge() {
        let connection = Connection::open_in_memory().expect("database opens");
        create_register_options_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email) VALUES (?1, ?2)",
                ("user-1", "user@example.com"),
            )
            .expect("user inserts");
        connection
            .execute(
                "INSERT INTO allowed_origins (origin) VALUES (?1)",
                ["https://app.example.com"],
            )
            .expect("origin inserts");
        let request = OptionsRequest {
            rp_id: "app.example.com".to_string(),
        };
        let first = register_options(&connection, "user-1", &request, "https://app.example.com")
            .expect("first options generate");
        let second = register_options(&connection, "user-1", &request, "https://app.example.com")
            .expect("second options generate");

        let first_consumed_at: Option<String> = connection
            .query_row(
                "SELECT consumed_at FROM webauthn_challenges WHERE request_id = ?1",
                [first["request_id"].as_str().expect("request id")],
                |row| row.get(0),
            )
            .expect("first consumed_at reads");
        let second_consumed_at: Option<String> = connection
            .query_row(
                "SELECT consumed_at FROM webauthn_challenges WHERE request_id = ?1",
                [second["request_id"].as_str().expect("request id")],
                |row| row.get(0),
            )
            .expect("second consumed_at reads");

        assert!(first_consumed_at.is_some());
        assert!(second_consumed_at.is_none());
    }

    #[test]
    fn rejects_register_options_for_sibling_rp_id() {
        let connection = Connection::open_in_memory().expect("database opens");
        create_register_options_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email) VALUES (?1, ?2)",
                ("user-1", "user@example.com"),
            )
            .expect("user inserts");
        connection
            .execute(
                "INSERT INTO allowed_origins (origin) VALUES (?1)",
                ["https://app.example.com"],
            )
            .expect("origin inserts");
        let request = OptionsRequest {
            rp_id: "login.example.com".to_string(),
        };

        let error = register_options(&connection, "user-1", &request, "https://app.example.com")
            .expect_err("sibling rp id is rejected");

        assert_eq!(error, RegisterOptionsError::InvalidWebauthnRegistration);
    }

    fn create_register_options_schema(connection: &Connection) {
        connection
            .execute_batch(
                "CREATE TABLE users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    email_verified_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE allowed_origins (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    origin TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE webauthn_challenges (
                    request_id TEXT PRIMARY KEY,
                    type TEXT NOT NULL CHECK (type IN ('register', 'authenticate')),
                    challenge TEXT NOT NULL,
                    user_id TEXT,
                    expires_at TEXT NOT NULL,
                    rp_id TEXT NOT NULL,
                    origin TEXT NOT NULL,
                    consumed_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .expect("schema exists");
    }
}
