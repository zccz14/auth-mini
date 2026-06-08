use std::fs;
use std::io::{self, BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};

use rusqlite::Connection;
use serde::Deserialize;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub openapi_path: PathBuf,
    pub database: Option<DatabaseConfig>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DatabaseConfig {
    pub db_path: PathBuf,
    pub schema_path: PathBuf,
}

impl Config {
    pub fn from_args(args: impl IntoIterator<Item = String>) -> io::Result<Self> {
        let mut config = Self::default();
        let mut args = args.into_iter();
        let mut db_path = None;
        let mut schema_path = None;

        while let Some(arg) = args.next() {
            match arg.as_str() {
                "--host" => config.host = next_arg(&mut args, "--host")?,
                "--port" => {
                    let port = next_arg(&mut args, "--port")?;
                    config.port = port.parse().map_err(|_| {
                        io::Error::new(io::ErrorKind::InvalidInput, "--port must be a u16")
                    })?;
                }
                "--openapi" => {
                    config.openapi_path = PathBuf::from(next_arg(&mut args, "--openapi")?)
                }
                "--db" => db_path = Some(PathBuf::from(next_arg(&mut args, "--db")?)),
                "--schema" => schema_path = Some(PathBuf::from(next_arg(&mut args, "--schema")?)),
                _ => {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidInput,
                        format!("unknown argument: {arg}"),
                    ));
                }
            }
        }

        if schema_path.is_some() && db_path.is_none() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "--schema requires --db",
            ));
        }

        config.database = db_path.map(|db_path| DatabaseConfig {
            db_path,
            schema_path: schema_path.unwrap_or_else(|| PathBuf::from("sql/schema.sql")),
        });

        Ok(config)
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 7777,
            openapi_path: PathBuf::from("openapi.yaml"),
            database: None,
        }
    }
}

pub fn run_server(config: Config) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(database) = &config.database {
        initialize_database(&database.db_path, &database.schema_path)?;
    }

    let listener = TcpListener::bind((config.host.as_str(), config.port))?;
    eprintln!(
        "auth-mini rust backend listening on {}:{}",
        config.host, config.port
    );

    for stream in listener.incoming() {
        handle_connection(stream?, &config)?;
    }

    Ok(())
}

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

fn next_arg(args: &mut impl Iterator<Item = String>, name: &str) -> io::Result<String> {
    args.next().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("{name} requires a value"),
        )
    })
}

fn handle_connection(mut stream: TcpStream, config: &Config) -> io::Result<()> {
    let request = read_request(&mut stream)?;
    let response = route_request(&request, config)?;
    stream.write_all(&response.to_http_bytes())
}

fn read_request(stream: &mut TcpStream) -> io::Result<Request> {
    let mut reader = BufReader::new(stream);
    let mut request_line = String::new();
    reader.read_line(&mut request_line)?;
    let mut content_length = 0;

    loop {
        let mut line = String::new();
        reader.read_line(&mut line)?;
        if line == "\r\n" || line == "\n" || line.is_empty() {
            break;
        }

        if let Some((name, value)) = line.split_once(':') {
            if name.eq_ignore_ascii_case("content-length") {
                content_length = value.trim().parse().map_err(|_| {
                    io::Error::new(io::ErrorKind::InvalidInput, "invalid content-length")
                })?;
            }
        }
    }

    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or_default().to_string();
    let path = parts.next().unwrap_or_default().to_string();
    let mut body = vec![0; content_length];
    reader.read_exact(&mut body)?;

    Ok(Request {
        method,
        path,
        body: String::from_utf8_lossy(&body).into_owned(),
    })
}

fn route_request(request: &Request, config: &Config) -> io::Result<Response> {
    if request.method == "GET" && request.path == "/healthz" {
        return Ok(Response::text(200, "ok"));
    }

    if request.method == "GET" && request.path == "/openapi.yaml" {
        let body = fs::read_to_string(&config.openapi_path)?;
        return Ok(Response::new(200, "application/yaml; charset=utf-8", body));
    }

    if request.method == "GET" && request.path == "/openapi.json" {
        return Ok(Response::json_error(501, "not_implemented"));
    }

    if request.method == "POST" && request.path == "/email/verify" {
        return Ok(handle_email_verify(request));
    }

    Ok(Response::json_error(404, "not_found"))
}

fn handle_email_verify(request: &Request) -> Response {
    match parse_email_verify_request(&request.body) {
        Ok(_) => Response::json_error(501, "not_implemented"),
        Err(_) => Response::json_error(400, "invalid_request"),
    }
}

fn parse_email_verify_request(body: &str) -> Result<EmailVerifyRequest, serde_json::Error> {
    let request: EmailVerifyRequest = serde_json::from_str(body)?;

    if is_email_address(&request.email) && is_six_digit_code(&request.code) {
        return Ok(request);
    }

    Err(serde_json::Error::io(io::Error::new(
        io::ErrorKind::InvalidInput,
        "invalid email verify request",
    )))
}

fn is_email_address(value: &str) -> bool {
    value
        .split_once('@')
        .is_some_and(|(local, domain)| !local.is_empty() && !domain.is_empty())
}

fn is_six_digit_code(value: &str) -> bool {
    value.len() == 6 && value.bytes().all(|byte| byte.is_ascii_digit())
}

#[derive(Debug, PartialEq, Eq)]
struct Request {
    method: String,
    path: String,
    body: String,
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
struct EmailVerifyRequest {
    email: String,
    code: String,
}

#[derive(Debug, PartialEq, Eq)]
struct Response {
    status: u16,
    content_type: &'static str,
    body: String,
}

impl Response {
    fn new(status: u16, content_type: &'static str, body: String) -> Self {
        Self {
            status,
            content_type,
            body,
        }
    }

    fn text(status: u16, body: &str) -> Self {
        Self::new(status, "text/plain; charset=utf-8", body.to_string())
    }

    fn json_error(status: u16, error: &str) -> Self {
        Self::new(
            status,
            "application/json; charset=utf-8",
            format!(r#"{{"error":"{error}"}}"#),
        )
    }

    fn to_http_bytes(&self) -> Vec<u8> {
        let reason = reason_phrase(self.status);
        let headers = format!(
            "HTTP/1.1 {} {}\r\ncontent-type: {}\r\ncontent-length: {}\r\nconnection: close\r\n\r\n",
            self.status,
            reason,
            self.content_type,
            self.body.len()
        );
        [headers.as_bytes(), self.body.as_bytes()].concat()
    }
}

fn reason_phrase(status: u16) -> &'static str {
    match status {
        200 => "OK",
        404 => "Not Found",
        501 => "Not Implemented",
        _ => "Internal Server Error",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_matches_existing_start_defaults() {
        let config = Config::from_args([]).expect("default config parses");

        assert_eq!(config.host, "127.0.0.1");
        assert_eq!(config.port, 7777);
        assert_eq!(config.openapi_path, PathBuf::from("openapi.yaml"));
        assert_eq!(config.database, None);
    }

    #[test]
    fn parses_explicit_config() {
        let config = Config::from_args([
            "--host".to_string(),
            "0.0.0.0".to_string(),
            "--port".to_string(),
            "8080".to_string(),
            "--openapi".to_string(),
            "../openapi.yaml".to_string(),
        ])
        .expect("explicit config parses");

        assert_eq!(config.host, "0.0.0.0");
        assert_eq!(config.port, 8080);
        assert_eq!(config.openapi_path, PathBuf::from("../openapi.yaml"));
    }

    #[test]
    fn parses_database_config() {
        let config = Config::from_args([
            "--db".to_string(),
            "target/test-dbs/app.sqlite".to_string(),
            "--schema".to_string(),
            "../sql/schema.sql".to_string(),
        ])
        .expect("database config parses");

        assert_eq!(
            config.database,
            Some(DatabaseConfig {
                db_path: PathBuf::from("target/test-dbs/app.sqlite"),
                schema_path: PathBuf::from("../sql/schema.sql"),
            })
        );
    }

    #[test]
    fn rejects_schema_without_database_path() {
        let error = Config::from_args(["--schema".to_string(), "../sql/schema.sql".to_string()])
            .expect_err("schema requires db path");

        assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
    }

    #[test]
    fn rejects_unknown_config_argument() {
        let error = Config::from_args(["--issuer".to_string(), "https://auth.example".to_string()])
            .expect_err("unknown args are rejected");

        assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
    }

    #[test]
    fn serves_health_response() {
        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/healthz".to_string(),
                body: String::new(),
            },
            &Config::default(),
        )
        .expect("health response builds");

        assert_eq!(response, Response::text(200, "ok"));
    }

    #[test]
    fn serves_openapi_yaml_from_configured_path() {
        let config = Config {
            openapi_path: PathBuf::from("../openapi.yaml"),
            ..Config::default()
        };
        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/openapi.yaml".to_string(),
                body: String::new(),
            },
            &config,
        )
        .expect("openapi yaml is read");

        assert_eq!(response.status, 200);
        assert_eq!(response.content_type, "application/yaml; charset=utf-8");
        assert!(response.body.contains("title: auth-mini HTTP API"));
    }

    #[test]
    fn marks_openapi_json_as_not_implemented() {
        let response = route_request(
            &Request {
                method: "GET".to_string(),
                path: "/openapi.json".to_string(),
                body: String::new(),
            },
            &Config::default(),
        )
        .expect("json response builds");

        assert_eq!(response, Response::json_error(501, "not_implemented"));
    }

    #[test]
    fn returns_not_found_for_unknown_paths() {
        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/email/start".to_string(),
                body: String::new(),
            },
            &Config::default(),
        )
        .expect("not found response builds");

        assert_eq!(response, Response::json_error(404, "not_found"));
    }

    #[test]
    fn accepts_email_verify_request_contract_before_business_logic_is_migrated() {
        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/email/verify".to_string(),
                body: r#"{"email":"user@example.com","code":"123456"}"#.to_string(),
            },
            &Config::default(),
        )
        .expect("email verify response builds");

        assert_eq!(response, Response::json_error(501, "not_implemented"));
    }

    #[test]
    fn rejects_invalid_email_verify_request_shape() {
        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/email/verify".to_string(),
                body: r#"{"email":"user@example.com","code":"12345"}"#.to_string(),
            },
            &Config::default(),
        )
        .expect("email verify response builds");

        assert_eq!(response, Response::json_error(400, "invalid_request"));
    }

    #[test]
    fn rejects_unknown_email_verify_request_fields() {
        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/email/verify".to_string(),
                body: r#"{"email":"user@example.com","code":"123456","extra":true}"#.to_string(),
            },
            &Config::default(),
        )
        .expect("email verify response builds");

        assert_eq!(response, Response::json_error(400, "invalid_request"));
    }

    #[test]
    fn serializes_http_response() {
        let bytes = Response::text(200, "ok").to_http_bytes();
        let text = String::from_utf8(bytes).expect("response is utf8");

        assert!(text.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(text.contains("content-length: 2\r\n"));
        assert!(text.ends_with("\r\n\r\nok"));
    }

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
