use std::io;
use std::path::PathBuf;

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
}
