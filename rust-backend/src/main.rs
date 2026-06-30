use auth_mini::{run_server, Config};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = Config::from_args(std::env::args().skip(1))?;
    if let Some(database) = &config.database {
        eprintln!("auth-mini SQLite database: {}", database.db_path.display());
    }

    run_server(config)
}
