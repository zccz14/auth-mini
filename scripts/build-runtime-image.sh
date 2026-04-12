#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
IMAGE_TAG="${1:-auth-mini:release-check}"

printf '==> build runtime image\n'
printf 'image_tag=%s\n' "$IMAGE_TAG"
printf 'bake_file=%s\n' "$REPO_ROOT/build/docker-bake.json"

if [[ "${SKIP_PREPARE_RUNTIME_ARTIFACT:-0}" != "1" ]]; then
	bash "$REPO_ROOT/scripts/prepare-linux-runtime-artifact.sh"
fi

docker buildx bake -f "$REPO_ROOT/build/docker-bake.json" release-check --load --set "release-check.tags=$IMAGE_TAG"
