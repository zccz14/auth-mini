use std::io;
use std::path::Path;

use chrono::{SecondsFormat, Utc};
use rusqlite::Connection;
use serde::Deserialize;
use sha2::{Digest, Sha256};

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub(crate) struct EmailVerifyRequest {
    pub(crate) email: String,
    pub(crate) code: String,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum EmailVerifyOutcome {
    InvalidOtp,
    OtpConsumed,
}

pub(crate) fn parse_email_verify_request(
    body: &str,
) -> Result<EmailVerifyRequest, serde_json::Error> {
    let request: EmailVerifyRequest = serde_json::from_str(body)?;

    if is_email_address(&request.email) && is_six_digit_code(&request.code) {
        return Ok(request);
    }

    Err(serde_json::Error::io(io::Error::new(
        io::ErrorKind::InvalidInput,
        "invalid email verify request",
    )))
}

pub(crate) fn consume_email_verify_otp(
    db_path: &Path,
    request: &EmailVerifyRequest,
) -> rusqlite::Result<EmailVerifyOutcome> {
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let connection = Connection::open(db_path)?;

    consume_email_verify_otp_with_now(&connection, request, &now)
}

fn consume_email_verify_otp_with_now(
    connection: &Connection,
    request: &EmailVerifyRequest,
    now: &str,
) -> rusqlite::Result<EmailVerifyOutcome> {
    let otp = get_email_otp(connection, &request.email)?;

    if !is_usable_email_otp(otp.as_ref(), &request.code, now) {
        return Ok(EmailVerifyOutcome::InvalidOtp);
    }

    let changed = connection.execute(
        "UPDATE email_otps SET consumed_at = ?1 WHERE email = ?2 AND consumed_at IS NULL",
        (now, &request.email),
    )?;

    if changed == 0 {
        return Ok(EmailVerifyOutcome::InvalidOtp);
    }

    Ok(EmailVerifyOutcome::OtpConsumed)
}

#[derive(Debug, PartialEq, Eq)]
struct EmailOtp {
    code_hash: String,
    expires_at: String,
    consumed_at: Option<String>,
}

fn get_email_otp(connection: &Connection, email: &str) -> rusqlite::Result<Option<EmailOtp>> {
    let mut statement = connection.prepare(
        "SELECT code_hash, expires_at, consumed_at FROM email_otps WHERE email = ?1 LIMIT 1",
    )?;
    let mut rows = statement.query([email])?;

    let Some(row) = rows.next()? else {
        return Ok(None);
    };

    Ok(Some(EmailOtp {
        code_hash: row.get(0)?,
        expires_at: row.get(1)?,
        consumed_at: row.get(2)?,
    }))
}

fn is_usable_email_otp(otp: Option<&EmailOtp>, code: &str, now: &str) -> bool {
    otp.is_some_and(|otp| {
        otp.consumed_at.is_none()
            && otp.expires_at.as_str() > now
            && otp.code_hash == hash_value(code)
    })
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

fn is_six_digit_code(value: &str) -> bool {
    value.len() == 6 && value.bytes().all(|byte| byte.is_ascii_digit())
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::PathBuf;

    use super::*;

    #[test]
    fn parses_email_verify_request_boundary() {
        let request = parse_email_verify_request(r#"{"email":"user@example.com","code":"123456"}"#)
            .expect("valid request parses");

        assert_eq!(request.email, "user@example.com");
        assert_eq!(request.code, "123456");
    }

    #[test]
    fn rejects_invalid_email_verify_request_shape() {
        parse_email_verify_request(r#"{"email":"user@example.com","code":"12345"}"#)
            .expect_err("short code is rejected");
    }

    #[test]
    fn rejects_unknown_email_verify_request_fields() {
        parse_email_verify_request(r#"{"email":"user@example.com","code":"123456","extra":true}"#)
            .expect_err("unknown fields are rejected");
    }

    #[test]
    fn consumes_matching_email_otp() {
        let connection = test_connection("consumes-matching-email-otp");
        insert_email_otp(
            &connection,
            "user@example.com",
            "123456",
            "2026-01-01T00:00:00.000Z",
            None,
        );
        let request = parse_email_verify_request(r#"{"email":"user@example.com","code":"123456"}"#)
            .expect("request parses");

        let outcome =
            consume_email_verify_otp_with_now(&connection, &request, "2025-01-01T00:00:00.000Z")
                .expect("otp check succeeds");

        assert_eq!(outcome, EmailVerifyOutcome::OtpConsumed);
        assert_eq!(
            consumed_at(&connection, "user@example.com").as_deref(),
            Some("2025-01-01T00:00:00.000Z")
        );
    }

    #[test]
    fn rejects_expired_consumed_missing_or_mismatched_email_otp() {
        let connection = test_connection("rejects-invalid-email-otp");
        insert_email_otp(
            &connection,
            "expired@example.com",
            "123456",
            "2020-01-01T00:00:00.000Z",
            None,
        );
        insert_email_otp(
            &connection,
            "consumed@example.com",
            "123456",
            "2026-01-01T00:00:00.000Z",
            Some("2025-01-01T00:00:00.000Z"),
        );

        for body in [
            r#"{"email":"expired@example.com","code":"123456"}"#,
            r#"{"email":"consumed@example.com","code":"123456"}"#,
            r#"{"email":"missing@example.com","code":"123456"}"#,
            r#"{"email":"expired@example.com","code":"654321"}"#,
        ] {
            let request = parse_email_verify_request(body).expect("request parses");
            let outcome = consume_email_verify_otp_with_now(
                &connection,
                &request,
                "2025-01-01T00:00:00.000Z",
            )
            .expect("otp check succeeds");

            assert_eq!(outcome, EmailVerifyOutcome::InvalidOtp);
        }
    }

    fn test_connection(name: &str) -> Connection {
        let db_path = test_db_path(name);
        let connection = Connection::open(db_path).expect("database opens");
        connection
            .execute_batch(
                "CREATE TABLE email_otps (
                    email TEXT PRIMARY KEY,
                    code_hash TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    consumed_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .expect("email_otps table exists");
        connection
    }

    fn test_db_path(name: &str) -> PathBuf {
        let directory = PathBuf::from("target/test-dbs");
        fs::create_dir_all(&directory).expect("test db directory exists");

        directory.join(format!("{name}-{}.sqlite", std::process::id()))
    }

    fn insert_email_otp(
        connection: &Connection,
        email: &str,
        code: &str,
        expires_at: &str,
        consumed_at: Option<&str>,
    ) {
        connection
            .execute(
                "INSERT INTO email_otps (email, code_hash, expires_at, consumed_at) VALUES (?1, ?2, ?3, ?4)",
                (email, hash_value(code), expires_at, consumed_at),
            )
            .expect("email otp inserted");
    }

    fn consumed_at(connection: &Connection, email: &str) -> Option<String> {
        connection
            .query_row(
                "SELECT consumed_at FROM email_otps WHERE email = ?1",
                [email],
                |row| row.get(0),
            )
            .expect("consumed_at reads")
    }
}
