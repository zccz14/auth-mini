# Docker deployment

The current Docker runtime is a minimal container for the Rust `auth-mini` binary. It does not include Node.js, npm, `npx`, Cloudflared, or a Node-to-Rust wrapper.

## Build the image

Release images are published to GHCR for `linux/amd64`:

```bash
docker pull ghcr.io/zccz14/auth-mini:latest
docker pull ghcr.io/zccz14/auth-mini:v0.3.0
```

Use `latest` for the latest release image, or a `vX.Y.Z` tag for a pinned version.

To build the same runtime image locally from this repository:

```bash
docker build -f build/Dockerfile -t auth-mini:local .
```

## Run the service

```bash
docker run --name auth-mini \
  --restart unless-stopped \
  -p 7777:7777 \
  -v auth-mini-data:/var/lib/auth-mini \
  ghcr.io/zccz14/auth-mini:latest \
  start /var/lib/auth-mini/auth-mini.sqlite --host 0.0.0.0 --port 7777 --issuer https://auth.zccz14.com
```

Runtime contract:

- entrypoint: `auth-mini`
- default command: `start /var/lib/auth-mini/auth-mini.sqlite --host 0.0.0.0 --port 7777 --issuer http://localhost:7777`
- port: `7777/tcp`
- user: non-root uid `10001`
- database path: `/var/lib/auth-mini/auth-mini.sqlite`
- persistence: mount `/var/lib/auth-mini`

The default command is for local smoke testing. For deployment, pass an explicit `start ... --issuer <public-origin>` command so JWT issuer, WebAuthn expectations, and SDK usage all match the public auth origin.

The Rust binary embeds the database schema and OpenAPI document. The container does not need `schema.sql` or `openapi.yaml` files at runtime.

## Post-start configuration

After the container is healthy, complete normal instance setup inside the persisted database:

```bash
docker run --rm \
  -v auth-mini-data:/var/lib/auth-mini \
  ghcr.io/zccz14/auth-mini:latest \
  origin add /var/lib/auth-mini/auth-mini.sqlite --value https://app.example.com
```

Add SMTP config with `auth-mini smtp add ...` in the same way.

## Publishing status

This repository publishes `ghcr.io/zccz14/auth-mini` from `v*` release tags after the Docker smoke test passes. Published tags include the full release tag, the `X.Y` minor tag, and `latest`. Multi-architecture images and Cloudflared packaging are separate follow-up work.
