# CLI and operations

Install the Rust release binary for your platform from GitHub Releases, verify its `.sha256` checksum, extract it, and put `auth-mini` on `PATH`:

```bash
curl -LO https://github.com/zccz14/auth-mini/releases/download/latest/auth-mini-linux-x86_64.tar.gz
curl -LO https://github.com/zccz14/auth-mini/releases/download/latest/auth-mini-linux-x86_64.tar.gz.sha256
shasum -a 256 -c auth-mini-linux-x86_64.tar.gz.sha256
tar -xzf auth-mini-linux-x86_64.tar.gz
chmod +x auth-mini
sudo mv auth-mini /usr/local/bin/auth-mini
auth-mini
```

Use the matching archive for your platform from the GitHub Release assets. The npm package does not provide a CLI; it only ships SDK exports. The released Rust binary is the auth-mini server runtime.

## Instance setup

Run auth-mini with no arguments for local development:

```bash
auth-mini
```

With no arguments, auth-mini listens on `127.0.0.1:7777` and stores SQLite data at `~/.auth-mini/default.sqlite3`. The database is initialized automatically when the server starts, including parent directory creation, `app_meta`, JWKS key bootstrap, and schema creation.

For deployment, the CLI only accepts the bind host, bind port, and database path:

```bash
auth-mini --host 127.0.0.1 --port 7777 --db ./auth-mini.sqlite
```

The Rust binary embeds the database schema, `openapi.yaml`, and the GUI demo static assets for release-binary use. Runtime initialization uses the embedded schema. Rust `/openapi.yaml` and `/openapi.json` do not depend on the current working directory, `/web/` serves the embedded GUI without a separate frontend deployment, and the Rust runtime has no `--openapi` override parameter.

The Rust binary prints one `auth-mini SQLite database: <path>` line to stderr when a database is configured.

The old npm/oclif commands and Rust management subcommands have been removed. Initialize the admin credential through the local setup API, then configure app metadata through the authenticated admin configuration API or GUI.

## Passkey RP configuration

Initialize the admin Ed25519 credential with loopback-only `PUT /admin/setup`, then manage the externally visible issuer and passkey RP ID with the admin configuration page or authenticated `PUT /admin/config`. These values are stored in `app_meta` as `app_meta.issuer` and `app_meta.rp_id`. Passkey ceremonies run on the Auth Mini server page, so WebAuthn origin is derived from the issuer; this does not control HTTP CORS, and auth-mini serves `Access-Control-Allow-Origin: *` on CORS responses.

```bash
curl -X PUT http://127.0.0.1:7777/admin/setup \
  -H 'content-type: application/json' \
  -d '{"admin_ed25519":{"name":"ops laptop","public_key":"<base64url-ed25519-public-key>"}}'
```

The required `admin_ed25519` value creates an admin user without an email address. Use that key for later Ed25519 admin login.

## SMTP configuration

Manage SMTP with the authenticated admin configuration API when email OTP is needed. SMTP is optional, and admin Ed25519 bootstrap does not depend on SMTP. The response returns an SMTP summary and never returns the stored password:

```bash
curl -X PUT http://127.0.0.1:7777/admin/config \\
  -H 'authorization: Bearer <admin-access-token>' \\
  -H 'content-type: application/json' \\
  -d '{"issuer":"https://auth.example.com","rp_id":"auth.example.com","smtp":{"host":"smtp.example.com","port":587,"username":"mailer","password":"secret","from_email":"noreply@example.com","from_name":"Auth Mini","secure":false,"weight":1}}'
```

## Starting the server

The CLI controls only the local listener and database path. The externally visible issuer used by clients, JWT verifiers, and WebAuthn flows is app metadata set through `/admin/config`.

```bash
auth-mini \
  --host 127.0.0.1 \
  --port 7777 \
  --db ./auth-mini.sqlite
```

## Release version rule

For versioned binary releases, Git tag `vX.Y.Z` is the release version single source of truth. Before pushing the tag, manually align these manifest versions to `X.Y.Z`:

- `package.json` `version`
- `rust-backend/Cargo.toml` `[package] version`
- `rust-backend/Cargo.lock` `auth-mini` package `version`

Run `npm run check:release-version -- vX.Y.Z` before pushing the tag. The release check does not bump manifests, infer another version, or create a release tag.

## Logging and diagnostics

auth-mini writes structured JSON logs by default. The logs are suitable for redirection to a file:

```bash
auth-mini --host 127.0.0.1 --port 7777 --db ./auth-mini.sqlite >> auth-mini.log
```

In the current version, logs may contain plaintext email addresses and client IPs. Logs intentionally exclude OTP values, tokens, and SMTP passwords.
