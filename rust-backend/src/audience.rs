use std::collections::BTreeSet;

use url::{Host, Url};

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum AudienceError {
    InvalidIssuer,
    InvalidRedirectUri,
    ExplicitAudienceNotAllowed,
    AudienceRequired,
    InvalidAudience,
}

pub(crate) fn resolve_audiences(
    issuer: &str,
    redirect_uri: Option<&str>,
    audience: Option<&str>,
    audiences: Option<&[String]>,
) -> Result<Vec<String>, AudienceError> {
    if audience.is_some() && audiences.is_some() {
        return Err(AudienceError::InvalidAudience);
    }
    let Some(redirect_uri) = redirect_uri else {
        if audience.is_some() || audiences.is_some() {
            return Err(AudienceError::ExplicitAudienceNotAllowed);
        }
        return Ok(vec![issuer_audience(issuer)?]);
    };
    let redirect = Url::parse(redirect_uri).map_err(|_| AudienceError::InvalidRedirectUri)?;
    let host = redirect.host().ok_or(AudienceError::InvalidRedirectUri)?;
    let callback_audience = normalize_host(host.clone());
    let loopback = is_allowed_loopback(&host);
    if !matches!(redirect.scheme(), "http" | "https") || (!loopback && redirect.scheme() != "https")
    {
        return Err(AudienceError::InvalidRedirectUri);
    }
    let explicit = match (audience, audiences) {
        (Some(value), None) => Some(vec![value.to_owned()]),
        (None, Some(values)) => Some(values.to_vec()),
        (None, None) => None,
        (Some(_), Some(_)) => unreachable!(),
    };
    if loopback && explicit.is_none() {
        return Err(AudienceError::AudienceRequired);
    }
    let values = explicit.unwrap_or_else(|| vec![callback_audience.clone()]);
    let values = normalize_audiences(&values)?;
    if !values.iter().any(|value| value == &callback_audience) {
        return Err(AudienceError::AudienceRequired);
    }
    Ok(values)
}

pub(crate) fn issuer_audience(issuer: &str) -> Result<String, AudienceError> {
    let issuer = Url::parse(issuer).map_err(|_| AudienceError::InvalidIssuer)?;
    let host = issuer.host().ok_or(AudienceError::InvalidIssuer)?;
    Ok(normalize_host(host))
}

pub(crate) fn normalize_audiences(values: &[String]) -> Result<Vec<String>, AudienceError> {
    if values.is_empty() {
        return Err(AudienceError::InvalidAudience);
    }
    let mut normalized = BTreeSet::new();
    for value in values {
        let value = normalize_audience(value)?;
        if !normalized.insert(value) {
            return Err(AudienceError::InvalidAudience);
        }
    }
    Ok(normalized.into_iter().collect())
}

pub(crate) fn audience_json(values: &[String]) -> serde_json::Value {
    if values.len() == 1 {
        serde_json::Value::String(values[0].clone())
    } else {
        serde_json::Value::Array(
            values
                .iter()
                .cloned()
                .map(serde_json::Value::String)
                .collect(),
        )
    }
}

pub(crate) fn audiences_from_claim(
    value: &serde_json::Value,
) -> Result<Vec<String>, AudienceError> {
    match value {
        serde_json::Value::String(value) => normalize_audiences(&[value.clone()]),
        serde_json::Value::Array(values) => normalize_audiences(
            &values
                .iter()
                .map(|value| {
                    value
                        .as_str()
                        .map(str::to_owned)
                        .ok_or(AudienceError::InvalidAudience)
                })
                .collect::<Result<Vec<_>, _>>()?,
        ),
        _ => Err(AudienceError::InvalidAudience),
    }
}

fn normalize_audience(audience: &str) -> Result<String, AudienceError> {
    if audience.is_empty() || audience != audience.trim() {
        return Err(AudienceError::InvalidAudience);
    }
    let audience = audience.strip_suffix('.').unwrap_or(audience);
    let host = Host::parse(audience).map_err(|_| AudienceError::InvalidAudience)?;
    Ok(normalize_host(host))
}

fn normalize_host<T: AsRef<str>>(host: Host<T>) -> String {
    match host {
        Host::Domain(domain) => domain.as_ref().trim_end_matches('.').to_ascii_lowercase(),
        Host::Ipv4(address) => address.to_string(),
        Host::Ipv6(address) => address.to_string(),
    }
}

fn is_allowed_loopback(host: &Host<&str>) -> bool {
    match host {
        Host::Domain(domain) => domain
            .trim_end_matches('.')
            .eq_ignore_ascii_case("localhost"),
        Host::Ipv4(address) => *address == std::net::Ipv4Addr::LOCALHOST,
        Host::Ipv6(address) => *address == std::net::Ipv6Addr::LOCALHOST,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_single_audience_and_canonicalizes_multiple_audiences() {
        assert_eq!(
            resolve_audiences(
                "https://auth.example.com",
                Some("https://app.example.com/callback"),
                None,
                None
            ),
            Ok(vec!["app.example.com".to_owned()]),
        );
        let values = vec!["LINKIT.NTNL.IO".to_owned(), "1ex.ntnl.io".to_owned()];
        assert_eq!(
            resolve_audiences(
                "https://auth.example.com",
                Some("https://1ex.ntnl.io/callback"),
                None,
                Some(&values)
            ),
            Ok(vec!["1ex.ntnl.io".to_owned(), "linkit.ntnl.io".to_owned()]),
        );
        assert_eq!(
            audience_json(&["app.example.com".to_owned()]),
            serde_json::json!("app.example.com")
        );
        assert_eq!(
            audience_json(&[
                "app.example.com".to_owned(),
                "linkit.example.com".to_owned()
            ]),
            serde_json::json!(["app.example.com", "linkit.example.com"])
        );
    }

    #[test]
    fn rejects_ambiguous_or_incomplete_explicit_audiences() {
        let values = vec!["linkit.example.com".to_owned()];
        assert_eq!(
            resolve_audiences(
                "https://auth.example.com",
                Some("https://app.example.com/callback"),
                None,
                Some(&values)
            ),
            Err(AudienceError::AudienceRequired),
        );
        assert_eq!(
            resolve_audiences(
                "https://auth.example.com",
                Some("https://app.example.com/callback"),
                Some("app.example.com"),
                Some(&values)
            ),
            Err(AudienceError::InvalidAudience),
        );
        assert_eq!(
            normalize_audiences(&["app.example.com".to_owned(), "app.example.com".to_owned()]),
            Err(AudienceError::InvalidAudience)
        );
    }

    #[test]
    fn accepts_string_or_array_audience_claims() {
        assert_eq!(
            audiences_from_claim(&serde_json::json!("app.example.com")),
            Ok(vec!["app.example.com".to_owned()])
        );
        assert_eq!(
            audiences_from_claim(&serde_json::json!([
                "linkit.example.com",
                "app.example.com"
            ])),
            Ok(vec![
                "app.example.com".to_owned(),
                "linkit.example.com".to_owned()
            ])
        );
    }
}
