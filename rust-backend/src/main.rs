use auth_mini_rust_backend::{run_server, Config};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = Config::from_args(std::env::args().skip(1))?;
    run_server(config)
}
