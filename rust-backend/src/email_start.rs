use std::io::{self, BufRead, BufReader, Write};
use std::net::TcpStream;
use std::path::Path;
use std::time::Duration as StdDuration;

use chrono::{Duration, SecondsFormat, Utc};
use rusqlite::{params, Connection};
use serde::Deserialize;
use sha2::{Digest, Sha256};

const OTP_SECONDS: i64 = 600;
const SMTP_TIMEOUT_MILLIS: u64 = 10_000;

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub(crate) struct EmailStartRequest {
    pub(crate) email: String,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum EmailStartError {
    SmtpNotConfigured,
    SmtpTemporarilyUnavailable,
    Database,
}

#[derive(Debug, PartialEq, Eq)]
struct SmtpConfig {
    id: i64,
    host: String,
    port: u16,
    username: String,
    password: String,
    from_email: String,
    from_name: String,
    secure: bool,
}

#[derive(Debug, PartialEq, Eq)]
struct MailMessage {
    from: String,
    to: String,
    subject: String,
    text: String,
}

pub(crate) fn parse_email_start_request(
    body: &str,
) -> Result<EmailStartRequest, serde_json::Error> {
    let mut request: EmailStartRequest = serde_json::from_str(body)?;
    let email = request.email.trim().to_lowercase();

    if is_email_address(&email) {
        request.email = email;
        return Ok(request);
    }

    Err(invalid_request_error("invalid email start request"))
}

pub(crate) fn start_email_auth(
    db_path: &Path,
    request: &EmailStartRequest,
) -> Result<(), EmailStartError> {
    let connection = Connection::open(db_path).map_err(|_| EmailStartError::Database)?;

    start_email_auth_with_connection(&connection, request)
}

fn start_email_auth_with_connection(
    connection: &Connection,
    request: &EmailStartRequest,
) -> Result<(), EmailStartError> {
    let config = select_smtp_config(connection)?.ok_or(EmailStartError::SmtpNotConfigured)?;
    let code = generate_otp_code(connection)?;
    let expires_at =
        (Utc::now() + Duration::seconds(OTP_SECONDS)).to_rfc3339_opts(SecondsFormat::Millis, true);

    upsert_email_otp(connection, &request.email, &code, &expires_at)?;

    if send_otp_mail(&config, &request.email, &code).is_err() {
        invalidate_email_otp(connection, &request.email)?;
        return Err(EmailStartError::SmtpTemporarilyUnavailable);
    }

    Ok(())
}

fn select_smtp_config(connection: &Connection) -> Result<Option<SmtpConfig>, EmailStartError> {
    let mut statement = connection
        .prepare(
            "SELECT id, host, port, username, password, from_email, from_name, secure, weight
             FROM smtp_configs WHERE is_active = 1 ORDER BY id ASC",
        )
        .map_err(|_| EmailStartError::Database)?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                SmtpConfig {
                    id: row.get(0)?,
                    host: row.get(1)?,
                    port: row.get::<_, i64>(2)? as u16,
                    username: row.get(3)?,
                    password: row.get(4)?,
                    from_email: row.get(5)?,
                    from_name: row.get(6)?,
                    secure: row.get::<_, i64>(7)? == 1,
                },
                row.get::<_, i64>(8)?,
            ))
        })
        .map_err(|_| EmailStartError::Database)?;
    let configs = rows
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|_| EmailStartError::Database)?;

    if configs.is_empty() {
        return Ok(None);
    }

    let total_weight: i64 = configs.iter().map(|(_, weight)| *weight).sum();
    let mut remaining = connection
        .query_row(
            "SELECT (random() & 9223372036854775807) % ?1",
            [total_weight],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|_| EmailStartError::Database)?;

    for (config, weight) in configs {
        remaining -= weight;
        if remaining < 0 {
            return Ok(Some(config));
        }
    }

    Ok(None)
}

fn upsert_email_otp(
    connection: &Connection,
    email: &str,
    code: &str,
    expires_at: &str,
) -> Result<(), EmailStartError> {
    connection
        .execute(
            "INSERT INTO email_otps (email, code_hash, expires_at, consumed_at)
             VALUES (?1, ?2, ?3, NULL)
             ON CONFLICT(email) DO UPDATE SET
             code_hash = excluded.code_hash,
             expires_at = excluded.expires_at,
             consumed_at = NULL,
             created_at = CURRENT_TIMESTAMP",
            params![email, hash_value(code), expires_at],
        )
        .map_err(|_| EmailStartError::Database)?;

    Ok(())
}

fn invalidate_email_otp(connection: &Connection, email: &str) -> Result<(), EmailStartError> {
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    connection
        .execute(
            "UPDATE email_otps SET consumed_at = ?1 WHERE email = ?2",
            params![now, email],
        )
        .map_err(|_| EmailStartError::Database)?;

    Ok(())
}

fn send_otp_mail(config: &SmtpConfig, email: &str, code: &str) -> io::Result<()> {
    if config.secure {
        return Err(io::Error::new(
            io::ErrorKind::Unsupported,
            "secure smtp is not implemented in rust backend yet",
        ));
    }

    send_mail_with_plain_smtp(config, &build_otp_message(config, email, code))
}

fn build_otp_message(config: &SmtpConfig, email: &str, code: &str) -> MailMessage {
    let from = if config.from_name.is_empty() {
        config.from_email.clone()
    } else {
        format!("{} <{}>", config.from_name, config.from_email)
    };

    MailMessage {
        from,
        to: email.to_string(),
        subject: "Your auth-mini verification code".to_string(),
        text: format!("Your verification code is {code}. It expires in 10 minutes."),
    }
}

fn send_mail_with_plain_smtp(config: &SmtpConfig, message: &MailMessage) -> io::Result<()> {
    let mut stream = TcpStream::connect((config.host.as_str(), config.port))?;
    let timeout = Some(StdDuration::from_millis(SMTP_TIMEOUT_MILLIS));
    stream.set_read_timeout(timeout)?;
    stream.set_write_timeout(timeout)?;
    let mut reader = BufReader::new(stream.try_clone()?);

    expect_smtp_status(&mut reader, 220)?;
    smtp_command(&mut stream, &mut reader, "EHLO localhost", 250)?;
    smtp_command(&mut stream, &mut reader, "AUTH LOGIN", 334)?;
    smtp_command(
        &mut stream,
        &mut reader,
        &base64_encode(&config.username),
        334,
    )?;
    smtp_command(
        &mut stream,
        &mut reader,
        &base64_encode(&config.password),
        235,
    )?;
    smtp_command(
        &mut stream,
        &mut reader,
        &format!("MAIL FROM:<{}>", config.from_email),
        250,
    )?;
    smtp_command(
        &mut stream,
        &mut reader,
        &format!("RCPT TO:<{}>", message.to),
        250,
    )?;
    smtp_command(&mut stream, &mut reader, "DATA", 354)?;
    write!(
        stream,
        "From: {}\r\nTo: {}\r\nSubject: {}\r\n\r\n{}\r\n.\r\n",
        message.from, message.to, message.subject, message.text
    )?;
    stream.flush()?;
    expect_smtp_status(&mut reader, 250)?;
    smtp_command(&mut stream, &mut reader, "QUIT", 221)
}

fn smtp_command(
    stream: &mut TcpStream,
    reader: &mut BufReader<TcpStream>,
    command: &str,
    expected_status: u16,
) -> io::Result<()> {
    write!(stream, "{command}\r\n")?;
    stream.flush()?;
    expect_smtp_status(reader, expected_status)
}

fn expect_smtp_status(reader: &mut BufReader<TcpStream>, expected_status: u16) -> io::Result<()> {
    loop {
        let mut line = String::new();
        reader.read_line(&mut line)?;
        if line.len() < 4 {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "invalid smtp response",
            ));
        }
        let status = line[0..3]
            .parse::<u16>()
            .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "invalid smtp status"))?;

        if status != expected_status {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "unexpected smtp status",
            ));
        }
        if line.as_bytes().get(3) == Some(&b' ') {
            return Ok(());
        }
    }
}

fn generate_otp_code(connection: &Connection) -> Result<String, EmailStartError> {
    connection
        .query_row(
            "SELECT printf('%06d', (random() & 9223372036854775807) % 1000000)",
            [],
            |row| row.get(0),
        )
        .map_err(|_| EmailStartError::Database)
}

fn hash_value(value: &str) -> String {
    let digest = Sha256::digest(value.as_bytes());
    digest.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn is_email_address(value: &str) -> bool {
    value
        .split_once('@')
        .is_some_and(|(local, domain)| !local.is_empty() && !domain.is_empty())
}

fn invalid_request_error(message: &str) -> serde_json::Error {
    serde_json::Error::io(io::Error::new(io::ErrorKind::InvalidInput, message))
}

fn base64_encode(value: &str) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let bytes = value.as_bytes();
    let mut output = String::new();
    let mut index = 0;

    while index < bytes.len() {
        let first = bytes[index];
        let second = bytes.get(index + 1).copied().unwrap_or(0);
        let third = bytes.get(index + 2).copied().unwrap_or(0);

        output.push(ALPHABET[(first >> 2) as usize] as char);
        output.push(ALPHABET[(((first & 0b0000_0011) << 4) | (second >> 4)) as usize] as char);
        if index + 1 < bytes.len() {
            output.push(ALPHABET[(((second & 0b0000_1111) << 2) | (third >> 6)) as usize] as char);
        } else {
            output.push('=');
        }
        if index + 2 < bytes.len() {
            output.push(ALPHABET[(third & 0b0011_1111) as usize] as char);
        } else {
            output.push('=');
        }

        index += 3;
    }

    output
}

#[cfg(test)]
mod tests {
    use std::io::{BufRead, BufReader, Write};
    use std::net::TcpListener;
    use std::sync::mpsc;
    use std::thread;

    use super::*;

    #[test]
    fn parses_email_start_request_and_normalizes_email() {
        let request = parse_email_start_request(r#"{"email":" User@Example.COM "}"#)
            .expect("valid request parses");

        assert_eq!(request.email, "user@example.com");
        parse_email_start_request(r#"{"email":"missing-domain@"}"#)
            .expect_err("invalid email rejects");
        parse_email_start_request(r#"{"email":"user@example.com","extra":true}"#)
            .expect_err("unknown fields reject");
    }

    #[test]
    fn returns_smtp_not_configured_without_active_smtp_config() {
        let connection = Connection::open_in_memory().expect("database opens");
        create_email_start_schema(&connection);
        let request = EmailStartRequest {
            email: "user@example.com".to_string(),
        };

        let error = start_email_auth_with_connection(&connection, &request)
            .expect_err("missing smtp config rejects");

        assert_eq!(error, EmailStartError::SmtpNotConfigured);
    }

    #[test]
    fn creates_otp_and_sends_plain_smtp_message() {
        let (port, received) = start_plain_smtp_server(false);
        let connection = Connection::open_in_memory().expect("database opens");
        create_email_start_schema(&connection);
        insert_smtp_config(&connection, port, false);
        let request = EmailStartRequest {
            email: "user@example.com".to_string(),
        };

        start_email_auth_with_connection(&connection, &request).expect("email start succeeds");

        let row = connection
            .query_row(
                "SELECT code_hash, expires_at, consumed_at FROM email_otps WHERE email = ?1",
                ["user@example.com"],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, Option<String>>(2)?,
                    ))
                },
            )
            .expect("otp row exists");
        let transcript = received.recv().expect("smtp transcript received");

        assert_eq!(row.0.len(), 64);
        assert!(row.1 > Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true));
        assert!(row.2.is_none());
        assert!(transcript.contains("AUTH LOGIN"));
        assert!(transcript.contains("MAIL FROM:<noreply@example.com>"));
        assert!(transcript.contains("RCPT TO:<user@example.com>"));
        assert!(transcript.contains("Subject: Your auth-mini verification code"));
        assert!(transcript.contains("Your verification code is "));
    }

    #[test]
    fn invalidates_pending_otp_when_smtp_send_fails() {
        let (port, _received) = start_plain_smtp_server(true);
        let connection = Connection::open_in_memory().expect("database opens");
        create_email_start_schema(&connection);
        insert_smtp_config(&connection, port, false);
        let request = EmailStartRequest {
            email: "user@example.com".to_string(),
        };

        let error = start_email_auth_with_connection(&connection, &request)
            .expect_err("smtp failure rejects");
        let consumed_at = connection
            .query_row(
                "SELECT consumed_at FROM email_otps WHERE email = ?1",
                ["user@example.com"],
                |row| row.get::<_, Option<String>>(0),
            )
            .expect("otp row exists");

        assert_eq!(error, EmailStartError::SmtpTemporarilyUnavailable);
        assert!(consumed_at.is_some());
    }

    #[test]
    fn secure_smtp_config_does_not_return_fake_success() {
        let connection = Connection::open_in_memory().expect("database opens");
        create_email_start_schema(&connection);
        insert_smtp_config(&connection, 2525, true);
        let request = EmailStartRequest {
            email: "user@example.com".to_string(),
        };

        let error = start_email_auth_with_connection(&connection, &request)
            .expect_err("unsupported secure smtp rejects");

        assert_eq!(error, EmailStartError::SmtpTemporarilyUnavailable);
    }

    fn create_email_start_schema(connection: &Connection) {
        connection
            .execute_batch(
                "CREATE TABLE email_otps (
                    email TEXT PRIMARY KEY,
                    code_hash TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    consumed_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE smtp_configs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    host TEXT NOT NULL,
                    port INTEGER NOT NULL,
                    username TEXT NOT NULL,
                    password TEXT NOT NULL,
                    from_email TEXT NOT NULL,
                    from_name TEXT NOT NULL DEFAULT '',
                    secure INTEGER NOT NULL DEFAULT 0 CHECK (secure IN (0, 1)),
                    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
                    weight INTEGER NOT NULL DEFAULT 1 CHECK (weight > 0)
                );",
            )
            .expect("schema exists");
    }

    fn insert_smtp_config(connection: &Connection, port: u16, secure: bool) {
        connection
            .execute(
                "INSERT INTO smtp_configs
                 (host, port, username, password, from_email, from_name, secure, is_active, weight)
                 VALUES ('127.0.0.1', ?1, 'mailer-user', 'mailer-pass', 'noreply@example.com', 'Mini Auth', ?2, 1, 1)",
                params![port, if secure { 1 } else { 0 }],
            )
            .expect("smtp config inserts");
    }

    fn start_plain_smtp_server(fail_recipient: bool) -> (u16, mpsc::Receiver<String>) {
        let listener = TcpListener::bind("127.0.0.1:0").expect("smtp test server binds");
        let port = listener.local_addr().expect("local addr").port();
        let (sender, receiver) = mpsc::channel();

        thread::spawn(move || {
            let (mut stream, _) = listener.accept().expect("smtp client connects");
            let mut reader = BufReader::new(stream.try_clone().expect("stream clones"));
            let mut transcript = String::new();

            write!(stream, "220 localhost\r\n").expect("greeting writes");
            respond(
                &mut reader,
                &mut stream,
                &mut transcript,
                "250-localhost\r\n250 AUTH LOGIN\r\n",
            );
            respond(
                &mut reader,
                &mut stream,
                &mut transcript,
                "334 VXNlcm5hbWU6\r\n",
            );
            respond(
                &mut reader,
                &mut stream,
                &mut transcript,
                "334 UGFzc3dvcmQ6\r\n",
            );
            respond(
                &mut reader,
                &mut stream,
                &mut transcript,
                "235 2.7.0 Authentication successful\r\n",
            );
            respond(
                &mut reader,
                &mut stream,
                &mut transcript,
                "250 2.1.0 Sender OK\r\n",
            );
            if fail_recipient {
                respond(
                    &mut reader,
                    &mut stream,
                    &mut transcript,
                    "550 5.1.1 Recipient rejected\r\n",
                );
                sender.send(transcript).expect("transcript sends");
                return;
            }
            respond(
                &mut reader,
                &mut stream,
                &mut transcript,
                "250 2.1.5 Recipient OK\r\n",
            );
            respond(
                &mut reader,
                &mut stream,
                &mut transcript,
                "354 Start mail input\r\n",
            );

            loop {
                let mut line = String::new();
                reader.read_line(&mut line).expect("data reads");
                transcript.push_str(&line);
                if line == ".\r\n" {
                    break;
                }
            }
            write!(stream, "250 2.0.0 Queued\r\n").expect("queued writes");
            respond(
                &mut reader,
                &mut stream,
                &mut transcript,
                "221 2.0.0 Bye\r\n",
            );
            sender.send(transcript).expect("transcript sends");
        });

        (port, receiver)
    }

    fn respond(
        reader: &mut BufReader<TcpStream>,
        stream: &mut TcpStream,
        transcript: &mut String,
        response: &str,
    ) {
        let mut line = String::new();
        reader.read_line(&mut line).expect("command reads");
        transcript.push_str(&line);
        write!(stream, "{response}").expect("response writes");
    }
}
