mod cli;
mod config;
mod db;
mod ed25519;
mod email_start;
mod email_verify;
mod http;
mod jwks;
mod openapi;
mod session;
mod webauthn;

pub use cli::{
    parse_app_command, parse_app_command_or_exit, run_init_command, run_origin_command,
    run_rotate_jwks_command, run_smtp_command, write_app_command_db_log, AppCommand, OriginCommand,
    SmtpCommand,
};
pub use config::{Config, DatabaseConfig};
pub use db::{initialize_database, initialize_database_from_schema, initialize_runtime_database};
pub use http::run_server;
