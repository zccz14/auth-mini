use std::fs;
use std::io::{self, BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub openapi_path: PathBuf,
}

impl Config {
    pub fn from_args(args: impl IntoIterator<Item = String>) -> io::Result<Self> {
        let mut config = Self::default();
        let mut args = args.into_iter();

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
                _ => {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidInput,
                        format!("unknown argument: {arg}"),
                    ));
                }
            }
        }

        Ok(config)
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 7777,
            openapi_path: PathBuf::from("openapi.yaml"),
        }
    }
}

pub fn run_server(config: Config) -> io::Result<()> {
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

    loop {
        let mut line = String::new();
        reader.read_line(&mut line)?;
        if line == "\r\n" || line == "\n" || line.is_empty() {
            break;
        }
    }

    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or_default().to_string();
    let path = parts.next().unwrap_or_default().to_string();

    Ok(Request { method, path })
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

    Ok(Response::json_error(404, "not_found"))
}

#[derive(Debug, PartialEq, Eq)]
struct Request {
    method: String,
    path: String,
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
            },
            &Config::default(),
        )
        .expect("not found response builds");

        assert_eq!(response, Response::json_error(404, "not_found"));
    }

    #[test]
    fn serializes_http_response() {
        let bytes = Response::text(200, "ok").to_http_bytes();
        let text = String::from_utf8(bytes).expect("response is utf8");

        assert!(text.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(text.contains("content-length: 2\r\n"));
        assert!(text.ends_with("\r\n\r\nok"));
    }
}
