#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
IMAGE_TAG="auth-mini:test"
RUN_CONTAINERS=()
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
  printf '%s\n' "$dir"
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

assert_status_eq() {
  local actual="$1" expected="$2"
  if [[ "$actual" -ne "$expected" ]]; then
    printf 'expected exit status %s, got %s\n' "$expected" "$actual" >&2
    exit 1
  fi
}

python3 -c 'import subprocess, sys; cmd=["docker","build","--platform","linux/amd64","-t","auth-mini:test",sys.argv[1]]
try:
 subprocess.run(cmd, check=True, timeout=180)
except subprocess.TimeoutExpired:
 print("docker build timed out; check Docker Hub connectivity for node:24.14.1-trixie-slim", file=sys.stderr); raise SystemExit(1)' "$REPO_ROOT"

start_image() {
  local dir="$1"
  shift
  local name="auth-mini-image-$RANDOM-$RANDOM"
  docker run -d \
    --name "$name" \
    -e STUB_LOG_DIR=/logs \
    -e PATH="/stubbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    -v "$dir/stubbin:/stubbin:ro" \
    -v "$dir/logs:/logs" \
    "$IMAGE_TAG" \
    "$@" >/dev/null
  RUN_CONTAINERS+=("$name")
  printf '%s\n' "$name"
}

CURRENT_CASE='image smoke uses tini and omits cloudflared curl launcher'
docker run --rm --entrypoint sh "$IMAGE_TAG" -lc '
  /usr/bin/tini --version >/dev/null
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
grep -Fq 'start /data/auth.sqlite --host 127.0.0.1 --port 7777 --issuer https://auth.example.com' "$local_dir/logs/auth-mini.argv"
docker rm -f "$container" >/dev/null 2>&1 || true

CURRENT_CASE='image smoke auth exit propagates'
local_dir=$(new_dir)
write_auth_stub "$local_dir/stubbin"
set +e
out=$(docker run --rm \
  -e AUTH_STUB_EXIT_EARLY=1 \
  -e AUTH_STUB_EXIT_CODE=17 \
  -e STUB_LOG_DIR=/logs \
  -e PATH="/stubbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
  -v "$local_dir/stubbin:/stubbin:ro" \
  -v "$local_dir/logs:/logs" \
  "$IMAGE_TAG" \
  --issuer https://auth.example.com 2>&1)
status=$?
set -e
assert_status_eq "$status" 17
grep -Fq 'auth-mini early exit' <<<"$out"

printf 'image smoke ok\n'
