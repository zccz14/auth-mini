#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORKFLOW_PATH="$REPO_ROOT/.github/workflows/release-image.yml"
PUBLISH_WORKFLOW_PATH="$REPO_ROOT/.github/workflows/publish.yml"

python - "$WORKFLOW_PATH" "$PUBLISH_WORKFLOW_PATH" <<'PY2'
from __future__ import annotations

import pathlib
import re
import subprocess
import sys

workflow_path = pathlib.Path(sys.argv[1])
publish_path = pathlib.Path(sys.argv[2])

if not workflow_path.exists():
    raise SystemExit(f"missing workflow: {workflow_path}")

workflow = workflow_path.read_text()
head_publish = subprocess.check_output(["git", "show", "HEAD:.github/workflows/publish.yml"])
publish_current = publish_path.read_bytes()

validation_index = workflow.find("bash docker/test-entrypoint.sh validation")
supervision_index = workflow.find("bash docker/test-entrypoint.sh supervision")
smoke_index = workflow.find("bash docker/test-image-smoke.sh")
publish_index = workflow.find("docker buildx build")
login_index = workflow.find("docker/login-action@v3")
manifest_index = workflow.find("docker manifest inspect ghcr.io/")
version_check_index = workflow.rfind("before_version=''")
workflow_dispatch_index = workflow.find('if [[ "${{ github.event_name }}" == \'workflow_dispatch\' ]]; then')
rerun_index = workflow.find('if [[ "${{ github.run_attempt }}" != \'1\' ]]; then')
version_source_index = workflow.find('version_source_sha="$(')
current_sha_index = workflow.find('current_sha="$(git rev-parse HEAD)"')
checkout_ref_expr = "ref: ${{ github.event_name == 'workflow_dispatch' && inputs.release_ref || github.sha }}"
manual_recovery_reject_text = 'Rejecting manual recovery because release_ref must target the version-introducing commit.'
manual_recovery_ancestry_reject_text = 'Rejecting manual recovery because release_ref is not reachable from origin/main.'
rerun_recovery_reject_text = 'Rejecting rerun recovery because original push did not change package.json version.'

dispatch_recovery_block = workflow[workflow_dispatch_index:version_check_index] if workflow_dispatch_index != -1 and version_check_index != -1 else ""
rerun_recovery_block = workflow[rerun_index:version_check_index] if rerun_index != -1 and version_check_index != -1 else ""

fixture_checks: list[tuple[str, bool]] = [
    (
        "push-main-version-bump",
        "github.event.before" in workflow
        and "before_version" in workflow
        and "after_version" in workflow
        and "version_changed=true" in workflow
        and "should_publish=true" in workflow
        and validation_index < publish_index
        and supervision_index < publish_index
        and smoke_index < publish_index,
    ),
    (
        "push-main-no-version-bump",
        "version_changed=false" in workflow and "should_publish=false" in workflow,
    ),
    (
        "workflow-dispatch-main",
        "workflow_dispatch:" in workflow
        and "release_ref:" in workflow
        and "required: true" in workflow
        and checkout_ref_expr in workflow
        and workflow_dispatch_index != -1
        and version_check_index != -1
        and workflow_dispatch_index < version_check_index
        and '"$current_sha" != "$version_source_sha"' in dispatch_recovery_block
        and manual_recovery_reject_text in dispatch_recovery_block
        and 'git merge-base --is-ancestor "$current_sha" origin/main' in dispatch_recovery_block
        and manual_recovery_ancestry_reject_text in dispatch_recovery_block
        and "should_publish=true" in dispatch_recovery_block
        and "recovery_path=workflow_dispatch" in dispatch_recovery_block
        and "exit 0" in dispatch_recovery_block,
    ),
    (
        "workflow-dispatch-non-main",
        "refs/heads/main" in workflow and "Rejecting non-main manual recovery for official publish." in workflow,
    ),
    (
        "rerun-main",
        rerun_index != -1
        and version_check_index != -1
        and rerun_index < version_check_index
        and manual_recovery_reject_text not in rerun_recovery_block
        and '"$current_sha" != "$version_source_sha"' not in rerun_recovery_block
        and 'rerun_before_version' in rerun_recovery_block
        and '"$rerun_before_version" == "$after_version"' in rerun_recovery_block
        and rerun_recovery_reject_text in rerun_recovery_block
        and "should_publish=true" in rerun_recovery_block
        and "recovery_path=rerun" in rerun_recovery_block
        and "exit 0" in rerun_recovery_block,
    ),
    (
        "existing-tag",
        "docker manifest inspect ghcr.io/${{ steps.gate.outputs.image_owner }}/auth-mini:${{ steps.gate.outputs.package_version }}" in workflow
        and "docker manifest inspect ghcr.io/${{ steps.gate.outputs.image_owner }}/auth-mini:latest" in workflow
        and 'version_exists=true' in workflow
        and 'latest_exists=true' in workflow
        and "if [[ \"$version_exists\" == 'true' && \"$latest_exists\" == 'true' ]]; then" in workflow
        and "GHCR version and latest tags already exist; skipping publish." in workflow
        and "skip_publish=true" in workflow
        and "steps.check_tag.outputs.skip_publish == 'false'" in workflow,
    ),
    (
        "publish-yml-unchanged",
        publish_current == head_publish,
    ),
]

general_checks: list[tuple[str, bool]] = [
    ("push-main trigger", "push:" in workflow and "branches:" in workflow and "- main" in workflow),
    ("workflow_dispatch trigger", "workflow_dispatch:" in workflow),
    ("workflow_dispatch release_ref input", "inputs:" in workflow and "release_ref:" in workflow and "type: string" in workflow),
    ("contents read permission", re.search(r"permissions:\n(?:.*\n)*?\s+contents:\s+read", workflow) is not None),
    ("packages write permission", re.search(r"permissions:\n(?:.*\n)*?\s+packages:\s+write", workflow) is not None),
    ("package version output", "package_version" in workflow),
    ("lowercase image owner output", "image_owner" in workflow and "tr '[:upper:]' '[:lower:]'" in workflow),
    ("current sha output", current_sha_index != -1 and 'echo "current_sha=$current_sha" >> "$GITHUB_OUTPUT"' in workflow),
    ("version source commit output", version_source_index != -1 and 'echo "version_source_sha=$version_source_sha" >> "$GITHUB_OUTPUT"' in workflow),
    ("checkout step", "actions/checkout@v4" in workflow),
    ("workflow dispatch checkout ref", checkout_ref_expr in workflow),
    ("workflow dispatch ancestry check", 'git merge-base --is-ancestor "$current_sha" origin/main' in workflow),
    ("ghcr login step", "docker/login-action@v3" in workflow and "GITHUB_TOKEN" in workflow),
    (
        "tag check after ghcr login",
        login_index != -1
        and manifest_index != -1
        and login_index < manifest_index
        and workflow.count("if: steps.gate.outputs.should_publish == 'true'") >= 2,
    ),
    ("setup buildx", "docker/setup-buildx-action@v3" in workflow),
    ("linux amd64 docker build", "docker build --platform linux/amd64" in workflow),
    ("validation test step", validation_index != -1),
    ("supervision test step", supervision_index != -1),
    ("image smoke step", smoke_index != -1),
    ("version tag publish", "ghcr.io/${{ steps.gate.outputs.image_owner }}/auth-mini:${{ steps.gate.outputs.package_version }}" in workflow),
    ("latest tag publish", "ghcr.io/${{ steps.gate.outputs.image_owner }}/auth-mini:latest" in workflow),
    ("publish gated by outputs", "steps.gate.outputs.should_publish == 'true'" in workflow and "steps.check_tag.outputs.skip_publish == 'false'" in workflow),
]

missing = [name for name, ok in fixture_checks + general_checks if not ok]
if missing:
    raise SystemExit("release-image workflow is missing required behavior:\n- " + "\n- ".join(missing))

print("release workflow checks passed")
PY2
