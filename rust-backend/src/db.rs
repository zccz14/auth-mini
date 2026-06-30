use std::fs;
use std::path::Path;

use rusqlite::Connection;

use crate::jwks::bootstrap_keys;

const SCHEMA_SQL: &str = include_str!("../../sql/schema.sql");
const DEFAULT_ISSUER: &str = "http://localhost:7777";

pub fn initialize_database(
    db_path: &Path,
    schema_path: &Path,
) -> Result<(), Box<dyn std::error::Error>> {
    let schema = fs::read_to_string(schema_path)?;

    initialize_database_from_schema(db_path, &schema)
}

pub fn initialize_runtime_database(db_path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    initialize_database_from_schema(db_path, SCHEMA_SQL)?;
    let connection = Connection::open(db_path)?;
    migrate_runtime_schema(&connection)?;
    ensure_app_meta(&connection)?;
    bootstrap_keys(&connection)?;

    Ok(())
}

pub fn initialize_database_from_schema(
    db_path: &Path,
    schema: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(parent) = db_path.parent().filter(|path| !path.as_os_str().is_empty()) {
        fs::create_dir_all(parent)?;
    }

    let connection = Connection::open(db_path)?;

    connection.pragma_update(None, "foreign_keys", "ON")?;
    connection.pragma_update(None, "journal_mode", "WAL")?;
    connection.execute_batch(schema)?;
    ensure_app_meta(&connection)?;
    assert_required_schema(&connection)?;

    Ok(())
}

pub(crate) fn read_app_issuer(connection: &Connection) -> rusqlite::Result<String> {
    connection.query_row("SELECT issuer FROM app_meta WHERE id = 'APP'", [], |row| {
        row.get(0)
    })
}

fn migrate_runtime_schema(connection: &Connection) -> rusqlite::Result<()> {
    // COMPATIBILITY: SQLite files created before app_meta allowed only non-null
    // users.email. Remove after old auth-mini SQLite files no longer need
    // automatic runtime upgrade support.
    if users_email_is_not_null(connection)? {
        connection.execute_batch("DROP TABLE IF EXISTS app_meta;")?;
        rebuild_users_with_nullable_email(connection)?;
    }
    connection.execute_batch(
        "CREATE TABLE IF NOT EXISTS app_meta (
            id TEXT PRIMARY KEY CHECK (id = 'APP'),
            issuer TEXT NOT NULL,
            admin_user_id TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL
        );",
    )?;

    Ok(())
}

fn ensure_app_meta(connection: &Connection) -> rusqlite::Result<()> {
    connection.execute(
        "INSERT OR IGNORE INTO app_meta (id, issuer) VALUES ('APP', ?1)",
        [DEFAULT_ISSUER],
    )?;

    Ok(())
}

fn assert_required_schema(connection: &Connection) -> rusqlite::Result<()> {
    let required_schema = [
        (
            "users",
            &["id", "email", "email_verified_at", "created_at"][..],
        ),
        (
            "app_meta",
            &["id", "issuer", "admin_user_id", "created_at", "updated_at"][..],
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
        (
            "email_otps",
            &[
                "email",
                "code_hash",
                "expires_at",
                "consumed_at",
                "created_at",
            ][..],
        ),
        (
            "smtp_configs",
            &[
                "id",
                "host",
                "port",
                "username",
                "password",
                "from_email",
                "from_name",
                "secure",
                "is_active",
                "weight",
            ][..],
        ),
        ("allowed_origins", &["id", "origin", "created_at"][..]),
        (
            "webauthn_credentials",
            &[
                "credential_id",
                "user_id",
                "passkey_json",
                "rp_id",
                "last_used_at",
                "created_at",
            ][..],
        ),
        (
            "webauthn_challenges",
            &[
                "request_id",
                "type",
                "state_json",
                "user_id",
                "expires_at",
                "rp_id",
                "origin",
                "consumed_at",
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
        (
            "ed25519_challenges",
            &[
                "request_id",
                "credential_id",
                "challenge",
                "expires_at",
                "consumed_at",
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

fn users_email_is_not_null(connection: &Connection) -> rusqlite::Result<bool> {
    let mut statement = connection.prepare("PRAGMA table_info(users)")?;
    let rows = statement.query_map([], |row| {
        Ok((row.get::<_, String>(1)?, row.get::<_, i64>(3)?))
    })?;

    for row in rows {
        let (column_name, not_null) = row?;
        if column_name == "email" {
            return Ok(not_null == 1);
        }
    }

    Ok(false)
}

fn rebuild_users_with_nullable_email(connection: &Connection) -> rusqlite::Result<()> {
    connection.pragma_update(None, "foreign_keys", "OFF")?;
    connection.pragma_update(None, "legacy_alter_table", "ON")?;
    let result = connection.execute_batch(
        "ALTER TABLE users RENAME TO users_old;
         CREATE TABLE users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            email_verified_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
         );
         INSERT INTO users (id, email, email_verified_at, created_at)
            SELECT id, email, email_verified_at, created_at FROM users_old;
         DROP TABLE users_old;",
    );
    connection.pragma_update(None, "legacy_alter_table", "OFF")?;
    connection.pragma_update(None, "foreign_keys", "ON")?;

    result
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
    fn runtime_database_initializes_embedded_schema_and_jwks_idempotently() {
        let db_path = test_db_path("runtime-implicit");

        initialize_runtime_database(&db_path).expect("runtime database initializes");
        let first_connection = Connection::open(&db_path).expect("database opens");
        let first_current_kid: String = first_connection
            .query_row(
                "SELECT kid FROM jwks_keys WHERE id = 'CURRENT'",
                [],
                |row| row.get(0),
            )
            .expect("current key reads");
        drop(first_connection);

        initialize_runtime_database(&db_path).expect("existing runtime database still initializes");

        let connection = Connection::open(db_path).expect("database opens");
        assert_required_schema(&connection).expect("required schema is present");
        let issuer = read_app_issuer(&connection).expect("app issuer reads");
        assert_eq!(issuer, "http://localhost:7777");
        let keys: i64 = connection
            .query_row("SELECT COUNT(*) FROM jwks_keys", [], |row| row.get(0))
            .expect("jwks count reads");
        assert_eq!(keys, 2);
        let current_kid: String = connection
            .query_row(
                "SELECT kid FROM jwks_keys WHERE id = 'CURRENT'",
                [],
                |row| row.get(0),
            )
            .expect("current key reads");
        assert_eq!(current_kid, first_current_kid);
    }

    #[test]
    fn runtime_database_allows_users_without_email() {
        let db_path = test_db_path("nullable-email");
        initialize_runtime_database(&db_path).expect("runtime database initializes");
        let connection = Connection::open(db_path).expect("database opens");

        connection
            .execute(
                "INSERT INTO users (id, email) VALUES ('admin-1', NULL), ('admin-2', NULL)",
                [],
            )
            .expect("nullable email users insert");
    }

    #[test]
    fn runtime_database_migrates_legacy_users_not_null_email() {
        let db_path = test_db_path("legacy-users-email");
        let connection = Connection::open(&db_path).expect("database opens");
        connection
            .execute_batch(
                "CREATE TABLE users (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL UNIQUE,
                    email_verified_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .expect("legacy users table is created");
        drop(connection);

        initialize_runtime_database(&db_path).expect("legacy database migrates");
        let connection = Connection::open(db_path).expect("database opens");
        assert!(!users_email_is_not_null(&connection).expect("email nullability reads"));
        connection
            .execute("INSERT INTO users (id, email) VALUES ('admin-1', NULL)", [])
            .expect("nullable email insert succeeds after migration");
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
