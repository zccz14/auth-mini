use std::io::{self, BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};

use crate::config::Config;
use crate::db::initialize_database;
use crate::email_verify::{
    consume_email_verify_otp, parse_email_verify_request, EmailVerifyOutcome,
};
use crate::openapi::read_openapi_yaml;

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
        let body = read_openapi_yaml(&config.openapi_path)?;
        return Ok(Response::new(200, "application/yaml; charset=utf-8", body));
    }

    if request.method == "GET" && request.path == "/openapi.json" {
        return Ok(Response::json_error(501, "not_implemented"));
    }

    if request.method == "POST" && request.path == "/email/verify" {
        return handle_email_verify(request, config);
    }

    Ok(Response::json_error(404, "not_found"))
}

fn handle_email_verify(request: &Request, config: &Config) -> io::Result<Response> {
    let parsed = match parse_email_verify_request(&request.body) {
        Ok(parsed) => parsed,
        Err(_) => return Ok(Response::json_error(400, "invalid_request")),
    };

    let Some(database) = &config.database else {
        return Ok(Response::json_error(501, "not_implemented"));
    };

    match consume_email_verify_otp(&database.db_path, &parsed)
        .map_err(|error| io::Error::new(io::ErrorKind::Other, error))?
    {
        EmailVerifyOutcome::InvalidOtp => Ok(Response::json_error(401, "invalid_email_otp")),
        EmailVerifyOutcome::OtpConsumed => Ok(Response::json_error(501, "not_implemented")),
    }
}

#[derive(Debug, PartialEq, Eq)]
struct Request {
    method: String,
    path: String,
    body: String,
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
        401 => "Unauthorized",
        404 => "Not Found",
        501 => "Not Implemented",
        _ => "Internal Server Error",
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use rusqlite::Connection;

    use super::*;

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
    fn consumes_valid_email_verify_otp_before_session_logic_is_migrated() {
        let db_path = test_db_path("http-consumes-email-otp");
        let connection = Connection::open(&db_path).expect("database opens");
        connection
            .execute_batch(
                "CREATE TABLE email_otps (
                    email TEXT PRIMARY KEY,
                    code_hash TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    consumed_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .expect("email_otps table exists");
        connection
            .execute(
                "INSERT INTO email_otps (email, code_hash, expires_at) VALUES (?1, ?2, ?3)",
                (
                    "user@example.com",
                    "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
                    "9999-01-01T00:00:00.000Z",
                ),
            )
            .expect("email otp inserted");
        drop(connection);
        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/email/verify".to_string(),
                body: r#"{"email":"user@example.com","code":"123456"}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path: db_path.clone(),
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
                ..Config::default()
            },
        )
        .expect("email verify response builds");

        let connection = Connection::open(db_path).expect("database opens");
        let consumed_at: Option<String> = connection
            .query_row(
                "SELECT consumed_at FROM email_otps WHERE email = ?1",
                ["user@example.com"],
                |row| row.get(0),
            )
            .expect("consumed_at reads");

        assert_eq!(response, Response::json_error(501, "not_implemented"));
        assert!(consumed_at.is_some());
    }

    #[test]
    fn rejects_invalid_email_verify_otp_over_http_boundary() {
        let db_path = test_db_path("http-rejects-email-otp");
        let connection = Connection::open(&db_path).expect("database opens");
        connection
            .execute_batch(
                "CREATE TABLE email_otps (
                    email TEXT PRIMARY KEY,
                    code_hash TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    consumed_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .expect("email_otps table exists");
        drop(connection);

        let response = route_request(
            &Request {
                method: "POST".to_string(),
                path: "/email/verify".to_string(),
                body: r#"{"email":"missing@example.com","code":"123456"}"#.to_string(),
            },
            &Config {
                database: Some(crate::DatabaseConfig {
                    db_path,
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
                ..Config::default()
            },
        )
        .expect("email verify response builds");

        assert_eq!(response, Response::json_error(401, "invalid_email_otp"));
    }

    #[test]
    fn rejects_invalid_email_verify_request_over_http_boundary() {
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
    fn serializes_http_response() {
        let bytes = Response::text(200, "ok").to_http_bytes();
        let text = String::from_utf8(bytes).expect("response is utf8");

        assert!(text.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(text.contains("content-length: 2\r\n"));
        assert!(text.ends_with("\r\n\r\nok"));
    }

    fn test_db_path(name: &str) -> PathBuf {
        let directory = PathBuf::from("target/test-dbs");
        std::fs::create_dir_all(&directory).expect("test db directory exists");

        directory.join(format!("{name}-{}.sqlite", std::process::id()))
    }
}
