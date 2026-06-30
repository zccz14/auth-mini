# CLI and operations

Install the Rust release binary for your platform from GitHub Releases, verify its `.sha256` checksum, extract it, and put `auth-mini` on `PATH`:

```bash
curl -LO https://github.com/zccz14/auth-mini/releases/download/v0.3.0/auth-mini-x86_64-unknown-linux-gnu.tar.gz
curl -LO https://github.com/zccz14/auth-mini/releases/download/v0.3.0/auth-mini-x86_64-unknown-linux-gnu.tar.gz.sha256
shasum -a 256 -c auth-mini-x86_64-unknown-linux-gnu.tar.gz.sha256
tar -xzf auth-mini-x86_64-unknown-linux-gnu.tar.gz
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

With no arguments, auth-mini listens on `127.0.0.1:7777`, uses `http://localhost:7777` as the issuer, and stores SQLite data at `~/.auth-mini/default.sqlite3`. The database is initialized automatically when the server starts, including parent directory creation, schema creation, and JWKS key bootstrap.

For deployment, set the externally visible issuer and optionally a database path:

```bash
auth-mini --db ./auth-mini.sqlite --issuer https://auth.your-domain.com
```

The Rust binary embeds the database schema and `openapi.yaml` for release-binary use. Runtime initialization uses the embedded schema. Rust `/openapi.yaml` and `/openapi.json` do not depend on the current working directory, and the Rust runtime has no `--openapi` override parameter.

The Rust binary prints one `auth-mini SQLite database: <path>` line to stderr when a database is configured.

The old npm/oclif commands and Rust management subcommands have been removed. Configure the instance through the GUI demo or the local admin setup API.

## Stored browser origins

Manage browser page origins for WebAuthn and related origin checks with the GUI demo setup page or `PUT /admin/setup`. This does not control HTTP CORS; auth-mini serves `Access-Control-Allow-Origin: *` on CORS responses.

```bash
curl -X PUT http://localhost:7777/admin/setup \
  -H 'content-type: application/json' \
  -d '{"origin":"https://app.example.com","smtp":{"host":"smtp.example.com","port":587,"username":"mailer","password":"secret","from_email":"noreply@example.com","secure":false,"weight":1}}'
```

## SMTP configuration

Manage SMTP with the same setup API. The response returns an SMTP summary and never returns the stored password:

```bash
curl http://localhost:7777/admin/setup
```

## Starting the server

`--issuer` is the externally visible auth origin that clients, JWT verifiers, and WebAuthn flows should use. It is not the local bind address from `--host`/`--port`.

```bash
auth-mini \
  --port 7777 \
  --issuer https://auth.zccz14.com
```

## Docker runtime

Pull the release image from GHCR:

```bash
docker pull ghcr.io/zccz14/auth-mini:latest
```

Use `ghcr.io/zccz14/auth-mini:v0.3.0` for a pinned release version, or `ghcr.io/zccz14/auth-mini:latest` for the latest release image.

Run the Rust binary container with persistent SQLite storage:

```bash
docker run --rm \
  -p 7777:7777 \
  -v auth-mini-data:/var/lib/auth-mini \
  ghcr.io/zccz14/auth-mini:latest \
  --db /var/lib/auth-mini/auth-mini.sqlite --host 0.0.0.0 --port 7777 --issuer https://auth.zccz14.com
```

The image entrypoint is `auth-mini`. The default command is `--db /var/lib/auth-mini/auth-mini.sqlite --host 0.0.0.0 --port 7777 --issuer http://localhost:7777`, which is intended for local smoke testing. For deployment, pass an explicit `--issuer <public-origin>` command. The image exposes `7777`, runs as non-root uid `10001`, and stores the default database at `/var/lib/auth-mini/auth-mini.sqlite`. The Rust binary embeds the schema and OpenAPI document, so the image does not need external `schema.sql` or `openapi.yaml` files at runtime.

To build the same runtime image locally from this repository, run `docker build -f build/Dockerfile -t auth-mini:local .`.

## Release version rule

For binary and GHCR releases, Git tag `vX.Y.Z` is the release version single source of truth. Before pushing the tag, manually align these manifest versions to `X.Y.Z`:

- `package.json` `version`
- `rust-backend/Cargo.toml` `[package] version`
- `rust-backend/Cargo.lock` `auth-mini` package `version`

Run `npm run check:release-version -- vX.Y.Z` before pushing the tag. The release workflows run the same check before binary builds and before Docker smoke/push; a mismatch fails fast. The release check does not bump manifests, infer another version, or create a release tag.

## Logging and diagnostics

auth-mini writes structured JSON logs by default. The logs are suitable for redirection to a file:

```bash
auth-mini --issuer https://auth.zccz14.com >> auth-mini.log
```

In the current version, logs may contain plaintext email addresses and client IPs. Logs intentionally exclude OTP values, tokens, and SMTP passwords.
