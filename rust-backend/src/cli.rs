use std::io::{self, Write};
use std::path::{Path, PathBuf};

use clap::{Args, Parser, Subcommand};
use rusqlite::{params, Connection, OptionalExtension};
use url::{Host, Url};

use crate::db::initialize_runtime_database;
use crate::jwks::rotate_keys;

const DEFAULT_DB_PATH_DISPLAY: &str = "~/.auth-mini/default.sqlite3";

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AppCommand {
    Serve(crate::Config),
    Init { db_path: PathBuf },
    RotateJwks { db_path: PathBuf },
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

#[derive(Debug, Parser)]
#[command(name = "auth-mini-rust-backend", disable_help_subcommand = true)]
struct CliArgs {
    #[command(subcommand)]
    command: Option<CliCommand>,

    #[command(flatten)]
    serve: ServeArgs,
}

#[derive(Debug, Subcommand)]
enum CliCommand {
    Init(InstanceArgs),
    Start(StartArgs),
    Rotate(RotateArgs),
    Origin(OriginArgs),
    Smtp(SmtpArgs),
}

#[derive(Debug, Args)]
struct ServeArgs {
    #[arg(long, default_value = "127.0.0.1")]
    host: String,

    #[arg(long, default_value_t = 7777)]
    port: u16,

    #[arg(long = "openapi", default_value = "openapi.yaml")]
    openapi_path: PathBuf,

    #[arg(long = "db")]
    db_path: Option<PathBuf>,

    #[arg(
        long = "schema",
        requires = "db_path",
        help = "Accepted for compatibility; runtime DB initialization uses the embedded schema"
    )]
    schema_path: Option<PathBuf>,
}

#[derive(Debug, Args)]
struct StartArgs {
    #[arg(
        value_name = "DB",
        help = "SQLite DB path (default: ~/.auth-mini/default.sqlite3)"
    )]
    db_path: Option<PathBuf>,

    #[arg(long, default_value = "127.0.0.1")]
    host: String,

    #[arg(long, default_value_t = 7777)]
    port: u16,

    #[arg(long = "issuer", value_parser = issuer_arg)]
    issuer: String,

    #[arg(long = "openapi", default_value = "openapi.yaml")]
    openapi_path: PathBuf,

    #[arg(
        long = "schema",
        default_value = "sql/schema.sql",
        help = "Accepted for compatibility; runtime DB initialization uses the embedded schema"
    )]
    schema_path: PathBuf,
}

#[derive(Debug, Args)]
struct RotateArgs {
    #[command(subcommand)]
    command: RotateSubcommand,
}

#[derive(Debug, Subcommand)]
enum RotateSubcommand {
    Jwks(InstanceArgs),
}

#[derive(Debug, Args)]
struct OriginArgs {
    #[command(subcommand)]
    command: OriginSubcommand,
}

#[derive(Debug, Subcommand)]
enum OriginSubcommand {
    Add(OriginAddArgs),
    List(InstanceArgs),
    Update(OriginUpdateArgs),
    Delete(DeleteArgs),
}

#[derive(Debug, Args)]
struct OriginAddArgs {
    #[arg(
        value_name = "DB",
        help = "SQLite DB path (default: ~/.auth-mini/default.sqlite3)"
    )]
    db_path: Option<PathBuf>,

    #[arg(long = "value")]
    value: String,
}

#[derive(Debug, Args)]
struct OriginUpdateArgs {
    #[arg(
        value_name = "DB",
        help = "SQLite DB path (default: ~/.auth-mini/default.sqlite3)"
    )]
    db_path: Option<PathBuf>,

    #[arg(long = "id")]
    id: i64,

    #[arg(long = "value")]
    value: String,
}

#[derive(Debug, Args)]
struct InstanceArgs {
    #[arg(
        value_name = "DB",
        help = "SQLite DB path (default: ~/.auth-mini/default.sqlite3)"
    )]
    db_path: Option<PathBuf>,
}

#[derive(Debug, Args)]
struct DeleteArgs {
    #[arg(
        value_name = "DB",
        help = "SQLite DB path (default: ~/.auth-mini/default.sqlite3)"
    )]
    db_path: Option<PathBuf>,

    #[arg(long = "id")]
    id: i64,
}

#[derive(Debug, Args)]
struct SmtpArgs {
    #[command(subcommand)]
    command: SmtpSubcommand,
}

#[derive(Debug, Subcommand)]
enum SmtpSubcommand {
    Add(SmtpAddArgs),
    List(InstanceArgs),
    Update(SmtpUpdateArgs),
    Delete(DeleteArgs),
}

#[derive(Debug, Args)]
struct SmtpAddArgs {
    #[arg(
        value_name = "DB",
        help = "SQLite DB path (default: ~/.auth-mini/default.sqlite3)"
    )]
    db_path: Option<PathBuf>,

    #[arg(long = "host")]
    host: String,

    #[arg(long = "port", value_parser = positive_i64_arg)]
    port: i64,

    #[arg(long = "username")]
    username: String,

    #[arg(long = "password")]
    password: String,

    #[arg(long = "from-email")]
    from_email: String,

    #[arg(long = "from-name", default_value = "")]
    from_name: String,

    #[arg(long = "secure")]
    secure: bool,

    #[arg(long = "weight", default_value_t = 1, value_parser = positive_i64_arg)]
    weight: i64,
}

#[derive(Debug, Args)]
struct SmtpUpdateArgs {
    #[arg(
        value_name = "DB",
        help = "SQLite DB path (default: ~/.auth-mini/default.sqlite3)"
    )]
    db_path: Option<PathBuf>,

    #[arg(long = "id", value_parser = positive_i64_arg)]
    id: i64,

    #[arg(long = "host")]
    host: Option<String>,

    #[arg(long = "port", value_parser = positive_i64_arg)]
    port: Option<i64>,

    #[arg(long = "username")]
    username: Option<String>,

    #[arg(long = "password")]
    password: Option<String>,

    #[arg(long = "from-email")]
    from_email: Option<String>,

    #[arg(long = "from-name")]
    from_name: Option<String>,

    #[arg(long = "secure")]
    secure: Option<bool>,

    #[arg(long = "weight", value_parser = positive_i64_arg)]
    weight: Option<i64>,
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

pub fn parse_app_command(args: impl IntoIterator<Item = String>) -> io::Result<AppCommand> {
    parse_cli(args).map_err(cli_parse_error_to_io_error)
}

pub fn parse_app_command_or_exit(args: impl IntoIterator<Item = String>) -> AppCommand {
    match parse_cli(args) {
        Ok(command) => command,
        Err(CliParseError::Clap(error)) => error.exit(),
        Err(CliParseError::Io(error)) => {
            eprintln!("{error}");
            std::process::exit(2);
        }
    }
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

pub fn run_init_command(db_path: PathBuf, _writer: &mut impl Write) -> io::Result<()> {
    initialize_runtime_database(&db_path).map_err(io_other)
}

pub fn run_rotate_jwks_command(db_path: PathBuf, _writer: &mut impl Write) -> io::Result<()> {
    let mut connection = open_cli_database(&db_path)?;
    rotate_keys(&mut connection).map_err(|error| invalid_input(error.to_string()))
}

pub fn write_app_command_db_log(command: &AppCommand, writer: &mut impl Write) -> io::Result<()> {
    if let Some(db_path) = app_command_db_path(command) {
        writeln!(writer, "auth-mini SQLite database: {}", db_path.display())?;
    }

    Ok(())
}

fn parse_cli(args: impl IntoIterator<Item = String>) -> Result<AppCommand, CliParseError> {
    let raw_args = std::iter::once("auth-mini-rust-backend".to_string()).chain(args);
    CliArgs::try_parse_from(raw_args)
        .map_err(CliParseError::Clap)?
        .into_app_command()
        .map_err(CliParseError::Io)
}

enum CliParseError {
    Clap(clap::Error),
    Io(io::Error),
}

impl CliArgs {
    fn into_app_command(self) -> io::Result<AppCommand> {
        let command = match self.command {
            Some(CliCommand::Init(args)) => AppCommand::Init {
                db_path: db_path_or_default(args.db_path)?,
            },
            Some(CliCommand::Start(args)) => AppCommand::Serve(args.into_config()?),
            Some(CliCommand::Rotate(args)) => args.into_app_command()?,
            Some(CliCommand::Origin(args)) => AppCommand::Origin(args.into_origin_command()?),
            Some(CliCommand::Smtp(args)) => AppCommand::Smtp(args.into_smtp_command()?),
            None => AppCommand::Serve(self.serve.into_config()),
        };

        Ok(command)
    }
}

impl ServeArgs {
    fn into_config(self) -> crate::Config {
        crate::Config {
            host: self.host,
            port: self.port,
            issuer: crate::Config::default().issuer,
            openapi_path: self.openapi_path,
            database: self.db_path.map(|db_path| crate::DatabaseConfig {
                db_path,
                schema_path: self
                    .schema_path
                    .unwrap_or_else(|| PathBuf::from("sql/schema.sql")),
            }),
        }
    }
}

impl StartArgs {
    fn into_config(self) -> io::Result<crate::Config> {
        Ok(crate::Config {
            host: self.host,
            port: self.port,
            issuer: self.issuer,
            openapi_path: self.openapi_path,
            database: Some(crate::DatabaseConfig {
                db_path: db_path_or_default(self.db_path)?,
                schema_path: self.schema_path,
            }),
        })
    }
}

impl RotateArgs {
    fn into_app_command(self) -> io::Result<AppCommand> {
        let command = match self.command {
            RotateSubcommand::Jwks(args) => AppCommand::RotateJwks {
                db_path: db_path_or_default(args.db_path)?,
            },
        };

        Ok(command)
    }
}

impl OriginArgs {
    fn into_origin_command(self) -> io::Result<OriginCommand> {
        let command = match self.command {
            OriginSubcommand::Add(args) => OriginCommand::Add {
                db_path: db_path_or_default(args.db_path)?,
                value: args.value,
            },
            OriginSubcommand::List(args) => OriginCommand::List {
                db_path: db_path_or_default(args.db_path)?,
            },
            OriginSubcommand::Update(args) => OriginCommand::Update {
                db_path: db_path_or_default(args.db_path)?,
                id: args.id,
                value: args.value,
            },
            OriginSubcommand::Delete(args) => OriginCommand::Delete {
                db_path: db_path_or_default(args.db_path)?,
                id: args.id,
            },
        };

        Ok(command)
    }
}

impl SmtpArgs {
    fn into_smtp_command(self) -> io::Result<SmtpCommand> {
        let command = match self.command {
            SmtpSubcommand::Add(args) => SmtpCommand::Add {
                db_path: db_path_or_default(args.db_path)?,
                host: args.host,
                port: args.port,
                username: args.username,
                password: args.password,
                from_email: args.from_email,
                from_name: args.from_name,
                secure: args.secure,
                weight: args.weight,
            },
            SmtpSubcommand::List(args) => SmtpCommand::List {
                db_path: db_path_or_default(args.db_path)?,
            },
            SmtpSubcommand::Update(args) => SmtpCommand::Update {
                db_path: db_path_or_default(args.db_path)?,
                id: args.id,
                host: args.host,
                port: args.port,
                username: args.username,
                password: args.password,
                from_email: args.from_email,
                from_name: args.from_name,
                secure: args.secure,
                weight: args.weight,
            },
            SmtpSubcommand::Delete(args) => SmtpCommand::Delete {
                db_path: db_path_or_default(args.db_path)?,
                id: args.id,
            },
        };

        Ok(command)
    }
}

fn positive_i64_arg(value: &str) -> Result<i64, String> {
    let parsed = value
        .parse::<i64>()
        .map_err(|_| "must be a positive integer".to_string())?;

    if parsed <= 0 {
        return Err("must be a positive integer".to_string());
    }

    Ok(parsed)
}

fn issuer_arg(value: &str) -> Result<String, String> {
    Url::parse(value)
        .map(|_| value.to_string())
        .map_err(|_| "must be a URL".to_string())
}

fn open_cli_database(db_path: &PathBuf) -> io::Result<Connection> {
    initialize_runtime_database(db_path).map_err(io_other)?;
    Connection::open(db_path).map_err(io_other)
}

fn app_command_db_path(command: &AppCommand) -> Option<&Path> {
    match command {
        AppCommand::Serve(config) => config
            .database
            .as_ref()
            .map(|database| database.db_path.as_path()),
        AppCommand::Init { db_path } | AppCommand::RotateJwks { db_path } => Some(db_path),
        AppCommand::Origin(command) => Some(origin_command_db_path(command)),
        AppCommand::Smtp(command) => Some(smtp_command_db_path(command)),
    }
}

fn origin_command_db_path(command: &OriginCommand) -> &Path {
    match command {
        OriginCommand::Add { db_path, .. }
        | OriginCommand::List { db_path }
        | OriginCommand::Update { db_path, .. }
        | OriginCommand::Delete { db_path, .. } => db_path,
    }
}

fn smtp_command_db_path(command: &SmtpCommand) -> &Path {
    match command {
        SmtpCommand::Add { db_path, .. }
        | SmtpCommand::List { db_path }
        | SmtpCommand::Update { db_path, .. }
        | SmtpCommand::Delete { db_path, .. } => db_path,
    }
}

fn cli_parse_error_to_io_error(error: CliParseError) -> io::Error {
    match error {
        CliParseError::Clap(error) => invalid_input(error.to_string()),
        CliParseError::Io(error) => error,
    }
}

fn db_path_or_default(db_path: Option<PathBuf>) -> io::Result<PathBuf> {
    match db_path {
        Some(db_path) => Ok(db_path),
        None => default_db_path(),
    }
}

fn default_db_path() -> io::Result<PathBuf> {
    default_home_dir().map(|home| default_db_path_for_home(&home))
}

fn default_db_path_for_home(home: &Path) -> PathBuf {
    home.join(".auth-mini").join("default.sqlite3")
}

#[cfg(not(windows))]
fn default_home_dir() -> io::Result<PathBuf> {
    env_path("HOME").ok_or_else(missing_home_error)
}

#[cfg(windows)]
fn default_home_dir() -> io::Result<PathBuf> {
    if let Some(home) = env_path("USERPROFILE") {
        return Ok(home);
    }

    match (env_path("HOMEDRIVE"), std::env::var_os("HOMEPATH")) {
        (Some(drive), Some(path)) if !path.is_empty() => Ok(drive.join(path)),
        _ => Err(missing_home_error()),
    }
}

fn env_path(name: &str) -> Option<PathBuf> {
    std::env::var_os(name)
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
}

fn missing_home_error() -> io::Error {
    invalid_input(format!(
        "cannot determine home directory for default DB path {DEFAULT_DB_PATH_DISPLAY}; pass an explicit DB path"
    ))
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
    io::Error::other(error.to_string())
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;

    #[test]
    fn parses_default_serve_command() {
        let command = parse_app_command([]).expect("default serve command parses");

        assert_eq!(command, AppCommand::Serve(crate::Config::default()));
    }

    #[test]
    fn parses_serve_database_config() {
        let command = parse_app_command([
            "--host".to_string(),
            "0.0.0.0".to_string(),
            "--port".to_string(),
            "8080".to_string(),
            "--openapi".to_string(),
            "../openapi.yaml".to_string(),
            "--db".to_string(),
            "target/test-dbs/app.sqlite".to_string(),
            "--schema".to_string(),
            "../sql/schema.sql".to_string(),
        ])
        .expect("serve config parses");

        assert_eq!(
            command,
            AppCommand::Serve(crate::Config {
                host: "0.0.0.0".to_string(),
                port: 8080,
                issuer: "auth-mini".to_string(),
                openapi_path: PathBuf::from("../openapi.yaml"),
                database: Some(crate::DatabaseConfig {
                    db_path: PathBuf::from("target/test-dbs/app.sqlite"),
                    schema_path: PathBuf::from("../sql/schema.sql"),
                }),
            })
        );
    }

    #[test]
    fn returns_clap_help_as_parse_error_for_testable_parser() {
        let error = parse_app_command([
            "origin".to_string(),
            "add".to_string(),
            "--help".to_string(),
        ])
        .expect_err("help is surfaced to the binary exit parser");

        assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
        assert!(error.to_string().contains("Usage:"));
        assert!(error.to_string().contains("Options:"));
        assert!(error.to_string().contains(DEFAULT_DB_PATH_DISPLAY));
    }

    #[test]
    fn builds_default_db_path_from_home() {
        let home = PathBuf::from("target/test-home");

        assert_eq!(
            default_db_path_for_home(&home),
            PathBuf::from("target/test-home/.auth-mini/default.sqlite3")
        );
    }

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
    fn origin_list_implicitly_initializes_missing_database_without_stdout_log() {
        let db_path = test_db_path("origin-implicit-init");
        let mut output = Vec::new();

        run_origin_command(
            OriginCommand::List {
                db_path: db_path.clone(),
            },
            &mut output,
        )
        .expect("origin list initializes missing database");

        assert!(output.is_empty());
        assert!(db_path.exists());
        let connection = Connection::open(db_path).expect("database opens");
        let rows = read_jwks_rows(&connection);
        assert_eq!(rows.len(), 2);
    }

    #[test]
    fn db_path_log_uses_separate_writer() {
        let db_path = PathBuf::from("target/test-dbs/log.sqlite");
        let command = AppCommand::Origin(OriginCommand::List {
            db_path: db_path.clone(),
        });
        let mut stderr = Vec::new();

        write_app_command_db_log(&command, &mut stderr).expect("db path log writes");

        let text = String::from_utf8(stderr).expect("log is utf-8");
        assert_eq!(
            text,
            format!("auth-mini SQLite database: {}\n", db_path.display())
        );
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
    fn parses_init_rotate_jwks_and_start_commands() {
        let init = parse_app_command([
            "init".to_string(),
            "target/test-dbs/init.sqlite".to_string(),
        ])
        .expect("init parses");
        assert_eq!(
            init,
            AppCommand::Init {
                db_path: PathBuf::from("target/test-dbs/init.sqlite"),
            }
        );

        let rotate = parse_app_command([
            "rotate".to_string(),
            "jwks".to_string(),
            "target/test-dbs/init.sqlite".to_string(),
        ])
        .expect("rotate jwks parses");
        assert_eq!(
            rotate,
            AppCommand::RotateJwks {
                db_path: PathBuf::from("target/test-dbs/init.sqlite"),
            }
        );

        let start = parse_app_command([
            "start".to_string(),
            "target/test-dbs/app.sqlite".to_string(),
            "--issuer".to_string(),
            "https://issuer.example".to_string(),
            "--host".to_string(),
            "0.0.0.0".to_string(),
            "--port".to_string(),
            "8080".to_string(),
        ])
        .expect("start parses");

        assert_eq!(
            start,
            AppCommand::Serve(crate::Config {
                host: "0.0.0.0".to_string(),
                port: 8080,
                issuer: "https://issuer.example".to_string(),
                openapi_path: PathBuf::from("openapi.yaml"),
                database: Some(crate::DatabaseConfig {
                    db_path: PathBuf::from("target/test-dbs/app.sqlite"),
                    schema_path: PathBuf::from("sql/schema.sql"),
                }),
            })
        );
    }

    #[test]
    fn parses_default_db_path_for_instance_commands() {
        let expected_db_path = default_db_path().expect("default db path resolves");

        let init = parse_app_command(["init".to_string()]).expect("init parses");
        assert_eq!(
            init,
            AppCommand::Init {
                db_path: expected_db_path.clone(),
            }
        );

        let start = parse_app_command([
            "start".to_string(),
            "--issuer".to_string(),
            "https://issuer.example".to_string(),
        ])
        .expect("start parses");
        assert_eq!(
            start,
            AppCommand::Serve(crate::Config {
                host: "127.0.0.1".to_string(),
                port: 7777,
                issuer: "https://issuer.example".to_string(),
                openapi_path: PathBuf::from("openapi.yaml"),
                database: Some(crate::DatabaseConfig {
                    db_path: expected_db_path.clone(),
                    schema_path: PathBuf::from("sql/schema.sql"),
                }),
            })
        );

        let origin = parse_app_command([
            "origin".to_string(),
            "add".to_string(),
            "--value".to_string(),
            "https://example.com".to_string(),
        ])
        .expect("origin add parses");
        assert_eq!(
            origin,
            AppCommand::Origin(OriginCommand::Add {
                db_path: expected_db_path.clone(),
                value: "https://example.com".to_string(),
            })
        );

        let smtp =
            parse_app_command(["smtp".to_string(), "list".to_string()]).expect("smtp list parses");
        assert_eq!(
            smtp,
            AppCommand::Smtp(SmtpCommand::List {
                db_path: expected_db_path.clone(),
            })
        );

        let rotate = parse_app_command(["rotate".to_string(), "jwks".to_string()])
            .expect("rotate jwks parses");
        assert_eq!(
            rotate,
            AppCommand::RotateJwks {
                db_path: expected_db_path,
            }
        );
    }

    #[test]
    fn rejects_start_without_issuer() {
        let error = parse_app_command([
            "start".to_string(),
            "target/test-dbs/app.sqlite".to_string(),
        ])
        .expect_err("start requires issuer");

        assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
    }

    #[test]
    fn init_seeds_schema_and_jwks_slots() {
        let db_path = test_db_path("init-command");
        let mut output = Vec::new();

        run_init_command(db_path.clone(), &mut output).expect("init succeeds");

        assert!(output.is_empty());
        let connection = Connection::open(db_path).expect("database opens");
        let rows = read_jwks_rows(&connection);

        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].0, "CURRENT");
        assert_eq!(rows[1].0, "STANDBY");
        assert_eq!(rows[0].2, "EdDSA");
        assert_eq!(rows[1].2, "EdDSA");
        assert_ne!(rows[0].1, rows[1].1);
    }

    #[test]
    fn init_creates_database_parent_directory() {
        let db_path = PathBuf::from(format!(
            "target/test-dbs/default-parent-{}/.auth-mini/default.sqlite3",
            std::process::id()
        ));
        let mut output = Vec::new();

        if let Some(parent) = db_path.parent() {
            let _ = fs::remove_dir_all(parent);
        }

        run_init_command(db_path.clone(), &mut output).expect("init creates parent and db");

        assert!(output.is_empty());
        assert!(db_path.exists());
    }

    #[test]
    fn rotate_jwks_promotes_standby_and_implicitly_initializes_missing_slots() {
        let db_path = test_db_path("rotate-jwks-command");
        let mut output = Vec::new();

        run_init_command(db_path.clone(), &mut output).expect("init succeeds");
        let connection = Connection::open(&db_path).expect("database opens");
        let before = read_jwks_rows(&connection);
        drop(connection);

        run_rotate_jwks_command(db_path.clone(), &mut output).expect("rotate succeeds");

        assert!(output.is_empty());
        let connection = Connection::open(db_path).expect("database opens");
        let after = read_jwks_rows(&connection);

        assert_eq!(after.len(), 2);
        assert_eq!(after[0].0, "CURRENT");
        assert_eq!(after[1].0, "STANDBY");
        assert_eq!(after[0].1, before[1].1);
        assert_ne!(after[1].1, before[0].1);
        assert_ne!(after[1].1, before[1].1);

        let empty_db_path = test_db_path("rotate-empty");
        run_rotate_jwks_command(empty_db_path.clone(), &mut output)
            .expect("rotate initializes missing slots");
        let connection = Connection::open(empty_db_path).expect("database opens");
        assert_eq!(read_jwks_rows(&connection).len(), 2);
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

    fn read_jwks_rows(connection: &Connection) -> Vec<(String, String, String)> {
        let mut statement = connection
            .prepare("SELECT id, kid, alg FROM jwks_keys ORDER BY id ASC")
            .expect("jwks query prepares");
        statement
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .expect("jwks query runs")
            .collect::<Result<Vec<_>, _>>()
            .expect("jwks rows read")
    }

    fn test_db_path(name: &str) -> PathBuf {
        let directory = PathBuf::from("target/test-dbs");
        fs::create_dir_all(&directory).expect("test db directory exists");

        directory.join(format!("{name}-{}.sqlite", std::process::id()))
    }
}
