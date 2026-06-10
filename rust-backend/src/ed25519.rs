use chrono::{Duration, SecondsFormat, Utc};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use rusqlite::{params, Connection, OptionalExtension};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::session::{mint_session_tokens, TokenPair};

#[derive(Debug, Deserialize, PartialEq, Eq)]
pub(crate) struct CredentialCreateRequest {
    pub(crate) name: String,
    pub(crate) public_key: String,
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
pub(crate) struct CredentialUpdateRequest {
    pub(crate) name: String,
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub(crate) struct StartAuthenticationRequest {
    pub(crate) credential_id: String,
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub(crate) struct VerifyAuthenticationRequest {
    pub(crate) request_id: String,
    pub(crate) signature: String,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum VerifyAuthenticationError {
    InvalidEd25519Authentication,
    Database,
}

#[derive(Debug, PartialEq, Eq)]
struct AuthenticationChallenge {
    credential_id: String,
    challenge: String,
    expires_at: String,
    consumed_at: Option<String>,
}

#[derive(Debug, PartialEq, Eq)]
struct AuthenticationCredential {
    id: String,
    user_id: String,
    public_key: String,
}

pub(crate) fn parse_credential_create_request(
    body: &str,
) -> Result<CredentialCreateRequest, serde_json::Error> {
    let request: CredentialCreateRequest = serde_json::from_str(body)?;

    if !request.name.is_empty() && base64url_decoded_len(&request.public_key) == Some(32) {
        return Ok(request);
    }

    Err(invalid_request_error("invalid credential create request"))
}

pub(crate) fn parse_credential_update_request(
    body: &str,
) -> Result<CredentialUpdateRequest, serde_json::Error> {
    let request: CredentialUpdateRequest = serde_json::from_str(body)?;

    if !request.name.is_empty() {
        return Ok(request);
    }

    Err(invalid_request_error("invalid credential update request"))
}

pub(crate) fn parse_start_authentication_request(
    body: &str,
) -> Result<StartAuthenticationRequest, serde_json::Error> {
    let request: StartAuthenticationRequest = serde_json::from_str(body)?;

    if is_uuid_like(&request.credential_id) {
        return Ok(request);
    }

    Err(invalid_request_error("invalid ed25519 start request"))
}

pub(crate) fn parse_verify_authentication_request(
    body: &str,
) -> Result<VerifyAuthenticationRequest, serde_json::Error> {
    let request: VerifyAuthenticationRequest = serde_json::from_str(body)?;

    if is_uuid_like(&request.request_id) && !request.signature.is_empty() {
        return Ok(request);
    }

    Err(invalid_request_error("invalid ed25519 verify request"))
}

pub(crate) fn create_credential(
    connection: &Connection,
    user_id: &str,
    request: &CredentialCreateRequest,
) -> rusqlite::Result<Value> {
    let credential_id = random_uuid(connection)?;
    let created_at = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);

    connection.execute(
        "INSERT INTO ed25519_credentials (id, user_id, name, public_key, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            credential_id,
            user_id,
            &request.name,
            &request.public_key,
            created_at
        ],
    )?;

    credential_response(connection, &credential_id, user_id).map(|credential| {
        credential.expect("inserted credential must be readable in the same connection")
    })
}

pub(crate) fn list_credentials(connection: &Connection, user_id: &str) -> rusqlite::Result<Value> {
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
    let credentials = rows.collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(json!(credentials))
}

pub(crate) fn update_credential(
    connection: &Connection,
    credential_id: &str,
    user_id: &str,
    request: &CredentialUpdateRequest,
) -> rusqlite::Result<Option<Value>> {
    connection.execute(
        "UPDATE ed25519_credentials SET name = ?1 WHERE id = ?2 AND user_id = ?3",
        params![request.name, credential_id, user_id],
    )?;

    credential_response(connection, credential_id, user_id)
}

pub(crate) fn delete_credential(
    connection: &Connection,
    credential_id: &str,
    user_id: &str,
) -> rusqlite::Result<bool> {
    let result = connection.execute(
        "DELETE FROM ed25519_credentials WHERE id = ?1 AND user_id = ?2",
        params![credential_id, user_id],
    )?;

    Ok(result > 0)
}

pub(crate) fn start_authentication(
    connection: &Connection,
    request: &StartAuthenticationRequest,
) -> rusqlite::Result<Option<Value>> {
    let Some(credential_id) = existing_credential_id(connection, &request.credential_id)? else {
        return Ok(None);
    };

    let request_id = random_uuid(connection)?;
    let challenge = random_token(connection)?;
    let created_at = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let expires_at =
        (Utc::now() + Duration::seconds(300)).to_rfc3339_opts(SecondsFormat::Millis, true);

    connection.execute(
        "INSERT INTO ed25519_challenges (request_id, credential_id, challenge, expires_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![request_id, credential_id, challenge, expires_at, created_at],
    )?;

    Ok(Some(json!({
        "request_id": request_id,
        "challenge": challenge,
    })))
}

pub(crate) fn verify_authentication(
    connection: &mut Connection,
    request: &VerifyAuthenticationRequest,
    issuer: &str,
    ip: Option<&str>,
    user_agent: Option<&str>,
) -> Result<TokenPair, VerifyAuthenticationError> {
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let challenge = valid_challenge(connection, &request.request_id, &now)?;
    let credential = credential_for_authentication(connection, &challenge.credential_id)?;

    verify_challenge_signature(
        &challenge.challenge,
        &credential.public_key,
        &request.signature,
    )?;

    let transaction = connection
        .transaction()
        .map_err(|_| VerifyAuthenticationError::Database)?;
    let changed = transaction
        .execute(
            "UPDATE ed25519_challenges SET consumed_at = ?1
             WHERE request_id = ?2 AND consumed_at IS NULL AND expires_at > ?3",
            params![now, request.request_id, now],
        )
        .map_err(|_| VerifyAuthenticationError::Database)?;

    if changed == 0 {
        return Err(VerifyAuthenticationError::InvalidEd25519Authentication);
    }

    transaction
        .execute(
            "UPDATE ed25519_credentials SET last_used_at = ?1 WHERE id = ?2",
            params![now, credential.id],
        )
        .map_err(|_| VerifyAuthenticationError::Database)?;
    let pair = mint_session_tokens(
        &transaction,
        &credential.user_id,
        "ed25519",
        issuer,
        ip,
        user_agent,
    )
    .map_err(|_| VerifyAuthenticationError::Database)?;

    transaction
        .commit()
        .map_err(|_| VerifyAuthenticationError::Database)?;

    Ok(pair)
}

fn credential_response(
    connection: &Connection,
    credential_id: &str,
    user_id: &str,
) -> rusqlite::Result<Option<Value>> {
    connection
        .query_row(
            "SELECT id, name, public_key, last_used_at, created_at
             FROM ed25519_credentials WHERE id = ?1 AND user_id = ?2 LIMIT 1",
            params![credential_id, user_id],
            |row| {
                Ok(json!({
                    "id": row.get::<_, String>(0)?,
                    "name": row.get::<_, String>(1)?,
                    "public_key": row.get::<_, String>(2)?,
                    "last_used_at": row.get::<_, Option<String>>(3)?,
                    "created_at": row.get::<_, String>(4)?,
                }))
            },
        )
        .optional()
}

fn existing_credential_id(
    connection: &Connection,
    credential_id: &str,
) -> rusqlite::Result<Option<String>> {
    connection
        .query_row(
            "SELECT id FROM ed25519_credentials WHERE id = ?1 LIMIT 1",
            [credential_id],
            |row| row.get(0),
        )
        .optional()
}

fn valid_challenge(
    connection: &Connection,
    request_id: &str,
    now: &str,
) -> Result<AuthenticationChallenge, VerifyAuthenticationError> {
    let challenge = connection
        .query_row(
            "SELECT credential_id, challenge, expires_at, consumed_at
             FROM ed25519_challenges WHERE request_id = ?1 LIMIT 1",
            [request_id],
            |row| {
                Ok(AuthenticationChallenge {
                    credential_id: row.get(0)?,
                    challenge: row.get(1)?,
                    expires_at: row.get(2)?,
                    consumed_at: row.get(3)?,
                })
            },
        )
        .optional()
        .map_err(|_| VerifyAuthenticationError::Database)?;
    let Some(challenge) = challenge else {
        return Err(VerifyAuthenticationError::InvalidEd25519Authentication);
    };

    if challenge.consumed_at.is_some() || challenge.expires_at.as_str() <= now {
        return Err(VerifyAuthenticationError::InvalidEd25519Authentication);
    }

    Ok(challenge)
}

fn credential_for_authentication(
    connection: &Connection,
    credential_id: &str,
) -> Result<AuthenticationCredential, VerifyAuthenticationError> {
    let credential = connection
        .query_row(
            "SELECT id, user_id, public_key FROM ed25519_credentials WHERE id = ?1 LIMIT 1",
            [credential_id],
            |row| {
                Ok(AuthenticationCredential {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    public_key: row.get(2)?,
                })
            },
        )
        .optional()
        .map_err(|_| VerifyAuthenticationError::Database)?;

    credential.ok_or(VerifyAuthenticationError::InvalidEd25519Authentication)
}

fn verify_challenge_signature(
    challenge: &str,
    public_key: &str,
    signature: &str,
) -> Result<(), VerifyAuthenticationError> {
    let public_key = base64url_decode(public_key)?;
    let signature = base64url_decode(signature)?;
    let public_key: [u8; 32] = public_key
        .try_into()
        .map_err(|_| VerifyAuthenticationError::InvalidEd25519Authentication)?;
    let signature: [u8; 64] = signature
        .try_into()
        .map_err(|_| VerifyAuthenticationError::InvalidEd25519Authentication)?;
    let verifying_key = VerifyingKey::from_bytes(&public_key)
        .map_err(|_| VerifyAuthenticationError::InvalidEd25519Authentication)?;
    let signature = Signature::from_bytes(&signature);

    verifying_key
        .verify(challenge.as_bytes(), &signature)
        .map_err(|_| VerifyAuthenticationError::InvalidEd25519Authentication)
}

fn base64url_decoded_len(value: &str) -> Option<usize> {
    if value.is_empty() || value.len() % 4 == 1 {
        return None;
    }

    if !value
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
    {
        return None;
    }

    let full_groups = value.len() / 4;
    let remainder_len = match value.len() % 4 {
        0 => 0,
        2 => 1,
        3 => 2,
        _ => return None,
    };

    Some(full_groups * 3 + remainder_len)
}

fn base64url_decode(value: &str) -> Result<Vec<u8>, VerifyAuthenticationError> {
    if value.is_empty() || value.len() % 4 == 1 {
        return Err(VerifyAuthenticationError::InvalidEd25519Authentication);
    }

    let mut bits = 0u32;
    let mut bit_count = 0u8;
    let mut output = Vec::with_capacity(base64url_decoded_len(value).unwrap_or_default());

    for byte in value.bytes() {
        let value = match byte {
            b'A'..=b'Z' => byte - b'A',
            b'a'..=b'z' => byte - b'a' + 26,
            b'0'..=b'9' => byte - b'0' + 52,
            b'-' => 62,
            b'_' => 63,
            _ => return Err(VerifyAuthenticationError::InvalidEd25519Authentication),
        };
        bits = (bits << 6) | u32::from(value);
        bit_count += 6;

        if bit_count >= 8 {
            bit_count -= 8;
            output.push((bits >> bit_count) as u8);
            bits &= (1 << bit_count) - 1;
        }
    }

    if bit_count > 0 && bits != 0 {
        return Err(VerifyAuthenticationError::InvalidEd25519Authentication);
    }

    Ok(output)
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

fn is_uuid_like(value: &str) -> bool {
    value.len() == 36
}

fn invalid_request_error(message: &str) -> serde_json::Error {
    serde_json::Error::io(std::io::Error::new(
        std::io::ErrorKind::InvalidInput,
        message,
    ))
}

#[cfg(test)]
mod tests {
    use ed25519_dalek::{Signer, SigningKey};
    use rusqlite::Connection;

    use super::*;

    #[test]
    fn lists_user_credentials_in_created_order() {
        let connection = Connection::open_in_memory().expect("database opens");
        connection
            .execute_batch(
                "CREATE TABLE ed25519_credentials (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    public_key TEXT NOT NULL,
                    last_used_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .expect("schema exists");
        connection
            .execute(
                "INSERT INTO ed25519_credentials
                 (id, user_id, name, public_key, last_used_at, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                (
                    "credential-2",
                    "user-1",
                    "Phone",
                    "public-key-2",
                    Option::<String>::None,
                    "2026-01-02T00:00:00.000Z",
                ),
            )
            .expect("second credential inserts");
        connection
            .execute(
                "INSERT INTO ed25519_credentials
                 (id, user_id, name, public_key, last_used_at, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                (
                    "credential-1",
                    "user-1",
                    "Laptop",
                    "public-key-1",
                    Some("2026-01-03T00:00:00.000Z"),
                    "2026-01-01T00:00:00.000Z",
                ),
            )
            .expect("first credential inserts");
        connection
            .execute(
                "INSERT INTO ed25519_credentials
                 (id, user_id, name, public_key, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                (
                    "credential-other",
                    "user-2",
                    "Tablet",
                    "public-key-other",
                    "2026-01-01T00:00:00.000Z",
                ),
            )
            .expect("other user credential inserts");

        let credentials = list_credentials(&connection, "user-1").expect("credentials list");

        assert_eq!(credentials[0]["id"], "credential-1");
        assert_eq!(credentials[0]["last_used_at"], "2026-01-03T00:00:00.000Z");
        assert_eq!(credentials[1]["id"], "credential-2");
        assert_eq!(credentials.as_array().expect("array response").len(), 2);
    }

    #[test]
    fn parses_credential_update_request_contract() {
        let request =
            parse_credential_update_request(r#"{"name":"Laptop"}"#).expect("request parses");

        assert_eq!(request.name, "Laptop");
        parse_credential_update_request(r#"{"name":""}"#).expect_err("empty name rejects");
    }

    #[test]
    fn parses_credential_create_request_contract() {
        let request = parse_credential_create_request(
            r#"{"name":"Laptop","public_key":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}"#,
        )
        .expect("request parses");

        assert_eq!(request.name, "Laptop");
        assert_eq!(request.public_key.len(), 43);
        parse_credential_create_request(
            r#"{"name":"Laptop","public_key":"not-a-valid-ed25519-public-key"}"#,
        )
        .expect_err("malformed public key rejects");
        parse_credential_create_request(
            r#"{"name":"","public_key":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}"#,
        )
        .expect_err("empty name rejects");
    }

    #[test]
    fn parses_start_authentication_request_contract() {
        let request = parse_start_authentication_request(
            r#"{"credential_id":"00000000-0000-4000-8000-000000000000"}"#,
        )
        .expect("request parses");

        assert_eq!(
            request.credential_id,
            "00000000-0000-4000-8000-000000000000"
        );
        parse_start_authentication_request(r#"{"credential_id":"not-a-uuid"}"#)
            .expect_err("malformed credential id rejects");
    }

    #[test]
    fn parses_verify_authentication_request_contract() {
        let request = parse_verify_authentication_request(
            r#"{"request_id":"00000000-0000-4000-8000-000000000000","signature":"signature"}"#,
        )
        .expect("request parses");

        assert_eq!(request.request_id, "00000000-0000-4000-8000-000000000000");
        assert_eq!(request.signature, "signature");
        parse_verify_authentication_request(
            r#"{"request_id":"00000000-0000-4000-8000-000000000000","signature":"signature","extra":true}"#,
        )
        .expect_err("unknown fields reject");
        parse_verify_authentication_request(
            r#"{"request_id":"not-a-uuid","signature":"signature"}"#,
        )
        .expect_err("malformed request id rejects");
        parse_verify_authentication_request(
            r#"{"request_id":"00000000-0000-4000-8000-000000000000","signature":""}"#,
        )
        .expect_err("empty signature rejects");
    }

    #[test]
    fn creates_user_credential() {
        let connection = Connection::open_in_memory().expect("database opens");
        connection
            .execute_batch(
                "CREATE TABLE ed25519_credentials (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    public_key TEXT NOT NULL,
                    last_used_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .expect("schema exists");

        let credential = create_credential(
            &connection,
            "user-1",
            &CredentialCreateRequest {
                name: "Laptop".to_string(),
                public_key: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA".to_string(),
            },
        )
        .expect("credential creates");

        assert_eq!(credential["name"], "Laptop");
        assert_eq!(
            credential["public_key"],
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        );
        assert_eq!(credential["last_used_at"], serde_json::Value::Null);
        assert_eq!(
            credential["created_at"]
                .as_str()
                .expect("created_at text")
                .len(),
            24
        );
    }

    #[test]
    fn updates_user_credential_name() {
        let connection = Connection::open_in_memory().expect("database opens");
        connection
            .execute_batch(
                "CREATE TABLE ed25519_credentials (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    public_key TEXT NOT NULL,
                    last_used_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .expect("schema exists");
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
            .expect("credential inserts");

        let credential = update_credential(
            &connection,
            "credential-1",
            "user-1",
            &CredentialUpdateRequest {
                name: "Renamed laptop".to_string(),
            },
        )
        .expect("credential updates")
        .expect("credential exists");

        assert_eq!(credential["id"], "credential-1");
        assert_eq!(credential["name"], "Renamed laptop");
        assert_eq!(credential["public_key"], "public-key");
    }

    #[test]
    fn update_rejects_other_user_credential() {
        let connection = Connection::open_in_memory().expect("database opens");
        connection
            .execute_batch(
                "CREATE TABLE ed25519_credentials (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    public_key TEXT NOT NULL,
                    last_used_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .expect("schema exists");
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
            .expect("credential inserts");

        let credential = update_credential(
            &connection,
            "credential-1",
            "user-1",
            &CredentialUpdateRequest {
                name: "Renamed tablet".to_string(),
            },
        )
        .expect("update attempts");

        assert!(credential.is_none());
    }

    #[test]
    fn deletes_user_credential() {
        let connection = Connection::open_in_memory().expect("database opens");
        connection
            .execute_batch(
                "CREATE TABLE ed25519_credentials (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    public_key TEXT NOT NULL,
                    last_used_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .expect("schema exists");
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
            .expect("credential inserts");

        let deleted =
            delete_credential(&connection, "credential-1", "user-1").expect("credential deletes");
        let remaining = list_credentials(&connection, "user-1").expect("credentials list");

        assert!(deleted);
        assert_eq!(remaining.as_array().expect("array response").len(), 0);
    }

    #[test]
    fn delete_rejects_other_user_credential() {
        let connection = Connection::open_in_memory().expect("database opens");
        connection
            .execute_batch(
                "CREATE TABLE ed25519_credentials (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    public_key TEXT NOT NULL,
                    last_used_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .expect("schema exists");
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
            .expect("credential inserts");

        let deleted =
            delete_credential(&connection, "credential-1", "user-1").expect("delete attempts");

        assert!(!deleted);
    }

    #[test]
    fn starts_authentication_challenge_for_existing_credential() {
        let connection = Connection::open_in_memory().expect("database opens");
        connection
            .execute_batch(
                "CREATE TABLE ed25519_credentials (
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
            .expect("schema exists");
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
            .expect("credential inserts");

        let challenge = start_authentication(
            &connection,
            &StartAuthenticationRequest {
                credential_id: "00000000-0000-4000-8000-000000000000".to_string(),
            },
        )
        .expect("challenge starts")
        .expect("credential exists");
        let stored_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM ed25519_challenges", [], |row| {
                row.get(0)
            })
            .expect("challenge count reads");

        assert_eq!(
            challenge["request_id"].as_str().expect("request id").len(),
            36
        );
        assert_eq!(
            challenge["challenge"].as_str().expect("challenge").len(),
            64
        );
        assert_eq!(stored_count, 1);
    }

    #[test]
    fn start_authentication_rejects_unknown_credential() {
        let connection = Connection::open_in_memory().expect("database opens");
        connection
            .execute_batch(
                "CREATE TABLE ed25519_credentials (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    public_key TEXT NOT NULL,
                    last_used_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .expect("schema exists");

        let challenge = start_authentication(
            &connection,
            &StartAuthenticationRequest {
                credential_id: "00000000-0000-4000-8000-000000000000".to_string(),
            },
        )
        .expect("challenge start attempts");

        assert!(challenge.is_none());
    }

    #[test]
    fn verifies_authentication_challenge_and_mints_ed25519_session() {
        let mut connection = Connection::open_in_memory().expect("database opens");
        create_authentication_schema(&connection);
        let signing_key = SigningKey::from_bytes(&[7; 32]);
        let public_key = base64url_encode(&signing_key.verifying_key().to_bytes());
        let signature = base64url_encode(&signing_key.sign(b"challenge").to_bytes());
        connection
            .execute(
                "INSERT INTO users (id, email) VALUES ('user-1', 'user@example.com')",
                [],
            )
            .expect("user inserts");
        connection
            .execute(
                "INSERT INTO ed25519_credentials
                 (id, user_id, name, public_key, created_at)
                 VALUES (?1, 'user-1', 'Laptop', ?2, '2026-01-01T00:00:00.000Z')",
                ("00000000-0000-4000-8000-000000000001", public_key),
            )
            .expect("credential inserts");
        connection
            .execute(
                "INSERT INTO ed25519_challenges
                 (request_id, credential_id, challenge, expires_at)
                 VALUES (?1, ?2, 'challenge', '9999-01-01T00:00:00.000Z')",
                (
                    "00000000-0000-4000-8000-000000000000",
                    "00000000-0000-4000-8000-000000000001",
                ),
            )
            .expect("challenge inserts");

        let pair = verify_authentication(
            &mut connection,
            &VerifyAuthenticationRequest {
                request_id: "00000000-0000-4000-8000-000000000000".to_string(),
                signature,
            },
            "auth-mini",
            None,
            Some("Agent/1.0"),
        )
        .expect("authentication verifies");
        let stored: (Option<String>, Option<String>, String, Option<String>) = connection
            .query_row(
                "SELECT c.consumed_at, p.last_used_at, s.auth_method, s.user_agent
                 FROM ed25519_challenges c, ed25519_credentials p, sessions s
                 WHERE c.request_id = ?1 AND p.id = ?2 AND s.id = ?3",
                [
                    "00000000-0000-4000-8000-000000000000",
                    "00000000-0000-4000-8000-000000000001",
                    &pair.session_id,
                ],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .expect("side effects read");

        assert!(!pair.access_token.is_empty());
        assert!(!pair.refresh_token.is_empty());
        assert!(stored.0.is_some());
        assert!(stored.1.is_some());
        assert_eq!(stored.2, "ed25519");
        assert_eq!(stored.3, Some("Agent/1.0".to_string()));
    }

    #[test]
    fn verify_rejects_invalid_signature_without_side_effects() {
        let mut connection = Connection::open_in_memory().expect("database opens");
        create_authentication_schema(&connection);
        let signing_key = SigningKey::from_bytes(&[7; 32]);
        let other_key = SigningKey::from_bytes(&[8; 32]);
        let public_key = base64url_encode(&signing_key.verifying_key().to_bytes());
        let signature = base64url_encode(&other_key.sign(b"challenge").to_bytes());
        connection
            .execute(
                "INSERT INTO users (id, email) VALUES ('user-1', 'user@example.com')",
                [],
            )
            .expect("user inserts");
        connection
            .execute(
                "INSERT INTO ed25519_credentials
                 (id, user_id, name, public_key, created_at)
                 VALUES (?1, 'user-1', 'Laptop', ?2, '2026-01-01T00:00:00.000Z')",
                ("00000000-0000-4000-8000-000000000001", public_key),
            )
            .expect("credential inserts");
        connection
            .execute(
                "INSERT INTO ed25519_challenges
                 (request_id, credential_id, challenge, expires_at)
                 VALUES (?1, ?2, 'challenge', '9999-01-01T00:00:00.000Z')",
                (
                    "00000000-0000-4000-8000-000000000000",
                    "00000000-0000-4000-8000-000000000001",
                ),
            )
            .expect("challenge inserts");

        let error = verify_authentication(
            &mut connection,
            &VerifyAuthenticationRequest {
                request_id: "00000000-0000-4000-8000-000000000000".to_string(),
                signature,
            },
            "auth-mini",
            None,
            None,
        )
        .expect_err("authentication rejects");
        let stored: (Option<String>, Option<String>, i64) = connection
            .query_row(
                "SELECT c.consumed_at, p.last_used_at, (SELECT COUNT(*) FROM sessions)
                 FROM ed25519_challenges c, ed25519_credentials p
                 WHERE c.request_id = ?1 AND p.id = ?2",
                [
                    "00000000-0000-4000-8000-000000000000",
                    "00000000-0000-4000-8000-000000000001",
                ],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("side effects read");

        assert_eq!(
            error,
            VerifyAuthenticationError::InvalidEd25519Authentication
        );
        assert_eq!(stored, (None, None, 0));
    }

    #[test]
    fn verify_rejects_reused_challenge() {
        let mut connection = Connection::open_in_memory().expect("database opens");
        create_authentication_schema(&connection);
        let signing_key = SigningKey::from_bytes(&[7; 32]);
        let public_key = base64url_encode(&signing_key.verifying_key().to_bytes());
        let signature = base64url_encode(&signing_key.sign(b"challenge").to_bytes());
        connection
            .execute(
                "INSERT INTO users (id, email) VALUES ('user-1', 'user@example.com')",
                [],
            )
            .expect("user inserts");
        connection
            .execute(
                "INSERT INTO ed25519_credentials
                 (id, user_id, name, public_key, created_at)
                 VALUES (?1, 'user-1', 'Laptop', ?2, '2026-01-01T00:00:00.000Z')",
                ("00000000-0000-4000-8000-000000000001", public_key),
            )
            .expect("credential inserts");
        connection
            .execute(
                "INSERT INTO ed25519_challenges
                 (request_id, credential_id, challenge, expires_at, consumed_at)
                 VALUES (?1, ?2, 'challenge', '9999-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')",
                (
                    "00000000-0000-4000-8000-000000000000",
                    "00000000-0000-4000-8000-000000000001",
                ),
            )
            .expect("challenge inserts");

        let error = verify_authentication(
            &mut connection,
            &VerifyAuthenticationRequest {
                request_id: "00000000-0000-4000-8000-000000000000".to_string(),
                signature,
            },
            "auth-mini",
            None,
            None,
        )
        .expect_err("authentication rejects");

        assert_eq!(
            error,
            VerifyAuthenticationError::InvalidEd25519Authentication
        );
    }

    fn create_authentication_schema(connection: &Connection) {
        connection
            .execute_batch(
                "CREATE TABLE users (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL,
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
                CREATE TABLE jwks_keys (
                    id TEXT PRIMARY KEY CHECK (id IN ('CURRENT', 'STANDBY')),
                    kid TEXT NOT NULL UNIQUE,
                    alg TEXT NOT NULL,
                    public_jwk TEXT NOT NULL,
                    private_jwk TEXT NOT NULL
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
            .expect("schema exists");
    }

    fn base64url_encode(bytes: &[u8]) -> String {
        const ALPHABET: &[u8; 64] =
            b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
        let mut output = String::with_capacity(bytes.len().div_ceil(3) * 4);

        for chunk in bytes.chunks(3) {
            let first = chunk[0];
            let second = chunk.get(1).copied().unwrap_or_default();
            let third = chunk.get(2).copied().unwrap_or_default();
            output.push(ALPHABET[(first >> 2) as usize] as char);
            output.push(ALPHABET[(((first & 0b0000_0011) << 4) | (second >> 4)) as usize] as char);
            if chunk.len() > 1 {
                output.push(
                    ALPHABET[(((second & 0b0000_1111) << 2) | (third >> 6)) as usize] as char,
                );
            }
            if chunk.len() > 2 {
                output.push(ALPHABET[(third & 0b0011_1111) as usize] as char);
            }
        }

        output
    }
}
