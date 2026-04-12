#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
NODE_IMAGE="${NODE_IMAGE:-node:24.14.1-trixie-slim}"
IMAGE_PLATFORM="${IMAGE_PLATFORM:-linux/amd64}"
ARTIFACT_DIR="$REPO_ROOT/build/runtime/linux-amd64"
WORK_DIR="$REPO_ROOT/build/.tmp/runtime-linux-amd64"
HOST_UID=$(id -u)
HOST_GID=$(id -g)

printf '==> prepare runtime artifact\n'
printf 'repo_root=%s\n' "$REPO_ROOT"
printf 'node_image=%s\n' "$NODE_IMAGE"
printf 'image_platform=%s\n' "$IMAGE_PLATFORM"
printf 'artifact_dir=%s\n' "$ARTIFACT_DIR"

if [[ "${FORCE_PREPARE_RUNTIME_ARTIFACT:-0}" != "1" && -d "$ARTIFACT_DIR" ]]; then
	printf 'reusing runtime artifact: %s\n' "$ARTIFACT_DIR"
	exit 0
fi

printf '==> rebuilding runtime artifact\n'
rm -rf "$ARTIFACT_DIR" "$WORK_DIR"
mkdir -p "$ARTIFACT_DIR" "$WORK_DIR"

docker run --rm \
	--platform "$IMAGE_PLATFORM" \
	--user "$HOST_UID:$HOST_GID" \
	-e HOME=/tmp/auth-mini-home \
	-e HUSKY=0 \
	-v "$REPO_ROOT:/src:ro" \
	-v "$WORK_DIR:/work" \
	-v "$ARTIFACT_DIR:/out" \
	"$NODE_IMAGE" \
	bash -lc 'set -euo pipefail; retry() { local attempt=1; while true; do if "$@"; then return 0; fi; if [ "$attempt" -ge 3 ]; then return 1; fi; attempt=$((attempt + 1)); sleep 5; done; }; mkdir -p "$HOME" /work/src; cp /src/package.json /src/package-lock.json /src/tsconfig.json /src/tsconfig.build.json /work/src/; cp -R /src/src /src/sql /src/scripts /work/src/; cd /work/src; echo "==> npm ci"; retry npm ci --no-audit --fund=false; echo "==> npm run build"; npm run build; echo "==> npm prune --omit=dev"; npm prune --omit=dev --no-audit --fund=false; echo "==> copy runtime artifact"; cp package.json package-lock.json /out/; cp -R dist node_modules sql /out/'

printf '==> runtime artifact ready: %s\n' "$ARTIFACT_DIR"
