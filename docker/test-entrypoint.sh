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
trap cleanup EXIT

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

  dir=$(new_dir)
  write_stubs "$dir/stubbin"
  set +e
  out=$(run_stub_once "$dir" 2>&1)
  status=$?
  set -e
  [[ $status -ne 0 ]]
  assert_contains "$out" "Cloudflare"
  assert_contains "$out" "token"

  dir=$(new_dir)
  write_stubs "$dir/stubbin"
  set +e
  out=$(run_stub_once "$dir" -e TUNNEL_TOKEN=token 2>&1)
  status=$?
  set -e
  [[ $status -ne 0 ]]
  assert_contains "$out" "https://auth.example.com"

  dir=$(new_dir)
  write_stubs "$dir/stubbin"
  set +e
  out=$(run_stub_once "$dir" -e TUNNEL_TOKEN=token -e AUTH_ISSUER=https://auth.example.com/path 2>&1)
  status=$?
  set -e
  [[ $status -ne 0 ]]
  assert_contains "$out" "pure origin"

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

  dir=$(new_dir)
  write_stubs "$dir/stubbin"
  printf '503\n200\n' >"$dir/logs/curl-seq"
  cid=$(start_stub_container "$dir" -e TUNNEL_TOKEN=token -e AUTH_ISSUER=https://auth.example.com)
  wait_for_file "$dir/logs/cloudflared.argv"
  curl_count=$(cat "$dir/logs/curl-count")
  [[ "$curl_count" -ge 2 ]]
  assert_file_contains "$dir/logs/events.log" "curl 1 503"
  assert_file_contains "$dir/logs/events.log" "curl 2 200"
  logs=$(docker logs "$cid" 2>&1)
  assert_contains "$logs" 'AUTH_ISSUER must match the Cloudflare Dashboard hostname'
  assert_contains "$logs" 'JWT `iss`, WebAuthn, and SDK usage'
  remove_container "$cid"

  dir=$(new_dir)
  write_stubs "$dir/stubbin"
  set +e
  out=$(run_stub_once "$dir" -e TUNNEL_TOKEN=token -e AUTH_ISSUER=https://auth.example.com -e CURL_DEFAULT_CODE=503 2>&1)
  status=$?
  set -e
  [[ $status -ne 0 ]]
  assert_contains "$out" "timed out waiting for auth-mini readiness"
  assert_file_absent "$dir/logs/cloudflared.argv"

  dir=$(new_dir)
  write_stubs "$dir/stubbin"
  set +e
  out=$(run_stub_once "$dir" -e TUNNEL_TOKEN=token -e AUTH_ISSUER=https://auth.example.com -e AUTH_STUB_EXIT_EARLY=1 -e AUTH_STUB_EXIT_CODE=17 2>&1)
  status=$?
  set -e
  [[ $status -eq 17 ]]
  assert_contains "$out" 'auth-mini exited before readiness; inspect auth-mini config/log output'
  assert_file_absent "$dir/logs/cloudflared.argv"

  dir=$(new_dir)
  write_stubs "$dir/stubbin"
  set +e
  out=$(run_stub_once "$dir" -e TUNNEL_TOKEN=token -e AUTH_ISSUER=https://auth.example.com -e CLOUDFLARED_STUB_EXIT_EARLY=1 -e CLOUDFLARED_STUB_EXIT_CODE=23 -e CURL_DEFAULT_CODE=200 2>&1)
  status=$?
  set -e
  [[ $status -eq 23 ]]
  assert_contains "$out" 'cloudflared exited; stopping auth-mini'
  assert_file_contains "$dir/logs/events.log" 'auth-mini TERM'

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
  assert_file_contains "$dir/logs/events.log" 'auth-mini TERM'
  assert_file_contains "$dir/logs/events.log" 'cloudflared TERM'
  remove_container "$cid"

  printf 'supervision ok\n'
}

case "$MODE" in
  validation) run_validation ;;
  supervision) run_supervision ;;
esac
