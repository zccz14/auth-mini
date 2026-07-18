use url::{Host, Url};

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum AudienceError {
    InvalidIssuer,
    InvalidRedirectUri,
    ExplicitAudienceNotAllowed,
    AudienceRequired,
    InvalidAudience,
}

pub(crate) fn resolve_audience(
    issuer: &str,
    redirect_uri: Option<&str>,
    audience: Option<&str>,
) -> Result<String, AudienceError> {
    let Some(redirect_uri) = redirect_uri else {
        if audience.is_some() {
            return Err(AudienceError::ExplicitAudienceNotAllowed);
        }

        return issuer_audience(issuer);
    };

    let redirect = Url::parse(redirect_uri).map_err(|_| AudienceError::InvalidRedirectUri)?;
    let host = redirect.host().ok_or(AudienceError::InvalidRedirectUri)?;
    let loopback = is_allowed_loopback(&host);

    if !matches!(redirect.scheme(), "http" | "https") || (!loopback && redirect.scheme() != "https")
    {
        return Err(AudienceError::InvalidRedirectUri);
    }

    if loopback {
        return audience
            .ok_or(AudienceError::AudienceRequired)
            .and_then(normalize_audience);
    }

    if audience.is_some() {
        return Err(AudienceError::ExplicitAudienceNotAllowed);
    }

    Ok(normalize_host(host))
}

pub(crate) fn issuer_audience(issuer: &str) -> Result<String, AudienceError> {
    let issuer = Url::parse(issuer).map_err(|_| AudienceError::InvalidIssuer)?;
    let host = issuer.host().ok_or(AudienceError::InvalidIssuer)?;

    Ok(normalize_host(host))
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
        Host::Domain(domain) => domain.as_ref().trim_end_matches('.').to_string(),
        Host::Ipv4(address) => address.to_string(),
        Host::Ipv6(address) => address.to_string(),
    }
}

fn is_allowed_loopback(host: &Host<&str>) -> bool {
    match host {
        Host::Domain(domain) => domain.trim_end_matches('.') == "localhost",
        Host::Ipv4(address) => *address == std::net::Ipv4Addr::LOCALHOST,
        Host::Ipv6(address) => *address == std::net::Ipv6Addr::LOCALHOST,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn derives_audience_from_issuer_without_redirect() {
        assert_eq!(
            resolve_audience("https://AUTH.Example.com:8443", None, None),
            Ok("auth.example.com".to_string())
        );
        assert_eq!(
            resolve_audience("https://[::1]:8443", None, None),
            Ok("::1".to_string())
        );
    }

    #[test]
    fn derives_audience_from_https_redirect_hostname() {
        assert_eq!(
            resolve_audience(
                "https://auth.example.com",
                Some("https://App.Example.com:9443/callback?next=1"),
                None,
            ),
            Ok("app.example.com".to_string())
        );
    }

    #[test]
    fn loopback_http_redirect_requires_explicit_normalized_audience() {
        for redirect_uri in [
            "http://localhost/callback",
            "http://localhost:3000/callback",
            "http://LOCALHOST.:3000/callback",
            "http://127.0.0.1:3000/callback",
            "http://[::1]:3000/callback",
        ] {
            assert_eq!(
                resolve_audience(
                    "https://auth.example.com",
                    Some(redirect_uri),
                    Some("API.Example.com."),
                ),
                Ok("api.example.com".to_string()),
                "{redirect_uri}"
            );
            assert_eq!(
                resolve_audience("https://auth.example.com", Some(redirect_uri), None,),
                Err(AudienceError::AudienceRequired),
                "{redirect_uri}"
            );
        }
    }

    #[test]
    fn rejects_non_loopback_http_and_explicit_audience_for_https_redirect() {
        for redirect_uri in [
            "http://0.0.0.0:3000/callback",
            "http://localhost.evil.com/callback",
            "http://127.0.0.2/callback",
            "http://app.example.com/callback",
        ] {
            assert_eq!(
                resolve_audience(
                    "https://auth.example.com",
                    Some(redirect_uri),
                    Some("api.example.com"),
                ),
                Err(AudienceError::InvalidRedirectUri),
                "{redirect_uri}"
            );
        }

        assert_eq!(
            resolve_audience(
                "https://auth.example.com",
                Some("https://app.example.com/callback"),
                Some("api.example.com"),
            ),
            Err(AudienceError::ExplicitAudienceNotAllowed)
        );
    }

    #[test]
    fn rejects_audience_without_redirect_and_non_hostname_audiences() {
        assert_eq!(
            resolve_audience("https://auth.example.com", None, Some("api.example.com"),),
            Err(AudienceError::ExplicitAudienceNotAllowed)
        );

        for audience in [
            "https://api.example.com",
            "api.example.com/path",
            "api.example.com:443",
            " api.example.com",
            "",
        ] {
            assert_eq!(
                resolve_audience(
                    "https://auth.example.com",
                    Some("http://localhost:3000/callback"),
                    Some(audience),
                ),
                Err(AudienceError::InvalidAudience),
                "{audience}"
            );
        }
    }
}
