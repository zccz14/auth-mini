#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
if [[ "$MODE" != "validation" && "$MODE" != "supervision" ]]; then
  printf 'usage: bash docker/test-entrypoint.sh <validation|supervision>\n' >&2
  exit 64
fi

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
BASE_IMAGE="node:20-slim"
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
  local status="$1"
  local cid dir
  [[ "$status" -ne 0 ]] || return 0

  printf '\n=== docker/test-entrypoint.sh diagnostics ===\n' >&2
  printf 'mode=%s\n' "$MODE" >&2
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
  local status=$?
  dump_failure_diagnostics "$status"
  cleanup
  exit "$status"
}
trap on_exit EXIT

ensure_base_image() {
  docker image inspect "$BASE_IMAGE" >/dev/null 2>&1 || docker pull "$BASE_IMAGE" >/dev/null
}

new_dir() {
  local dir
  dir=$(mktemp -d "${TMPDIR:-/tmp}/auth-mini-entrypoint.XXXXXX")
  RUN_DIRS+=("$dir")
  mkdir -p "$dir/stubbin" "$dir/logs"
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
    printf 'auth-mini init %s\n' "$*" >>"$log_dir/events.log"
    mkdir -p "$(dirname "$1")"
    : >"$1"
    ;;
  start)
    printf 'auth-mini start %s\n' "$*" >>"$log_dir/events.log"
    printf '%s\n' "$*" >"$log_dir/auth-mini.start.argv"
    trap 'printf "auth-mini TERM\n" >>"$log_dir/events.log"; exit 143' TERM INT HUP
    if [ "${AUTH_STUB_EXIT_EARLY:-0}" = "1" ]; then
      printf 'auth-mini early exit\n' >>"$log_dir/events.log"
      exit "${AUTH_STUB_EXIT_CODE:-17}"
    fi
    while :; do sleep 1; done
    ;;
  *)
    printf 'unexpected auth-mini command: %s\n' "$cmd" >&2
    exit 97
    ;;
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
if [ "${STUB_REAL_SLEEP:-0}" = "1" ]; then
  exec /bin/sleep "$@"
fi
exec /bin/sleep 0.05
EOF
  chmod 0755 "$stubbin/auth-mini" "$stubbin/cloudflared" "$stubbin/curl" "$stubbin/sleep"
}

assert_contains() {
  local text="$1" needle="$2"
  if [[ "$text" != *"$needle"* ]]; then
    printf 'expected output to contain [%s]\n%s\n' "$needle" "$text" >&2
    exit 1
  fi
}

assert_not_contains() {
  local text="$1" needle="$2"
  if [[ "$text" == *"$needle"* ]]; then
    printf 'expected output to not contain [%s]\n%s\n' "$needle" "$text" >&2
    exit 1
  fi
}

assert_file_contains() {
  local file="$1" needle="$2"
  grep -Fq -- "$needle" "$file" || {
    printf 'expected %s to contain [%s]\n' "$file" "$needle" >&2
    exit 1
  }
}

assert_file_absent() {
  local file="$1"
  [[ ! -e "$file" ]] || {
    printf 'expected %s to be absent\n' "$file" >&2
    exit 1
  }
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
  local i logs
  for ((i = 0; i < attempts; i++)); do
    logs=$(docker logs "$cid" 2>&1 || true)
    if [[ "$logs" == *"$needle"* ]]; then
      return 0
    fi
    /bin/sleep 0.05
  done
  printf 'timed out waiting for docker logs from %s to contain [%s]\n' "$cid" "$needle" >&2
  exit 1
}

start_stub_container() {
  local dir="$1"
  shift
  local name="auth-mini-entrypoint-$RANDOM-$RANDOM"
  docker run -d \
    --name "$name" \
    -e STUB_LOG_DIR=/tmp/logs \
    -e PATH="/tmp/stubbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    -v "$REPO_ROOT:/repo:ro" \
    -v "$dir/stubbin:/tmp/stubbin:ro" \
    -v "$dir/logs:/tmp/logs" \
    "$@" \
    "$BASE_IMAGE" \
    sh /repo/docker/entrypoint.sh >/dev/null
  RUN_CONTAINERS+=("$name")
  printf '%s\n' "$name"
}

run_stub_once() {
  local dir="$1"
  shift
  docker run --rm \
    -e STUB_LOG_DIR=/tmp/logs \
    -e PATH="/tmp/stubbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    -v "$REPO_ROOT:/repo:ro" \
    -v "$dir/stubbin:/tmp/stubbin:ro" \
    -v "$dir/logs:/tmp/logs" \
    "$@" \
    "$BASE_IMAGE" \
    sh /repo/docker/entrypoint.sh
}

remove_container() {
  local cid="$1"
  docker rm -f "$cid" >/dev/null 2>&1 || true
}

run_validation() {
  ensure_base_image

  local dir out status cid preserved

  CURRENT_CASE='validation missing token'
  dir=$(new_dir)
  write_stubs "$dir/stubbin"
  set +e
  out=$(run_stub_once "$dir" 2>&1)
  status=$?
  set -e
  [[ $status -ne 0 ]]
  assert_contains "$out" "Cloudflare"
  assert_contains "$out" "token"

  CURRENT_CASE='validation missing issuer'
  dir=$(new_dir)
  write_stubs "$dir/stubbin"
  set +e
  out=$(run_stub_once "$dir" -e TUNNEL_TOKEN=token 2>&1)
  status=$?
  set -e
  [[ $status -ne 0 ]]
  assert_contains "$out" "https://auth.example.com"

  CURRENT_CASE='validation issuer has path'
  dir=$(new_dir)
  write_stubs "$dir/stubbin"
  set +e
  out=$(run_stub_once "$dir" -e TUNNEL_TOKEN=token -e AUTH_ISSUER=https://auth.example.com/path 2>&1)
  status=$?
  set -e
  [[ $status -ne 0 ]]
  assert_contains "$out" "pure origin"

  CURRENT_CASE='validation fresh data initializes and starts tunnel'
  dir=$(new_dir)
  write_stubs "$dir/stubbin"
  printf '200\n' >"$dir/logs/curl-seq"
  cid=$(start_stub_container "$dir" -e TUNNEL_TOKEN=token -e AUTH_ISSUER=https://auth.example.com)
  wait_for_file "$dir/logs/cloudflared.argv"
  docker exec "$cid" sh -c 'test -f /data/auth.sqlite'
  assert_file_contains "$dir/logs/auth-mini.argv" "init /data/auth.sqlite"
  assert_file_contains "$dir/logs/auth-mini.start.argv" "/data/auth.sqlite --issuer https://auth.example.com --host 127.0.0.1 --port 7777"
  assert_file_contains "$dir/logs/cloudflared.argv" "tunnel run --token token"
  remove_container "$cid"

  CURRENT_CASE='validation existing data skips init'
  dir=$(new_dir)
  write_stubs "$dir/stubbin"
  printf '200\n' >"$dir/logs/curl-seq"
  mkdir -p "$dir/data"
  printf 'keep-state' >"$dir/data/auth.sqlite"
  preserved=$(cat "$dir/data/auth.sqlite")
  cid=$(start_stub_container "$dir" -e TUNNEL_TOKEN=token -e AUTH_ISSUER=https://auth.example.com -v "$dir/data:/data")
  wait_for_file "$dir/logs/cloudflared.argv"
  if [[ -e "$dir/logs/auth-mini.argv" ]]; then
    assert_not_contains "$(cat "$dir/logs/auth-mini.argv")" "init /data/auth.sqlite"
  fi
  [[ $(cat "$dir/data/auth.sqlite") == "$preserved" ]]
  assert_file_contains "$dir/logs/auth-mini.start.argv" "/data/auth.sqlite --issuer https://auth.example.com --host 127.0.0.1 --port 7777"
  assert_file_contains "$dir/logs/cloudflared.argv" "tunnel run --token token"
  remove_container "$cid"

  printf 'validation ok\n'
}

run_supervision() {
  ensure_base_image

  local dir out status cid logs curl_count

  CURRENT_CASE='supervision readiness retries before tunnel starts'
  dir=$(new_dir)
  write_stubs "$dir/stubbin"
  printf '503\n200\n' >"$dir/logs/curl-seq"
  cid=$(start_stub_container "$dir" -e TUNNEL_TOKEN=token -e AUTH_ISSUER=https://auth.example.com)
  wait_for_file "$dir/logs/cloudflared.argv"
  wait_for_file_contains "$dir/logs/events.log" 'curl 2 200'
  curl_count=$(cat "$dir/logs/curl-count")
  [[ "$curl_count" -ge 2 ]]
  assert_file_contains "$dir/logs/events.log" "curl 1 503"
  assert_file_contains "$dir/logs/events.log" "curl 2 200"
  wait_for_container_logs_contains "$cid" 'AUTH_ISSUER must match the Cloudflare Dashboard hostname'
  logs=$(docker logs "$cid" 2>&1)
  assert_contains "$logs" 'AUTH_ISSUER must match the Cloudflare Dashboard hostname'
  assert_contains "$logs" 'JWT `iss`, WebAuthn, and SDK usage'
  remove_container "$cid"

  CURRENT_CASE='supervision readiness timeout blocks tunnel'
  dir=$(new_dir)
  write_stubs "$dir/stubbin"
  set +e
  out=$(run_stub_once "$dir" -e TUNNEL_TOKEN=token -e AUTH_ISSUER=https://auth.example.com -e CURL_DEFAULT_CODE=503 2>&1)
  status=$?
  set -e
  [[ $status -ne 0 ]]
  assert_contains "$out" "timed out waiting for auth-mini readiness"
  assert_file_absent "$dir/logs/cloudflared.argv"

  CURRENT_CASE='supervision auth exits before readiness'
  dir=$(new_dir)
  write_stubs "$dir/stubbin"
  set +e
  out=$(run_stub_once "$dir" -e TUNNEL_TOKEN=token -e AUTH_ISSUER=https://auth.example.com -e AUTH_STUB_EXIT_EARLY=1 -e AUTH_STUB_EXIT_CODE=17 2>&1)
  status=$?
  set -e
  [[ $status -eq 17 ]]
  assert_contains "$out" 'auth-mini exited before readiness; inspect auth-mini config/log output'
  assert_file_absent "$dir/logs/cloudflared.argv"

  CURRENT_CASE='supervision cloudflared exit stops auth-mini'
  dir=$(new_dir)
  write_stubs "$dir/stubbin"
  set +e
  out=$(run_stub_once "$dir" -e TUNNEL_TOKEN=token -e AUTH_ISSUER=https://auth.example.com -e CLOUDFLARED_STUB_EXIT_EARLY=1 -e CLOUDFLARED_STUB_EXIT_CODE=23 -e CURL_DEFAULT_CODE=200 2>&1)
  status=$?
  set -e
  [[ $status -eq 23 ]]
  assert_contains "$out" 'cloudflared exited; stopping auth-mini'
  wait_for_file_contains "$dir/logs/events.log" 'auth-mini TERM'

  CURRENT_CASE='supervision term signal stops both processes'
  dir=$(new_dir)
  write_stubs "$dir/stubbin"
  printf '200\n' >"$dir/logs/curl-seq"
  cid=$(start_stub_container "$dir" -e TUNNEL_TOKEN=token -e AUTH_ISSUER=https://auth.example.com)
  wait_for_file "$dir/logs/cloudflared.argv"
  docker kill --signal TERM "$cid" >/dev/null
  set +e
  status=$(docker wait "$cid")
  set -e
  [[ "$status" -ne 0 ]]
  wait_for_file_contains "$dir/logs/events.log" 'auth-mini TERM'
  wait_for_file_contains "$dir/logs/events.log" 'cloudflared TERM'
  remove_container "$cid"

  printf 'supervision ok\n'
}

case "$MODE" in
  validation) run_validation ;;
  supervision) run_supervision ;;
esac
