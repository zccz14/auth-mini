use std::collections::{HashMap, HashSet};
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
    Smtp(SmtpCommand),
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
pub enum SmtpCommand {
    Add {
        db_path: PathBuf,
        host: String,
        port: i64,
        username: String,
        password: String,
        from_email: String,
        from_name: String,
        secure: bool,
        weight: i64,
    },
    List {
        db_path: PathBuf,
    },
    Update {
        db_path: PathBuf,
        id: i64,
        host: Option<String>,
        port: Option<i64>,
        username: Option<String>,
        password: Option<String>,
        from_email: Option<String>,
        from_name: Option<String>,
        secure: Option<bool>,
        weight: Option<i64>,
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

#[derive(Debug, Clone, PartialEq, Eq)]
struct SmtpConfig {
    id: i64,
    host: String,
    port: i64,
    username: String,
    password: String,
    from_email: String,
    from_name: String,
    secure: bool,
    is_active: bool,
    weight: i64,
}

#[derive(Debug, Default, Clone, PartialEq, Eq)]
struct CliFlags {
    values: HashMap<String, String>,
    booleans: HashSet<String>,
}

pub fn parse_app_command(args: impl IntoIterator<Item = String>) -> io::Result<AppCommand> {
    let args = args.into_iter().collect::<Vec<_>>();

    if args.first().map(|arg| arg.as_str()) == Some("origin") {
        return parse_origin_command(&args[1..]).map(AppCommand::Origin);
    }

    if args.first().map(|arg| arg.as_str()) == Some("smtp") {
        return parse_smtp_command(&args[1..]).map(AppCommand::Smtp);
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

pub fn run_smtp_command(command: SmtpCommand, writer: &mut impl Write) -> io::Result<()> {
    match command {
        SmtpCommand::Add {
            db_path,
            host,
            port,
            username,
            password,
            from_email,
            from_name,
            secure,
            weight,
        } => {
            let connection = open_cli_database(&db_path)?;
            let config = insert_smtp_config(
                &connection,
                InsertSmtpConfig {
                    host,
                    port,
                    username,
                    password,
                    from_email,
                    from_name,
                    secure,
                    weight,
                },
            )?;
            write_smtp_config(writer, &config)?;
        }
        SmtpCommand::List { db_path } => {
            let connection = open_cli_database(&db_path)?;
            let configs = list_smtp_configs(&connection)?;

            for config in configs {
                write_smtp_config(writer, &config)?;
            }
        }
        SmtpCommand::Update {
            db_path,
            id,
            host,
            port,
            username,
            password,
            from_email,
            from_name,
            secure,
            weight,
        } => {
            let connection = open_cli_database(&db_path)?;
            let config = update_smtp_config(
                &connection,
                UpdateSmtpConfig {
                    id,
                    host,
                    port,
                    username,
                    password,
                    from_email,
                    from_name,
                    secure,
                    weight,
                },
            )?;
            write_smtp_config(writer, &config)?;
        }
        SmtpCommand::Delete { db_path, id } => {
            let connection = open_cli_database(&db_path)?;
            delete_smtp_config(&connection, id)?;
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
            reject_extra_args(args, 4, "origin")?;
            Ok(OriginCommand::Add { db_path, value })
        }
        "list" => {
            let db_path = required_positional(args, 1, "origin list requires an instance")?;
            reject_extra_args(args, 2, "origin")?;
            Ok(OriginCommand::List { db_path })
        }
        "update" => {
            let db_path = required_positional(args, 1, "origin update requires an instance")?;
            let id = parse_id(&required_flag(args, "--id")?)?;
            let value = required_flag(args, "--value")?;
            reject_extra_args(args, 6, "origin")?;
            Ok(OriginCommand::Update { db_path, id, value })
        }
        "delete" => {
            let db_path = required_positional(args, 1, "origin delete requires an instance")?;
            let id = parse_id(&required_flag(args, "--id")?)?;
            reject_extra_args(args, 4, "origin")?;
            Ok(OriginCommand::Delete { db_path, id })
        }
        _ => Err(invalid_input(format!(
            "unknown origin subcommand: {subcommand}"
        ))),
    }
}

fn parse_smtp_command(args: &[String]) -> io::Result<SmtpCommand> {
    let subcommand = args
        .first()
        .ok_or_else(|| invalid_input("smtp requires a subcommand"))?;

    match subcommand.as_str() {
        "add" => {
            let db_path = required_positional(args, 1, "smtp add requires an instance")?;
            let flags = parse_flag_args(
                &args[2..],
                &[
                    "--host",
                    "--port",
                    "--username",
                    "--password",
                    "--from-email",
                    "--from-name",
                    "--weight",
                ],
                &["--secure"],
                "smtp",
            )?;

            Ok(SmtpCommand::Add {
                db_path,
                host: required_parsed_flag(&flags, "--host")?,
                port: parse_positive_i64(&required_parsed_flag(&flags, "--port")?, "--port")?,
                username: required_parsed_flag(&flags, "--username")?,
                password: required_parsed_flag(&flags, "--password")?,
                from_email: required_parsed_flag(&flags, "--from-email")?,
                from_name: flags.values.get("--from-name").cloned().unwrap_or_default(),
                secure: flags.booleans.contains("--secure"),
                weight: parse_optional_positive_i64(flags.values.get("--weight"), "--weight")?
                    .unwrap_or(1),
            })
        }
        "list" => {
            let db_path = required_positional(args, 1, "smtp list requires an instance")?;
            reject_extra_args(args, 2, "smtp")?;
            Ok(SmtpCommand::List { db_path })
        }
        "update" => {
            let db_path = required_positional(args, 1, "smtp update requires an instance")?;
            let flags = parse_flag_args(
                &args[2..],
                &[
                    "--id",
                    "--host",
                    "--port",
                    "--username",
                    "--password",
                    "--from-email",
                    "--from-name",
                    "--secure",
                    "--weight",
                ],
                &[],
                "smtp",
            )?;

            Ok(SmtpCommand::Update {
                db_path,
                id: parse_positive_i64(&required_parsed_flag(&flags, "--id")?, "--id")?,
                host: flags.values.get("--host").cloned(),
                port: parse_optional_positive_i64(flags.values.get("--port"), "--port")?,
                username: flags.values.get("--username").cloned(),
                password: flags.values.get("--password").cloned(),
                from_email: flags.values.get("--from-email").cloned(),
                from_name: flags.values.get("--from-name").cloned(),
                secure: parse_optional_bool(flags.values.get("--secure"), "--secure")?,
                weight: parse_optional_positive_i64(flags.values.get("--weight"), "--weight")?,
            })
        }
        "delete" => {
            let db_path = required_positional(args, 1, "smtp delete requires an instance")?;
            let id = parse_id(&required_flag(args, "--id")?)?;
            reject_extra_args(args, 4, "smtp")?;
            Ok(SmtpCommand::Delete { db_path, id })
        }
        _ => Err(invalid_input(format!(
            "unknown smtp subcommand: {subcommand}"
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

fn reject_extra_args(args: &[String], allowed_len: usize, topic: &str) -> io::Result<()> {
    if args.len() == allowed_len {
        return Ok(());
    }

    Err(invalid_input(format!("unexpected {topic} arguments")))
}

fn parse_flag_args(
    args: &[String],
    value_flags: &[&str],
    boolean_flags: &[&str],
    topic: &str,
) -> io::Result<CliFlags> {
    let mut flags = CliFlags::default();
    let mut index = 0;

    while index < args.len() {
        let flag = args[index].as_str();

        if value_flags.contains(&flag) {
            let value = args
                .get(index + 1)
                .ok_or_else(|| invalid_input(format!("{flag} requires a value")))?;

            if value.starts_with("--") {
                return Err(invalid_input(format!("{flag} requires a value")));
            }

            flags.values.insert(flag.to_string(), value.clone());
            index += 2;
        } else if boolean_flags.contains(&flag) {
            flags.booleans.insert(flag.to_string());
            index += 1;
        } else {
            return Err(invalid_input(format!("unexpected {topic} arguments")));
        }
    }

    Ok(flags)
}

fn required_parsed_flag(flags: &CliFlags, name: &str) -> io::Result<String> {
    flags
        .values
        .get(name)
        .cloned()
        .ok_or_else(|| invalid_input(format!("{name} requires a value")))
}

fn parse_id(value: &str) -> io::Result<i64> {
    value
        .parse()
        .map_err(|_| invalid_input("--id must be an integer"))
}

fn parse_positive_i64(value: &str, name: &str) -> io::Result<i64> {
    let parsed = value
        .parse::<i64>()
        .map_err(|_| invalid_input(format!("{name} must be a positive integer")))?;

    if parsed <= 0 {
        return Err(invalid_input(format!("{name} must be a positive integer")));
    }

    Ok(parsed)
}

fn parse_optional_positive_i64(value: Option<&String>, name: &str) -> io::Result<Option<i64>> {
    value.map(|raw| parse_positive_i64(raw, name)).transpose()
}

fn parse_optional_bool(value: Option<&String>, name: &str) -> io::Result<Option<bool>> {
    value
        .map(|raw| match raw.as_str() {
            "true" => Ok(true),
            "false" => Ok(false),
            _ => Err(invalid_input(format!("{name} must be true or false"))),
        })
        .transpose()
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

struct InsertSmtpConfig {
    host: String,
    port: i64,
    username: String,
    password: String,
    from_email: String,
    from_name: String,
    secure: bool,
    weight: i64,
}

struct UpdateSmtpConfig {
    id: i64,
    host: Option<String>,
    port: Option<i64>,
    username: Option<String>,
    password: Option<String>,
    from_email: Option<String>,
    from_name: Option<String>,
    secure: Option<bool>,
    weight: Option<i64>,
}

fn list_smtp_configs(connection: &Connection) -> io::Result<Vec<SmtpConfig>> {
    let mut statement = connection
        .prepare(
            "SELECT id, host, port, username, password, from_email, from_name, secure, is_active, weight FROM smtp_configs ORDER BY id ASC",
        )
        .map_err(io_other)?;
    let rows = statement
        .query_map([], map_smtp_config_row)
        .map_err(io_other)?;

    rows.collect::<Result<Vec<_>, _>>().map_err(io_other)
}

fn insert_smtp_config(connection: &Connection, input: InsertSmtpConfig) -> io::Result<SmtpConfig> {
    validate_smtp_config_parts(
        &input.host,
        input.port,
        &input.username,
        &input.password,
        &input.from_email,
        input.weight,
    )?;

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
                input.weight,
            ],
        )
        .map_err(io_other)?;

    get_smtp_config(connection, connection.last_insert_rowid())
}

fn update_smtp_config(connection: &Connection, input: UpdateSmtpConfig) -> io::Result<SmtpConfig> {
    let current = get_smtp_config(connection, input.id)?;
    let next = SmtpConfig {
        id: current.id,
        host: input.host.unwrap_or(current.host),
        port: input.port.unwrap_or(current.port),
        username: input.username.unwrap_or(current.username),
        password: input.password.unwrap_or(current.password),
        from_email: input.from_email.unwrap_or(current.from_email),
        from_name: input.from_name.unwrap_or(current.from_name),
        secure: input.secure.unwrap_or(current.secure),
        is_active: current.is_active,
        weight: input.weight.unwrap_or(current.weight),
    };

    validate_smtp_config_parts(
        &next.host,
        next.port,
        &next.username,
        &next.password,
        &next.from_email,
        next.weight,
    )?;

    connection
        .execute(
            "UPDATE smtp_configs SET host = ?1, port = ?2, username = ?3, password = ?4, from_email = ?5, from_name = ?6, secure = ?7, weight = ?8 WHERE id = ?9",
            params![
                next.host,
                next.port,
                next.username,
                next.password,
                next.from_email,
                next.from_name,
                bool_to_i64(next.secure),
                next.weight,
                input.id,
            ],
        )
        .map_err(io_other)?;

    get_smtp_config(connection, input.id)
}

fn delete_smtp_config(connection: &Connection, id: i64) -> io::Result<()> {
    let changed = connection
        .execute("DELETE FROM smtp_configs WHERE id = ?1", [id])
        .map_err(io_other)?;

    if changed == 0 {
        return Err(invalid_input(format!("smtp config {id} not found")));
    }

    Ok(())
}

fn get_smtp_config(connection: &Connection, id: i64) -> io::Result<SmtpConfig> {
    connection
        .query_row(
            "SELECT id, host, port, username, password, from_email, from_name, secure, is_active, weight FROM smtp_configs WHERE id = ?1 LIMIT 1",
            [id],
            map_smtp_config_row,
        )
        .optional()
        .map_err(io_other)?
        .ok_or_else(|| invalid_input(format!("smtp config {id} not found")))
}

fn map_smtp_config_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<SmtpConfig> {
    Ok(SmtpConfig {
        id: row.get(0)?,
        host: row.get(1)?,
        port: row.get(2)?,
        username: row.get(3)?,
        password: row.get(4)?,
        from_email: row.get(5)?,
        from_name: row.get(6)?,
        secure: row.get::<_, i64>(7)? == 1,
        is_active: row.get::<_, i64>(8)? == 1,
        weight: row.get(9)?,
    })
}

fn validate_smtp_config_parts(
    host: &str,
    port: i64,
    username: &str,
    password: &str,
    from_email: &str,
    weight: i64,
) -> io::Result<()> {
    if host.is_empty()
        || username.is_empty()
        || password.is_empty()
        || from_email.is_empty()
        || port <= 0
        || weight <= 0
    {
        return Err(invalid_input("invalid smtp config"));
    }

    Ok(())
}

fn bool_to_i64(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
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

fn write_smtp_config(writer: &mut impl Write, config: &SmtpConfig) -> io::Result<()> {
    writeln!(
        writer,
        "{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}",
        config.id,
        config.host,
        config.port,
        config.username,
        config.from_email,
        config.from_name,
        bool_to_i64(config.secure),
        bool_to_i64(config.is_active),
        config.weight,
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

    #[test]
    fn parses_smtp_add_command() {
        let command = parse_app_command([
            "smtp".to_string(),
            "add".to_string(),
            "target/test-dbs/smtp.sqlite".to_string(),
            "--host".to_string(),
            "smtp.example.com".to_string(),
            "--port".to_string(),
            "587".to_string(),
            "--username".to_string(),
            "mailer".to_string(),
            "--password".to_string(),
            "secret".to_string(),
            "--from-email".to_string(),
            "noreply@example.com".to_string(),
            "--from-name".to_string(),
            "Auth Mini".to_string(),
            "--secure".to_string(),
            "--weight".to_string(),
            "5".to_string(),
        ])
        .expect("smtp add parses");

        assert_eq!(
            command,
            AppCommand::Smtp(SmtpCommand::Add {
                db_path: PathBuf::from("target/test-dbs/smtp.sqlite"),
                host: "smtp.example.com".to_string(),
                port: 587,
                username: "mailer".to_string(),
                password: "secret".to_string(),
                from_email: "noreply@example.com".to_string(),
                from_name: "Auth Mini".to_string(),
                secure: true,
                weight: 5,
            })
        );
    }

    #[test]
    fn rejects_invalid_smtp_arguments() {
        let missing_host = parse_app_command([
            "smtp".to_string(),
            "add".to_string(),
            "target/test-dbs/smtp.sqlite".to_string(),
            "--port".to_string(),
            "587".to_string(),
            "--username".to_string(),
            "mailer".to_string(),
            "--password".to_string(),
            "secret".to_string(),
            "--from-email".to_string(),
            "noreply@example.com".to_string(),
        ])
        .expect_err("missing host is rejected");
        assert_eq!(missing_host.kind(), io::ErrorKind::InvalidInput);

        let bad_secure = parse_app_command([
            "smtp".to_string(),
            "update".to_string(),
            "target/test-dbs/smtp.sqlite".to_string(),
            "--id".to_string(),
            "1".to_string(),
            "--secure".to_string(),
            "yes".to_string(),
        ])
        .expect_err("bad secure value is rejected");
        assert_eq!(bad_secure.kind(), io::ErrorKind::InvalidInput);

        let unknown = parse_app_command([
            "smtp".to_string(),
            "list".to_string(),
            "target/test-dbs/smtp.sqlite".to_string(),
            "--unknown".to_string(),
        ])
        .expect_err("unknown list argument is rejected");
        assert_eq!(unknown.kind(), io::ErrorKind::InvalidInput);
    }

    #[test]
    fn smtp_add_list_update_delete_roundtrip_without_password_output() {
        let db_path = test_db_path("smtp-roundtrip");
        let mut output = Vec::new();

        run_smtp_command(
            SmtpCommand::Add {
                db_path: db_path.clone(),
                host: "smtp.example.com".to_string(),
                port: 587,
                username: "mailer".to_string(),
                password: "secret".to_string(),
                from_email: "noreply@example.com".to_string(),
                from_name: "Auth Mini".to_string(),
                secure: true,
                weight: 5,
            },
            &mut output,
        )
        .expect("smtp add succeeds");
        assert_output_contains(
            &output,
            "1\tsmtp.example.com\t587\tmailer\tnoreply@example.com\tAuth Mini\t1\t1\t5",
        );
        assert_output_excludes(&output, "secret");

        output.clear();
        run_smtp_command(
            SmtpCommand::List {
                db_path: db_path.clone(),
            },
            &mut output,
        )
        .expect("smtp list succeeds");
        assert_output_contains(&output, "smtp.example.com");
        assert_output_excludes(&output, "secret");

        let connection = Connection::open(&db_path).expect("database opens");
        let row = read_smtp_row(&connection, 1);
        assert_eq!(
            row,
            (
                "smtp.example.com".to_string(),
                587,
                "mailer".to_string(),
                "secret".to_string(),
                "noreply@example.com".to_string(),
                "Auth Mini".to_string(),
                1,
                1,
                5
            )
        );

        output.clear();
        run_smtp_command(
            SmtpCommand::Update {
                db_path: db_path.clone(),
                id: 1,
                host: Some("smtp-2.example.com".to_string()),
                port: Some(465),
                username: Some("mailer-2".to_string()),
                password: Some("secret-2".to_string()),
                from_email: Some("ops@example.com".to_string()),
                from_name: Some("Ops".to_string()),
                secure: Some(true),
                weight: Some(9),
            },
            &mut output,
        )
        .expect("smtp update succeeds");
        assert_output_contains(
            &output,
            "1\tsmtp-2.example.com\t465\tmailer-2\tops@example.com\tOps\t1\t1\t9",
        );
        assert_output_excludes(&output, "secret-2");

        output.clear();
        run_smtp_command(
            SmtpCommand::Update {
                db_path: db_path.clone(),
                id: 1,
                host: None,
                port: None,
                username: None,
                password: None,
                from_email: None,
                from_name: None,
                secure: Some(false),
                weight: None,
            },
            &mut output,
        )
        .expect("partial smtp update succeeds");
        assert_output_contains(&output, "\t0\t1\t9");

        let updated = read_smtp_row(&connection, 1);
        assert_eq!(
            updated,
            (
                "smtp-2.example.com".to_string(),
                465,
                "mailer-2".to_string(),
                "secret-2".to_string(),
                "ops@example.com".to_string(),
                "Ops".to_string(),
                0,
                1,
                9
            )
        );

        output.clear();
        run_smtp_command(
            SmtpCommand::Delete {
                db_path: db_path.clone(),
                id: 1,
            },
            &mut output,
        )
        .expect("smtp delete succeeds");
        assert!(output.is_empty());

        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM smtp_configs", [], |row| row.get(0))
            .expect("count reads");
        assert_eq!(count, 0);
    }

    #[test]
    fn rejects_invalid_smtp_config_and_missing_targets() {
        let db_path = test_db_path("smtp-errors");
        let mut output = Vec::new();

        let invalid_add = run_smtp_command(
            SmtpCommand::Add {
                db_path: db_path.clone(),
                host: "".to_string(),
                port: 587,
                username: "mailer".to_string(),
                password: "secret".to_string(),
                from_email: "noreply@example.com".to_string(),
                from_name: "".to_string(),
                secure: false,
                weight: 1,
            },
            &mut output,
        )
        .expect_err("invalid smtp config is rejected");
        assert_eq!(invalid_add.kind(), io::ErrorKind::InvalidInput);

        let missing_update = run_smtp_command(
            SmtpCommand::Update {
                db_path: db_path.clone(),
                id: 404,
                host: Some("smtp.example.com".to_string()),
                port: None,
                username: None,
                password: None,
                from_email: None,
                from_name: None,
                secure: None,
                weight: None,
            },
            &mut output,
        )
        .expect_err("missing smtp update target is rejected");
        assert_eq!(missing_update.kind(), io::ErrorKind::InvalidInput);

        let missing_delete =
            run_smtp_command(SmtpCommand::Delete { db_path, id: 404 }, &mut output)
                .expect_err("missing smtp delete target is rejected");
        assert_eq!(missing_delete.kind(), io::ErrorKind::InvalidInput);
    }

    fn assert_output_contains(output: &[u8], expected: &str) {
        let text = String::from_utf8(output.to_vec()).expect("output is utf-8");
        assert!(text.contains(expected), "output was {text:?}");
    }

    fn assert_output_excludes(output: &[u8], unexpected: &str) {
        let text = String::from_utf8(output.to_vec()).expect("output is utf-8");
        assert!(!text.contains(unexpected), "output was {text:?}");
    }

    fn read_smtp_row(
        connection: &Connection,
        id: i64,
    ) -> (String, i64, String, String, String, String, i64, i64, i64) {
        connection
            .query_row(
                "SELECT host, port, username, password, from_email, from_name, secure, is_active, weight FROM smtp_configs WHERE id = ?1",
                [id],
                |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                        row.get(5)?,
                        row.get(6)?,
                        row.get(7)?,
                        row.get(8)?,
                    ))
                },
            )
            .expect("smtp row reads")
    }

    fn test_db_path(name: &str) -> PathBuf {
        let directory = PathBuf::from("target/test-dbs");
        fs::create_dir_all(&directory).expect("test db directory exists");

        directory.join(format!("{name}-{}.sqlite", std::process::id()))
    }
}
