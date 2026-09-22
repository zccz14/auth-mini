use std::collections::BTreeMap;
use std::sync::{Mutex, OnceLock};

use chrono::Utc;
use serde::Serialize;

// Unmatched requests come from the public internet, so both the number of tracked paths and
// the length of each path are capped to keep the in-memory store bounded.
const MAX_UNMATCHED_PATHS: usize = 512;
const MAX_UNMATCHED_PATH_CHARS: usize = 160;

#[derive(Debug, Serialize)]
pub(crate) struct RequestAuditSnapshot {
    started_at: i64,
    endpoints: Vec<EndpointAccessCount>,
    unmatched: Vec<UnmatchedRequest>,
}

#[derive(Debug, Serialize)]
struct EndpointAccessCount {
    method: String,
    endpoint: String,
    count: u64,
}

#[derive(Debug, Serialize)]
struct UnmatchedRequest {
    method: String,
    path: String,
    count: u64,
    last_seen: i64,
}

struct UnmatchedEntry {
    count: u64,
    last_seen: i64,
}

struct RequestAudit {
    started_at: i64,
    counts: BTreeMap<(String, String), u64>,
    unmatched: BTreeMap<(String, String), UnmatchedEntry>,
    unmatched_overflow: u64,
    unmatched_overflow_last_seen: i64,
}

impl RequestAudit {
    fn new(started_at: i64) -> Self {
        Self {
            started_at,
            counts: BTreeMap::new(),
            unmatched: BTreeMap::new(),
            unmatched_overflow: 0,
            unmatched_overflow_last_seen: 0,
        }
    }

    fn record(&mut self, method: &str, endpoint: &str) {
        let count = self
            .counts
            .entry((method.to_string(), endpoint.to_string()))
            .or_insert(0);
        *count += 1;
    }

    fn record_unmatched(&mut self, method: &str, path: &str) {
        let now = Utc::now().timestamp();
        let key = (method.to_string(), truncate_path(path));

        if let Some(entry) = self.unmatched.get_mut(&key) {
            entry.count += 1;
            entry.last_seen = now;
            return;
        }
        if self.unmatched.len() >= MAX_UNMATCHED_PATHS {
            self.unmatched_overflow += 1;
            self.unmatched_overflow_last_seen = now;
            return;
        }
        self.unmatched.insert(
            key,
            UnmatchedEntry {
                count: 1,
                last_seen: now,
            },
        );
    }

    fn snapshot(&self) -> RequestAuditSnapshot {
        let mut endpoints = self
            .counts
            .iter()
            .map(|((method, endpoint), count)| EndpointAccessCount {
                method: method.clone(),
                endpoint: endpoint.clone(),
                count: *count,
            })
            .collect::<Vec<_>>();
        endpoints.sort_by(|left, right| {
            right
                .count
                .cmp(&left.count)
                .then_with(|| left.method.cmp(&right.method))
                .then_with(|| left.endpoint.cmp(&right.endpoint))
        });

        let mut unmatched = self
            .unmatched
            .iter()
            .map(|((method, path), entry)| UnmatchedRequest {
                method: method.clone(),
                path: path.clone(),
                count: entry.count,
                last_seen: entry.last_seen,
            })
            .collect::<Vec<_>>();
        if self.unmatched_overflow > 0 {
            unmatched.push(UnmatchedRequest {
                method: "*".to_string(),
                path: "(other)".to_string(),
                count: self.unmatched_overflow,
                last_seen: self.unmatched_overflow_last_seen,
            });
        }
        unmatched.sort_by(|left, right| {
            right
                .count
                .cmp(&left.count)
                .then_with(|| left.method.cmp(&right.method))
                .then_with(|| left.path.cmp(&right.path))
        });

        RequestAuditSnapshot {
            started_at: self.started_at,
            endpoints,
            unmatched,
        }
    }
}

fn truncate_path(path: &str) -> String {
    if path.chars().count() <= MAX_UNMATCHED_PATH_CHARS {
        return path.to_string();
    }

    let mut truncated = path
        .chars()
        .take(MAX_UNMATCHED_PATH_CHARS)
        .collect::<String>();
    truncated.push('…');
    truncated
}

pub(crate) fn initialize() {
    let _ = audit();
}

pub(crate) fn record(method: &str, endpoint: &str) {
    audit()
        .lock()
        .expect("request audit lock poisoned")
        .record(method, endpoint);
}

pub(crate) fn record_unmatched(method: &str, path: &str) {
    audit()
        .lock()
        .expect("request audit lock poisoned")
        .record_unmatched(method, path);
}

pub(crate) fn snapshot() -> RequestAuditSnapshot {
    audit()
        .lock()
        .expect("request audit lock poisoned")
        .snapshot()
}

fn audit() -> &'static Mutex<RequestAudit> {
    static AUDIT: OnceLock<Mutex<RequestAudit>> = OnceLock::new();
    AUDIT.get_or_init(|| Mutex::new(RequestAudit::new(Utc::now().timestamp())))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_endpoint_accesses_and_sorts_by_count() {
        let mut audit = RequestAudit::new(1_784_200_000);
        audit.record("GET", "/jwks");
        audit.record("POST", "/email/start");
        audit.record("GET", "/jwks");

        let snapshot = audit.snapshot();

        assert_eq!(snapshot.started_at, 1_784_200_000);
        assert_eq!(snapshot.endpoints.len(), 2);
        assert_eq!(snapshot.endpoints[0].method, "GET");
        assert_eq!(snapshot.endpoints[0].endpoint, "/jwks");
        assert_eq!(snapshot.endpoints[0].count, 2);
        assert_eq!(snapshot.endpoints[1].method, "POST");
        assert_eq!(snapshot.endpoints[1].endpoint, "/email/start");
        assert_eq!(snapshot.endpoints[1].count, 1);
    }

    #[test]
    fn breaks_count_ties_by_method_then_endpoint() {
        let mut audit = RequestAudit::new(0);
        audit.record("POST", "/b");
        audit.record("GET", "/c");
        audit.record("GET", "/a");
        audit.record("POST", "/a");

        let snapshot = audit.snapshot();

        let labels = snapshot
            .endpoints
            .iter()
            .map(|entry| (entry.method.as_str(), entry.endpoint.as_str()))
            .collect::<Vec<_>>();
        assert_eq!(
            labels,
            vec![("GET", "/a"), ("GET", "/c"), ("POST", "/a"), ("POST", "/b"),]
        );
    }

    #[test]
    fn records_unmatched_requests_with_last_seen() {
        let mut audit = RequestAudit::new(0);
        audit.record_unmatched("GET", "/missing");
        audit.record_unmatched("GET", "/missing");
        audit.record_unmatched("POST", "/other");

        let snapshot = audit.snapshot();

        assert_eq!(snapshot.unmatched.len(), 2);
        assert_eq!(snapshot.unmatched[0].method, "GET");
        assert_eq!(snapshot.unmatched[0].path, "/missing");
        assert_eq!(snapshot.unmatched[0].count, 2);
        assert!(snapshot.unmatched[0].last_seen > 0);
        assert_eq!(snapshot.unmatched[1].method, "POST");
        assert_eq!(snapshot.unmatched[1].path, "/other");
        assert_eq!(snapshot.unmatched[1].count, 1);
    }

    #[test]
    fn caps_and_truncates_unmatched_requests() {
        let mut audit = RequestAudit::new(0);
        let long_path = format!("/{}", "a".repeat(MAX_UNMATCHED_PATH_CHARS + 10));
        audit.record_unmatched("GET", &long_path);
        for index in 0..MAX_UNMATCHED_PATHS {
            audit.record_unmatched("GET", &format!("/missing-{index}"));
        }
        audit.record_unmatched("GET", "/beyond-cap");

        let snapshot = audit.snapshot();

        assert_eq!(snapshot.unmatched.len(), MAX_UNMATCHED_PATHS + 1);
        let truncated = snapshot
            .unmatched
            .iter()
            .find(|entry| entry.path.starts_with("/aaa"))
            .expect("truncated path is tracked");
        assert_eq!(truncated.path.chars().count(), MAX_UNMATCHED_PATH_CHARS + 1);
        assert!(truncated.path.ends_with('…'));
        let overflow = snapshot
            .unmatched
            .iter()
            .find(|entry| entry.path == "(other)")
            .expect("overflow row is tracked");
        assert_eq!(overflow.method, "*");
        assert_eq!(overflow.count, 2);
        assert!(overflow.last_seen > 0);
    }
}
