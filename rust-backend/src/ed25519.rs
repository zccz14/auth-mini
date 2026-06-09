use chrono::{SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::Deserialize;
use serde_json::{json, Value};

#[derive(Debug, Deserialize, PartialEq, Eq)]
pub(crate) struct CredentialCreateRequest {
    pub(crate) name: String,
    pub(crate) public_key: String,
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
pub(crate) struct CredentialUpdateRequest {
    pub(crate) name: String,
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

fn invalid_request_error(message: &str) -> serde_json::Error {
    serde_json::Error::io(std::io::Error::new(
        std::io::ErrorKind::InvalidInput,
        message,
    ))
}

#[cfg(test)]
mod tests {
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
}
