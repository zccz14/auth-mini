# Cloudflared Docker Release Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an official Docker image that runs `auth-mini` and `cloudflared` together, documents the Cloudflare Tunnel setup, and auto-publishes versioned GHCR images when `package.json` version changes on `main`.

**Architecture:** Keep all deployment behavior outside `src/`: the image is built from the existing CLI/runtime contract, a shell entrypoint manages init/start/readiness/cloudflared sequencing, and GitHub Actions handles build-and-publish gating. User-facing docs explain the required Cloudflare Dashboard hostname/service configuration and the one-container `docker run` flow.

**Tech Stack:** Docker, POSIX shell, GitHub Actions, GHCR, Node.js 20+, existing `auth-mini` CLI build output

---

## File Structure

- Create: `Dockerfile` - multi-stage image build that produces the final runtime image with `dist/`, production deps, `cloudflared`, and the entrypoint.
- Create: `.dockerignore` - excludes local artifacts (`node_modules`, `dist`, temp DBs, logs, docs noise) from Docker build context.
- Create: `docker/entrypoint.sh` - validates env vars, initializes `/data/auth.sqlite`, starts `auth-mini`, waits on `GET /jwks`, logs the issuer/hostname reminder, and starts `cloudflared`.
- Create: `docker/test-entrypoint.sh` - lightweight shell test harness for entrypoint behavior that can run in CI without publishing.
- Create: `docker/test-image-smoke.sh` - deterministic image-level smoke test that bind-mounts stub binaries and checks container startup/exit behavior.
- Create: `docker/check-docs.sh` - local executable assertions for README and deployment-guide coverage.
- Create: `.github/workflows/release-image.yml` - builds/tests the image, gates publishing on version bump or manual recovery from `main`, and pushes `ghcr.io/...:<version>` plus `latest`.
- Create: `docker/check-release-workflow.sh` - local executable assertions for release-workflow gates and required tags.
- Modify: `README.md` - add Docker + Cloudflare Tunnel deployment section, `docker run` example, token acquisition, Dashboard service URL requirement, and troubleshooting.
- Create: `docs/deploy/docker-cloudflared.md` - longer operational guide for tunnel creation, token rotation, persistent volume layout, and recovery flow; link from `README.md`.
- Test: `docker/test-entrypoint.sh` - script-level checks for init, validation, readiness timeout, reminder text, and child-process exit handling.
- Test: `docker/test-image-smoke.sh` - image-level smoke test for the packaged runtime image.
- Test: `docker/check-docs.sh` - local assertions for deployment-doc coverage.
- Test: `.github/workflows/release-image.yml` via workflow logic and local command checklist in docs.

## Chunk 1: Container Runtime

### Task 1: Build the image skeleton

**Files:**

- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `docker/entrypoint.sh`

- [ ] **Step 1: Run a failing image build command**

Run: `docker build --platform linux/amd64 -t auth-mini:test .`
Expected: FAIL because `Dockerfile`, `.dockerignore`, and `docker/entrypoint.sh` do not exist yet.

- [ ] **Step 2: Create the placeholder entrypoint**

Create the `docker/` directory and add `docker/entrypoint.sh` with a temporary implementation that prints `entrypoint not implemented yet` and exits non-zero.

- [ ] **Step 3: Add the builder stage**

Write the builder stage in `Dockerfile` with comments documenting this contract:

- final image contains `node`, `dist/index.js`, `dist/sdk/singleton-iife.js`, `cloudflared`, and `/app/docker/entrypoint.sh`
- final image does not depend on checked-out repo source files at runtime
- runtime image exposes `/data` and provides `auth-mini` on `PATH`

Builder stage requirements:

- install dependencies with `npm ci`
- run `npm run build`
- run `npm prune --omit=dev` to prepare production `node_modules`

- [ ] **Step 4: Add the runtime skeleton**

Extend `Dockerfile` so the runtime stage:

- installs `curl` as the readiness probe tool
- copies `package.json`, `package-lock.json`, pruned `node_modules`, `dist/`, and `docker/entrypoint.sh`
- symlinks `/usr/local/bin/auth-mini` to `/app/dist/index.js` so `auth-mini` is runnable on `PATH`
- sets executable bits and defines `ENTRYPOINT ["/app/docker/entrypoint.sh"]`

- [ ] **Step 5: Pin and verify `cloudflared`**

Extend `Dockerfile` so the runtime stage pins `cloudflared` to `2026.3.0` using the `cloudflared-linux-amd64` asset and SHA256 `4a9e50e6d6d798e90fcd01933151a90bf7edd99a0a55c28ad18f2e16263a5c30`, verifies the checksum, and asserts `cloudflared --version` contains `2026.3.0`.

- [ ] **Step 6: Add `.dockerignore`**

Add at least these entries to `.dockerignore`:

- `.git`
- `node_modules`
- `dist`
- `.legion`
- `test.sqlite`
- `server.log`
- `.tmp-pack-debug`
- `docs/superpowers/plans`
- `docs/superpowers/specs`

- [ ] **Step 7: Verify `.dockerignore` exclusions**

Run: `mkdir -p node_modules/.tmp-dockerignore-check && touch node_modules/.tmp-dockerignore-check/sentinel && printf 'FROM alpine\nCOPY node_modules/.tmp-dockerignore-check/sentinel /sentinel\n' > Dockerfile.dockerignore-check && ! docker build --platform linux/amd64 -f Dockerfile.dockerignore-check . && rm Dockerfile.dockerignore-check && rm -rf node_modules/.tmp-dockerignore-check`
Expected: PASS because the debug build fails when trying to `COPY` a file under the root-level ignored `node_modules/` path.

- [ ] **Step 8: Run the build to verify it passes**

Run: `docker build --platform linux/amd64 -t auth-mini:test .`
Expected: PASS with a final image that contains the compiled CLI and pinned `cloudflared`.

- [ ] **Step 9: Smoke-check build outputs inside the image**

Run: `docker run --rm --platform linux/amd64 --entrypoint sh auth-mini:test -lc 'test -f /app/dist/index.js && test -f /app/dist/sdk/singleton-iife.js && test -x /app/docker/entrypoint.sh && test -d /data && command -v auth-mini && command -v cloudflared && test ! -d /app/src && cloudflared --version | grep 2026.3.0'`
Expected: PASS with exit code `0`, `auth-mini` present on `PATH`, and the exact pinned `cloudflared` version string.

- [ ] **Step 10: Commit**

```bash
git add Dockerfile .dockerignore docker/entrypoint.sh
git commit -m "build: add docker image skeleton"
```

### Task 2: Implement and verify the entrypoint

**Files:**

- Modify: `docker/entrypoint.sh`
- Create: `docker/test-entrypoint.sh`
- Create: `docker/test-image-smoke.sh`

- [ ] **Step 1: Write failing validation/init checks**

Create `docker/test-entrypoint.sh` with named checks for:

1. missing `TUNNEL_TOKEN` exits non-zero and mentions Cloudflare token setup
2. missing `AUTH_ISSUER` exits non-zero and mentions `https://auth.example.com`
3. invalid `AUTH_ISSUER` with path exits non-zero and mentions pure origin requirement
4. when `/data` does not exist, the entrypoint creates it and first-run init creates the SQLite file
5. when `/data/auth.sqlite` already exists, the entrypoint skips `auth-mini init` and preserves existing state
6. stub assertions capture the exact `auth-mini start` argv and verify fixed constants: when `AUTH_INSTANCE` is unset it defaults to `/data/auth.sqlite`, and `--host 127.0.0.1` plus `--port 7777` are always passed
7. stub assertions capture the exact `cloudflared` argv and verify the supported mode is only `tunnel run --token "$TUNNEL_TOKEN"`

Use shell stubs/mocks (temporary `auth-mini` and `cloudflared` executables earlier on `PATH`) so the test can run without building or publishing a real image.

- [ ] **Step 2: Run the validation/init harness to verify it fails**

Run: `bash docker/test-entrypoint.sh validation`
Expected: FAIL because the placeholder `docker/entrypoint.sh` does not satisfy the real contract yet.

- [ ] **Step 3: Implement validation/init behavior**

Update `docker/entrypoint.sh` to:

- `set -eu`
- default `AUTH_INSTANCE=/data/auth.sqlite`
- validate `TUNNEL_TOKEN` and `AUTH_ISSUER`
- reject `AUTH_ISSUER` unless it is an `https://` origin without path/query/hash
- create `/data` if missing
- run `auth-mini init "$AUTH_INSTANCE"` only when the DB file is absent
- start `auth-mini start "$AUTH_INSTANCE" --issuer "$AUTH_ISSUER" --host 127.0.0.1 --port 7777` in background

- [ ] **Step 4: Run the validation/init harness to verify it passes**

Run: `bash docker/test-entrypoint.sh validation`
Expected: PASS.

- [ ] **Step 5: Write failing readiness checks**

Extend `docker/test-entrypoint.sh` with named checks for:

1. ready path waits for `GET /jwks` and only starts `cloudflared` after an HTTP `200` response
2. non-200 readiness responses (for example `503`) never count as ready and do not start `cloudflared`
3. startup logs include the fixed reminder that `AUTH_ISSUER` must equal the Dashboard hostname and that mismatch affects JWT `iss`, WebAuthn, and SDK usage
4. readiness timeout exits non-zero without starting `cloudflared`

- [ ] **Step 6: Run the readiness harness to verify it fails**

Run: `bash docker/test-entrypoint.sh supervision`
Expected: FAIL until readiness polling is implemented.

- [ ] **Step 7: Implement readiness polling**

Update `docker/entrypoint.sh` to poll `GET http://127.0.0.1:7777/jwks` with `curl` every 1 second for up to 30 seconds, and treat only HTTP `200` as ready.

- [ ] **Step 8: Implement timeout failure cleanup**

Update `docker/entrypoint.sh` so readiness timeout returns non-zero, emits a clear timeout message, and terminates the background `auth-mini` process before exit.

- [ ] **Step 9: Implement reminder logging and cloudflared start sequencing**

Update `docker/entrypoint.sh` to emit the fixed issuer/hostname reminder to container stderr/stdout and start `cloudflared tunnel run --token "$TUNNEL_TOKEN"` only after readiness succeeds.

- [ ] **Step 10: Run the readiness harness to verify it passes**

Run: `bash docker/test-entrypoint.sh supervision`
Expected: PASS for the readiness, timeout, and reminder checks.

- [ ] **Step 11: Write failing process-supervision checks**

Extend `docker/test-entrypoint.sh` with named checks for:

1. `auth-mini` exits early, the parent script exits non-zero, and logs a clear startup-failure message telling the operator to inspect auth-mini config/log output
2. `cloudflared` exits early after startup, the parent script terminates `auth-mini`, and exits with the child failure
3. sending SIGTERM to the entrypoint forwards termination and cleans up both child processes

- [ ] **Step 12: Run the process-supervision harness to verify it fails**

Run: `bash docker/test-entrypoint.sh supervision`
Expected: FAIL until child-process supervision is implemented.

- [ ] **Step 13: Implement auth-mini early-exit handling**

Update `docker/entrypoint.sh` so an `auth-mini` exit before `cloudflared` readiness causes the entrypoint to exit non-zero with a startup-failure message.

- [ ] **Step 14: Implement cloudflared-exit handling**

Update `docker/entrypoint.sh` so a `cloudflared` exit after startup terminates `auth-mini`, waits for shutdown, and exits with the `cloudflared` failure.

- [ ] **Step 15: Implement SIGTERM forwarding**

Update `docker/entrypoint.sh` so auth early exit, readiness timeout, `cloudflared` early exit, and SIGTERM all terminate both child processes cleanly and return non-zero on failure paths.

- [ ] **Step 16: Run the process-supervision harness to verify it passes**

Run: `bash docker/test-entrypoint.sh supervision`
Expected: PASS.

- [ ] **Step 17: Write the failing image-level smoke test**

Create `docker/test-image-smoke.sh` with one deterministic command path that:

- builds the image
- runs `docker run` with `-e PATH="/stubbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" -v <stubdir>:/stubbin:ro` so mounted stubs override image binaries predictably
- asserts first-run init creates the DB
- asserts `/jwks` readiness gates `cloudflared` startup
- asserts the issuer reminder is logged
- asserts an existing DB skips re-init
- asserts child-process exit behavior remains deterministic

- [ ] **Step 18: Run the image-level smoke test to verify it fails**

Run: `bash docker/test-image-smoke.sh`
Expected: FAIL until the real entrypoint fully satisfies the packaged-image runtime contract.

- [ ] **Step 19: Run the image-level smoke test to verify it passes**

Run: `bash docker/test-image-smoke.sh`
Expected: PASS with the image reaching auth readiness, logging the issuer reminder, invoking the stubbed `cloudflared` with `tunnel run --token ...`, and exiting deterministically.

- [ ] **Step 20: Commit**

```bash
git add Dockerfile docker/entrypoint.sh docker/test-entrypoint.sh docker/test-image-smoke.sh
git commit -m "build: add cloudflared container entrypoint"
```

## Chunk 2: Release Workflow

### Task 3: Add GHCR release workflow

**Files:**

- Create: `.github/workflows/release-image.yml`
- Create: `docker/check-release-workflow.sh`
- Test: `.github/workflows/release-image.yml`
- Test: `docker/check-release-workflow.sh`

- [ ] **Step 1: Write the failing workflow-check script**

Create `docker/check-release-workflow.sh` so it fails until the workflow encodes these exact fixture cases and boundaries:

- `push-main-version-bump` -> publish path allowed only after validation steps
- `push-main-no-version-bump` -> publish path skipped
- `workflow-dispatch-main` -> recovery path allowed
- `workflow-dispatch-non-main` -> official publish rejected
- `rerun-main` -> recovery path allowed
- `existing-tag` -> publish skipped cleanly
- `.github/workflows/publish.yml` remains unchanged

- [ ] **Step 2: Run the workflow-check script to verify it fails**

Run: `bash docker/check-release-workflow.sh`
Expected: FAIL because `.github/workflows/release-image.yml` and its required gates do not exist yet.

- [ ] **Step 3: Add workflow trigger and permission skeleton**

Create `.github/workflows/release-image.yml` with:

- `push` trigger on `main`
- `workflow_dispatch` trigger
- permissions including at least `contents: read` and `packages: write`
- a note that `.github/workflows/publish.yml` remains unchanged because npm publishing is separate

- [ ] **Step 4: Add push/version-bump detection**

Implement workflow logic that:

- reads `package.json` version into a step output such as `package_version`
- on `push`, compares `github.event.before` vs `github.sha` and extracts the `package.json` `version` value before/after
- sets an explicit gate output such as `should_publish=true|false` based on whether the `version` field changed
- only allows the push-triggered publish path when the ref is `refs/heads/main` and the version field changed

- [ ] **Step 5: Add GHCR tag-exists skip logic**

Implement workflow logic that queries GHCR with `docker manifest inspect ghcr.io/<owner>/auth-mini:${package_version}` after `docker/login-action`, sets an explicit skip output when the target tag already exists, and never publishes when that output is true.

- [ ] **Step 6: Add recovery and rerun protections**

Implement workflow logic that:

- allows `workflow_dispatch` only when `github.ref == "refs/heads/main"`
- treats `workflow_dispatch` on `main` as a recovery path that bypasses version-bump detection and goes straight to tag-exists checks
- treats reruns of failed `main` executions as re-entry to the same recovery/tag-exists gating path
- rejects non-`main` manual recovery for official publish

- [ ] **Step 7: Add build/test/publish steps**

Implement workflow jobs/steps that:

- check out the repo
- log in to GHCR with `GITHUB_TOKEN`
- build with Docker Buildx
- run `docker build --platform linux/amd64`, `bash docker/test-entrypoint.sh validation`, `bash docker/test-entrypoint.sh supervision`, and `bash docker/test-image-smoke.sh` before any push
- push `<version>` and `latest` only when `should_publish=true` and the tag does not already exist

- [ ] **Step 8: Review workflow syntax and gating logic**

Run:

```bash
bash docker/check-release-workflow.sh && docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint:1.7.7 -color
```

Expected: PASS with explicit checks for all named fixture cases, validation-before-push ordering, `publish.yml` unchanged, GHCR tags, skip behavior, and valid GitHub Actions syntax.

- [ ] **Step 9: Commit**

```bash
git add .github/workflows/release-image.yml docker/check-release-workflow.sh
git commit -m "ci: add docker image release workflow"
```

## Chunk 3: Docs And Final Verification

### Task 4: Document the one-container deployment path

**Files:**

- Modify: `README.md`
- Create: `docs/deploy/docker-cloudflared.md`
- Create: `docker/check-docs.sh`

- [ ] **Step 1: Write the failing docs checklist**

Create `docker/check-docs.sh` as a durable docs verification script, and encode these required reader outcomes in it:

- README must contain a deployment entry point linking to `docs/deploy/docker-cloudflared.md`
- a new user can create a Tunnel in Zero Trust
- a new user can find the `TUNNEL_TOKEN`
- a new user knows to set Dashboard service URL to `http://127.0.0.1:7777`
- a new user can run the image with one `docker run`
- a new user understands `/data` persistence and post-start config steps
- a new user can diagnose issuer/hostname mismatch, malformed issuer, invalid token, and restart loops
- a new user sees that issuer/hostname mismatch affects JWT `iss`, WebAuthn, and SDK usage
- docs explicitly state Docker files are for GHCR/container distribution, not npm package contents

- [ ] **Step 2: Confirm the docs gap**

Run: `bash docker/check-docs.sh pre`
Expected: FAIL because the required Docker/cloudflared deployment docs do not exist yet.

- [ ] **Step 3: Add the README deployment entry point**

Update `README.md` with a concise deployment section that:

- links to `docs/deploy/docker-cloudflared.md`
- includes the canonical `docker run` command
- states that GHCR/container assets are separate from npm package contents
- states that v1 targets linux/amd64 only

- [ ] **Step 4: Add the detailed deployment guide**

Create `docs/deploy/docker-cloudflared.md` with:

- Tunnel creation steps in Cloudflare Zero Trust
- where to find/copy/rotate the token
- the exact Dashboard hostname + service URL requirement
- troubleshooting for a misconfigured Dashboard service URL `http://127.0.0.1:7777`
- explicit support boundary: only Dashboard-managed tunnel + `TUNNEL_TOKEN` mode is supported; local `config.yml`, credentials files, and custom ingress configs are out of scope
- explicit mismatch explanation: if `AUTH_ISSUER` and the Dashboard hostname differ, JWT `iss`, WebAuthn expectations, and SDK guidance will be wrong
- malformed `AUTH_ISSUER` troubleshooting: explain that non-`https` values or values with path/query/hash fail startup validation
- volume layout and DB location
- what the entrypoint auto-initializes
- post-start config tasks (`origin add`, SMTP, other instance setup)
- common failures and what log/output to inspect

- [ ] **Step 5: Verify docs accuracy against the implemented image contract**

Run: `bash docker/check-docs.sh post`
Expected: PASS; docs cover the README link, run command, token setup, fixed service URL, persistence path, unsupported tunnel modes, linux/amd64 scope, and troubleshooting topics.

- [ ] **Step 6: Commit**

```bash
git add README.md docs/deploy/docker-cloudflared.md docker/check-docs.sh
git commit -m "docs: add cloudflared docker deployment guide"
```

### Task 5: Final verification

**Files:**

- Verify: `Dockerfile`
- Verify: `.dockerignore`
- Verify: `docker/entrypoint.sh`
- Verify: `docker/test-entrypoint.sh`
- Verify: `docker/test-image-smoke.sh`
- Verify: `docker/check-release-workflow.sh`
- Verify: `docker/check-docs.sh`
- Verify: `.github/workflows/release-image.yml`
- Verify: `README.md`
- Verify: `docs/deploy/docker-cloudflared.md`

- [ ] **Step 1: Confirm Chunk 1 is already complete**

Run: `bash docker/test-entrypoint.sh validation && bash docker/test-entrypoint.sh supervision && bash docker/test-image-smoke.sh`
Expected: PASS.

- [ ] **Step 2: Run repo verification**

Run: `npm run lint && npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 3: Run docs verification**

Run: `bash docker/check-docs.sh post`
Expected: PASS.

- [ ] **Step 4: Run release-workflow spot checks**

Run:

```bash
bash docker/check-release-workflow.sh && docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint:1.7.7 -color
```

Expected: PASS.

- [ ] **Step 5: Verify reminder log output explicitly**

Run: `bash docker/test-entrypoint.sh supervision | tee /tmp/auth-mini-entrypoint-supervision.log && grep -F "AUTH_ISSUER must match the Cloudflare Dashboard hostname" /tmp/auth-mini-entrypoint-supervision.log`
Expected: PASS and the fixed reminder text is present.

- [ ] **Step 6: Verify npm package boundary**

Run: `npm pack --dry-run`
Expected: PASS and the output does not include `Dockerfile`, `.dockerignore`, `docker/`, or `.github/workflows/release-image.yml`.

- [ ] **Step 7: Review final diffs**

Run: `git fetch origin main || true; BASE_REF=$(git show-ref --verify --quiet refs/remotes/origin/main && printf origin/main || git rev-list --max-parents=0 HEAD | tail -n 1); git log --oneline --stat -- Dockerfile .dockerignore docker/entrypoint.sh docker/test-entrypoint.sh docker/test-image-smoke.sh docker/check-release-workflow.sh docker/check-docs.sh .github/workflows/release-image.yml README.md docs/deploy/docker-cloudflared.md && git diff $(git merge-base HEAD "$BASE_REF")..HEAD -- Dockerfile .dockerignore docker/entrypoint.sh docker/test-entrypoint.sh docker/test-image-smoke.sh docker/check-release-workflow.sh docker/check-docs.sh .github/workflows/release-image.yml README.md docs/deploy/docker-cloudflared.md`
Expected: review covers the cumulative implementation history on this branch for the touched deployment/runtime/docs/workflow files.

- [ ] **Step 8: Commit**

```bash
if git diff --quiet -- Dockerfile .dockerignore docker/entrypoint.sh docker/test-entrypoint.sh docker/test-image-smoke.sh docker/check-release-workflow.sh docker/check-docs.sh .github/workflows/release-image.yml README.md docs/deploy/docker-cloudflared.md; then
  printf "No follow-up verification edits; skip final commit.\n"
else
  git add Dockerfile .dockerignore docker/entrypoint.sh docker/test-entrypoint.sh docker/test-image-smoke.sh docker/check-release-workflow.sh docker/check-docs.sh .github/workflows/release-image.yml README.md docs/deploy/docker-cloudflared.md
  git commit -m "feat: ship cloudflared docker release flow"
fi
```
