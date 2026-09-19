use std::io;

use rusqlite::{Connection, OptionalExtension};
use serde_json::{json, Value};

use crate::session::hash_value;

pub(crate) fn token_status(connection: &Connection) -> io::Result<Value> {
    let created_at: Option<String> = connection
        .query_row(
            "SELECT created_at FROM user_directory_token WHERE id=1",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(io::Error::other)?;
    Ok(json!({"configured": created_at.is_some(), "created_at": created_at}))
}

pub(crate) fn rotate_token(connection: &Connection) -> io::Result<Value> {
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes).map_err(|error| io::Error::other(error.to_string()))?;
    let token = format!(
        "am_uid_{}",
        bytes
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect::<String>()
    );
    connection
        .execute(
            "INSERT INTO user_directory_token(id,token_hash) VALUES(1,?1)
         ON CONFLICT(id) DO UPDATE SET token_hash=excluded.token_hash,created_at=CURRENT_TIMESTAMP",
            [hash_value(&token)],
        )
        .map_err(io::Error::other)?;
    Ok(json!({"token": token}))
}

pub(crate) fn authenticate(connection: &Connection, token: &str) -> io::Result<bool> {
    if token.len() != 71 || !token.starts_with("am_uid_") {
        return Ok(false);
    }
    connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM user_directory_token WHERE id=1 AND token_hash=?1)",
            [hash_value(token)],
            |row| row.get(0),
        )
        .map_err(io::Error::other)
}

pub(crate) fn user_ids(connection: &Connection) -> io::Result<Value> {
    let mut statement = connection
        .prepare("SELECT id FROM users ORDER BY id")
        .map_err(io::Error::other)?;
    let ids = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(io::Error::other)?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(io::Error::other)?;
    Ok(json!({"user_ids": ids}))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn token_is_hash_only_rotatable_and_revocable() {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(include_str!("../../sql/schema.sql"))
            .unwrap();
        assert_eq!(
            token_status(&connection).unwrap(),
            json!({"configured": false, "created_at": null})
        );
        let first = rotate_token(&connection).unwrap()["token"]
            .as_str()
            .unwrap()
            .to_owned();
        assert_eq!(first.len(), 71);
        assert!(authenticate(&connection, &first).unwrap());
        let stored: String = connection
            .query_row("SELECT token_hash FROM user_directory_token", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(stored, hash_value(&first));
        assert!(!token_status(&connection)
            .unwrap()
            .to_string()
            .contains(&first));
        let second = rotate_token(&connection).unwrap()["token"]
            .as_str()
            .unwrap()
            .to_owned();
        assert_ne!(first, second);
        assert!(!authenticate(&connection, &first).unwrap());
        assert!(authenticate(&connection, &second).unwrap());
        connection
            .execute("DELETE FROM user_directory_token", [])
            .unwrap();
        assert!(!authenticate(&connection, &second).unwrap());
    }

    #[test]
    fn directory_does_not_truncate_large_user_lists() {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(include_str!("../../sql/schema.sql"))
            .unwrap();
        for index in 0..250 {
            connection
                .execute(
                    "INSERT INTO users(id) VALUES(?1)",
                    [format!("00000000-0000-4000-8000-{index:012}")],
                )
                .unwrap();
        }
        let response = user_ids(&connection).unwrap();
        assert_eq!(response.as_object().unwrap().len(), 1);
        assert_eq!(response["user_ids"].as_array().unwrap().len(), 250);
    }

    #[test]
    fn full_directory_contains_only_ids_including_email_less_users() {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(include_str!("../../sql/schema.sql"))
            .unwrap();
        assert_eq!(user_ids(&connection).unwrap(), json!({"user_ids": []}));
        connection
            .execute(
                "INSERT INTO users(id,email) VALUES('z','secret@example.com'),('a',NULL)",
                [],
            )
            .unwrap();
        assert_eq!(
            user_ids(&connection).unwrap(),
            json!({"user_ids": ["a", "z"]})
        );
    }
}
