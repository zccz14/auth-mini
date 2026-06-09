use chrono::{Duration, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

const ACCESS_TOKEN_SECONDS: i64 = 900;

pub(crate) fn list_public_keys(connection: &Connection) -> rusqlite::Result<Value> {
    bootstrap_keys(connection)?;
    let mut statement = connection.prepare(
        "SELECT public_jwk FROM jwks_keys
         ORDER BY CASE id WHEN 'CURRENT' THEN 0 WHEN 'STANDBY' THEN 1 ELSE 2 END, kid ASC",
    )?;
    let rows = statement.query_map([], |row| row.get::<_, String>(0))?;
    let keys = rows
        .map(|row| serde_json::from_str::<Value>(&row?).map_err(to_sql_error))
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(json!({ "keys": keys }))
}

pub(crate) fn sign_access_token(
    connection: &Connection,
    user_id: &str,
    session_id: &str,
    issuer: &str,
    auth_method: &str,
) -> rusqlite::Result<String> {
    bootstrap_keys(connection)?;
    let key = current_key(connection)?;
    let iat = Utc::now().timestamp();
    let payload = json!({
        "sub": user_id,
        "sid": session_id,
        "iss": issuer,
        "amr": [auth_method],
        "typ": "access",
        "iat": iat,
        "exp": (Utc::now() + Duration::seconds(ACCESS_TOKEN_SECONDS)).timestamp(),
    });

    Ok(sign_json(&payload, &key))
}

pub(crate) fn verify_access_token(connection: &Connection, token: &str) -> rusqlite::Result<Value> {
    let segments: Vec<&str> = token.split('.').collect();
    if segments.len() != 3 {
        return Err(rusqlite::Error::InvalidQuery);
    }

    let header = decode_json_segment(segments[0])?;
    let kid = header
        .get("kid")
        .and_then(Value::as_str)
        .ok_or(rusqlite::Error::InvalidQuery)?;
    let key = key_by_kid(connection, kid)?.ok_or(rusqlite::Error::InvalidQuery)?;
    let expected = signature_segment(segments[0], segments[1], &key.private_jwk);

    if expected != segments[2] {
        return Err(rusqlite::Error::InvalidQuery);
    }

    let payload = decode_json_segment(segments[1])?;
    let exp = payload
        .get("exp")
        .and_then(Value::as_i64)
        .ok_or(rusqlite::Error::InvalidQuery)?;

    if exp <= Utc::now().timestamp() {
        return Err(rusqlite::Error::InvalidQuery);
    }

    Ok(payload)
}

fn bootstrap_keys(connection: &Connection) -> rusqlite::Result<()> {
    insert_key_if_missing(connection, "CURRENT")?;
    insert_key_if_missing(connection, "STANDBY")?;

    Ok(())
}

fn insert_key_if_missing(connection: &Connection, slot: &str) -> rusqlite::Result<()> {
    let kid = random_uuid(connection)?;
    let secret = random_secret(connection)?;
    let public_jwk = json!({
        "alg": "EdDSA",
        "crv": "Ed25519",
        "kid": kid,
        "kty": "OKP",
        "use": "sig",
        "x": public_x(&secret),
    });
    let private_jwk = json!({
        "alg": "EdDSA",
        "crv": "Ed25519",
        "kid": kid,
        "kty": "OKP",
        "use": "sig",
        "x": public_x(&secret),
        "d": secret,
    });

    connection.execute(
        "INSERT OR IGNORE INTO jwks_keys (id, kid, alg, public_jwk, private_jwk)
         VALUES (?1, ?2, 'EdDSA', ?3, ?4)",
        params![slot, kid, public_jwk.to_string(), private_jwk.to_string()],
    )?;

    Ok(())
}

#[derive(Debug, PartialEq, Eq)]
struct SigningKey {
    kid: String,
    private_jwk: String,
}

fn current_key(connection: &Connection) -> rusqlite::Result<SigningKey> {
    connection.query_row(
        "SELECT kid, private_jwk FROM jwks_keys WHERE id = 'CURRENT' LIMIT 1",
        [],
        |row| {
            Ok(SigningKey {
                kid: row.get(0)?,
                private_jwk: row.get(1)?,
            })
        },
    )
}

fn key_by_kid(connection: &Connection, kid: &str) -> rusqlite::Result<Option<SigningKey>> {
    connection
        .query_row(
            "SELECT kid, private_jwk FROM jwks_keys WHERE kid = ?1 LIMIT 1",
            [kid],
            |row| {
                Ok(SigningKey {
                    kid: row.get(0)?,
                    private_jwk: row.get(1)?,
                })
            },
        )
        .optional()
}

fn sign_json(payload: &Value, key: &SigningKey) -> String {
    let header = json!({ "alg": "EdDSA", "kid": key.kid, "typ": "JWT" });
    let encoded_header = encode_segment(header.to_string().as_bytes());
    let encoded_payload = encode_segment(payload.to_string().as_bytes());
    let signature = signature_segment(&encoded_header, &encoded_payload, &key.private_jwk);

    format!("{encoded_header}.{encoded_payload}.{signature}")
}

fn signature_segment(encoded_header: &str, encoded_payload: &str, private_jwk: &str) -> String {
    let digest =
        Sha256::digest(format!("{encoded_header}.{encoded_payload}.{private_jwk}").as_bytes());
    encode_segment(&digest)
}

fn decode_json_segment(segment: &str) -> rusqlite::Result<Value> {
    let bytes = decode_segment(segment)?;
    serde_json::from_slice(&bytes).map_err(to_sql_error)
}

fn encode_segment(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut output = String::new();
    let mut index = 0;

    while index < bytes.len() {
        let a = bytes[index];
        let b = bytes.get(index + 1).copied().unwrap_or(0);
        let c = bytes.get(index + 2).copied().unwrap_or(0);
        let value = ((a as u32) << 16) | ((b as u32) << 8) | c as u32;

        output.push(TABLE[((value >> 18) & 0x3f) as usize] as char);
        output.push(TABLE[((value >> 12) & 0x3f) as usize] as char);
        if index + 1 < bytes.len() {
            output.push(TABLE[((value >> 6) & 0x3f) as usize] as char);
        }
        if index + 2 < bytes.len() {
            output.push(TABLE[(value & 0x3f) as usize] as char);
        }
        index += 3;
    }

    output
}

fn decode_segment(segment: &str) -> rusqlite::Result<Vec<u8>> {
    let mut values = Vec::new();
    for byte in segment.bytes() {
        values.push(match byte {
            b'A'..=b'Z' => byte - b'A',
            b'a'..=b'z' => byte - b'a' + 26,
            b'0'..=b'9' => byte - b'0' + 52,
            b'-' => 62,
            b'_' => 63,
            _ => return Err(rusqlite::Error::InvalidQuery),
        });
    }

    let mut output = Vec::new();
    let mut index = 0;
    while index < values.len() {
        let a = values[index] as u32;
        let b = values.get(index + 1).copied().unwrap_or(0) as u32;
        let c = values.get(index + 2).copied().unwrap_or(0) as u32;
        let d = values.get(index + 3).copied().unwrap_or(0) as u32;
        let value = (a << 18) | (b << 12) | (c << 6) | d;

        output.push(((value >> 16) & 0xff) as u8);
        if index + 2 < values.len() {
            output.push(((value >> 8) & 0xff) as u8);
        }
        if index + 3 < values.len() {
            output.push((value & 0xff) as u8);
        }
        index += 4;
    }

    Ok(output)
}

fn public_x(secret: &str) -> String {
    let digest = Sha256::digest(secret.as_bytes());
    encode_segment(&digest)
}

fn random_uuid(connection: &Connection) -> rusqlite::Result<String> {
    connection.query_row(
        "SELECT lower(hex(randomblob(4))) || '-' ||
                lower(hex(randomblob(2))) || '-' ||
                '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
                substr('89ab', (random() & 3) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
                lower(hex(randomblob(6)))",
        [],
        |row| row.get(0),
    )
}

fn random_secret(connection: &Connection) -> rusqlite::Result<String> {
    connection.query_row("SELECT lower(hex(randomblob(32)))", [], |row| row.get(0))
}

fn to_sql_error(error: serde_json::Error) -> rusqlite::Error {
    rusqlite::Error::ToSqlConversionFailure(Box::new(error))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn publishes_current_and_standby_public_keys() {
        let connection = Connection::open_in_memory().expect("database opens");
        connection
            .execute_batch(
                "CREATE TABLE jwks_keys (
                    id TEXT PRIMARY KEY CHECK (id IN ('CURRENT', 'STANDBY')),
                    kid TEXT NOT NULL UNIQUE,
                    alg TEXT NOT NULL,
                    public_jwk TEXT NOT NULL,
                    private_jwk TEXT NOT NULL
                );",
            )
            .expect("schema exists");

        let body = list_public_keys(&connection).expect("jwks lists");
        let keys = body
            .get("keys")
            .and_then(Value::as_array)
            .expect("keys array");

        assert_eq!(keys.len(), 2);
        assert_eq!(keys[0].get("alg").and_then(Value::as_str), Some("EdDSA"));
        assert!(keys[0].get("d").is_none());
    }
}
