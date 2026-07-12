# Maintenance

## Firefox and Bitwarden Interoperability Gate

- **Status**: satisfied on 2026-07-11; no longer blocks merge/release
- **Evidence**: acorn served the new public OpenAPI contract and the operator confirmed successful Firefox/Bitwarden registration, username-less discovery, and login on the deployed `b4f6cf7` build.
- **Evidence limit**: exact browser/extension/OS versions and screenshots were not supplied; credential preservation remains covered by the automated row-snapshot tests.
- **Constraint**: do not replace this evidence with Node or virtual-authenticator tests and do not relax the strict `rk=true` contract if the target combination fails.
- **Source**: [change review EXTERNAL-01](../tasks/fix-passkey-discoverable-contract/docs/review-change.md#external-release-gate)

## Rustfmt Baseline

- `cargo fmt --all -- --check` under Rust 1.96.0 requests a change in `rust-backend/src/session.rs`, whose blob is identical to `origin/main`.
- The Passkey change's Rust files pass scoped rustfmt and current PR workflows do not run this repository-wide gate.
- Handle the baseline in a separate maintenance change rather than mixing it into authentication work.

## SDK Native Extension Method Coverage

- Browser serialization prefers `getClientExtensionResults()`, but the current SDK fixture directly covers only the property fallback.
- A future focused test should use a receiver-sensitive native-style method returning `{ credProps: { rk: true } }`.
