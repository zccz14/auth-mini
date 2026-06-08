use auth_mini_rust_backend::{run_server, Config};

fn main() -> std::io::Result<()> {
    let config = Config::from_args(std::env::args().skip(1))?;
    run_server(config)
}
