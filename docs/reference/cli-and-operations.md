# CLI and operations

Requires Node.js 20.10+ (the published CLI uses modern ESM, JSON import attributes, and top-level `await`).

## Instance setup

Initialize an auth-mini instance (currently a SQLite database path):

```bash
npx auth-mini init ./auth-mini.sqlite
```

`<instance>` currently means the path to your auth-mini SQLite database file.

`create` remains available as a compatibility alias during the transition.

## Stored browser origins

Manage browser page origins for WebAuthn and related origin checks with the `origin` topic. This does not control HTTP CORS; auth-mini serves `Access-Control-Allow-Origin: *` on CORS responses.

```bash
npx auth-mini origin add ./auth-mini.sqlite --value https://app.example.com
npx auth-mini origin list ./auth-mini.sqlite
npx auth-mini origin update ./auth-mini.sqlite --id 1 --value https://admin.example.com
npx auth-mini origin delete ./auth-mini.sqlite --id 1
```

## SMTP configuration

Manage SMTP configs with the `smtp` topic:

```bash
npx auth-mini smtp add ./auth-mini.sqlite --host smtp.example.com --port 587 --username mailer --password secret --from-email noreply@example.com
npx auth-mini smtp list ./auth-mini.sqlite
npx auth-mini smtp update ./auth-mini.sqlite --id 1 --secure true
npx auth-mini smtp delete ./auth-mini.sqlite --id 1
```

## Starting the server

`--issuer` is the externally visible auth origin that clients, JWT verifiers, and WebAuthn flows should use. It is not the local bind address from `--host`/`--port`.

```bash
npx auth-mini start ./auth-mini.sqlite \
  --host 127.0.0.1 \
  --port 7777 \
  --issuer https://auth.zccz14.com
```

## JWKS rotation

```bash
npx auth-mini rotate jwks ./auth-mini.sqlite
```

`/jwks` always publishes the `CURRENT` and `STANDBY` keys.

`rotate jwks` promotes `STANDBY` to `CURRENT`, then generates a fresh `STANDBY`.

After rotation, the previous `CURRENT` key is no longer retained.

Because the previous `CURRENT` key is not retained after rotation, consumers that refresh JWKS after rotation may be unable to verify still-valid access tokens signed before rotation. Plan rotation timing and token lifetimes accordingly.

`rotate-jwks` remains available only as a transition/compatibility alias during the migration release.

## Logging and diagnostics

By default, CLI errors stay concise; use `--verbose` for detailed diagnostics.

auth-mini writes structured JSON logs by default. The logs are suitable for redirection to a file:

```bash
npx auth-mini start ./auth-mini.sqlite --issuer https://auth.zccz14.com >> auth-mini.log
```

In the current version, logs may contain plaintext email addresses and client IPs. Logs intentionally exclude OTP values, tokens, and SMTP passwords.
