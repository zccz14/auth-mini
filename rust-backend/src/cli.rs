use std::io::{self, Write};
use std::path::PathBuf;

use rusqlite::{params, Connection, OptionalExtension};
use url::{Host, Url};

use crate::db::initialize_database_from_schema;

const SCHEMA_SQL: &str = include_str!("../../sql/schema.sql");

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AppCommand {
    Serve(crate::Config),
    Origin(OriginCommand),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum OriginCommand {
    Add {
        db_path: PathBuf,
        value: String,
    },
    List {
        db_path: PathBuf,
    },
    Update {
        db_path: PathBuf,
        id: i64,
        value: String,
    },
    Delete {
        db_path: PathBuf,
        id: i64,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct AllowedOrigin {
    id: i64,
    origin: String,
    created_at: String,
}

pub fn parse_app_command(args: impl IntoIterator<Item = String>) -> io::Result<AppCommand> {
    let args = args.into_iter().collect::<Vec<_>>();

    if args.first().map(|arg| arg.as_str()) == Some("origin") {
        return parse_origin_command(&args[1..]).map(AppCommand::Origin);
    }

    crate::Config::from_args(args).map(AppCommand::Serve)
}

pub fn run_origin_command(command: OriginCommand, writer: &mut impl Write) -> io::Result<()> {
    match command {
        OriginCommand::Add { db_path, value } => {
            let connection = open_cli_database(&db_path)?;
            let origin = insert_allowed_origin(&connection, &value)?;
            write_origin(writer, &origin)?;
        }
        OriginCommand::List { db_path } => {
            let connection = open_cli_database(&db_path)?;
            let origins = list_allowed_origins(&connection)?;

            for origin in origins {
                write_origin(writer, &origin)?;
            }
        }
        OriginCommand::Update { db_path, id, value } => {
            let connection = open_cli_database(&db_path)?;
            let origin = update_allowed_origin(&connection, id, &value)?;
            write_origin(writer, &origin)?;
        }
        OriginCommand::Delete { db_path, id } => {
            let connection = open_cli_database(&db_path)?;
            delete_allowed_origin(&connection, id)?;
        }
    }

    Ok(())
}

fn parse_origin_command(args: &[String]) -> io::Result<OriginCommand> {
    let subcommand = args
        .first()
        .ok_or_else(|| invalid_input("origin requires a subcommand"))?;

    match subcommand.as_str() {
        "add" => {
            let db_path = required_positional(args, 1, "origin add requires an instance")?;
            let value = required_flag(args, "--value")?;
            reject_extra_args(args, 4)?;
            Ok(OriginCommand::Add { db_path, value })
        }
        "list" => {
            let db_path = required_positional(args, 1, "origin list requires an instance")?;
            reject_extra_args(args, 2)?;
            Ok(OriginCommand::List { db_path })
        }
        "update" => {
            let db_path = required_positional(args, 1, "origin update requires an instance")?;
            let id = parse_id(&required_flag(args, "--id")?)?;
            let value = required_flag(args, "--value")?;
            reject_extra_args(args, 6)?;
            Ok(OriginCommand::Update { db_path, id, value })
        }
        "delete" => {
            let db_path = required_positional(args, 1, "origin delete requires an instance")?;
            let id = parse_id(&required_flag(args, "--id")?)?;
            reject_extra_args(args, 4)?;
            Ok(OriginCommand::Delete { db_path, id })
        }
        _ => Err(invalid_input(format!(
            "unknown origin subcommand: {subcommand}"
        ))),
    }
}

fn required_positional(args: &[String], index: usize, message: &str) -> io::Result<PathBuf> {
    let value = args
        .get(index)
        .ok_or_else(|| invalid_input(message.to_string()))?;

    if value.starts_with("--") {
        return Err(invalid_input(message.to_string()));
    }

    Ok(PathBuf::from(value))
}

fn required_flag(args: &[String], name: &str) -> io::Result<String> {
    let flag_index = args
        .iter()
        .position(|arg| arg == name)
        .ok_or_else(|| invalid_input(format!("{name} requires a value")))?;
    let value = args
        .get(flag_index + 1)
        .ok_or_else(|| invalid_input(format!("{name} requires a value")))?;

    if value.starts_with("--") {
        return Err(invalid_input(format!("{name} requires a value")));
    }

    Ok(value.clone())
}

fn reject_extra_args(args: &[String], allowed_len: usize) -> io::Result<()> {
    if args.len() == allowed_len {
        return Ok(());
    }

    Err(invalid_input("unexpected origin arguments"))
}

fn parse_id(value: &str) -> io::Result<i64> {
    value
        .parse()
        .map_err(|_| invalid_input("--id must be an integer"))
}

fn open_cli_database(db_path: &PathBuf) -> io::Result<Connection> {
    initialize_database_from_schema(db_path, SCHEMA_SQL).map_err(io_other)?;
    Connection::open(db_path).map_err(io_other)
}

fn list_allowed_origins(connection: &Connection) -> io::Result<Vec<AllowedOrigin>> {
    let mut statement = connection
        .prepare("SELECT id, origin, created_at FROM allowed_origins ORDER BY id ASC")
        .map_err(io_other)?;
    let rows = statement
        .query_map([], |row| {
            Ok(AllowedOrigin {
                id: row.get(0)?,
                origin: row.get(1)?,
                created_at: row.get(2)?,
            })
        })
        .map_err(io_other)?;

    rows.collect::<Result<Vec<_>, _>>().map_err(io_other)
}

fn insert_allowed_origin(connection: &Connection, input: &str) -> io::Result<AllowedOrigin> {
    let origin = normalize_allowed_origin(input)?;
    connection
        .execute("INSERT INTO allowed_origins (origin) VALUES (?1)", [origin])
        .map_err(io_other)?;
    get_allowed_origin(connection, connection.last_insert_rowid())
}

fn update_allowed_origin(
    connection: &Connection,
    id: i64,
    input: &str,
) -> io::Result<AllowedOrigin> {
    let origin = normalize_allowed_origin(input)?;
    let changed = connection
        .execute(
            "UPDATE allowed_origins SET origin = ?1 WHERE id = ?2",
            params![origin, id],
        )
        .map_err(io_other)?;

    if changed == 0 {
        return Err(invalid_input(format!("allowed origin {id} not found")));
    }

    get_allowed_origin(connection, id)
}

fn delete_allowed_origin(connection: &Connection, id: i64) -> io::Result<()> {
    let changed = connection
        .execute("DELETE FROM allowed_origins WHERE id = ?1", [id])
        .map_err(io_other)?;

    if changed == 0 {
        return Err(invalid_input(format!("allowed origin {id} not found")));
    }

    Ok(())
}

fn get_allowed_origin(connection: &Connection, id: i64) -> io::Result<AllowedOrigin> {
    connection
        .query_row(
            "SELECT id, origin, created_at FROM allowed_origins WHERE id = ?1 LIMIT 1",
            [id],
            |row| {
                Ok(AllowedOrigin {
                    id: row.get(0)?,
                    origin: row.get(1)?,
                    created_at: row.get(2)?,
                })
            },
        )
        .optional()
        .map_err(io_other)?
        .ok_or_else(|| invalid_input(format!("allowed origin {id} not found")))
}

fn normalize_allowed_origin(input: &str) -> io::Result<String> {
    if input == "null" {
        return Err(invalid_input("invalid_origin"));
    }

    let url = Url::parse(input).map_err(|_| invalid_input("invalid_origin"))?;
    let scheme = url.scheme();

    if scheme != "http" && scheme != "https" {
        return Err(invalid_input("invalid_origin"));
    }

    if !url.username().is_empty() || url.password().is_some() {
        return Err(invalid_input("invalid_origin"));
    }

    if url.path() != "/" || url.query().is_some() || url.fragment().is_some() {
        return Err(invalid_input("invalid_origin"));
    }

    let host = format_origin_host(url.host().ok_or_else(|| invalid_input("invalid_origin"))?);
    let default_port = (scheme == "http" && url.port() == Some(80))
        || (scheme == "https" && url.port() == Some(443));

    if default_port || url.port().is_none() {
        return Ok(format!("{scheme}://{host}"));
    }

    Ok(format!("{scheme}://{host}:{}", url.port().unwrap()))
}

fn format_origin_host(host: Host<&str>) -> String {
    match host {
        Host::Domain(domain) => domain.trim_end_matches('.').to_ascii_lowercase(),
        Host::Ipv4(address) => address.to_string(),
        Host::Ipv6(address) => format!("[{address}]"),
    }
}

fn write_origin(writer: &mut impl Write, origin: &AllowedOrigin) -> io::Result<()> {
    writeln!(
        writer,
        "{}\t{}\t{}",
        origin.id, origin.origin, origin.created_at
    )
}

fn invalid_input(message: impl Into<String>) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidInput, message.into())
}

fn io_other(error: impl std::fmt::Display) -> io::Error {
    io::Error::new(io::ErrorKind::Other, error.to_string())
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;

    #[test]
    fn parses_origin_add_command() {
        let command = parse_app_command([
            "origin".to_string(),
            "add".to_string(),
            "target/test-dbs/origin.sqlite".to_string(),
            "--value".to_string(),
            "HTTPS://Example.COM:443".to_string(),
        ])
        .expect("origin add parses");

        assert_eq!(
            command,
            AppCommand::Origin(OriginCommand::Add {
                db_path: PathBuf::from("target/test-dbs/origin.sqlite"),
                value: "HTTPS://Example.COM:443".to_string(),
            })
        );
    }

    #[test]
    fn rejects_origin_update_without_id_value() {
        let error = parse_app_command([
            "origin".to_string(),
            "update".to_string(),
            "target/test-dbs/origin.sqlite".to_string(),
            "--value".to_string(),
            "https://example.com".to_string(),
        ])
        .expect_err("missing id is rejected");

        assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
    }

    #[test]
    fn rejects_unknown_origin_arguments() {
        let error = parse_app_command([
            "origin".to_string(),
            "add".to_string(),
            "target/test-dbs/origin.sqlite".to_string(),
            "--value".to_string(),
            "https://example.com".to_string(),
            "--unknown".to_string(),
            "value".to_string(),
        ])
        .expect_err("unknown argument is rejected");

        assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
    }

    #[test]
    fn origin_add_list_update_delete_roundtrip() {
        let db_path = test_db_path("origin-roundtrip");
        let mut output = Vec::new();

        run_origin_command(
            OriginCommand::Add {
                db_path: db_path.clone(),
                value: "HTTPS://Example.COM:443".to_string(),
            },
            &mut output,
        )
        .expect("origin add succeeds");
        assert_output_contains(&output, "1\thttps://example.com\t");

        output.clear();
        run_origin_command(
            OriginCommand::List {
                db_path: db_path.clone(),
            },
            &mut output,
        )
        .expect("origin list succeeds");
        assert_output_contains(&output, "1\thttps://example.com\t");

        output.clear();
        run_origin_command(
            OriginCommand::Update {
                db_path: db_path.clone(),
                id: 1,
                value: "https://LOCALHOST.:3000".to_string(),
            },
            &mut output,
        )
        .expect("origin update succeeds");
        assert_output_contains(&output, "1\thttps://localhost:3000\t");

        output.clear();
        run_origin_command(
            OriginCommand::Delete {
                db_path: db_path.clone(),
                id: 1,
            },
            &mut output,
        )
        .expect("origin delete succeeds");
        assert!(output.is_empty());

        let connection = Connection::open(db_path).expect("database opens");
        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM allowed_origins", [], |row| row.get(0))
            .expect("count reads");
        assert_eq!(count, 0);
    }

    #[test]
    fn rejects_invalid_origin_and_missing_delete_target() {
        let db_path = test_db_path("origin-errors");
        let mut output = Vec::new();

        let invalid_origin = run_origin_command(
            OriginCommand::Add {
                db_path: db_path.clone(),
                value: "https://example.com/path".to_string(),
            },
            &mut output,
        )
        .expect_err("invalid origin is rejected");
        assert_eq!(invalid_origin.kind(), io::ErrorKind::InvalidInput);

        let missing_delete =
            run_origin_command(OriginCommand::Delete { db_path, id: 404 }, &mut output)
                .expect_err("missing origin is rejected");
        assert_eq!(missing_delete.kind(), io::ErrorKind::InvalidInput);
    }

    #[test]
    fn normalizes_supported_origin_hosts() {
        assert_eq!(
            normalize_allowed_origin("https://BÜCHER.example.").expect("unicode host normalizes"),
            "https://xn--bcher-kva.example"
        );
        assert_eq!(
            normalize_allowed_origin("https://127.0.0.1:8443").expect("ipv4 host normalizes"),
            "https://127.0.0.1:8443"
        );
        assert_eq!(
            normalize_allowed_origin("https://[::1]:9443").expect("ipv6 host normalizes"),
            "https://[::1]:9443"
        );
    }

    fn assert_output_contains(output: &[u8], expected: &str) {
        let text = String::from_utf8(output.to_vec()).expect("output is utf-8");
        assert!(text.contains(expected), "output was {text:?}");
    }

    fn test_db_path(name: &str) -> PathBuf {
        let directory = PathBuf::from("target/test-dbs");
        fs::create_dir_all(&directory).expect("test db directory exists");

        directory.join(format!("{name}-{}.sqlite", std::process::id()))
    }
}
