use auth_mini_rust_backend::{
    parse_app_command_or_exit, run_init_command, run_origin_command, run_rotate_jwks_command,
    run_server, run_smtp_command, write_app_command_db_log, AppCommand,
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let command = parse_app_command_or_exit(std::env::args().skip(1));
    write_app_command_db_log(&command, &mut std::io::stderr())?;

    match command {
        AppCommand::Serve(config) => run_server(config),
        AppCommand::Init { db_path } => {
            run_init_command(db_path, &mut std::io::stdout()).map_err(Into::into)
        }
        AppCommand::RotateJwks { db_path } => {
            run_rotate_jwks_command(db_path, &mut std::io::stdout()).map_err(Into::into)
        }
        AppCommand::Origin(command) => {
            run_origin_command(command, &mut std::io::stdout()).map_err(Into::into)
        }
        AppCommand::Smtp(command) => {
            run_smtp_command(command, &mut std::io::stdout()).map_err(Into::into)
        }
    }
}
