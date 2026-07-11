# Maintenance

## Firefox and Bitwarden Interoperability Gate

- **Status**: open, blocks merge/release
- **Required evidence**: target OS, Firefox and Bitwarden versions; configured RP ID/origin; required registration options; real `credProps.rk=true`; username-less chooser listing; successful login; unchanged existing credential rows.
- **Constraint**: do not replace this evidence with Node or virtual-authenticator tests and do not relax the strict `rk=true` contract if the target combination fails.
- **Source**: [change review EXTERNAL-01](../tasks/fix-passkey-discoverable-contract/docs/review-change.md#external-release-gate)

## Rustfmt Baseline

- `cargo fmt --all -- --check` under Rust 1.96.0 requests a change in `rust-backend/src/session.rs`, whose blob is identical to `origin/main`.
- The Passkey change's Rust files pass scoped rustfmt and current PR workflows do not run this repository-wide gate.
- Handle the baseline in a separate maintenance change rather than mixing it into authentication work.

## SDK Native Extension Method Coverage

- Browser serialization prefers `getClientExtensionResults()`, but the current SDK fixture directly covers only the property fallback.
- A future focused test should use a receiver-sensitive native-style method returning `{ credProps: { rk: true } }`.
