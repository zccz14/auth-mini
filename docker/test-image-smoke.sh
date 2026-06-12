#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
IMAGE_TAG="${IMAGE_TAG:-auth-mini:smoke}"
IMAGE_PLATFORM="${IMAGE_PLATFORM:-linux/amd64}"
RUN_ROOT="$REPO_ROOT/.tmp/docker-smoke"
DATA_DIR="$RUN_ROOT/data"
CONTAINER_NAME="auth-mini-smoke-$RANDOM-$RANDOM"

cleanup() {
	docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
	rm -rf "$RUN_ROOT"
}

trap cleanup EXIT

rm -rf "$RUN_ROOT"
mkdir -p "$DATA_DIR"
chmod 0777 "$DATA_DIR"

if [[ "${SKIP_IMAGE_BUILD:-0}" != "1" ]]; then
	bash "$REPO_ROOT/scripts/build-runtime-image.sh" "$IMAGE_TAG"
fi

inspect_output=$(docker image inspect "$IMAGE_TAG" --format '{{json .Config.User}} {{json .Config.Entrypoint}} {{json .Config.Cmd}} {{json .Config.ExposedPorts}}')
grep -Fq '"10001"' <<<"$inspect_output"
grep -Fq '["auth-mini"]' <<<"$inspect_output"
grep -Fq '"7777/tcp"' <<<"$inspect_output"

docker run -d \
	--platform "$IMAGE_PLATFORM" \
	--name "$CONTAINER_NAME" \
	-v "$DATA_DIR:/var/lib/auth-mini" \
	-p 127.0.0.1::7777 \
	"$IMAGE_TAG" \
	start /var/lib/auth-mini/auth-mini.sqlite --host 0.0.0.0 --port 7777 --issuer http://127.0.0.1:7777 >/dev/null

host_port=$(docker port "$CONTAINER_NAME" 7777/tcp)
host_port=${host_port##*:}

AUTH_MINI_URL="http://127.0.0.1:$host_port" python3 <<'PY'
import json
import os
import time
import urllib.error
import urllib.request

base_url = os.environ["AUTH_MINI_URL"]
last_error = None

for _ in range(120):
    try:
        with urllib.request.urlopen(f"{base_url}/healthz", timeout=2) as response:
            if response.status == 200 and response.read().decode() == "ok":
                break
    except Exception as error:
        last_error = error
        time.sleep(0.25)
else:
    raise SystemExit(f"/healthz readiness failed: {last_error}")

try:
    urllib.request.urlopen(f"{base_url}/me", timeout=5)
    raise SystemExit("/me unexpectedly succeeded without auth")
except urllib.error.HTTPError as error:
    body = error.read().decode()
    if error.code != 401 or "invalid_access_token" not in body:
        raise SystemExit(f"unexpected /me response: {error.code} {body}")

with urllib.request.urlopen(f"{base_url}/jwks", timeout=5) as response:
    payload = json.loads(response.read().decode())
    if response.status != 200 or not isinstance(payload.get("keys"), list):
        raise SystemExit(f"unexpected /jwks response: {payload}")
PY

test -f "$DATA_DIR/auth-mini.sqlite"

printf 'docker image smoke ok\n'
