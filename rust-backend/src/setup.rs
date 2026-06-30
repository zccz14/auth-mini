use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use url::{Host, Url};

use crate::ed25519::{create_credential, CredentialCreateRequest};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct AdminSetupState {
    pub issuer: String,
    pub admin_user_id: Option<String>,
    pub admin_ed25519: Option<AdminEd25519CredentialSummary>,
    pub origins: Vec<AllowedOrigin>,
    pub smtp: Option<SmtpConfigSummary>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct AllowedOrigin {
    pub id: i64,
    pub origin: String,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct SmtpConfigSummary {
    pub id: i64,
    pub host: String,
    pub port: i64,
    pub username: String,
    pub from_email: String,
    pub from_name: String,
    pub secure: bool,
    pub is_active: bool,
    pub weight: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct AdminSetupRequest {
    pub admin_ed25519: AdminEd25519Input,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct AdminConfigRequest {
    pub issuer: String,
    pub origin: String,
    pub smtp: Option<SmtpConfigInput>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct AdminEd25519Input {
    pub name: String,
    pub public_key: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct AdminEd25519CredentialSummary {
    pub id: String,
    pub name: String,
    pub public_key: String,
    pub last_used_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct SmtpConfigInput {
    pub host: String,
    pub port: i64,
    pub username: String,
    pub password: String,
    pub from_email: String,
    #[serde(default)]
    pub from_name: String,
    #[serde(default)]
    pub secure: bool,
    #[serde(default = "default_weight")]
    pub weight: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SetupError {
    AlreadyInitialized,
    InvalidRequest,
    Database,
}

pub fn parse_admin_setup_request(body: &str) -> Result<AdminSetupRequest, SetupError> {
    serde_json::from_str(body).map_err(|_| SetupError::InvalidRequest)
}

pub fn parse_admin_config_request(body: &str) -> Result<AdminConfigRequest, SetupError> {
    serde_json::from_str(body).map_err(|_| SetupError::InvalidRequest)
}

pub fn read_admin_setup(connection: &Connection) -> Result<AdminSetupState, SetupError> {
    let (issuer, admin_user_id) = read_app_meta(connection)?;
    Ok(AdminSetupState {
        issuer,
        admin_ed25519: admin_user_id
            .as_deref()
            .map(|user_id| admin_ed25519_summary(connection, user_id))
            .transpose()?
            .flatten(),
        admin_user_id,
        origins: list_allowed_origins(connection)?,
        smtp: first_smtp_config(connection)?,
    })
}

pub fn apply_admin_setup(
    connection: &Connection,
    request: &AdminSetupRequest,
) -> Result<AdminSetupState, SetupError> {
    if read_app_meta(connection)?.1.is_some() {
        return Err(SetupError::AlreadyInitialized);
    }
    upsert_admin_ed25519(connection, &request.admin_ed25519)?;
    read_admin_setup(connection)
}

pub fn apply_admin_config(
    connection: &Connection,
    request: &AdminConfigRequest,
) -> Result<AdminSetupState, SetupError> {
    let issuer = normalize_allowed_origin(&request.issuer)?;
    update_issuer(connection, &issuer)?;
    upsert_allowed_origin(connection, &request.origin)?;
    if let Some(smtp) = &request.smtp {
        upsert_smtp_config(connection, smtp)?;
    }
    read_admin_setup(connection)
}

fn read_app_meta(connection: &Connection) -> Result<(String, Option<String>), SetupError> {
    connection
        .query_row(
            "SELECT issuer, admin_user_id FROM app_meta WHERE id = 'APP'",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| SetupError::Database)
}

fn update_issuer(connection: &Connection, issuer: &str) -> Result<(), SetupError> {
    connection
        .execute(
            "UPDATE app_meta SET issuer = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = 'APP'",
            [issuer],
        )
        .map_err(|_| SetupError::Database)?;

    Ok(())
}

fn upsert_admin_ed25519(
    connection: &Connection,
    input: &AdminEd25519Input,
) -> Result<(), SetupError> {
    let request = CredentialCreateRequest {
        name: input.name.clone(),
        public_key: input.public_key.clone(),
    };
    crate::ed25519::validate_credential_create_request(&request)
        .map_err(|_| SetupError::InvalidRequest)?;
    let user_id = ensure_admin_user(connection)?;
    let existing_id = existing_admin_ed25519_id(connection, &user_id, &input.public_key)?;

    match existing_id {
        Some(id) => update_admin_ed25519_name(connection, &id, &input.name),
        None => create_credential(connection, &user_id, &request)
            .map(|_| ())
            .map_err(|_| SetupError::Database),
    }
}

fn ensure_admin_user(connection: &Connection) -> Result<String, SetupError> {
    let (_, admin_user_id) = read_app_meta(connection)?;
    if let Some(user_id) = admin_user_id {
        return Ok(user_id);
    }

    let user_id = connection
        .query_row(
            "INSERT INTO users (id, email)
             VALUES (
                lower(hex(randomblob(4))) || '-' ||
                lower(hex(randomblob(2))) || '-' ||
                '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
                substr('89ab', (random() & 3) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
                lower(hex(randomblob(6))),
                NULL
             )
             RETURNING id",
            [],
            |row| row.get::<_, String>(0),
        )
        .map_err(|_| SetupError::Database)?;
    connection
        .execute(
            "UPDATE app_meta SET admin_user_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = 'APP'",
            [&user_id],
        )
        .map_err(|_| SetupError::Database)?;

    Ok(user_id)
}

fn existing_admin_ed25519_id(
    connection: &Connection,
    user_id: &str,
    public_key: &str,
) -> Result<Option<String>, SetupError> {
    connection
        .query_row(
            "SELECT id FROM ed25519_credentials WHERE user_id = ?1 AND public_key = ?2 LIMIT 1",
            params![user_id, public_key],
            |row| row.get(0),
        )
        .optional()
        .map_err(|_| SetupError::Database)
}

fn update_admin_ed25519_name(
    connection: &Connection,
    credential_id: &str,
    name: &str,
) -> Result<(), SetupError> {
    connection
        .execute(
            "UPDATE ed25519_credentials SET name = ?1 WHERE id = ?2",
            params![name, credential_id],
        )
        .map_err(|_| SetupError::Database)?;

    Ok(())
}

fn admin_ed25519_summary(
    connection: &Connection,
    user_id: &str,
) -> Result<Option<AdminEd25519CredentialSummary>, SetupError> {
    connection
        .query_row(
            "SELECT id, name, public_key, last_used_at, created_at
             FROM ed25519_credentials WHERE user_id = ?1 ORDER BY created_at ASC, id ASC LIMIT 1",
            [user_id],
            |row| {
                Ok(AdminEd25519CredentialSummary {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    public_key: row.get(2)?,
                    last_used_at: row.get(3)?,
                    created_at: row.get(4)?,
                })
            },
        )
        .optional()
        .map_err(|_| SetupError::Database)
}

fn list_allowed_origins(connection: &Connection) -> Result<Vec<AllowedOrigin>, SetupError> {
    let mut statement = connection
        .prepare("SELECT id, origin, created_at FROM allowed_origins ORDER BY id ASC")
        .map_err(|_| SetupError::Database)?;
    let rows = statement
        .query_map([], |row| {
            Ok(AllowedOrigin {
                id: row.get(0)?,
                origin: row.get(1)?,
                created_at: row.get(2)?,
            })
        })
        .map_err(|_| SetupError::Database)?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| SetupError::Database)
}

fn upsert_allowed_origin(connection: &Connection, input: &str) -> Result<(), SetupError> {
    let origin = normalize_allowed_origin(input)?;
    connection
        .execute(
            "INSERT OR IGNORE INTO allowed_origins (origin) VALUES (?1)",
            [origin],
        )
        .map_err(|_| SetupError::Database)?;

    Ok(())
}

fn first_smtp_config(connection: &Connection) -> Result<Option<SmtpConfigSummary>, SetupError> {
    connection
        .query_row(
            "SELECT id, host, port, username, from_email, from_name, secure, is_active, weight FROM smtp_configs ORDER BY id ASC LIMIT 1",
            [],
            map_smtp_summary_row,
        )
        .optional()
        .map_err(|_| SetupError::Database)
}

fn upsert_smtp_config(connection: &Connection, input: &SmtpConfigInput) -> Result<(), SetupError> {
    validate_smtp_config(input)?;
    let id = connection
        .query_row(
            "SELECT id FROM smtp_configs ORDER BY id ASC LIMIT 1",
            [],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|_| SetupError::Database)?;

    match id {
        Some(id) => update_smtp_config(connection, id, input),
        None => insert_smtp_config(connection, input),
    }
}

fn insert_smtp_config(connection: &Connection, input: &SmtpConfigInput) -> Result<(), SetupError> {
    connection
        .execute(
            "INSERT INTO smtp_configs (host, port, username, password, from_email, from_name, secure, weight) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                input.host,
                input.port,
                input.username,
                input.password,
                input.from_email,
                input.from_name,
                bool_to_i64(input.secure),
                input.weight
            ],
        )
        .map_err(|_| SetupError::Database)?;

    Ok(())
}

fn update_smtp_config(
    connection: &Connection,
    id: i64,
    input: &SmtpConfigInput,
) -> Result<(), SetupError> {
    connection
        .execute(
            "UPDATE smtp_configs SET host = ?1, port = ?2, username = ?3, password = ?4, from_email = ?5, from_name = ?6, secure = ?7, weight = ?8 WHERE id = ?9",
            params![
                input.host,
                input.port,
                input.username,
                input.password,
                input.from_email,
                input.from_name,
                bool_to_i64(input.secure),
                input.weight,
                id
            ],
        )
        .map_err(|_| SetupError::Database)?;

    Ok(())
}

fn validate_smtp_config(input: &SmtpConfigInput) -> Result<(), SetupError> {
    if input.host.trim().is_empty()
        || input.port <= 0
        || input.username.trim().is_empty()
        || input.password.is_empty()
        || input.from_email.trim().is_empty()
        || input.weight <= 0
    {
        return Err(SetupError::InvalidRequest);
    }

    Ok(())
}

fn normalize_allowed_origin(input: &str) -> Result<String, SetupError> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err(SetupError::InvalidRequest);
    }

    let url = Url::parse(trimmed).map_err(|_| SetupError::InvalidRequest)?;
    if url.scheme() != "http" && url.scheme() != "https" {
        return Err(SetupError::InvalidRequest);
    }
    if url.username() != ""
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(SetupError::InvalidRequest);
    }
    if url.path() != "/" {
        return Err(SetupError::InvalidRequest);
    }

    let host = format_origin_host(url.host().ok_or(SetupError::InvalidRequest)?);
    let port = url
        .port()
        .map(|port| format!(":{port}"))
        .unwrap_or_default();
    Ok(format!("{}://{}{}", url.scheme(), host, port))
}

fn format_origin_host(host: Host<&str>) -> String {
    match host {
        Host::Domain(domain) => domain.trim_end_matches('.').to_ascii_lowercase(),
        Host::Ipv4(address) => address.to_string(),
        Host::Ipv6(address) => format!("[{address}]"),
    }
}

fn map_smtp_summary_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<SmtpConfigSummary> {
    Ok(SmtpConfigSummary {
        id: row.get(0)?,
        host: row.get(1)?,
        port: row.get(2)?,
        username: row.get(3)?,
        from_email: row.get(4)?,
        from_name: row.get(5)?,
        secure: i64_to_bool(row.get(6)?),
        is_active: i64_to_bool(row.get(7)?),
        weight: row.get(8)?,
    })
}

fn default_weight() -> i64 {
    1
}

fn bool_to_i64(value: bool) -> i64 {
    if value {
        return 1;
    }

    0
}

fn i64_to_bool(value: i64) -> bool {
    value != 0
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_database_from_schema;

    #[test]
    fn admin_setup_writes_origin_and_smtp_without_returning_password() {
        let connection = test_connection("setup-roundtrip");
        let request = AdminConfigRequest {
            issuer: "https://auth.example.com".to_string(),
            origin: "https://DEMO.example.com".to_string(),
            smtp: Some(SmtpConfigInput {
                host: "smtp.example.com".to_string(),
                port: 587,
                username: "mailer".to_string(),
                password: "secret".to_string(),
                from_email: "noreply@example.com".to_string(),
                from_name: "Auth Mini".to_string(),
                secure: true,
                weight: 2,
            }),
        };

        let state = apply_admin_config(&connection, &request).expect("setup applies");

        assert_eq!(state.issuer, "https://auth.example.com");
        assert_eq!(state.origins[0].origin, "https://demo.example.com");
        assert_eq!(
            state.smtp.as_ref().expect("smtp exists").host,
            "smtp.example.com"
        );
        let body = serde_json::to_string(&state).expect("state serializes");
        assert!(!body.contains("secret"));
    }

    #[test]
    fn admin_setup_updates_existing_smtp_config() {
        let connection = test_connection("setup-update");
        let mut request = valid_request();
        apply_admin_config(&connection, &request).expect("initial setup applies");
        request.smtp.as_mut().expect("smtp exists").host = "smtp-2.example.com".to_string();

        let state = apply_admin_config(&connection, &request).expect("setup updates");

        assert_eq!(state.smtp.as_ref().expect("smtp exists").id, 1);
        assert_eq!(
            state.smtp.as_ref().expect("smtp exists").host,
            "smtp-2.example.com"
        );
    }

    #[test]
    fn admin_setup_rejects_invalid_origin_and_smtp() {
        assert_eq!(
            normalize_allowed_origin("ftp://example.com"),
            Err(SetupError::InvalidRequest)
        );
        let mut request = valid_request();
        request.smtp.as_mut().expect("smtp exists").port = 0;
        assert_eq!(
            validate_smtp_config(request.smtp.as_ref().expect("smtp exists")),
            Err(SetupError::InvalidRequest)
        );
    }

    #[test]
    fn admin_setup_creates_admin_ed25519_without_smtp_or_email() {
        let connection = test_connection("setup-admin-ed25519");
        let request = AdminSetupRequest {
            admin_ed25519: AdminEd25519Input {
                name: "Admin key".to_string(),
                public_key: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA".to_string(),
            },
        };

        let state = apply_admin_setup(&connection, &request).expect("setup applies");

        let admin_user_id = state.admin_user_id.expect("admin user id exists");
        assert_eq!(state.issuer, "http://localhost:7777");
        assert_eq!(
            state.admin_ed25519.expect("admin credential exists").name,
            "Admin key"
        );
        let email: Option<String> = connection
            .query_row(
                "SELECT email FROM users WHERE id = ?1",
                [admin_user_id],
                |row| row.get(0),
            )
            .expect("admin email reads");
        assert_eq!(email, None);
        assert_eq!(state.smtp, None);
    }

    fn valid_request() -> AdminConfigRequest {
        AdminConfigRequest {
            issuer: "https://auth.example.com".to_string(),
            origin: "https://demo.example.com".to_string(),
            smtp: Some(SmtpConfigInput {
                host: "smtp.example.com".to_string(),
                port: 587,
                username: "mailer".to_string(),
                password: "secret".to_string(),
                from_email: "noreply@example.com".to_string(),
                from_name: "Auth Mini".to_string(),
                secure: true,
                weight: 1,
            }),
        }
    }

    fn test_connection(name: &str) -> Connection {
        let db_path = std::path::PathBuf::from(format!(
            "target/test-dbs/auth-mini-{name}-{}.sqlite",
            std::process::id()
        ));
        let _ = std::fs::remove_file(&db_path);
        initialize_database_from_schema(&db_path, include_str!("../../sql/schema.sql"))
            .expect("database initializes");
        let connection = Connection::open(db_path).expect("database opens");
        connection
            .execute(
                "INSERT OR IGNORE INTO app_meta (id, issuer) VALUES ('APP', 'http://localhost:7777')",
                [],
            )
            .expect("app meta exists");
        connection
    }
}
