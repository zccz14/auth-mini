use rusqlite::{params, Connection};

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
}
