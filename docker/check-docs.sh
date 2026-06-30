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

python3 - "$MODE" "$README_PATH" "$GUIDE_PATH" <<'PY2'
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
    ('rust binary runtime boundary', 'Rust `auth-mini` binary' in guide and 'does not include Node.js' in guide),
    ('build command', 'docker build -f build/Dockerfile -t auth-mini:local .' in guide),
    ('one docker run path', 'docker run' in guide),
    ('guide runtime contract details', 'entrypoint: `auth-mini`' in guide and 'port: `7777/tcp`' in guide and 'non-root uid `10001`' in guide),
    ('volume layout and db location', '/var/lib/auth-mini/auth-mini.sqlite' in guide and 'mount `/var/lib/auth-mini`' in guide),
    ('explicit deployment issuer', 'pass an explicit `--issuer <public-origin>` command' in guide),
    ('embedded runtime assets', 'does not need `schema.sql` or `openapi.yaml` files at runtime' in guide),
    ('post start tasks', '/admin/setup' in guide and 'SMTP' in guide),
    ('ghcr publishing status', 'publishes `ghcr.io/zccz14/auth-mini` from `v*` release tags' in guide and 'Multi-architecture images and Cloudflared packaging are separate follow-up work' in guide),
]

missing = [name for name, ok in checks if not ok]
if missing:
    raise SystemExit(f"docs checks failed ({mode}):\n- " + "\n- ".join(missing))

print(f'docs checks passed ({mode})')
PY2
