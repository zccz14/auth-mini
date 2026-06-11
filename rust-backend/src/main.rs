use auth_mini_rust_backend::{parse_app_command, run_origin_command, run_server, AppCommand};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    match parse_app_command(std::env::args().skip(1))? {
        AppCommand::Serve(config) => run_server(config),
        AppCommand::Origin(command) => {
            run_origin_command(command, &mut std::io::stdout()).map_err(Into::into)
        }
    }
}
