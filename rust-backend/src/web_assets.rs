pub(crate) const WEB_ASSET_CACHE_CONTROL: &str = "public, max-age=31536000, immutable";
pub(crate) const WEB_INDEX_CACHE_CONTROL: &str = "no-cache";

const INDEX_HTML: &[u8] = include_bytes!("../web/index.html");
const INDEX_CSS: &[u8] = include_bytes!("../web/assets/index-XS1pIkA7.css");
const INDEX_JS: &[u8] = include_bytes!("../web/assets/index-DEriteJU.js");

pub(crate) enum WebAsset {
    Redirect,
    Body {
        content_type: &'static str,
        cache_control: &'static str,
        body: &'static [u8],
    },
    MissingAsset,
}

pub(crate) fn match_web_asset(path: &str) -> Option<WebAsset> {
    let path = path.split_once('?').map_or(path, |(path, _)| path);

    if path == "/web" {
        return Some(WebAsset::Redirect);
    }

    if path == "/web/" {
        return Some(index_asset());
    }

    if let Some(asset_path) = path.strip_prefix("/web/assets/") {
        return Some(match_asset(asset_path));
    }

    path.strip_prefix("/web/").map(|_| index_asset())
}

fn match_asset(path: &str) -> WebAsset {
    match path {
        "index-XS1pIkA7.css" => WebAsset::Body {
            content_type: content_type(path),
            cache_control: WEB_ASSET_CACHE_CONTROL,
            body: INDEX_CSS,
        },
        "index-DEriteJU.js" => WebAsset::Body {
            content_type: content_type(path),
            cache_control: WEB_ASSET_CACHE_CONTROL,
            body: INDEX_JS,
        },
        _ => WebAsset::MissingAsset,
    }
}

fn index_asset() -> WebAsset {
    WebAsset::Body {
        content_type: "text/html; charset=utf-8",
        cache_control: WEB_INDEX_CACHE_CONTROL,
        body: INDEX_HTML,
    }
}

fn content_type(path: &str) -> &'static str {
    match path.rsplit_once('.').map(|(_, extension)| extension) {
        Some("css") => "text/css; charset=utf-8",
        Some("js") => "text/javascript; charset=utf-8",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("ico") => "image/x-icon",
        Some("woff2") => "font/woff2",
        Some("json") => "application/json; charset=utf-8",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_web_redirect_without_query() {
        assert!(matches!(match_web_asset("/web?from=test"), Some(WebAsset::Redirect)));
    }

    #[test]
    fn matches_known_asset_without_query() {
        let Some(WebAsset::Body {
            content_type,
            cache_control,
            body,
        }) = match_web_asset("/web/assets/index-DEriteJU.js?v=1")
        else {
            panic!("expected embedded js asset");
        };

        assert_eq!(content_type, "text/javascript; charset=utf-8");
        assert_eq!(cache_control, WEB_ASSET_CACHE_CONTROL);
        assert!(body.starts_with(b"(") || body.starts_with(b"var ") || body.starts_with(b"function "));
    }

    #[test]
    fn falls_back_to_index_for_spa_routes() {
        let Some(WebAsset::Body {
            content_type,
            cache_control,
            body,
        }) = match_web_asset("/web/setup")
        else {
            panic!("expected spa index asset");
        };

        assert_eq!(content_type, "text/html; charset=utf-8");
        assert_eq!(cache_control, WEB_INDEX_CACHE_CONTROL);
        assert!(body.windows(b"id=\"root\"".len()).any(|window| window == b"id=\"root\""));
    }

    #[test]
    fn classifies_missing_assets() {
        assert!(matches!(
            match_web_asset("/web/assets/missing.js"),
            Some(WebAsset::MissingAsset)
        ));
    }
}
