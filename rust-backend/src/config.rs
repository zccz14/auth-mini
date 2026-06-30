use std::io;
use std::path::{Path, PathBuf};

const DEFAULT_DB_PATH_DISPLAY: &str = "~/.auth-mini/default.sqlite3";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database: Option<DatabaseConfig>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DatabaseConfig {
    pub db_path: PathBuf,
}

impl Config {
    pub fn from_args(args: impl IntoIterator<Item = String>) -> io::Result<Self> {
        let mut config = Self::default();
        let mut args = args.into_iter();
        let mut db_path = config
            .database
            .as_ref()
            .map(|database| database.db_path.clone());

        while let Some(arg) = args.next() {
            match arg.as_str() {
                "--host" => config.host = next_arg(&mut args, "--host")?,
                "--port" => {
                    let port = next_arg(&mut args, "--port")?;
                    config.port = port.parse().map_err(|_| {
                        io::Error::new(io::ErrorKind::InvalidInput, "--port must be a u16")
                    })?;
                }
                "--db" => db_path = Some(PathBuf::from(next_arg(&mut args, "--db")?)),
                _ => {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidInput,
                        format!("unknown argument: {arg}"),
                    ));
                }
            }
        }

        config.database = db_path.map(|db_path| DatabaseConfig { db_path });

        Ok(config)
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 7777,
            database: Some(DatabaseConfig {
                db_path: default_db_path().unwrap_or_else(|_| PathBuf::from("auth-mini.sqlite3")),
            }),
        }
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

    match (env_path("HOMEDRIVE"), env_path("HOMEPATH")) {
        (Some(drive), Some(path)) => Ok(drive.join(path)),
        _ => Err(missing_home_error()),
    }
}

fn env_path(name: &str) -> Option<PathBuf> {
    std::env::var_os(name)
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
}

fn missing_home_error() -> io::Error {
    io::Error::new(
        io::ErrorKind::NotFound,
        format!("cannot determine home directory for default DB path {DEFAULT_DB_PATH_DISPLAY}; pass --db"),
    )
}

fn next_arg(args: &mut impl Iterator<Item = String>, name: &str) -> io::Result<String> {
    args.next().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("{name} requires a value"),
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_matches_existing_start_defaults() {
        let config = Config::from_args([]).expect("default config parses");

        assert_eq!(config.host, "127.0.0.1");
        assert_eq!(config.port, 7777);
        assert!(config.database.is_some());
    }

    #[test]
    fn parses_explicit_config() {
        let config = Config::from_args([
            "--host".to_string(),
            "0.0.0.0".to_string(),
            "--port".to_string(),
            "8080".to_string(),
        ])
        .expect("explicit config parses");

        assert_eq!(config.host, "0.0.0.0");
        assert_eq!(config.port, 8080);
    }

    #[test]
    fn parses_database_config() {
        let config =
            Config::from_args(["--db".to_string(), "target/test-dbs/app.sqlite".to_string()])
                .expect("database config parses");

        assert_eq!(
            config.database,
            Some(DatabaseConfig {
                db_path: PathBuf::from("target/test-dbs/app.sqlite"),
            })
        );
    }

    #[test]
    fn rejects_removed_issuer_argument() {
        let error = Config::from_args(["--issuer".to_string(), "https://auth.example".to_string()])
            .expect_err("issuer is managed in app_meta");

        assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
    }

    #[test]
    fn rejects_removed_schema_argument() {
        let error = Config::from_args(["--schema".to_string(), "../sql/schema.sql".to_string()])
            .expect_err("schema is embedded at runtime");

        assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
    }

    #[test]
    fn rejects_unknown_config_argument() {
        let error = Config::from_args(["--unknown".to_string(), "value".to_string()])
            .expect_err("unknown args are rejected");

        assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
    }
}
