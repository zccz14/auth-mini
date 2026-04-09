#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-post}"
if [[ "$MODE" != "pre" && "$MODE" != "post" ]]; then
  printf 'usage: bash docker/check-docs.sh <pre|post>\n' >&2
  exit 64
fi

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
README_PATH="$REPO_ROOT/README.md"
GUIDE_PATH="$REPO_ROOT/docs/deploy/docker-cloudflared.md"

python - "$MODE" "$README_PATH" "$GUIDE_PATH" <<'PY2'
from __future__ import annotations

import pathlib
import sys

mode = sys.argv[1]
readme_path = pathlib.Path(sys.argv[2])
guide_path = pathlib.Path(sys.argv[3])

readme = readme_path.read_text() if readme_path.exists() else ''
guide = guide_path.read_text() if guide_path.exists() else ''

checks: list[tuple[str, bool]] = [
    ('README deployment entry point link', 'docs/deploy/docker-cloudflared.md' in readme),
    ('guide exists', guide_path.exists()),
    ('Zero Trust tunnel creation steps', 'Zero Trust' in guide and 'Networks' in guide and 'Tunnels' in guide and 'Add a tunnel' in guide),
    ('token find copy rotate guidance', 'TUNNEL_TOKEN' in guide and 'copy' in guide and 'rotate' in guide),
    ('dashboard service URL requirement', 'http://127.0.0.1:7777' in guide and 'Dashboard' in guide),
    ('one docker run path', 'docker run' in guide),
    ('guide runtime contract details', 'docker run' in guide and 'TUNNEL_TOKEN' in guide and 'AUTH_ISSUER' in guide and '/data' in guide),
    ('data persistence and post start tasks', '/data' in guide and 'origin add' in guide and 'SMTP' in guide),
    ('unsupported tunnel modes boundary', 'Dashboard-managed tunnel' in guide and 'config.yml' in guide and 'credentials files' in guide and 'custom ingress' in guide),
    ('issuer mismatch troubleshooting', 'issuer/hostname mismatch' in guide and 'JWT `iss`' in guide and 'WebAuthn' in guide and 'SDK' in guide),
    ('malformed issuer troubleshooting', 'non-https' in guide and 'path' in guide and 'query' in guide and 'hash' in guide and 'fail startup validation' in guide),
    ('invalid token troubleshooting', 'invalid token' in guide or 'token is invalid' in guide),
    ('restart loop troubleshooting', 'restart loop' in guide or 'restart loops' in guide),
    ('service URL troubleshooting', 'misconfigured Dashboard service URL' in guide or ('service URL' in guide and '127.0.0.1:7777' in guide)),
    ('volume layout and db location', '/data/auth.sqlite' in guide and 'volume' in guide),
    ('entrypoint auto initialization', 'entrypoint' in guide and 'auto-initializes' in guide and '/jwks' in guide),
    ('common failure inspection guidance', 'log' in guide and 'output' in guide),
    ('docker distribution boundary note', 'GHCR/container distribution' in guide and 'npm package contents' in guide),
    ('guide linux amd64 scope', 'linux/amd64' in guide),
]

missing = [name for name, ok in checks if not ok]
if missing:
    raise SystemExit(f"docs checks failed ({mode}):\n- " + "\n- ".join(missing))

print(f'docs checks passed ({mode})')
PY2
