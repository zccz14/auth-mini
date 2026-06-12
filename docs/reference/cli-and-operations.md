# CLI and operations

Install the Rust release binary for your platform from GitHub Releases, verify its `.sha256` checksum, extract it, and put `auth-mini` on `PATH`:

```bash
curl -LO https://github.com/zccz14/auth-mini/releases/download/v0.3.0/auth-mini-x86_64-unknown-linux-gnu.tar.gz
curl -LO https://github.com/zccz14/auth-mini/releases/download/v0.3.0/auth-mini-x86_64-unknown-linux-gnu.tar.gz.sha256
shasum -a 256 -c auth-mini-x86_64-unknown-linux-gnu.tar.gz.sha256
tar -xzf auth-mini-x86_64-unknown-linux-gnu.tar.gz
chmod +x auth-mini
sudo mv auth-mini /usr/local/bin/auth-mini
auth-mini --help
```

Use the matching archive for your platform from the GitHub Release assets. The npm package no longer provides a CLI; it only ships SDK exports. The released Rust binary is the official `auth-mini` CLI and server runtime.

## Instance setup

Initialize an auth-mini instance (currently a SQLite database path):

```bash
auth-mini init
```

`<instance>` currently means the path to your auth-mini SQLite database file.

The instance path is optional on `init`, `start`, `origin`, `smtp`, and `rotate jwks`. When omitted, it uses `~/.auth-mini/default.sqlite3`. Commands that use a database initialize the SQLite file automatically when it is missing, including parent directory creation, schema creation, and JWKS key bootstrap:

```bash
auth-mini init
auth-mini start --issuer https://auth.your-domain.com
auth-mini origin add --value https://app.example.com
```

Explicit paths remain supported, for example `auth-mini init ./auth-mini.sqlite`. Explicit `init` remains available and is idempotent. The Rust binary embeds the database schema and `openapi.yaml` for release-binary use; existing `--schema` arguments are accepted for compatibility but runtime initialization uses the embedded schema. Rust `/openapi.yaml` and `/openapi.json` do not depend on the current working directory, and the Rust CLI has no `--openapi` override parameter.

The Rust binary prints one `auth-mini SQLite database: <path>` line to stderr for database-using commands. Management command stdout remains tab-separated rows for scripts.

The old npm/oclif `create` command has been removed with the Node backend cleanup. Use `auth-mini init`, `auth-mini origin`, `auth-mini smtp`, `auth-mini rotate jwks`, and `auth-mini start` from the Rust release binary.

## Stored browser origins

Manage browser page origins for WebAuthn and related origin checks with the `origin` topic. This does not control HTTP CORS; auth-mini serves `Access-Control-Allow-Origin: *` on CORS responses.

```bash
auth-mini origin add --value https://app.example.com
auth-mini origin list
auth-mini origin update --id 1 --value https://admin.example.com
auth-mini origin delete --id 1
```

## SMTP configuration

Manage SMTP configs with the `smtp` topic:

```bash
auth-mini smtp add --host smtp.example.com --port 587 --username mailer --password secret --from-email noreply@example.com
auth-mini smtp list
auth-mini smtp update --id 1 --secure true
auth-mini smtp delete --id 1
```

## Starting the server

`--issuer` is the externally visible auth origin that clients, JWT verifiers, and WebAuthn flows should use. It is not the local bind address from `--host`/`--port`.

```bash
auth-mini start \
  --host 127.0.0.1 \
  --port 7777 \
  --issuer https://auth.zccz14.com
```

## JWKS rotation

```bash
auth-mini rotate jwks
```

`/jwks` always publishes the `CURRENT` and `STANDBY` keys.

`rotate jwks` promotes `STANDBY` to `CURRENT`, then generates a fresh `STANDBY`.

After rotation, the previous `CURRENT` key is no longer retained.

Because the previous `CURRENT` key is not retained after rotation, consumers that refresh JWKS after rotation may be unable to verify still-valid access tokens signed before rotation. Plan rotation timing and token lifetimes accordingly.

Use `auth-mini rotate jwks` from the Rust release binary for key rotation. The old npm/oclif `rotate-jwks` alias has been removed.

## Logging and diagnostics

By default, CLI errors stay concise; use `--verbose` for detailed diagnostics.

auth-mini writes structured JSON logs by default. The logs are suitable for redirection to a file:

```bash
auth-mini start --issuer https://auth.zccz14.com >> auth-mini.log
```

In the current version, logs may contain plaintext email addresses and client IPs. Logs intentionally exclude OTP values, tokens, and SMTP passwords.
