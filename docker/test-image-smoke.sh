#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
IMAGE_TAG="${IMAGE_TAG:-auth-mini:test}"
IMAGE_PLATFORM="${IMAGE_PLATFORM:-linux/amd64}"
DEFAULT_START_ARGS=(auth-mini start /data/auth.sqlite --port 7777)
DOCKERFILE_PATH="$REPO_ROOT/build/Dockerfile"
RUN_CONTAINERS=()
RUN_VOLUMES=()
RUN_DIRS=()
CURRENT_CASE=''

print_file_if_present() {
	local file="$1"
	[[ -f "$file" ]] || return 0
	printf '\n--- %s ---\n' "$file" >&2
	while IFS= read -r line; do
		printf '%s\n' "$line" >&2
	done <"$file"
}

dump_failure_diagnostics() {
	local exit_code="$1"
	local cid dir
	[[ "$exit_code" -ne 0 ]] || return 0

	printf '\n=== docker/test-image-smoke.sh diagnostics ===\n' >&2
	printf 'case=%s\n' "${CURRENT_CASE:-unknown}" >&2

	for dir in "${RUN_DIRS[@]:-}"; do
		[[ -n "$dir" ]] || continue
		printf '\n--- run dir: %s ---\n' "$dir" >&2
		if [[ -d "$dir/logs" ]]; then
			ls -la "$dir/logs" >&2 || true
			print_file_if_present "$dir/logs/events.log"
			print_file_if_present "$dir/logs/auth-mini.argv"
		fi
	done

	for cid in "${RUN_CONTAINERS[@]:-}"; do
		[[ -n "$cid" ]] || continue
		printf '\n--- docker ps for %s ---\n' "$cid" >&2
		docker ps -a --filter "name=$cid" >&2 || true
		printf '\n--- docker logs %s ---\n' "$cid" >&2
		docker logs "$cid" >&2 || true
	done
}

cleanup() {
	local cid dir
	for cid in "${RUN_CONTAINERS[@]:-}"; do
		[[ -n "$cid" ]] || continue
		docker rm -f "$cid" >/dev/null 2>&1 || true
	done
	for cid in "${RUN_VOLUMES[@]:-}"; do
		[[ -n "$cid" ]] || continue
		docker volume rm "$cid" >/dev/null 2>&1 || true
	done
	for dir in "${RUN_DIRS[@]:-}"; do
		[[ -n "$dir" ]] || continue
		rm -rf "$dir"
	done
}

on_exit() {
	local exit_code=$?
	dump_failure_diagnostics "$exit_code"
	cleanup
	exit "$exit_code"
}
trap on_exit EXIT

new_dir() {
	local dir
	dir=$(mktemp -d "${TMPDIR:-/tmp}/auth-mini-image-smoke.XXXXXX")
	RUN_DIRS+=("$dir")
	mkdir -p "$dir/stubbin" "$dir/logs"
	chmod 0777 "$dir/logs"
	printf '%s\n' "$dir"
}

new_volume() {
	local name
	name="auth-mini-image-volume-$RANDOM-$RANDOM"
	docker volume create "$name" >/dev/null
	RUN_VOLUMES+=("$name")
	printf '%s\n' "$name"
}

write_auth_stub() {
	local stubbin="$1"
	cat >"$stubbin/auth-mini" <<'EOF'
#!/bin/sh
set -eu
log_dir=${STUB_LOG_DIR:?}
printf '%s\n' "$*" >>"$log_dir/auth-mini.argv"
trap 'printf "auth-mini TERM\n" >>"$log_dir/events.log"; exit 143' TERM INT HUP
if [ "${AUTH_STUB_EXIT_EARLY:-0}" = "1" ]; then
  printf 'auth-mini early exit\n' >>"$log_dir/events.log"
  exit "${AUTH_STUB_EXIT_CODE:-17}"
fi
while :; do sleep 1; done
EOF
	chmod 0755 "$stubbin/auth-mini"
}

wait_for_file() {
	local file="$1" attempts="${2:-80}"
	local i
	for ((i = 0; i < attempts; i++)); do
		[[ -e "$file" ]] && return 0
		/bin/sleep 0.05
	done
	printf 'timed out waiting for %s\n' "$file" >&2
	exit 1
}

wait_for_file_contains() {
	local file="$1" needle="$2" attempts="${3:-80}"
	local i
	for ((i = 0; i < attempts; i++)); do
		if [[ -e "$file" ]] && grep -Fq -- "$needle" "$file"; then
			return 0
		fi
		/bin/sleep 0.05
	done
	printf 'timed out waiting for %s to contain [%s]\n' "$file" "$needle" >&2
	exit 1
}

assert_status_eq() {
	local actual="$1" expected="$2"
	if [[ "$actual" -ne "$expected" ]]; then
		printf 'expected exit status %s, got %s\n' "$expected" "$actual" >&2
		exit 1
	fi
}

assert_dockerfile_has_tini_checksum_validation() {
	grep -Fq 'TINI_SHA256_AMD64=c5b0666b4cb676901f90dfcb37106783c5fe2077b04590973b885950611b30ee' "$DOCKERFILE_PATH"
	grep -Fq 'TINI_SHA256_ARM64=eae1d3aa50c48fb23b8cbdf4e369d0910dfc538566bfd09df89a774aa84a48b9' "$DOCKERFILE_PATH"
	grep -Fq 'sha256sum -c -' "$DOCKERFILE_PATH"
}

assert_real_http_smoke() {
	local base_url="$1"
	AUTH_MINI_URL="$base_url" python3 <<'PY'
import json
import os
import time
import urllib.error
import urllib.request

base = os.environ['AUTH_MINI_URL']
last_error = None

for _ in range(120):
    try:
        with urllib.request.urlopen(f'{base}/jwks', timeout=2) as response:
            payload = json.loads(response.read().decode())
            if response.status == 200 and isinstance(payload.get('keys'), list) and len(payload['keys']) >= 1:
                break
            raise RuntimeError(f'unexpected jwks payload: {payload}')
    except Exception as error:
        last_error = error
        time.sleep(0.25)
else:
    raise SystemExit(f'jwks readiness failed: {last_error}')

with urllib.request.urlopen(f'{base}/sdk/singleton-iife.js', timeout=5) as response:
    body = response.read().decode()
    if response.status != 200 or 'AuthMini' not in body:
        raise SystemExit('sdk endpoint did not return expected AuthMini bundle')

try:
    urllib.request.urlopen(f'{base}/me', timeout=5)
    raise SystemExit('/me unexpectedly succeeded without auth')
except urllib.error.HTTPError as error:
    body = error.read().decode()
    if error.code != 401 or 'invalid_access_token' not in body:
        raise SystemExit(f'unexpected /me response: {error.code} {body}')
PY
}

if [[ "${SKIP_IMAGE_BUILD:-0}" != "1" ]]; then
	FORCE_PREPARE_RUNTIME_ARTIFACT=1 bash "$REPO_ROOT/scripts/build-runtime-image.sh" "$IMAGE_TAG"
fi

start_image() {
	local dir="$1"
	shift
	local name="auth-mini-image-$RANDOM-$RANDOM"
	docker run -d \
		--platform "$IMAGE_PLATFORM" \
		--name "$name" \
		-e STUB_LOG_DIR=/logs \
		-e PATH="/stubbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
		-v "$dir/stubbin:/stubbin:ro" \
		-v "$dir/logs:/logs" \
		"$IMAGE_TAG" \
		"${DEFAULT_START_ARGS[@]}" \
		"$@" >/dev/null
	RUN_CONTAINERS+=("$name")
	printf '%s\n' "$name"
}

CURRENT_CASE='image smoke uses tini and omits cloudflared curl launcher'
assert_dockerfile_has_tini_checksum_validation
inspect_output=$(docker image inspect "$IMAGE_TAG" --format '{{json .Config.Entrypoint}} {{json .Config.Cmd}}')
grep -Fq '["/tini","--"] ["auth-mini","start","/data/auth.sqlite","--port","7777"]' <<<"$inspect_output"
docker run --rm --platform "$IMAGE_PLATFORM" --entrypoint sh "$IMAGE_TAG" -lc '
  set -eu
  /tini --version >/dev/null
  test "$(id -u)" != "0"
  if command -v cloudflared >/dev/null 2>&1; then exit 1; fi
  if command -v curl >/dev/null 2>&1; then exit 1; fi
  if [ -e /app/docker/launcher.mjs ]; then exit 1; fi
  if [ -e /app/docker/entrypoint.sh ]; then exit 1; fi
'

CURRENT_CASE='image smoke starts auth-mini via default command chain'
local_dir=$(new_dir)
write_auth_stub "$local_dir/stubbin"
container=$(start_image "$local_dir" --issuer https://auth.example.com)
wait_for_file "$local_dir/logs/auth-mini.argv"
grep -Fq 'start /data/auth.sqlite --port 7777 --issuer https://auth.example.com' "$local_dir/logs/auth-mini.argv"
docker rm -f "$container" >/dev/null 2>&1 || true

CURRENT_CASE='image smoke auth exit propagates'
local_dir=$(new_dir)
write_auth_stub "$local_dir/stubbin"
set +e
docker run --rm \
	--platform "$IMAGE_PLATFORM" \
	-e AUTH_STUB_EXIT_EARLY=1 \
	-e AUTH_STUB_EXIT_CODE=17 \
	-e STUB_LOG_DIR=/logs \
	-e PATH="/stubbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
	-v "$local_dir/stubbin:/stubbin:ro" \
	-v "$local_dir/logs:/logs" \
	"$IMAGE_TAG" \
	"${DEFAULT_START_ARGS[@]}" \
	--issuer https://auth.example.com >/dev/null 2>&1
status=$?
set -e
assert_status_eq "$status" 17
wait_for_file_contains "$local_dir/logs/events.log" 'auth-mini early exit'

CURRENT_CASE='image smoke real auth-mini serves jwks sdk and auth guard'
real_volume=$(new_volume)
docker run --rm --platform "$IMAGE_PLATFORM" -v "$real_volume:/data" "$IMAGE_TAG" auth-mini init /data/auth.sqlite >/dev/null
real_container="auth-mini-real-$RANDOM-$RANDOM"
docker run -d --platform "$IMAGE_PLATFORM" --name "$real_container" -e AUTH_HOST=0.0.0.0 -e AUTH_ISSUER=https://auth.example.com -v "$real_volume:/data" -p 127.0.0.1::7777 "$IMAGE_TAG" >/dev/null
RUN_CONTAINERS+=("$real_container")
real_port=$(docker port "$real_container" 7777/tcp)
real_port=${real_port##*:}
assert_real_http_smoke "http://127.0.0.1:$real_port"
docker rm -f "$real_container" >/dev/null 2>&1 || true

printf 'image smoke ok\n'
