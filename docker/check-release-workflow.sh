#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORKFLOW_PATH="$REPO_ROOT/.github/workflows/release-image.yml"

python3 - "$WORKFLOW_PATH" <<'PY'
from __future__ import annotations

import pathlib
import sys

import yaml

workflow_path = pathlib.Path(sys.argv[1])
if not workflow_path.exists():
    raise SystemExit(f"missing workflow: {workflow_path}")

workflow_text = workflow_path.read_text(encoding="utf-8")
workflow_data = yaml.safe_load(workflow_text)

on_block = workflow_data.get("on")
if on_block is None:
    on_block = workflow_data.get(True)

errors: list[str] = []


def require(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)


def step_index(steps: list[dict], name: str) -> int:
    for index, step in enumerate(steps):
        if step.get("name") == name:
            return index
    return -1


require(isinstance(on_block, dict), "missing workflow triggers")
if isinstance(on_block, dict):
    push_block = on_block.get("push")
    dispatch_block = on_block.get("workflow_dispatch")

    require(isinstance(push_block, dict), "missing push trigger")
    if isinstance(push_block, dict):
        require(push_block.get("branches") == ["main"], "push trigger must target main")

    require(isinstance(dispatch_block, dict), "missing workflow_dispatch trigger")
    if isinstance(dispatch_block, dict):
        inputs = dispatch_block.get("inputs")
        require(isinstance(inputs, dict), "workflow_dispatch must define inputs")
        if isinstance(inputs, dict):
            release_ref = inputs.get("release_ref")
            require(isinstance(release_ref, dict), "workflow_dispatch must define release_ref input")
            if isinstance(release_ref, dict):
                require(release_ref.get("required") is True, "release_ref input must be required")
                require(release_ref.get("type") == "string", "release_ref input must be a string")

permissions = workflow_data.get("permissions", {})
require(permissions.get("contents") == "read", "permissions.contents must be read")
require(permissions.get("packages") == "write", "permissions.packages must be write")

jobs = workflow_data.get("jobs", {})
release_job = jobs.get("release-image") if isinstance(jobs, dict) else None
require(isinstance(release_job, dict), "missing release-image job")

steps = release_job.get("steps", []) if isinstance(release_job, dict) else []
require(isinstance(steps, list), "release-image job must define steps")

expected_steps = [
    "Checkout repository",
    "Validate manual recovery ref",
    "Set up Docker Buildx",
    "Prepare Linux runtime artifact",
    "Build release candidate image",
    "Validate entrypoint contract",
    "Validate entrypoint supervision",
    "Run container smoke test",
    "Decide publish plan",
    "Show publish plan",
    "Log in to GHCR",
    "Publish image to GHCR",
]

indices = {name: step_index(steps, name) for name in expected_steps}
for name, index in indices.items():
    require(index != -1, f"missing step: {name}")

ordered_steps = [
    "Prepare Linux runtime artifact",
    "Build release candidate image",
    "Validate entrypoint contract",
    "Validate entrypoint supervision",
    "Run container smoke test",
    "Decide publish plan",
    "Log in to GHCR",
    "Publish image to GHCR",
]
for left, right in zip(ordered_steps, ordered_steps[1:]):
    if indices[left] != -1 and indices[right] != -1:
        require(indices[left] < indices[right], f"step order must keep '{left}' before '{right}'")

checkout_step = steps[indices["Checkout repository"]] if indices["Checkout repository"] != -1 else {}
require(checkout_step.get("uses") == "actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5", "checkout step must stay pinned")
checkout_with = checkout_step.get("with", {}) if isinstance(checkout_step, dict) else {}
require(checkout_with.get("fetch-depth") == 0, "checkout must use fetch-depth 0")
require(
    checkout_with.get("ref") == "${{ github.event_name == 'workflow_dispatch' && inputs.release_ref || github.sha }}",
    "checkout must select workflow_dispatch release_ref or github.sha",
)

validate_step = steps[indices["Validate manual recovery ref"]] if indices["Validate manual recovery ref"] != -1 else {}
require(validate_step.get("if") == "github.event_name == 'workflow_dispatch'", "manual recovery validation must only run on workflow_dispatch")
validate_run = validate_step.get("run", "") if isinstance(validate_step, dict) else ""
require("git merge-base --is-ancestor HEAD origin/main" in validate_run, "manual recovery validation must check origin/main ancestry")
require("Rejecting manual recovery because release_ref is not reachable from origin/main." in validate_run, "manual recovery validation must explain ancestry rejection")

buildx_step = steps[indices["Set up Docker Buildx"]] if indices["Set up Docker Buildx"] != -1 else {}
require(buildx_step.get("uses") == "docker/setup-buildx-action@8d2750c68a42422c14e847fe6c8ac0403b4cbd6f", "buildx step must stay pinned")

prepare_step = steps[indices["Prepare Linux runtime artifact"]] if indices["Prepare Linux runtime artifact"] != -1 else {}
require(prepare_step.get("run") == "bash scripts/prepare-linux-runtime-artifact.sh", "prepare step must use runtime artifact script")

build_step = steps[indices["Build release candidate image"]] if indices["Build release candidate image"] != -1 else {}
require(
    build_step.get("run") == "SKIP_PREPARE_RUNTIME_ARTIFACT=1 bash scripts/build-runtime-image.sh auth-mini:release-check",
    "build step must use build-runtime-image.sh with SKIP_PREPARE_RUNTIME_ARTIFACT=1",
)

validation_step = steps[indices["Validate entrypoint contract"]] if indices["Validate entrypoint contract"] != -1 else {}
require(
    validation_step.get("run") == "IMAGE_TAG=auth-mini:release-check SKIP_IMAGE_BUILD=1 bash docker/test-entrypoint.sh validation",
    "validation step must run entrypoint validation against the prepared image",
)

supervision_step = steps[indices["Validate entrypoint supervision"]] if indices["Validate entrypoint supervision"] != -1 else {}
require(
    supervision_step.get("run") == "IMAGE_TAG=auth-mini:release-check SKIP_IMAGE_BUILD=1 bash docker/test-entrypoint.sh supervision",
    "supervision step must run entrypoint supervision against the prepared image",
)

smoke_step = steps[indices["Run container smoke test"]] if indices["Run container smoke test"] != -1 else {}
require(
    smoke_step.get("run") == "IMAGE_TAG=auth-mini:release-check SKIP_IMAGE_BUILD=1 bash docker/test-image-smoke.sh",
    "smoke step must run image smoke against the prepared image",
)

publish_plan_step = steps[indices["Decide publish plan"]] if indices["Decide publish plan"] != -1 else {}
require(publish_plan_step.get("id") == "publish", "publish plan step must expose id=publish")
publish_run = publish_plan_step.get("run", "") if isinstance(publish_plan_step, dict) else ""
for snippet, message in [
    ("current_version=", "publish plan must emit current_version output"),
    ("image_owner=", "publish plan must emit image_owner output"),
    ("should_publish=false", "publish plan must default should_publish to false"),
    ("reason=image-exists", "publish plan must default reason to image-exists"),
    ("if [[ \"${{ github.event_name }}\" == 'workflow_dispatch' ]]; then", "publish plan must publish on workflow_dispatch"),
    ("reason=workflow-dispatch", "publish plan must explain workflow_dispatch publishes"),
    ("docker manifest inspect \"$image_ref\"", "publish plan must inspect image existence"),
    ("reason=image-missing", "publish plan must explain missing image publishes"),
    ("publish decision: image already exists -> skip publish", "publish plan must log skip reason"),
    ("publish decision: image missing -> publish", "publish plan must log publish reason"),
]:
    require(snippet in publish_run, message)

show_plan_step = steps[indices["Show publish plan"]] if indices["Show publish plan"] != -1 else {}
show_plan_run = show_plan_step.get("run", "") if isinstance(show_plan_step, dict) else ""
require("steps.publish.outputs.should_publish" in show_plan_run, "show publish plan must print should_publish output")
require("steps.publish.outputs.reason" in show_plan_run, "show publish plan must print reason output")

login_step = steps[indices["Log in to GHCR"]] if indices["Log in to GHCR"] != -1 else {}
require(login_step.get("if") == "steps.publish.outputs.should_publish == 'true'", "ghcr login must be gated by publish output")
require(login_step.get("uses") == "docker/login-action@c94ce9fb468520275223c153574b00df6fe4bcc9", "ghcr login step must stay pinned")

publish_step = steps[indices["Publish image to GHCR"]] if indices["Publish image to GHCR"] != -1 else {}
require(publish_step.get("if") == "steps.publish.outputs.should_publish == 'true'", "publish step must be gated by publish output")
publish_step_run = publish_step.get("run", "") if isinstance(publish_step, dict) else ""
require("export IMAGE_OWNER=\"${{ steps.publish.outputs.image_owner }}\"" in publish_step_run, "publish step must pass IMAGE_OWNER into bake")
require("export PACKAGE_VERSION=\"${{ steps.publish.outputs.current_version }}\"" in publish_step_run, "publish step must pass PACKAGE_VERSION into bake")
require("docker buildx bake -f build/docker-bake.json release --push" in publish_step_run, "publish step must publish via docker buildx bake")

for snippet, message in [
    ("build/docker-bake.json", "release workflow must use build/docker-bake.json"),
]:
    require(snippet in workflow_text, message)

for forbidden_snippet, message in [
    ("version_changed", "release workflow must not depend on old version_changed gate"),
    ("version_source_sha", "release workflow must not depend on old version source gate"),
    ("recovery_path=", "release workflow must not depend on old recovery_path gate"),
    ("steps.gate.outputs", "release workflow must not depend on old gate outputs"),
    ("steps.check_tag.outputs", "release workflow must not depend on old check_tag outputs"),
    ("docker build --platform linux/amd64", "release workflow must not use root Dockerfile build path"),
]:
    require(forbidden_snippet not in workflow_text, message)

if errors:
    raise SystemExit("release-image workflow is missing required behavior:\n- " + "\n- ".join(errors))

print("release workflow checks passed")
PY
