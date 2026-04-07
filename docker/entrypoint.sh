#!/bin/sh
set -eu

AUTH_INSTANCE=${AUTH_INSTANCE:-/data/auth.sqlite}
AUTH_HOST=127.0.0.1
AUTH_PORT=7777
READINESS_URL=http://127.0.0.1:7777/jwks
READINESS_ATTEMPTS=30
AUTH_PID=
CLOUDFLARED_PID=
WAIT_STATUS=0

log() {
  printf '%s\n' "$*" >&2
}

fail() {
  log "$*"
  exit 1
}

capture_wait_status() {
  pid=$1
  set +e
  wait "$pid"
  WAIT_STATUS=$?
  set -e
}

terminate_child() {
  pid=${1:-}
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    capture_wait_status "$pid"
  fi
}

cleanup_and_exit() {
  status=${1:-1}
  terminate_child "$CLOUDFLARED_PID"
  terminate_child "$AUTH_PID"
  exit "$status"
}

on_term() {
  log 'received termination signal; stopping auth-mini and cloudflared'
  cleanup_and_exit 143
}
trap on_term TERM INT HUP

[ -n "${TUNNEL_TOKEN:-}" ] || fail 'Missing TUNNEL_TOKEN. Copy the Cloudflare token setup command from the Zero Trust tunnel page and pass its token value.'
[ -n "${AUTH_ISSUER:-}" ] || fail 'Missing AUTH_ISSUER. Use an https origin such as https://auth.example.com.'
case "$AUTH_ISSUER" in
  https://*) ;;
  *) fail 'AUTH_ISSUER must use an https origin such as https://auth.example.com.' ;;
esac
issuer_rest=${AUTH_ISSUER#https://}
case "$issuer_rest" in
  ''|*/*|*\?*|*#*) fail 'AUTH_ISSUER must be a pure origin without path, query, or hash.' ;;
esac

mkdir -p /data

if [ ! -f "$AUTH_INSTANCE" ]; then
  auth-mini init "$AUTH_INSTANCE"
fi

auth-mini start "$AUTH_INSTANCE" --issuer "$AUTH_ISSUER" --host "$AUTH_HOST" --port "$AUTH_PORT" &
AUTH_PID=$!

attempt=0
while [ "$attempt" -lt "$READINESS_ATTEMPTS" ]; do
  if ! kill -0 "$AUTH_PID" 2>/dev/null; then
    capture_wait_status "$AUTH_PID"
    log 'auth-mini exited before readiness; inspect auth-mini config/log output.'
    exit "$WAIT_STATUS"
  fi
  code=$(curl -s -o /dev/null -w '%{http_code}' "$READINESS_URL" 2>/dev/null || true)
  if [ "$code" = '200' ]; then
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
done

if [ "$attempt" -ge "$READINESS_ATTEMPTS" ]; then
  terminate_child "$AUTH_PID"
  fail 'timed out waiting for auth-mini readiness; /jwks never returned HTTP 200.'
fi

log 'AUTH_ISSUER must match the Cloudflare Dashboard hostname exactly; mismatch affects JWT `iss`, WebAuthn, and SDK usage.'
cloudflared tunnel run --token "$TUNNEL_TOKEN" &
CLOUDFLARED_PID=$!

while :; do
  if ! kill -0 "$AUTH_PID" 2>/dev/null; then
    capture_wait_status "$AUTH_PID"
    terminate_child "$CLOUDFLARED_PID"
    exit "$WAIT_STATUS"
  fi
  if ! kill -0 "$CLOUDFLARED_PID" 2>/dev/null; then
    capture_wait_status "$CLOUDFLARED_PID"
    log 'cloudflared exited; stopping auth-mini'
    terminate_child "$AUTH_PID"
    exit "$WAIT_STATUS"
  fi
  sleep 1
done
