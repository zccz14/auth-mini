use rusqlite::Connection;
use serde_json::{json, Value};

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
}
