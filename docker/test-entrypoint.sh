#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
if [[ "$MODE" != "validation" && "$MODE" != "supervision" ]]; then
	printf 'usage: bash docker/test-entrypoint.sh <validation|supervision>\n' >&2
	exit 64
fi

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
IMAGE_TAG="${IMAGE_TAG:-auth-mini:test-entrypoint}"
IMAGE_PLATFORM="${IMAGE_PLATFORM:-linux/amd64}"
DEFAULT_START_ARGS=(auth-mini start /data/auth.sqlite --port 7777)
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

new_dir() {
	local dir
	dir=$(mktemp -d "${TMPDIR:-/tmp}/auth-mini-entrypoint.XXXXXX")
	RUN_DIRS+=("$dir")
	mkdir -p "$dir/stubbin" "$dir/logs"
	chmod 0777 "$dir/logs"
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

assert_contains() {
	local text="$1" needle="$2"
	if [[ "$text" != *"$needle"* ]]; then
		printf 'expected output to contain [%s]\n%s\n' "$needle" "$text" >&2
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

if [[ "${SKIP_IMAGE_BUILD:-0}" != "1" ]]; then
	FORCE_PREPARE_RUNTIME_ARTIFACT=1 bash "$REPO_ROOT/scripts/build-runtime-image.sh" "$IMAGE_TAG"
fi

start_stub_container() {
	local dir="$1"
	shift
	local name="auth-mini-entrypoint-$RANDOM-$RANDOM"
	docker run -d \
		--platform "$IMAGE_PLATFORM" \
		--name "$name" \
		-e STUB_LOG_DIR=/logs \
		-e PATH="/stubbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
		-v "$dir/stubbin:/stubbin:ro" \
		-v "$dir/logs:/logs" \
		"$@" \
		"$IMAGE_TAG" \
		"${DEFAULT_START_ARGS[@]}" \
		--issuer https://auth.example.com >/dev/null
	RUN_CONTAINERS+=("$name")
	printf '%s\n' "$name"
}

run_once() {
	local dir="$1"
	shift
	docker run --rm \
		--platform "$IMAGE_PLATFORM" \
		-e STUB_LOG_DIR=/logs \
		-e PATH="/stubbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
		-v "$dir/stubbin:/stubbin:ro" \
		-v "$dir/logs:/logs" \
		"$@" \
		"$IMAGE_TAG" \
		"${DEFAULT_START_ARGS[@]}" \
		--issuer https://auth.example.com
}

remove_container() {
	local cid="$1"
	docker rm -f "$cid" >/dev/null 2>&1 || true
}

run_validation() {
	local dir cid

	CURRENT_CASE='validation tini starts auth-mini with default args plus issuer'
	dir=$(new_dir)
	write_auth_stub "$dir/stubbin"
	cid=$(start_stub_container "$dir")
	wait_for_file "$dir/logs/auth-mini.argv"
	assert_file_contains "$dir/logs/auth-mini.argv" 'start /data/auth.sqlite --port 7777 --issuer https://auth.example.com'
	remove_container "$cid"

	printf 'validation ok\n'
}

run_supervision() {
	local dir status cid

	CURRENT_CASE='supervision auth exit propagates'
	dir=$(new_dir)
	write_auth_stub "$dir/stubbin"
	set +e
	run_once "$dir" -e AUTH_STUB_EXIT_EARLY=1 -e AUTH_STUB_EXIT_CODE=17 >/dev/null 2>&1
	status=$?
	set -e
	assert_status_eq "$status" 17
	wait_for_file_contains "$dir/logs/events.log" 'auth-mini early exit'

	CURRENT_CASE='supervision term signal reaches auth-mini'
	dir=$(new_dir)
	write_auth_stub "$dir/stubbin"
	cid=$(start_stub_container "$dir")
	wait_for_file "$dir/logs/auth-mini.argv"
	docker kill --signal TERM "$cid" >/dev/null
	status=$(docker wait "$cid")
	[[ "$status" -ne 0 ]]
	wait_for_file_contains "$dir/logs/events.log" 'auth-mini TERM'
	remove_container "$cid"

	printf 'supervision ok\n'
}

case "$MODE" in
validation) run_validation ;;
supervision) run_supervision ;;
esac
