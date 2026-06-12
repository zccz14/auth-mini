# Docker deployment

The current Docker runtime is a minimal container for the Rust `auth-mini` binary. It does not include Node.js, npm, `npx`, Cloudflared, or a Node-to-Rust wrapper.

## Build the image

```bash
docker build -f build/Dockerfile -t auth-mini:local .
```

## Run the service

```bash
docker run --name auth-mini \
  --restart unless-stopped \
  -p 7777:7777 \
  -v auth-mini-data:/var/lib/auth-mini \
  auth-mini:local \
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
  auth-mini:local \
  origin add /var/lib/auth-mini/auth-mini.sqlite --value https://app.example.com
```

Add SMTP config with `auth-mini smtp add ...` in the same way.

## Publishing status

This repository currently builds and smokes the Docker image in PR CI only. GHCR publishing, release tags, Cloudflared packaging, and multi-architecture images are separate follow-up work.
