use std::io;

use serde::Deserialize;

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub(crate) struct EmailVerifyRequest {
    email: String,
    code: String,
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
}
