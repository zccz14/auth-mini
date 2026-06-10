use std::error::Error;
use std::io;
use std::path::Path;
use std::time::Duration as StdDuration;

use chrono::{Duration, SecondsFormat, Utc};
use lettre::message::Mailbox;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
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

type SmtpSendError = Box<dyn Error + Send + Sync>;

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
    start_email_auth_with_mailer(connection, request, send_otp_mail)
}

fn start_email_auth_with_mailer<F>(
    connection: &Connection,
    request: &EmailStartRequest,
    send_mail: F,
) -> Result<(), EmailStartError>
where
    F: FnOnce(&SmtpConfig, &str, &str) -> Result<(), SmtpSendError>,
{
    let config = select_smtp_config(connection)?.ok_or(EmailStartError::SmtpNotConfigured)?;
    let code = generate_otp_code(connection)?;
    let expires_at =
        (Utc::now() + Duration::seconds(OTP_SECONDS)).to_rfc3339_opts(SecondsFormat::Millis, true);

    upsert_email_otp(connection, &request.email, &code, &expires_at)?;

    if send_mail(&config, &request.email, &code).is_err() {
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

fn send_otp_mail(config: &SmtpConfig, email: &str, code: &str) -> Result<(), SmtpSendError> {
    let transport = build_smtp_transport(config)?;

    send_mail_with_transport(&transport, &build_otp_message(config, email, code)?)
}

fn build_otp_message(
    config: &SmtpConfig,
    email: &str,
    code: &str,
) -> Result<Message, SmtpSendError> {
    let from_address = config.from_email.parse()?;
    let from = if config.from_name.is_empty() {
        Mailbox::new(None, from_address)
    } else {
        Mailbox::new(Some(config.from_name.clone()), from_address)
    };

    Message::builder()
        .from(from)
        .to(email.parse()?)
        .subject("Your auth-mini verification code")
        .body(format!(
            "Your verification code is {code}. It expires in 10 minutes."
        ))
        .map_err(|error| Box::new(error) as SmtpSendError)
}

fn build_smtp_transport(config: &SmtpConfig) -> Result<SmtpTransport, SmtpSendError> {
    let credentials = Credentials::new(config.username.clone(), config.password.clone());
    let builder = if config.secure {
        SmtpTransport::relay(&config.host)?
    } else {
        SmtpTransport::builder_dangerous(&config.host)
    };

    Ok(builder
        .port(config.port)
        .credentials(credentials)
        .timeout(Some(StdDuration::from_millis(SMTP_TIMEOUT_MILLIS)))
        .build())
}

fn send_mail_with_transport<T>(transport: &T, message: &Message) -> Result<(), SmtpSendError>
where
    T: Transport,
    T::Error: Error + Send + Sync + 'static,
{
    transport
        .send(message)
        .map(|_| ())
        .map_err(|error| Box::new(error) as SmtpSendError)
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

#[cfg(test)]
mod tests {
    use super::*;
    use lettre::transport::stub::StubTransport;

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
    fn creates_otp_and_sends_message_through_lettre_transport() {
        let transport = StubTransport::new_ok();
        let connection = Connection::open_in_memory().expect("database opens");
        create_email_start_schema(&connection);
        insert_smtp_config(&connection, 2525, false);
        let request = EmailStartRequest {
            email: "user@example.com".to_string(),
        };

        start_email_auth_with_mailer(&connection, &request, |config, email, code| {
            send_mail_with_transport(&transport, &build_otp_message(config, email, code)?)
        })
        .expect("email start succeeds");

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
        let messages = transport.messages();

        assert_eq!(row.0.len(), 64);
        assert!(row.1 > Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true));
        assert!(row.2.is_none());
        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].0.to().len(), 1);
        assert_eq!(messages[0].0.to()[0].to_string(), "user@example.com");
        assert!(messages[0]
            .1
            .contains("Subject: Your auth-mini verification code"));
        assert!(messages[0].1.contains("Your verification code is "));
    }

    #[test]
    fn invalidates_pending_otp_when_smtp_send_fails() {
        let transport = StubTransport::new_error();
        let connection = Connection::open_in_memory().expect("database opens");
        create_email_start_schema(&connection);
        insert_smtp_config(&connection, 2525, false);
        let request = EmailStartRequest {
            email: "user@example.com".to_string(),
        };

        let error = start_email_auth_with_mailer(&connection, &request, |config, email, code| {
            send_mail_with_transport(&transport, &build_otp_message(config, email, code)?)
        })
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
    fn secure_smtp_config_uses_tls_transport_and_does_not_return_fake_success() {
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

    #[test]
    fn maps_secure_boolean_to_lettre_transport_modes() {
        let plain_config = test_smtp_config(2525, false);
        let secure_config = test_smtp_config(465, true);

        let plain_transport = format!("{:?}", build_smtp_transport(&plain_config).unwrap());
        let secure_transport = format!("{:?}", build_smtp_transport(&secure_config).unwrap());

        assert!(plain_transport.contains("None"));
        assert!(secure_transport.contains("Wrapper"));
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

    fn test_smtp_config(port: u16, secure: bool) -> SmtpConfig {
        SmtpConfig {
            id: 1,
            host: "smtp.example.com".to_string(),
            port,
            username: "mailer-user".to_string(),
            password: "mailer-pass".to_string(),
            from_email: "noreply@example.com".to_string(),
            from_name: "Mini Auth".to_string(),
            secure,
        }
    }
}
