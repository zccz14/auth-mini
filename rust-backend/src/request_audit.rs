use std::collections::BTreeMap;
use std::sync::{Mutex, OnceLock};

use chrono::Utc;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub(crate) struct RequestAuditSnapshot {
    started_at: i64,
    endpoints: Vec<EndpointAccessCount>,
}

#[derive(Debug, Serialize)]
struct EndpointAccessCount {
    method: String,
    endpoint: String,
    count: u64,
}

struct RequestAudit {
    started_at: i64,
    counts: BTreeMap<(String, String), u64>,
}

impl RequestAudit {
    fn new(started_at: i64) -> Self {
        Self {
            started_at,
            counts: BTreeMap::new(),
        }
    }

    fn record(&mut self, method: &str, endpoint: &str) {
        let count = self
            .counts
            .entry((method.to_string(), endpoint.to_string()))
            .or_insert(0);
        *count += 1;
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
        RequestAuditSnapshot {
            started_at: self.started_at,
            endpoints,
        }
    }
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
}
