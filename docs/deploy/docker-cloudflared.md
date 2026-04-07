# Docker + Cloudflared deployment

This image runs `auth-mini` and `cloudflared` in one container. The supported mode is a Dashboard-managed tunnel in Cloudflare Zero Trust started as:

```bash
cloudflared tunnel run --token "$TUNNEL_TOKEN"
```

Only that `TUNNEL_TOKEN` flow is supported. Local `config.yml`, credentials files, and custom ingress configs are out of scope for this image.

Docker files in this repo are for GHCR/container distribution. They are separate from the npm package contents.

## Before you run the container

You need:

- a Cloudflare Zero Trust account
- a public hostname such as `auth.example.com`
- `AUTH_ISSUER` set to that exact `https://` origin
- a persistent Docker volume for `/data`

## Create the tunnel in Zero Trust

1. Open Cloudflare Zero Trust.
2. Go to **Networks** -> **Tunnels**.
3. Click **Add a tunnel**.
4. Choose **Cloudflared**.
5. Name the tunnel.
6. In the tunnel's **Public Hostname** section, add the hostname you want users to reach, for example `auth.example.com`.
7. Set the service type to **HTTP**.
8. Set the Dashboard service URL to exactly `http://127.0.0.1:7777`.

The Dashboard hostname and `AUTH_ISSUER` must match exactly. If they differ, you have an issuer/hostname mismatch: JWT `iss`, WebAuthn expectations, and SDK usage will all point at the wrong origin.

### If the service URL is wrong

If the Dashboard service URL is anything other than `http://127.0.0.1:7777`, Cloudflare will send traffic to the wrong local address. Typical symptoms are 502/1033-style failures, readiness succeeding inside the container while external requests fail, or a tunnel that looks healthy but never serves auth traffic. Re-open the tunnel in the Dashboard and correct the service URL.

## Find, copy, and rotate the token

After you create the tunnel, Cloudflare shows a tunnel token for the Docker/Cloudflared connector flow.

- Copy that value into your container environment as `TUNNEL_TOKEN`.
- If you need it again later, open the same tunnel in Zero Trust and view the connector/token section.
- If the token leaks or the container logs show an invalid token error, rotate the token in the Dashboard, update `TUNNEL_TOKEN`, and restart the container.

## Run the image

Use one `docker run` command:

```bash
docker run --name auth-mini \
  --restart unless-stopped \
  -e TUNNEL_TOKEN=cf_tunnel_token_here \
  -e AUTH_ISSUER=https://auth.example.com \
  -v auth-mini-data:/data \
  ghcr.io/<owner>/auth-mini:latest
```

Runtime contract:

- required env vars: `TUNNEL_TOKEN`, `AUTH_ISSUER`
- default database path: `AUTH_INSTANCE=/data/auth.sqlite`
- internal auth service is fixed at `127.0.0.1:7777`
- the entrypoint waits for `GET /jwks` to return `200` before starting `cloudflared`
- v1 image support targets `linux/amd64` only

## Persistence and volume layout

Mount `/data` to persistent storage. The SQLite database lives at `/data/auth.sqlite` unless you explicitly override `AUTH_INSTANCE`.

On first start, the entrypoint auto-initializes the instance when `/data/auth.sqlite` does not exist, then starts `auth-mini`, waits for `/jwks`, and only then launches `cloudflared`.

## Post-start configuration

After the container is healthy, complete normal instance setup inside the persisted database:

- add allowed browser origins with `auth-mini origin add /data/auth.sqlite --value https://app.example.com`
- add SMTP config so email OTP can be delivered
- apply any other instance setup your deployment needs

## Troubleshooting

### Issuer/hostname mismatch

If `AUTH_ISSUER` does not equal the Cloudflare Dashboard hostname, JWT `iss`, WebAuthn relying-party expectations, and SDK guidance will all be wrong. Fix the mismatch so both use the same public `https://` origin.

### Malformed `AUTH_ISSUER`

Startup validation rejects malformed `AUTH_ISSUER` values. non-https values, or values with a path, query, or hash, fail startup validation because the issuer must be a pure origin such as `https://auth.example.com`.

### Invalid tunnel token

If `cloudflared` reports an invalid token, the container cannot establish the tunnel. Inspect the container log output for the `cloudflared` error, then copy the current token from Zero Trust or rotate it and restart the container.

### Restart loop or startup failure

A restart loop usually means startup validation failed, `auth-mini` exited before readiness, or `cloudflared` exited after launch. Inspect `docker logs <container>` first.

Check for:

- issuer validation errors
- tunnel token errors from `cloudflared`
- readiness timeout messages mentioning `/jwks`
- app-level auth-mini config or SMTP/output problems reported before the tunnel starts

### Dashboard service URL still broken after deploy

If the tunnel connects but the hostname does not serve auth traffic, verify the Dashboard service URL is still `http://127.0.0.1:7777`. This container does not expose another internal address or port.
