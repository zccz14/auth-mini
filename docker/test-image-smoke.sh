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
      print_file_if_present "$dir/logs/auth-mini.start.argv"
      print_file_if_present "$dir/logs/cloudflared.argv"
      print_file_if_present "$dir/logs/curl-count"
      print_file_if_present "$dir/logs/curl-seq"
    fi
    if [[ -d "$dir/data" ]]; then
      printf '\n--- data dir: %s ---\n' "$dir/data" >&2
      ls -la "$dir/data" >&2 || true
      print_file_if_present "$dir/data/auth.sqlite"
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
  mkdir -p "$dir/stubbin" "$dir/logs" "$dir/data"
  printf '%s\n' "$dir"
}

write_stubs() {
  local stubbin="$1"
  cat >"$stubbin/auth-mini" <<'EOF'
#!/bin/sh
set -eu
log_dir=${STUB_LOG_DIR:?}
printf '%s\n' "$*" >>"$log_dir/auth-mini.argv"
cmd=${1:-}
shift || true
case "$cmd" in
  init)
    mkdir -p "$(dirname "$1")"
    : >"$1"
    printf 'auth-mini init %s\n' "$*" >>"$log_dir/events.log"
    ;;
  start)
    printf '%s\n' "$*" >"$log_dir/auth-mini.start.argv"
    printf 'auth-mini start %s\n' "$*" >>"$log_dir/events.log"
    trap 'printf "auth-mini TERM\n" >>"$log_dir/events.log"; exit 143' TERM INT HUP
    while :; do sleep 1; done
    ;;
  *) exit 97 ;;
esac
EOF
  cat >"$stubbin/cloudflared" <<'EOF'
#!/bin/sh
set -eu
log_dir=${STUB_LOG_DIR:?}
printf '%s\n' "$*" >>"$log_dir/cloudflared.argv"
printf 'cloudflared start %s\n' "$*" >>"$log_dir/events.log"
trap 'printf "cloudflared TERM\n" >>"$log_dir/events.log"; exit 143' TERM INT HUP
if [ "${CLOUDFLARED_STUB_EXIT_EARLY:-0}" = "1" ]; then
  printf 'cloudflared early exit\n' >>"$log_dir/events.log"
  exit "${CLOUDFLARED_STUB_EXIT_CODE:-23}"
fi
while :; do sleep 1; done
EOF
  cat >"$stubbin/curl" <<'EOF'
#!/bin/sh
set -eu
log_dir=${STUB_LOG_DIR:?}
count_file="$log_dir/curl-count"
seq_file="$log_dir/curl-seq"
count=0
if [ -f "$count_file" ]; then
  count=$(cat "$count_file")
fi
count=$((count + 1))
printf '%s' "$count" >"$count_file"
code=${CURL_DEFAULT_CODE:-000}
if [ -f "$seq_file" ]; then
  line=$(sed -n "${count}p" "$seq_file" 2>/dev/null || true)
  if [ -n "$line" ]; then
    code=$line
  fi
fi
printf 'curl %s %s\n' "$count" "$code" >>"$log_dir/events.log"
printf '%s' "$code"
EOF
  cat >"$stubbin/sleep" <<'EOF'
#!/bin/sh
exec /bin/sleep 0.05
EOF
  chmod 0755 "$stubbin/auth-mini" "$stubbin/cloudflared" "$stubbin/curl" "$stubbin/sleep"
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

wait_for_container_logs_contains() {
  local cid="$1" needle="$2" attempts="${3:-80}"
  local i
  for ((i = 0; i < attempts; i++)); do
    if docker logs "$cid" 2>&1 | grep -Fq -- "$needle"; then
      return 0
    fi
    /bin/sleep 0.05
  done
  printf 'timed out waiting for docker logs from %s to contain [%s]\n' "$cid" "$needle" >&2
  exit 1
}

assert_status_eq() {
  local actual="$1" expected="$2"
  if [[ "$actual" -ne "$expected" ]]; then
    printf 'expected exit status %s, got %s\n' "$expected" "$actual" >&2
    exit 1
  fi
}

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
    -v "$dir/data:/data" \
    "$@" \
    "$IMAGE_TAG" >/dev/null
  RUN_CONTAINERS+=("$name")
  printf '%s\n' "$name"
}

python3 -c 'import subprocess, sys; cmd=["docker","build","--platform","linux/amd64","-t","auth-mini:test",sys.argv[1]]
try:
 subprocess.run(cmd, check=True, timeout=180)
except subprocess.TimeoutExpired:
 print("docker build timed out; check Docker Hub connectivity for node:20-slim and cloudflared download access", file=sys.stderr); raise SystemExit(1)' "$REPO_ROOT"

CURRENT_CASE='image smoke fresh data initializes and becomes ready'
local_dir=$(new_dir)
write_stubs "$local_dir/stubbin"
printf '503\n200\n' >"$local_dir/logs/curl-seq"
container=$(start_image "$local_dir" -e TUNNEL_TOKEN=token -e AUTH_ISSUER=https://auth.example.com)
wait_for_file "$local_dir/logs/cloudflared.argv"
wait_for_file_contains "$local_dir/logs/events.log" 'curl 2 200'
[[ -f "$local_dir/data/auth.sqlite" ]]
grep -Fq 'auth-mini init /data/auth.sqlite' "$local_dir/logs/events.log"
grep -Fq 'curl 1 503' "$local_dir/logs/events.log"
grep -Fq 'curl 2 200' "$local_dir/logs/events.log"
grep -Fq 'tunnel run --token token' "$local_dir/logs/cloudflared.argv"
wait_for_container_logs_contains "$container" 'AUTH_ISSUER must match the Cloudflare Dashboard hostname'
docker rm -f "$container" >/dev/null 2>&1 || true

CURRENT_CASE='image smoke existing data skips init'
local_dir=$(new_dir)
write_stubs "$local_dir/stubbin"
printf 'keep-state' >"$local_dir/data/auth.sqlite"
printf '200\n' >"$local_dir/logs/curl-seq"
container=$(start_image "$local_dir" -e TUNNEL_TOKEN=token -e AUTH_ISSUER=https://auth.example.com)
wait_for_file "$local_dir/logs/cloudflared.argv"
wait_for_file "$local_dir/logs/auth-mini.start.argv"
[[ $(cat "$local_dir/data/auth.sqlite") == 'keep-state' ]]
if [[ -e "$local_dir/logs/auth-mini.argv" ]]; then
  ! grep -Fq 'init /data/auth.sqlite' "$local_dir/logs/auth-mini.argv"
fi
grep -Fq '/data/auth.sqlite --issuer https://auth.example.com --host 127.0.0.1 --port 7777' "$local_dir/logs/auth-mini.start.argv"
docker rm -f "$container" >/dev/null 2>&1 || true

CURRENT_CASE='image smoke cloudflared exit stops auth-mini'
local_dir=$(new_dir)
write_stubs "$local_dir/stubbin"
printf '200\n' >"$local_dir/logs/curl-seq"
set +e
out=$(docker run --rm \
  -e TUNNEL_TOKEN=token \
  -e AUTH_ISSUER=https://auth.example.com \
  -e CLOUDFLARED_STUB_EXIT_EARLY=1 \
  -e CLOUDFLARED_STUB_EXIT_CODE=23 \
  -e STUB_LOG_DIR=/logs \
  -e PATH="/stubbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
  -v "$local_dir/stubbin:/stubbin:ro" \
  -v "$local_dir/logs:/logs" \
  -v "$local_dir/data:/data" \
  "$IMAGE_TAG" 2>&1)
status=$?
set -e
assert_status_eq "$status" 23
[[ -f "$local_dir/data/auth.sqlite" ]]
grep -Fq 'cloudflared exited; stopping auth-mini' <<<"$out"
grep -Fq 'auth-mini TERM' "$local_dir/logs/events.log"
grep -Fq 'tunnel run --token token' "$local_dir/logs/cloudflared.argv"

printf 'image smoke ok\n'
