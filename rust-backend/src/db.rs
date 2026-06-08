use std::fs;
use std::path::Path;

use rusqlite::Connection;

pub fn initialize_database(
    db_path: &Path,
    schema_path: &Path,
) -> Result<(), Box<dyn std::error::Error>> {
    let schema = fs::read_to_string(schema_path)?;
    let connection = Connection::open(db_path)?;

    connection.pragma_update(None, "foreign_keys", "ON")?;
    connection.pragma_update(None, "journal_mode", "WAL")?;
    connection.execute_batch(&schema)?;
    assert_required_schema(&connection)?;

    Ok(())
}

fn assert_required_schema(connection: &Connection) -> rusqlite::Result<()> {
    let required_schema = [
        (
            "users",
            &["id", "email", "email_verified_at", "created_at"][..],
        ),
        (
            "sessions",
            &[
                "id",
                "user_id",
                "refresh_token_hash",
                "auth_method",
                "ip",
                "user_agent",
                "expires_at",
                "revoked_at",
                "created_at",
            ][..],
        ),
        (
            "jwks_keys",
            &["id", "kid", "alg", "public_jwk", "private_jwk"][..],
        ),
        ("allowed_origins", &["id", "origin", "created_at"][..]),
        (
            "webauthn_credentials",
            &[
                "id",
                "user_id",
                "credential_id",
                "public_key",
                "counter",
                "transports",
                "rp_id",
                "last_used_at",
                "created_at",
            ][..],
        ),
        (
            "ed25519_credentials",
            &[
                "id",
                "user_id",
                "name",
                "public_key",
                "last_used_at",
                "created_at",
            ][..],
        ),
    ];

    for (table_name, column_names) in required_schema {
        assert_table_columns(connection, table_name, column_names)?;
    }

    Ok(())
}

fn assert_table_columns(
    connection: &Connection,
    table_name: &str,
    column_names: &[&str],
) -> rusqlite::Result<()> {
    let table_exists: bool = connection.query_row(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1)",
        [table_name],
        |row| row.get(0),
    )?;

    if !table_exists {
        return Err(rusqlite::Error::InvalidColumnName(table_name.to_string()));
    }

    for column_name in column_names {
        let column_exists = table_has_column(connection, table_name, column_name)?;

        if !column_exists {
            return Err(rusqlite::Error::InvalidColumnName(format!(
                "{table_name}.{column_name}"
            )));
        }
    }

    Ok(())
}

fn table_has_column(
    connection: &Connection,
    table_name: &str,
    column_name: &str,
) -> rusqlite::Result<bool> {
    let sql = format!("PRAGMA table_info({table_name})");
    let mut statement = connection.prepare(&sql)?;
    let rows = statement.query_map([], |row| row.get::<_, String>(1))?;

    for row in rows {
        if row? == column_name {
            return Ok(true);
        }
    }

    Ok(false)
}

#[cfg(test)]
mod tests {
    use std::path::{Path, PathBuf};

    use super::*;

    #[test]
    fn initializes_sqlite_database_from_schema_contract() {
        let db_path = test_db_path("schema-contract");
        initialize_database(&db_path, Path::new("../sql/schema.sql"))
            .expect("database initializes from schema");

        let connection = Connection::open(db_path).expect("database opens");
        assert_required_schema(&connection).expect("required schema is present");
    }

    #[test]
    fn rejects_database_missing_required_columns() {
        let db_path = test_db_path("missing-required-column");
        let connection = Connection::open(&db_path).expect("database opens");
        connection
            .execute_batch("CREATE TABLE users (id TEXT PRIMARY KEY);")
            .expect("test schema is created");

        let error = assert_required_schema(&connection).expect_err("missing schema is rejected");
        assert!(matches!(error, rusqlite::Error::InvalidColumnName(_)));
    }

    fn test_db_path(name: &str) -> PathBuf {
        let directory = PathBuf::from("target/test-dbs");
        fs::create_dir_all(&directory).expect("test db directory exists");

        directory.join(format!("{name}-{}.sqlite", std::process::id()))
    }
}
