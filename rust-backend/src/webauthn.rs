use std::time::Duration;

use chrono::{DateTime, Duration as ChronoDuration, SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use webauthn_rs::prelude::{
    DiscoverableAuthentication, DiscoverableKey, Passkey, PasskeyRegistration, PublicKeyCredential,
    RegisterPublicKeyCredential, Url, Uuid, Webauthn, WebauthnBuilder,
};

const WEBAUTHN_CHALLENGE_SECONDS: i64 = 300;

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub(crate) struct OptionsRequest {
    rp_id: String,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum RegisterOptionsError {
    InvalidRequest,
    InvalidWebauthnRegistration,
    InvalidAccessToken,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum AuthenticationOptionsError {
    InvalidRequest,
    InvalidWebauthnAuthentication,
}

#[derive(Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub(crate) struct RegisterVerifyRequest {
    request_id: String,
    credential: RegistrationCredential,
}

#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub(crate) struct AuthenticationVerifyRequest {
    request_id: String,
    credential: AuthenticationCredential,
}

#[derive(Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
struct RegistrationCredential {
    id: String,
    #[serde(rename = "rawId")]
    raw_id: String,
    #[serde(rename = "type")]
    credential_type: String,
    #[serde(rename = "authenticatorAttachment")]
    #[serde(skip_serializing_if = "Option::is_none")]
    authenticator_attachment: Option<String>,
    #[serde(rename = "clientExtensionResults")]
    #[serde(skip_serializing_if = "Option::is_none")]
    client_extension_results: Option<Value>,
    response: RegistrationCredentialResponse,
}

#[derive(Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
struct RegistrationCredentialResponse {
    #[serde(rename = "clientDataJSON")]
    client_data_json: String,
    #[serde(rename = "attestationObject")]
    attestation_object: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    transports: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
struct AuthenticationCredential {
    id: String,
    #[serde(rename = "rawId")]
    raw_id: String,
    #[serde(rename = "type")]
    credential_type: String,
    #[serde(rename = "clientExtensionResults")]
    #[serde(skip_serializing_if = "Option::is_none")]
    client_extension_results: Option<Value>,
    response: AuthenticationCredentialResponse,
}

#[derive(Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
struct AuthenticationCredentialResponse {
    #[serde(rename = "clientDataJSON")]
    client_data_json: String,
    #[serde(rename = "authenticatorData")]
    authenticator_data: String,
    signature: String,
    #[serde(rename = "userHandle")]
    user_handle: Option<Option<String>>,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum RegisterVerifyError {
    InvalidWebauthnRegistration,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum AuthenticationVerifyError {
    InvalidWebauthnAuthentication,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) struct AuthenticationVerifyOutcome {
    pub(crate) user_id: String,
}

struct ResolvedOptionsInput {
    origin: String,
    rp_id: String,
}

pub(crate) fn parse_options_request(body: &str) -> Result<OptionsRequest, serde_json::Error> {
    let request: OptionsRequest = serde_json::from_str(body)?;

    if request.rp_id.trim().is_empty() {
        return Err(serde_json::Error::io(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "invalid rp_id",
        )));
    }

    Ok(request)
}

pub(crate) fn parse_register_verify_request(
    body: &str,
) -> Result<RegisterVerifyRequest, serde_json::Error> {
    let request: RegisterVerifyRequest = serde_json::from_str(body)?;

    if !is_uuid(&request.request_id)
        || request.credential.id.is_empty()
        || request.credential.raw_id.is_empty()
        || request.credential.credential_type != "public-key"
        || request.credential.response.client_data_json.is_empty()
        || request.credential.response.attestation_object.is_empty()
        || request
            .credential
            .response
            .transports
            .as_ref()
            .map(|transports| transports.iter().any(|transport| transport.is_empty()))
            .unwrap_or(false)
    {
        return Err(serde_json::Error::io(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "invalid register verify request",
        )));
    }

    Ok(request)
}

pub(crate) fn parse_authentication_verify_request(
    body: &str,
) -> Result<AuthenticationVerifyRequest, serde_json::Error> {
    let request: AuthenticationVerifyRequest = serde_json::from_str(body)?;

    if !is_uuid(&request.request_id)
        || request.credential.id.is_empty()
        || request.credential.raw_id.is_empty()
        || request.credential.credential_type != "public-key"
        || request.credential.response.client_data_json.is_empty()
        || request.credential.response.authenticator_data.is_empty()
        || request.credential.response.signature.is_empty()
        || request
            .credential
            .response
            .user_handle
            .as_ref()
            .and_then(|value| value.as_ref())
            .map(|value| value.is_empty())
            .unwrap_or(false)
    {
        return Err(serde_json::Error::io(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "invalid authentication verify request",
        )));
    }

    Ok(request)
}

pub(crate) fn register_options(
    connection: &Connection,
    user_id: &str,
    request: &OptionsRequest,
    origin: &str,
) -> Result<Value, RegisterOptionsError> {
    let email = user_email(connection, user_id)?;
    let resolved = resolve_options_input(connection, request, origin)
        .map_err(|_| RegisterOptionsError::InvalidWebauthnRegistration)?;
    let request_id = random_uuid(connection).map_err(|_| RegisterOptionsError::InvalidRequest)?;
    let webauthn = build_webauthn(&resolved.rp_id, &resolved.origin)
        .map_err(|_| RegisterOptionsError::InvalidWebauthnRegistration)?;
    let (options, state) = webauthn
        .start_passkey_registration(user_webauthn_id(user_id), &email, &email, None)
        .map_err(|_| RegisterOptionsError::InvalidRequest)?;
    let state_json =
        serde_json::to_string(&state).map_err(|_| RegisterOptionsError::InvalidRequest)?;
    let public_key = serde_json::to_value(options.public_key)
        .map_err(|_| RegisterOptionsError::InvalidRequest)?;
    let challenge = public_key
        .get("challenge")
        .cloned()
        .ok_or(RegisterOptionsError::InvalidRequest)?;
    let rp = public_key
        .get("rp")
        .cloned()
        .ok_or(RegisterOptionsError::InvalidRequest)?;
    let user = public_key
        .get("user")
        .cloned()
        .ok_or(RegisterOptionsError::InvalidRequest)?;
    let pub_key_cred_params = public_key
        .get("pubKeyCredParams")
        .cloned()
        .ok_or(RegisterOptionsError::InvalidRequest)?;
    let authenticator_selection = public_key
        .get("authenticatorSelection")
        .cloned()
        .ok_or(RegisterOptionsError::InvalidRequest)?;
    let expires_at = (Utc::now() + ChronoDuration::seconds(WEBAUTHN_CHALLENGE_SECONDS))
        .to_rfc3339_opts(SecondsFormat::Millis, true);
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);

    connection
        .execute(
            "UPDATE webauthn_challenges
             SET consumed_at = ?1
             WHERE type = 'register' AND user_id = ?2 AND consumed_at IS NULL",
            params![now, user_id],
        )
        .map_err(|_| RegisterOptionsError::InvalidRequest)?;
    connection
        .execute(
            "INSERT INTO webauthn_challenges
             (request_id, type, state_json, user_id, expires_at, rp_id, origin)
             VALUES (?1, 'register', ?2, ?3, ?4, ?5, ?6)",
            params![
                request_id,
                state_json,
                user_id,
                expires_at,
                resolved.rp_id,
                resolved.origin
            ],
        )
        .map_err(|_| RegisterOptionsError::InvalidRequest)?;

    Ok(json!({
        "request_id": request_id,
        "publicKey": {
            "challenge": challenge,
            "rp": rp,
            "user": user,
            "pubKeyCredParams": pub_key_cred_params,
            "timeout": 300000,
            "authenticatorSelection": authenticator_selection
        }
    }))
}

pub(crate) fn authentication_options(
    connection: &Connection,
    request: &OptionsRequest,
    origin: &str,
) -> Result<Value, AuthenticationOptionsError> {
    let resolved = resolve_options_input(connection, request, origin)
        .map_err(|_| AuthenticationOptionsError::InvalidWebauthnAuthentication)?;
    let request_id =
        random_uuid(connection).map_err(|_| AuthenticationOptionsError::InvalidRequest)?;
    let webauthn = build_webauthn(&resolved.rp_id, &resolved.origin)
        .map_err(|_| AuthenticationOptionsError::InvalidWebauthnAuthentication)?;
    let (options, state) = webauthn
        .start_discoverable_authentication()
        .map_err(|_| AuthenticationOptionsError::InvalidRequest)?;
    let state_json =
        serde_json::to_string(&state).map_err(|_| AuthenticationOptionsError::InvalidRequest)?;
    let public_key = serde_json::to_value(options.public_key)
        .map_err(|_| AuthenticationOptionsError::InvalidRequest)?;
    let challenge = public_key
        .get("challenge")
        .cloned()
        .ok_or(AuthenticationOptionsError::InvalidRequest)?;
    let expires_at = (Utc::now() + ChronoDuration::seconds(WEBAUTHN_CHALLENGE_SECONDS))
        .to_rfc3339_opts(SecondsFormat::Millis, true);

    connection
        .execute(
            "INSERT INTO webauthn_challenges
             (request_id, type, state_json, user_id, expires_at, rp_id, origin)
             VALUES (?1, 'authenticate', ?2, NULL, ?3, ?4, ?5)",
            params![
                request_id,
                state_json,
                expires_at,
                resolved.rp_id,
                resolved.origin
            ],
        )
        .map_err(|_| AuthenticationOptionsError::InvalidRequest)?;

    Ok(json!({
        "request_id": request_id,
        "publicKey": {
            "challenge": challenge,
            "rpId": resolved.rp_id,
            "timeout": 300000,
            "userVerification": "preferred"
        }
    }))
}

fn build_webauthn(rp_id: &str, origin: &str) -> Result<Webauthn, ()> {
    let origin = Url::parse(origin).map_err(|_| ())?;

    WebauthnBuilder::new(rp_id, &origin)
        .map_err(|_| ())?
        .rp_name("auth-mini")
        .timeout(Duration::from_secs(WEBAUTHN_CHALLENGE_SECONDS as u64))
        .build()
        .map_err(|_| ())
}

fn user_webauthn_id(user_id: &str) -> Uuid {
    let mut digest = Sha256::new();
    digest.update(b"auth-mini-webauthn-user-handle\0");
    digest.update(user_id.as_bytes());
    let mut bytes = [0u8; 16];

    bytes.copy_from_slice(&digest.finalize()[..16]);
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    Uuid::from_bytes(bytes)
}

pub(crate) fn register_verify(
    connection: &Connection,
    user_id: &str,
    request: &RegisterVerifyRequest,
    origin: &str,
) -> Result<Value, RegisterVerifyError> {
    let origin = normalize_allowed_origin(origin)
        .map_err(|_| RegisterVerifyError::InvalidWebauthnRegistration)?;
    let challenge = get_valid_register_challenge(connection, &request.request_id)?;
    let allowed_origins = list_allowed_origins(connection)
        .map_err(|_| RegisterVerifyError::InvalidWebauthnRegistration)?;

    if challenge.user_id.as_deref() != Some(user_id) {
        return Err(RegisterVerifyError::InvalidWebauthnRegistration);
    }

    if challenge.origin != origin {
        return Err(RegisterVerifyError::InvalidWebauthnRegistration);
    }

    if !allowed_origins.iter().any(|allowed| allowed == &origin) {
        return Err(RegisterVerifyError::InvalidWebauthnRegistration);
    }

    let state: PasskeyRegistration = serde_json::from_str(&challenge.state_json)
        .map_err(|_| RegisterVerifyError::InvalidWebauthnRegistration)?;
    let credential: RegisterPublicKeyCredential = serde_json::from_value(
        serde_json::to_value(&request.credential)
            .map_err(|_| RegisterVerifyError::InvalidWebauthnRegistration)?,
    )
    .map_err(|_| RegisterVerifyError::InvalidWebauthnRegistration)?;
    let webauthn = build_webauthn(&challenge.rp_id, &challenge.origin)
        .map_err(|_| RegisterVerifyError::InvalidWebauthnRegistration)?;
    let passkey = webauthn
        .finish_passkey_registration(&credential, &state)
        .map_err(|_| RegisterVerifyError::InvalidWebauthnRegistration)?;
    let credential_id = serde_json::to_value(passkey.cred_id())
        .map_err(|_| RegisterVerifyError::InvalidWebauthnRegistration)?
        .as_str()
        .ok_or(RegisterVerifyError::InvalidWebauthnRegistration)?
        .to_string();
    let passkey_json = serde_json::to_string(&passkey)
        .map_err(|_| RegisterVerifyError::InvalidWebauthnRegistration)?;
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let transaction = connection
        .unchecked_transaction()
        .map_err(|_| RegisterVerifyError::InvalidWebauthnRegistration)?;

    transaction
        .execute(
            "UPDATE webauthn_challenges
             SET consumed_at = ?1
             WHERE request_id = ?2 AND consumed_at IS NULL",
            params![now, request.request_id],
        )
        .map_err(|_| RegisterVerifyError::InvalidWebauthnRegistration)
        .and_then(|changes| {
            if changes == 1 {
                Ok(())
            } else {
                Err(RegisterVerifyError::InvalidWebauthnRegistration)
            }
        })?;
    transaction
        .execute(
            "INSERT INTO webauthn_credentials
             (credential_id, user_id, passkey_json, rp_id)
             VALUES (?1, ?2, ?3, ?4)",
            params![credential_id, user_id, passkey_json, challenge.rp_id],
        )
        .map_err(|_| RegisterVerifyError::InvalidWebauthnRegistration)?;
    transaction
        .commit()
        .map_err(|_| RegisterVerifyError::InvalidWebauthnRegistration)?;

    Ok(json!({ "ok": true }))
}

pub(crate) fn authentication_verify(
    connection: &Connection,
    request: &AuthenticationVerifyRequest,
    origin: &str,
) -> Result<AuthenticationVerifyOutcome, AuthenticationVerifyError> {
    let origin = normalize_allowed_origin(origin)
        .map_err(|_| AuthenticationVerifyError::InvalidWebauthnAuthentication)?;
    let challenge = get_valid_authentication_challenge(connection, &request.request_id)?;
    let allowed_origins = list_allowed_origins(connection)
        .map_err(|_| AuthenticationVerifyError::InvalidWebauthnAuthentication)?;

    if challenge.origin != origin {
        return Err(AuthenticationVerifyError::InvalidWebauthnAuthentication);
    }

    if !allowed_origins.iter().any(|allowed| allowed == &origin) {
        return Err(AuthenticationVerifyError::InvalidWebauthnAuthentication);
    }

    let credential_row =
        get_authentication_credential(connection, &request.credential.id, &challenge.rp_id)?;
    let state: DiscoverableAuthentication = serde_json::from_str(&challenge.state_json)
        .map_err(|_| AuthenticationVerifyError::InvalidWebauthnAuthentication)?;
    let credential: PublicKeyCredential = serde_json::from_value(
        serde_json::to_value(&request.credential)
            .map_err(|_| AuthenticationVerifyError::InvalidWebauthnAuthentication)?,
    )
    .map_err(|_| AuthenticationVerifyError::InvalidWebauthnAuthentication)?;
    let webauthn = build_webauthn(&challenge.rp_id, &challenge.origin)
        .map_err(|_| AuthenticationVerifyError::InvalidWebauthnAuthentication)?;
    let mut passkey: Passkey = serde_json::from_str(&credential_row.passkey_json)
        .map_err(|_| AuthenticationVerifyError::InvalidWebauthnAuthentication)?;
    let result = webauthn
        .finish_discoverable_authentication(&credential, state, &[DiscoverableKey::from(&passkey)])
        .map_err(|_| AuthenticationVerifyError::InvalidWebauthnAuthentication)?;

    passkey
        .update_credential(&result)
        .ok_or(AuthenticationVerifyError::InvalidWebauthnAuthentication)?;

    let passkey_json = serde_json::to_string(&passkey)
        .map_err(|_| AuthenticationVerifyError::InvalidWebauthnAuthentication)?;
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let transaction = connection
        .unchecked_transaction()
        .map_err(|_| AuthenticationVerifyError::InvalidWebauthnAuthentication)?;

    transaction
        .execute(
            "UPDATE webauthn_challenges
             SET consumed_at = ?1
             WHERE request_id = ?2 AND type = 'authenticate' AND consumed_at IS NULL",
            params![now, request.request_id],
        )
        .map_err(|_| AuthenticationVerifyError::InvalidWebauthnAuthentication)
        .and_then(|changes| {
            if changes == 1 {
                Ok(())
            } else {
                Err(AuthenticationVerifyError::InvalidWebauthnAuthentication)
            }
        })?;
    transaction
        .execute(
            "UPDATE webauthn_credentials
             SET passkey_json = ?1, last_used_at = ?2
             WHERE credential_id = ?3 AND rp_id = ?4",
            params![passkey_json, now, request.credential.id, challenge.rp_id],
        )
        .map_err(|_| AuthenticationVerifyError::InvalidWebauthnAuthentication)
        .and_then(|changes| {
            if changes == 1 {
                Ok(())
            } else {
                Err(AuthenticationVerifyError::InvalidWebauthnAuthentication)
            }
        })?;
    transaction
        .commit()
        .map_err(|_| AuthenticationVerifyError::InvalidWebauthnAuthentication)?;

    Ok(AuthenticationVerifyOutcome {
        user_id: credential_row.user_id,
    })
}

pub(crate) fn delete_credential(
    connection: &Connection,
    credential_id: &str,
    user_id: &str,
) -> rusqlite::Result<bool> {
    let result = connection.execute(
        "DELETE FROM webauthn_credentials WHERE credential_id = ?1 AND user_id = ?2",
        params![credential_id, user_id],
    )?;

    Ok(result > 0)
}

fn user_email(connection: &Connection, user_id: &str) -> Result<String, RegisterOptionsError> {
    connection
        .query_row(
            "SELECT email FROM users WHERE id = ?1 LIMIT 1",
            [user_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|_| RegisterOptionsError::InvalidAccessToken)?
        .ok_or(RegisterOptionsError::InvalidAccessToken)
}

struct RegisterChallengePrecheckRow {
    user_id: Option<String>,
    state_json: String,
    expires_at: String,
    rp_id: String,
    origin: String,
}

struct AuthenticationChallengePrecheckRow {
    state_json: String,
    expires_at: String,
    rp_id: String,
    origin: String,
}

struct AuthenticationCredentialRow {
    user_id: String,
    passkey_json: String,
}

fn get_valid_register_challenge(
    connection: &Connection,
    request_id: &str,
) -> Result<RegisterChallengePrecheckRow, RegisterVerifyError> {
    let challenge = connection
        .query_row(
            "SELECT user_id, state_json, expires_at, rp_id, origin
             FROM webauthn_challenges
             WHERE request_id = ?1 AND type = 'register' AND consumed_at IS NULL
             LIMIT 1",
            [request_id],
            |row| {
                Ok(RegisterChallengePrecheckRow {
                    user_id: row.get(0)?,
                    state_json: row.get(1)?,
                    expires_at: row.get(2)?,
                    rp_id: row.get(3)?,
                    origin: row.get(4)?,
                })
            },
        )
        .optional()
        .map_err(|_| RegisterVerifyError::InvalidWebauthnRegistration)?
        .ok_or(RegisterVerifyError::InvalidWebauthnRegistration)?;
    let expires_at = DateTime::parse_from_rfc3339(&challenge.expires_at)
        .map_err(|_| RegisterVerifyError::InvalidWebauthnRegistration)?;

    if expires_at <= Utc::now() {
        return Err(RegisterVerifyError::InvalidWebauthnRegistration);
    }

    Ok(challenge)
}

fn get_valid_authentication_challenge(
    connection: &Connection,
    request_id: &str,
) -> Result<AuthenticationChallengePrecheckRow, AuthenticationVerifyError> {
    let challenge = connection
        .query_row(
            "SELECT state_json, expires_at, rp_id, origin
             FROM webauthn_challenges
             WHERE request_id = ?1 AND type = 'authenticate' AND consumed_at IS NULL
             LIMIT 1",
            [request_id],
            |row| {
                Ok(AuthenticationChallengePrecheckRow {
                    state_json: row.get(0)?,
                    expires_at: row.get(1)?,
                    rp_id: row.get(2)?,
                    origin: row.get(3)?,
                })
            },
        )
        .optional()
        .map_err(|_| AuthenticationVerifyError::InvalidWebauthnAuthentication)?
        .ok_or(AuthenticationVerifyError::InvalidWebauthnAuthentication)?;
    let expires_at = DateTime::parse_from_rfc3339(&challenge.expires_at)
        .map_err(|_| AuthenticationVerifyError::InvalidWebauthnAuthentication)?;

    if expires_at <= Utc::now() {
        return Err(AuthenticationVerifyError::InvalidWebauthnAuthentication);
    }

    Ok(challenge)
}

fn get_authentication_credential(
    connection: &Connection,
    credential_id: &str,
    rp_id: &str,
) -> Result<AuthenticationCredentialRow, AuthenticationVerifyError> {
    connection
        .query_row(
            "SELECT user_id, passkey_json FROM webauthn_credentials WHERE credential_id = ?1 AND rp_id = ?2 LIMIT 1",
            params![credential_id, rp_id],
            |row| {
                Ok(AuthenticationCredentialRow {
                    user_id: row.get(0)?,
                    passkey_json: row.get(1)?,
                })
            },
        )
        .optional()
        .map_err(|_| AuthenticationVerifyError::InvalidWebauthnAuthentication)?
        .ok_or(AuthenticationVerifyError::InvalidWebauthnAuthentication)
}

fn list_allowed_origins(connection: &Connection) -> Result<Vec<String>, RegisterOptionsError> {
    let mut statement = connection
        .prepare("SELECT origin FROM allowed_origins ORDER BY id ASC")
        .map_err(|_| RegisterOptionsError::InvalidWebauthnRegistration)?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|_| RegisterOptionsError::InvalidWebauthnRegistration)?;
    let mut origins = Vec::new();

    for row in rows {
        let origin = row.map_err(|_| RegisterOptionsError::InvalidWebauthnRegistration)?;
        origins.push(
            normalize_allowed_origin(&origin)
                .map_err(|_| RegisterOptionsError::InvalidWebauthnRegistration)?,
        );
    }

    Ok(origins)
}

fn resolve_options_input(
    connection: &Connection,
    request: &OptionsRequest,
    origin: &str,
) -> Result<ResolvedOptionsInput, ()> {
    let origin = normalize_allowed_origin(origin)?;
    let origin_hostname = origin_hostname(&origin).ok_or(())?;
    let rp_id = normalize_rp_id(&request.rp_id)?;
    let allowed_origins = list_allowed_origins(connection).map_err(|_| ())?;

    if !allowed_origins.iter().any(|allowed| allowed == &origin) {
        return Err(());
    }

    if !is_rp_id_allowed_for_origin(&origin_hostname, &rp_id) {
        return Err(());
    }

    if !rp_id_covered_by_allowed_origins(&allowed_origins, &rp_id) {
        return Err(());
    }

    Ok(ResolvedOptionsInput { origin, rp_id })
}

fn normalize_allowed_origin(input: &str) -> Result<String, ()> {
    if input == "null" || input.contains('@') || input.contains('?') || input.contains('#') {
        return Err(());
    }
    let (protocol, rest) = input.split_once("://").ok_or(())?;
    let protocol = protocol.to_ascii_lowercase();

    if protocol != "http" && protocol != "https" {
        return Err(());
    }

    if rest.contains('/') || rest.is_empty() {
        return Err(());
    }

    let (hostname, port) = split_host_port(rest)?;
    let hostname = hostname.trim_end_matches('.').to_ascii_lowercase();

    if hostname.is_empty() {
        return Err(());
    }

    let port = match (protocol.as_str(), port) {
        ("http", Some("80")) | ("https", Some("443")) | (_, None) => String::new(),
        (_, Some(value))
            if !value.is_empty() && value.bytes().all(|byte| byte.is_ascii_digit()) =>
        {
            format!(":{value}")
        }
        _ => return Err(()),
    };

    Ok(format!("{protocol}://{hostname}{port}"))
}

fn normalize_rp_id(input: &str) -> Result<String, ()> {
    let trimmed = input.trim().to_ascii_lowercase();
    let rp_id = trimmed.trim_end_matches('.');

    if rp_id.is_empty()
        || rp_id.contains(':')
        || rp_id.contains('/')
        || rp_id.contains('@')
        || rp_id.contains(' ')
        || rp_id.split('.').any(|label| label.is_empty())
        || !rp_id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'.')
    {
        return Err(());
    }

    Ok(rp_id.to_string())
}

fn rp_id_covered_by_allowed_origins(allowed_origins: &[String], rp_id: &str) -> bool {
    allowed_origins.iter().any(|origin| {
        origin_hostname(origin)
            .map(|hostname| is_rp_id_allowed_for_origin(&hostname, rp_id))
            .unwrap_or(false)
    })
}

fn is_rp_id_allowed_for_origin(origin_hostname: &str, rp_id: &str) -> bool {
    if origin_hostname == rp_id {
        return true;
    }

    if is_ip_address(origin_hostname)
        || is_ip_address(rp_id)
        || origin_hostname == "localhost"
        || rp_id == "localhost"
    {
        return false;
    }

    origin_hostname.ends_with(&format!(".{rp_id}"))
}

fn origin_hostname(origin: &str) -> Option<String> {
    let (_, rest) = origin.split_once("://")?;
    split_host_port(rest).ok().map(|(host, _)| host.to_string())
}

fn split_host_port(value: &str) -> Result<(&str, Option<&str>), ()> {
    if value.starts_with('[') {
        return Err(());
    }

    match value.rsplit_once(':') {
        Some((host, port)) => Ok((host, Some(port))),
        None => Ok((value, None)),
    }
}

fn is_ip_address(value: &str) -> bool {
    value.contains(':') || {
        let parts = value.split('.').collect::<Vec<_>>();
        parts.len() == 4
            && parts
                .iter()
                .all(|part| !part.is_empty() && part.bytes().all(|byte| byte.is_ascii_digit()))
    }
}

fn is_uuid(value: &str) -> bool {
    let bytes = value.as_bytes();

    if bytes.len() != 36 {
        return false;
    }

    for (index, byte) in bytes.iter().enumerate() {
        if matches!(index, 8 | 13 | 18 | 23) {
            if *byte != b'-' {
                return false;
            }
        } else if !byte.is_ascii_hexdigit() {
            return false;
        }
    }

    true
}

fn random_uuid(connection: &Connection) -> rusqlite::Result<String> {
    connection.query_row(
        "SELECT lower(hex(randomblob(4))) || '-' ||
                lower(hex(randomblob(2))) || '-' ||
                '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
                substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
                lower(hex(randomblob(6)))",
        [],
        |row| row.get(0),
    )
}

#[cfg(test)]
fn base64url_encode(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut output = String::new();
    let mut index = 0;

    while index + 3 <= bytes.len() {
        let chunk = ((bytes[index] as u32) << 16)
            | ((bytes[index + 1] as u32) << 8)
            | bytes[index + 2] as u32;
        output.push(ALPHABET[((chunk >> 18) & 0x3f) as usize] as char);
        output.push(ALPHABET[((chunk >> 12) & 0x3f) as usize] as char);
        output.push(ALPHABET[((chunk >> 6) & 0x3f) as usize] as char);
        output.push(ALPHABET[(chunk & 0x3f) as usize] as char);
        index += 3;
    }

    match bytes.len() - index {
        1 => {
            let chunk = (bytes[index] as u32) << 16;
            output.push(ALPHABET[((chunk >> 18) & 0x3f) as usize] as char);
            output.push(ALPHABET[((chunk >> 12) & 0x3f) as usize] as char);
        }
        2 => {
            let chunk = ((bytes[index] as u32) << 16) | ((bytes[index + 1] as u32) << 8);
            output.push(ALPHABET[((chunk >> 18) & 0x3f) as usize] as char);
            output.push(ALPHABET[((chunk >> 12) & 0x3f) as usize] as char);
            output.push(ALPHABET[((chunk >> 6) & 0x3f) as usize] as char);
        }
        _ => {}
    }

    output
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;
    use webauthn_rs::prelude::{
        DiscoverableAuthentication, PasskeyRegistration, Url, Uuid, WebauthnBuilder,
    };

    use super::*;

    #[test]
    fn deletes_only_the_owners_credential() {
        let connection = Connection::open_in_memory().expect("database opens");
        connection
            .execute_batch(
                "CREATE TABLE webauthn_credentials (
                    credential_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    passkey_json TEXT NOT NULL,
                    rp_id TEXT NOT NULL,
                    last_used_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .expect("schema exists");
        connection
            .execute(
                "INSERT INTO webauthn_credentials
                 (credential_id, user_id, passkey_json, rp_id)
                 VALUES (?1, ?2, ?3, ?4)",
                ("credential-1", "user-1", "{}", "app.example.com"),
            )
            .expect("credential inserts");

        let denied = delete_credential(&connection, "credential-1", "user-2")
            .expect("delete query succeeds");
        let allowed = delete_credential(&connection, "credential-1", "user-1")
            .expect("delete query succeeds");

        assert!(!denied);
        assert!(allowed);
    }

    #[test]
    fn webauthn_rs_registration_state_serializes_for_challenge_persistence() {
        let origin = Url::parse("https://app.example.com").expect("origin parses");
        let webauthn = WebauthnBuilder::new("example.com", &origin)
            .expect("webauthn builder accepts rp")
            .rp_name("auth-mini")
            .build()
            .expect("webauthn builds");
        let user_unique_id =
            Uuid::parse_str("00000000-0000-4000-8000-000000000000").expect("uuid parses");
        let (_, state) = webauthn
            .start_passkey_registration(
                user_unique_id,
                "user@example.com",
                "user@example.com",
                None,
            )
            .expect("registration starts");

        let state_json = serde_json::to_string(&state).expect("registration state serializes");
        let restored: PasskeyRegistration =
            serde_json::from_str(&state_json).expect("registration state deserializes");
        let restored_json =
            serde_json::to_string(&restored).expect("restored registration state serializes");

        assert_eq!(
            serde_json::from_str::<Value>(&state_json).expect("json parses"),
            serde_json::from_str::<Value>(&restored_json).expect("json parses")
        );
    }

    #[test]
    fn normalizes_parent_domain_register_options_and_stores_challenge() {
        let connection = Connection::open_in_memory().expect("database opens");
        create_register_options_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email) VALUES (?1, ?2)",
                ("user-1", "user@example.com"),
            )
            .expect("user inserts");
        connection
            .execute(
                "INSERT INTO allowed_origins (origin) VALUES (?1)",
                ["https://app.example.com"],
            )
            .expect("origin inserts");
        let request = OptionsRequest {
            rp_id: "EXAMPLE.COM.".to_string(),
        };

        let body = register_options(&connection, "user-1", &request, "https://app.example.com")
            .expect("options generate");
        let request_id = body["request_id"].as_str().expect("request id");
        let stored: (String, String, String, String, Option<String>) = connection
            .query_row(
                "SELECT type, state_json, rp_id, origin, consumed_at FROM webauthn_challenges WHERE request_id = ?1",
                [request_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
            )
            .expect("challenge reads");
        let restored_state: PasskeyRegistration =
            serde_json::from_str(&stored.1).expect("webauthn-rs state deserializes");
        let restored_state_json =
            serde_json::to_string(&restored_state).expect("webauthn-rs state serializes");

        assert_eq!(body["publicKey"]["rp"]["id"], "example.com");
        assert_eq!(
            body["publicKey"]["user"]["id"],
            expected_user_handle("user-1")
        );
        assert_eq!(body["publicKey"]["pubKeyCredParams"][0]["alg"], -7);
        assert_ne!(
            stored.1,
            json!({ "challenge": body["publicKey"]["challenge"] }).to_string()
        );
        assert_eq!(
            serde_json::from_str::<Value>(&stored.1).expect("state json parses"),
            serde_json::from_str::<Value>(&restored_state_json)
                .expect("restored state json parses")
        );
        assert_eq!(stored.0, "register");
        assert_eq!(stored.2, "example.com");
        assert_eq!(stored.3, "https://app.example.com");
        assert_eq!(stored.4, None);
    }

    #[test]
    fn second_register_options_consumes_first_unused_registration_challenge() {
        let connection = Connection::open_in_memory().expect("database opens");
        create_register_options_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email) VALUES (?1, ?2)",
                ("user-1", "user@example.com"),
            )
            .expect("user inserts");
        connection
            .execute(
                "INSERT INTO allowed_origins (origin) VALUES (?1)",
                ["https://app.example.com"],
            )
            .expect("origin inserts");
        let request = OptionsRequest {
            rp_id: "app.example.com".to_string(),
        };
        let first = register_options(&connection, "user-1", &request, "https://app.example.com")
            .expect("first options generate");
        let second = register_options(&connection, "user-1", &request, "https://app.example.com")
            .expect("second options generate");

        let first_consumed_at: Option<String> = connection
            .query_row(
                "SELECT consumed_at FROM webauthn_challenges WHERE request_id = ?1",
                [first["request_id"].as_str().expect("request id")],
                |row| row.get(0),
            )
            .expect("first consumed_at reads");
        let second_consumed_at: Option<String> = connection
            .query_row(
                "SELECT consumed_at FROM webauthn_challenges WHERE request_id = ?1",
                [second["request_id"].as_str().expect("request id")],
                |row| row.get(0),
            )
            .expect("second consumed_at reads");

        assert!(first_consumed_at.is_some());
        assert!(second_consumed_at.is_none());
    }

    #[test]
    fn rejects_register_options_for_sibling_rp_id() {
        let connection = Connection::open_in_memory().expect("database opens");
        create_register_options_schema(&connection);
        connection
            .execute(
                "INSERT INTO users (id, email) VALUES (?1, ?2)",
                ("user-1", "user@example.com"),
            )
            .expect("user inserts");
        connection
            .execute(
                "INSERT INTO allowed_origins (origin) VALUES (?1)",
                ["https://app.example.com"],
            )
            .expect("origin inserts");
        let request = OptionsRequest {
            rp_id: "login.example.com".to_string(),
        };

        let error = register_options(&connection, "user-1", &request, "https://app.example.com")
            .expect_err("sibling rp id is rejected");

        assert_eq!(error, RegisterOptionsError::InvalidWebauthnRegistration);
    }

    #[test]
    fn creates_authentication_options_and_stores_anonymous_challenge() {
        let connection = Connection::open_in_memory().expect("database opens");
        create_register_options_schema(&connection);
        connection
            .execute(
                "INSERT INTO allowed_origins (origin) VALUES (?1)",
                ["https://app.example.com"],
            )
            .expect("origin inserts");
        let request = OptionsRequest {
            rp_id: "EXAMPLE.COM.".to_string(),
        };

        let body = authentication_options(&connection, &request, "https://app.example.com")
            .expect("options generate");
        let request_id = body["request_id"].as_str().expect("request id");
        let stored: (String, String, Option<String>, String, String) = connection
            .query_row(
                "SELECT type, state_json, user_id, rp_id, origin FROM webauthn_challenges WHERE request_id = ?1",
                [request_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
            )
            .expect("challenge reads");
        let restored_state: DiscoverableAuthentication =
            serde_json::from_str(&stored.1).expect("webauthn-rs state deserializes");
        let restored_state_json =
            serde_json::to_string(&restored_state).expect("webauthn-rs state serializes");

        assert_eq!(body["publicKey"]["rpId"], "example.com");
        assert_eq!(body["publicKey"]["timeout"], 300000);
        assert_eq!(body["publicKey"]["userVerification"], "preferred");
        assert!(body["publicKey"].get("allowCredentials").is_none());
        assert_ne!(
            stored.1,
            json!({ "challenge": body["publicKey"]["challenge"] }).to_string()
        );
        assert_eq!(
            serde_json::from_str::<Value>(&stored.1).expect("state json parses"),
            serde_json::from_str::<Value>(&restored_state_json)
                .expect("restored state json parses")
        );
        assert_eq!(stored.0, "authenticate");
        assert_eq!(stored.2, None);
        assert_eq!(stored.3, "example.com");
        assert_eq!(stored.4, "https://app.example.com");
    }

    #[test]
    fn rejects_authentication_options_for_unallowlisted_request_origin() {
        let connection = Connection::open_in_memory().expect("database opens");
        create_register_options_schema(&connection);
        connection
            .execute(
                "INSERT INTO allowed_origins (origin) VALUES (?1)",
                ["https://app.example.com"],
            )
            .expect("origin inserts");
        let request = OptionsRequest {
            rp_id: "example.com".to_string(),
        };

        let error = authentication_options(&connection, &request, "https://evil.example.com")
            .expect_err("unallowlisted request origin is rejected");

        assert_eq!(
            error,
            AuthenticationOptionsError::InvalidWebauthnAuthentication
        );
    }

    #[test]
    fn parses_register_verify_request_boundary() {
        let parsed = parse_register_verify_request(
            r#"{"request_id":"00000000-0000-4000-8000-000000000000","credential":{"id":"credential-id","rawId":"raw-id","type":"public-key","response":{"clientDataJSON":"client-data","attestationObject":"attestation"}}}"#,
        )
        .expect("request parses");

        assert_eq!(parsed.request_id, "00000000-0000-4000-8000-000000000000");
        assert_eq!(parsed.credential.id, "credential-id");
    }

    #[test]
    fn rejects_register_verify_request_with_extra_fields() {
        let error = parse_register_verify_request(
            r#"{"request_id":"00000000-0000-4000-8000-000000000000","credential":{"id":"credential-id","rawId":"raw-id","type":"public-key","response":{"clientDataJSON":"client-data","attestationObject":"attestation"}},"extra":true}"#,
        )
        .expect_err("extra fields are rejected");

        assert!(error.is_data() || error.is_io());
    }

    #[test]
    fn register_verify_rejects_wrong_user_challenge() {
        let connection = Connection::open_in_memory().expect("database opens");
        create_register_options_schema(&connection);
        create_webauthn_credentials_schema(&connection);
        connection
            .execute(
                "INSERT INTO allowed_origins (origin) VALUES (?1)",
                ["https://app.example.com"],
            )
            .expect("origin inserts");
        connection
            .execute(
                "INSERT INTO webauthn_challenges
                 (request_id, type, state_json, user_id, expires_at, rp_id, origin)
                 VALUES (?1, 'register', ?2, ?3, ?4, ?5, ?6)",
                (
                    "00000000-0000-4000-8000-000000000000",
                    "challenge",
                    "other-user",
                    "9999-01-01T00:00:00.000Z",
                    "example.com",
                    "https://app.example.com",
                ),
            )
            .expect("challenge inserts");
        let request = register_verify_base64_request();

        let error = register_verify(&connection, "user-1", &request, "https://app.example.com")
            .expect_err("wrong user is rejected");

        assert_eq!(error, RegisterVerifyError::InvalidWebauthnRegistration);
    }

    #[test]
    fn register_verify_rejects_legacy_state_without_consuming_challenge() {
        let connection = Connection::open_in_memory().expect("database opens");
        create_register_options_schema(&connection);
        create_webauthn_credentials_schema(&connection);
        connection
            .execute(
                "INSERT INTO allowed_origins (origin) VALUES (?1)",
                ["https://app.example.com"],
            )
            .expect("origin inserts");
        connection
            .execute(
                "INSERT INTO webauthn_challenges
                 (request_id, type, state_json, user_id, expires_at, rp_id, origin)
                 VALUES (?1, 'register', ?2, ?3, ?4, ?5, ?6)",
                (
                    "00000000-0000-4000-8000-000000000000",
                    r#"{"challenge":"old"}"#,
                    "user-1",
                    "9999-01-01T00:00:00.000Z",
                    "example.com",
                    "https://app.example.com",
                ),
            )
            .expect("challenge inserts");
        let request = register_verify_base64_request();

        let error = register_verify(&connection, "user-1", &request, "https://app.example.com")
            .expect_err("legacy state is rejected");
        let consumed_at: Option<String> = connection
            .query_row(
                "SELECT consumed_at FROM webauthn_challenges WHERE request_id = ?1",
                ["00000000-0000-4000-8000-000000000000"],
                |row| row.get(0),
            )
            .expect("consumed_at reads");

        assert_eq!(error, RegisterVerifyError::InvalidWebauthnRegistration);
        assert!(consumed_at.is_none());
    }

    #[test]
    fn parses_authentication_verify_request_boundary() {
        let parsed = parse_authentication_verify_request(
            r#"{"request_id":"00000000-0000-4000-8000-000000000000","credential":{"id":"credential-id","rawId":"raw-id","type":"public-key","response":{"clientDataJSON":"client-data","authenticatorData":"auth-data","signature":"signature","userHandle":null}}}"#,
        )
        .expect("request parses");

        assert_eq!(parsed.request_id, "00000000-0000-4000-8000-000000000000");
        assert_eq!(parsed.credential.id, "credential-id");
    }

    #[test]
    fn rejects_authentication_verify_request_with_extra_fields() {
        let error = parse_authentication_verify_request(
            r#"{"request_id":"00000000-0000-4000-8000-000000000000","credential":{"id":"credential-id","rawId":"raw-id","type":"public-key","response":{"clientDataJSON":"client-data","authenticatorData":"auth-data","signature":"signature"}},"extra":true}"#,
        )
        .expect_err("extra fields are rejected");

        assert!(error.is_data() || error.is_io());
    }

    #[test]
    fn authentication_verify_rejects_legacy_state_without_consuming_challenge() {
        let connection = Connection::open_in_memory().expect("database opens");
        create_register_options_schema(&connection);
        create_webauthn_credentials_schema(&connection);
        connection
            .execute(
                "INSERT INTO allowed_origins (origin) VALUES (?1)",
                ["https://app.example.com"],
            )
            .expect("origin inserts");
        connection
            .execute(
                "INSERT INTO webauthn_challenges
                 (request_id, type, state_json, user_id, expires_at, rp_id, origin)
                 VALUES (?1, 'authenticate', ?2, NULL, ?3, ?4, ?5)",
                (
                    "00000000-0000-4000-8000-000000000000",
                    "challenge",
                    "9999-01-01T00:00:00.000Z",
                    "example.com",
                    "https://app.example.com",
                ),
            )
            .expect("challenge inserts");
        connection
            .execute(
                "INSERT INTO webauthn_credentials
                 (credential_id, user_id, passkey_json, rp_id)
                 VALUES (?1, ?2, ?3, ?4)",
                ("credential-id", "user-1", "{}", "example.com"),
            )
            .expect("credential inserts");
        let request = authentication_verify_request();

        let error = authentication_verify(&connection, &request, "https://app.example.com")
            .expect_err("legacy state is rejected");
        let stored: (Option<String>, Option<String>) = connection
            .query_row(
                "SELECT c.consumed_at, p.last_used_at
                 FROM webauthn_challenges c, webauthn_credentials p
                 WHERE c.request_id = ?1 AND p.credential_id = ?2",
                ["00000000-0000-4000-8000-000000000000", "credential-id"],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("side effects read");

        assert_eq!(
            error,
            AuthenticationVerifyError::InvalidWebauthnAuthentication
        );
        assert_eq!(stored, (None, None));
    }

    #[test]
    fn authentication_verify_rejects_credential_from_other_rp_id() {
        let connection = Connection::open_in_memory().expect("database opens");
        create_register_options_schema(&connection);
        create_webauthn_credentials_schema(&connection);
        connection
            .execute(
                "INSERT INTO allowed_origins (origin) VALUES (?1)",
                ["https://app.example.com"],
            )
            .expect("origin inserts");
        connection
            .execute(
                "INSERT INTO webauthn_challenges
                 (request_id, type, state_json, user_id, expires_at, rp_id, origin)
                 VALUES (?1, 'authenticate', ?2, NULL, ?3, ?4, ?5)",
                (
                    "00000000-0000-4000-8000-000000000000",
                    "challenge",
                    "9999-01-01T00:00:00.000Z",
                    "app.example.com",
                    "https://app.example.com",
                ),
            )
            .expect("challenge inserts");
        connection
            .execute(
                "INSERT INTO webauthn_credentials
                 (credential_id, user_id, passkey_json, rp_id)
                 VALUES (?1, ?2, ?3, ?4)",
                ("credential-id", "user-1", "{}", "example.com"),
            )
            .expect("credential inserts");
        let request = authentication_verify_request();

        let error = authentication_verify(&connection, &request, "https://app.example.com")
            .expect_err("rp scoped credential is required");

        assert_eq!(
            error,
            AuthenticationVerifyError::InvalidWebauthnAuthentication
        );
    }

    fn create_register_options_schema(connection: &Connection) {
        connection
            .execute_batch(
                "CREATE TABLE users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    email_verified_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE allowed_origins (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    origin TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE webauthn_challenges (
                    request_id TEXT PRIMARY KEY,
                    type TEXT NOT NULL CHECK (type IN ('register', 'authenticate')),
                    state_json TEXT NOT NULL,
                    user_id TEXT,
                    expires_at TEXT NOT NULL,
                    rp_id TEXT NOT NULL,
                    origin TEXT NOT NULL,
                    consumed_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .expect("schema exists");
    }

    fn create_webauthn_credentials_schema(connection: &Connection) {
        connection
            .execute_batch(
                "CREATE TABLE webauthn_credentials (
                    credential_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    passkey_json TEXT NOT NULL,
                    rp_id TEXT NOT NULL,
                    last_used_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .expect("credential schema exists");
    }

    fn register_verify_base64_request() -> RegisterVerifyRequest {
        parse_register_verify_request(
            r#"{"request_id":"00000000-0000-4000-8000-000000000000","credential":{"id":"YQ","rawId":"YQ","type":"public-key","response":{"clientDataJSON":"YQ","attestationObject":"YQ"}}}"#,
        )
        .expect("request parses")
    }

    fn authentication_verify_request() -> AuthenticationVerifyRequest {
        parse_authentication_verify_request(
            r#"{"request_id":"00000000-0000-4000-8000-000000000000","credential":{"id":"credential-id","rawId":"raw-id","type":"public-key","response":{"clientDataJSON":"client-data","authenticatorData":"auth-data","signature":"signature"}}}"#,
        )
        .expect("request parses")
    }

    fn expected_user_handle(user_id: &str) -> String {
        base64url_encode(user_webauthn_id(user_id).as_bytes())
    }
}
