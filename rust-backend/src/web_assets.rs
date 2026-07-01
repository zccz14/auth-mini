use std::io::Read;
use std::sync::OnceLock;

use flate2::read::GzDecoder;

pub(crate) const WEB_ASSET_CACHE_CONTROL: &str = "public, max-age=31536000, immutable";
pub(crate) const WEB_INDEX_CACHE_CONTROL: &str = "no-cache";

const WEB_ASSETS_ARCHIVE: &[u8] = include_bytes!("../web-assets.bin.gz");
const ARCHIVE_MAGIC: &[u8] = b"AUTHMINIWEB\0";
const ARCHIVE_VERSION: u16 = 1;

pub(crate) enum WebAsset {
    Redirect,
    Body {
        content_type: &'static str,
        cache_control: &'static str,
        body: Vec<u8>,
    },
    MissingAsset,
}

#[derive(Debug)]
struct WebAssetEntry {
    path: String,
    body: Vec<u8>,
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
    asset_body(&format!("assets/{path}"))
        .map(|body| WebAsset::Body {
            content_type: content_type(path),
            cache_control: WEB_ASSET_CACHE_CONTROL,
            body,
        })
        .unwrap_or(WebAsset::MissingAsset)
}

fn index_asset() -> WebAsset {
    WebAsset::Body {
        content_type: "text/html; charset=utf-8",
        cache_control: WEB_INDEX_CACHE_CONTROL,
        body: asset_body("index.html").expect("embedded web archive must contain index.html"),
    }
}

fn asset_body(path: &str) -> Option<Vec<u8>> {
    web_assets()
        .iter()
        .find(|entry| entry.path == path)
        .map(|entry| entry.body.clone())
}

fn web_assets() -> &'static [WebAssetEntry] {
    static WEB_ASSETS: OnceLock<Vec<WebAssetEntry>> = OnceLock::new();
    WEB_ASSETS.get_or_init(|| {
        decode_archive(WEB_ASSETS_ARCHIVE).expect("embedded web assets archive must decode")
    })
}

fn decode_archive(archive: &[u8]) -> Result<Vec<WebAssetEntry>, String> {
    let mut decoder = GzDecoder::new(archive);
    let mut bytes = Vec::new();
    decoder
        .read_to_end(&mut bytes)
        .map_err(|error| format!("web archive gzip decode failed: {error}"))?;

    let mut cursor = Cursor::new(&bytes);
    let magic = cursor.take(ARCHIVE_MAGIC.len())?;
    if magic != ARCHIVE_MAGIC {
        return Err("web archive magic mismatch".to_string());
    }

    let version = cursor.u16()?;
    if version != ARCHIVE_VERSION {
        return Err("web archive version mismatch".to_string());
    }

    let count = cursor.u32()?;
    let mut entries = Vec::with_capacity(count as usize);
    for _ in 0..count {
        let path_len = cursor.u16()? as usize;
        let body_len = cursor.u64()? as usize;
        let path = String::from_utf8(cursor.take(path_len)?.to_vec())
            .map_err(|_| "web archive path is not utf-8".to_string())?;
        let body = cursor.take(body_len)?.to_vec();
        entries.push(WebAssetEntry { path, body });
    }

    Ok(entries)
}

struct Cursor<'a> {
    bytes: &'a [u8],
    offset: usize,
}

impl<'a> Cursor<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, offset: 0 }
    }

    fn take(&mut self, len: usize) -> Result<&'a [u8], String> {
        let end = self
            .offset
            .checked_add(len)
            .ok_or_else(|| "web archive offset overflow".to_string())?;
        let slice = self
            .bytes
            .get(self.offset..end)
            .ok_or_else(|| "web archive ended unexpectedly".to_string())?;
        self.offset = end;
        Ok(slice)
    }

    fn u16(&mut self) -> Result<u16, String> {
        Ok(u16::from_be_bytes(
            self.take(2)?
                .try_into()
                .map_err(|_| "web archive u16 parse failed".to_string())?,
        ))
    }

    fn u32(&mut self) -> Result<u32, String> {
        Ok(u32::from_be_bytes(
            self.take(4)?
                .try_into()
                .map_err(|_| "web archive u32 parse failed".to_string())?,
        ))
    }

    fn u64(&mut self) -> Result<u64, String> {
        Ok(u64::from_be_bytes(
            self.take(8)?
                .try_into()
                .map_err(|_| "web archive u64 parse failed".to_string())?,
        ))
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
        assert!(matches!(
            match_web_asset("/web?from=test"),
            Some(WebAsset::Redirect)
        ));
    }

    #[test]
    fn matches_asset_referenced_by_index() {
        let Some(WebAsset::Body {
            content_type: _,
            cache_control: _,
            body,
        }) = match_web_asset("/web/")
        else {
            panic!("expected spa index asset");
        };
        let index = String::from_utf8(body).expect("index is utf-8");
        let asset_path = index
            .split('"')
            .find(|part| part.starts_with("/web/assets/") && part.ends_with(".js"))
            .expect("index references js asset");

        let Some(WebAsset::Body {
            content_type,
            cache_control,
            body,
        }) = match_web_asset(asset_path)
        else {
            panic!("expected embedded js asset");
        };

        assert_eq!(content_type, "text/javascript; charset=utf-8");
        assert_eq!(cache_control, WEB_ASSET_CACHE_CONTROL);
        assert!(!body.is_empty());
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
        assert!(body
            .windows(b"id=\"root\"".len())
            .any(|window| window == b"id=\"root\""));
    }

    #[test]
    fn classifies_missing_assets() {
        assert!(matches!(
            match_web_asset("/web/assets/missing.js"),
            Some(WebAsset::MissingAsset)
        ));
    }
}
