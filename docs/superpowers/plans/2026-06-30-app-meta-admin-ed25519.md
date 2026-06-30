# app_meta 与 Ed25519 管理员初始化 Implementation Plan

## Scope

Implement the spec in `docs/superpowers/specs/2026-06-30-app-meta-admin-ed25519.md`: persist app-level issuer/admin user metadata, remove issuer from the CLI, allow nullable user email, and support loopback Ed25519 admin setup without requiring SMTP.

## Files

- `sql/schema.sql`: add the single-row `app_meta` table and make `users.email` nullable while preserving uniqueness for non-null email values.
- `rust-backend/src/db.rs` and related DB init modules/tests: create or migrate `app_meta`, seed the `APP` row, migrate old `users.email NOT NULL` schemas, and expose app metadata reads/writes.
- `rust-backend/src/config.rs`, `rust-backend/src/main.rs`, and CLI parsing files: remove `--issuer` and keep only runtime-required parameters such as host, port, and database path.
- HTTP route/state modules for setup, token minting, Ed25519 auth, WebAuthn/RP metadata, and `/me`: read issuer from `app_meta`, write `admin_user_id`, allow `email: null`, and return setup state without SMTP password.
- OpenAPI and generated API types: update admin setup request/response schemas, nullable email fields, and removed CLI expectations.
- README and docs, including CLI/operations documentation: describe app_meta issuer authority, nullable email accounts, SMTP optionality, and Ed25519 admin setup.
- Demo setup UI and tests: remove required SMTP assumption and support issuer plus Ed25519 public key bootstrap.
- Rust, API, and demo tests covering migration, setup, login, nullable email responses, and docs/API shape.

## Steps

1. Update schema and runtime initialization.
   - Add `app_meta` with `id = 'APP'`, `issuer`, nullable `admin_user_id`, timestamps, and user foreign key.
   - Ensure new database initialization creates the table and inserts the `APP` row.
   - Add the old-database migration path for missing `app_meta` and nullable `users.email`.
   - Keep the migration owned by runtime DB initialization; do not add a separate operator command for this compatibility path.

2. Simplify CLI and issuer ownership.
   - Remove `--issuer` from CLI parsing, README examples, and docs.
   - Keep only parameters required to start the service.
   - Change runtime consumers of issuer to read `app_meta.issuer` instead of config/CLI state.

3. Extend loopback `/admin/setup`.
   - Accept issuer, origin configuration, optional SMTP configuration, and optional `admin_ed25519`.
   - Create or reuse the `app_meta.admin_user_id` user when `admin_ed25519` is provided.
   - Bind the Ed25519 public key as an admin credential for that user.
   - Preserve loopback-only enforcement and never return SMTP password.

4. Support nullable email.
   - Update DB query mapping and response structs so `users.email` is optional.
   - Update `/me`, setup responses, OpenAPI schemas, generated types, and demo assumptions to accept `email: null`.
   - Preserve non-null email uniqueness with tests for duplicate non-null email and multiple null email users.

5. Update docs, OpenAPI, generated assets, and demo.
   - Update OpenAPI admin setup schemas and nullable email schema fields.
   - Regenerate checked-in SDK/API artifacts if the repository expects generated outputs.
   - Update README and docs to explain app_meta, simplified CLI, optional SMTP, and Ed25519 setup.
   - Update demo setup UI and tests for the new bootstrap path.

6. Verify.
   - Run Rust unit/integration tests covering DB initialization, old SQLite migration, admin setup, Ed25519 login, and `/me`.
   - Run OpenAPI/schema generation checks used by the repository.
   - Run demo/typecheck/tests that cover setup UI and nullable email behavior.
   - Re-run targeted migration tests after any schema or DB init adjustment.

## Clean-Code Complexity Constraints

- New paths must be limited to explicit business rules: new database initialization, old SQLite migration, loopback-only admin setup, optional SMTP configuration, optional admin Ed25519 binding, and nullable email serialization.
- The compatibility path for old SQLite files is necessary because existing deployments may already have databases without `app_meta` and with `users.email NOT NULL`.
- Compatibility owner: runtime database initialization.
- Compatibility dependency: SQLite files created before this schema change.
- Removal condition: delete the compatibility path only after the project stops supporting automatic startup migration for old SQLite files.
- Verification: migration tests must cover old schemas without `app_meta`, old schemas with `users.email NOT NULL`, preservation of existing data, insertion of the `APP` row, nullable email behavior, and non-null email uniqueness.
- Do not add broad fallback issuer sources. After migration/init, issuer authority is `app_meta.issuer`; missing or invalid app metadata should fail at the DB/runtime boundary instead of silently reading old CLI/config state.
