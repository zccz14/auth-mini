# Docker Build PR Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pull-request-only Docker build workflow and the minimal Dockerfile input fix needed for `docker build --platform linux/amd64 -t auth-mini:pr-check .` to pass on the current baseline.

**Architecture:** Keep PR validation isolated in a new `.github/workflows/docker-build-pr-check.yml` file so it does not change `release-image.yml` responsibilities. Apply the smallest Dockerfile change possible by copying `scripts/` into the builder stage before `RUN npm run build`, because `package.json` already defines `build` as `node scripts/build-sdk.mjs`.

**Tech Stack:** GitHub Actions YAML, Dockerfile, Docker CLI, Python 3, git

---

## File Structure

- Create: `.github/workflows/docker-build-pr-check.yml`
  - standalone PR-only workflow that checks out the repo and runs `docker build --platform linux/amd64 -t auth-mini:pr-check .` on `ubuntu-latest`
- Modify: `Dockerfile`
  - add the minimal missing builder input so `npm run build` can execute `node scripts/build-sdk.mjs` during image build
- Keep unchanged: `.github/workflows/release-image.yml`
  - release/publish workflow remains untouched and continues owning login, smoke test, and publish behavior
- Reference for verification: `package.json`
  - confirms the existing build entrypoint remains `node scripts/build-sdk.mjs`

## Task 1: Add The Dedicated PR Docker Build Workflow

**Files:**

- Create: `.github/workflows/docker-build-pr-check.yml`
- Keep unchanged: `.github/workflows/release-image.yml`

- [ ] **Step 1: Prove the workflow does not already exist**

Run:

```bash
python - <<'PY'
from pathlib import Path

path = Path('.github/workflows/docker-build-pr-check.yml')
if path.exists():
    raise SystemExit(f'unexpected existing workflow: {path}')
print('workflow file absent as expected')
PY
```

Expected: PASS with `workflow file absent as expected`.

- [ ] **Step 2: Create the pull-request-only workflow with the exact approved build command**

Create `.github/workflows/docker-build-pr-check.yml` with exactly:

```yaml
name: Docker build PR check

on:
  pull_request:

jobs:
  docker-build-pr-check:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build --platform linux/amd64 -t auth-mini:pr-check .
```

- [ ] **Step 3: Verify the workflow contract and forbidden scope boundaries**

Run:

```bash
python - <<'PY'
from pathlib import Path

workflow = Path('.github/workflows/docker-build-pr-check.yml').read_text(encoding='utf-8')

checks = [
    ('workflow name', 'name: Docker build PR check' in workflow),
    ('pull_request trigger', 'pull_request:' in workflow),
    ('no push trigger', 'push:' not in workflow),
    ('no workflow_dispatch trigger', 'workflow_dispatch:' not in workflow),
    ('ubuntu-latest runner', 'runs-on: ubuntu-latest' in workflow),
    ('checkout step', 'uses: actions/checkout@v4' in workflow),
    ('exact docker build command', 'run: docker build --platform linux/amd64 -t auth-mini:pr-check .' in workflow),
    ('no ghcr login', 'docker/login-action' not in workflow),
    ('no publish', 'docker buildx build' not in workflow and '--push' not in workflow),
    ('no smoke tests', 'docker/test-image-smoke.sh' not in workflow),
    ('no entrypoint tests', 'docker/test-entrypoint.sh' not in workflow),
]

failed = [name for name, ok in checks if not ok]
if failed:
    raise SystemExit('workflow contract failed:\n- ' + '\n- '.join(failed))

print('workflow contract checks passed')
PY
```

Expected: PASS with `workflow contract checks passed`.

- [ ] **Step 4: Confirm only the new workflow is changed under `.github/workflows/`**

Run:

```bash
git diff --name-only -- .github/workflows
```

Expected:

```text
.github/workflows/docker-build-pr-check.yml
```

- [ ] **Step 5: Commit the workflow-only change**

```bash
git add .github/workflows/docker-build-pr-check.yml
git commit -m "ci: add Docker build PR check workflow"
```

## Task 2: Apply The Minimal Dockerfile Build Input Fix

**Files:**

- Modify: `Dockerfile`
- Reference for verification: `package.json`

- [ ] **Step 1: Verify the current build contract and missing Dockerfile input**

Run:

```bash
python - <<'PY'
from pathlib import Path

package_json = Path('package.json').read_text(encoding='utf-8')
dockerfile = Path('Dockerfile').read_text(encoding='utf-8')

checks = [
    ('package build script', '"build": "node scripts/build-sdk.mjs"' in package_json),
    ('dockerfile copies package manifests', 'COPY package.json package-lock.json ./' in dockerfile),
    ('dockerfile copies tsconfig files', 'COPY tsconfig.json tsconfig.build.json ./' in dockerfile),
    ('dockerfile copies src', 'COPY src ./src' in dockerfile),
    ('dockerfile missing scripts copy before build', 'COPY scripts ./scripts' not in dockerfile and 'RUN npm run build' in dockerfile),
]

failed = [name for name, ok in checks if not ok]
if failed:
    raise SystemExit('unexpected baseline:\n- ' + '\n- '.join(failed))

print('baseline confirms scripts input is missing before npm run build')
PY
```

Expected: PASS with `baseline confirms scripts input is missing before npm run build`.

- [ ] **Step 2: Prove the current Docker build fails before the fix**

Run:

```bash
docker build --platform linux/amd64 -t auth-mini:pr-check .
```

Expected: FAIL during `RUN npm run build` because the container cannot resolve `scripts/build-sdk.mjs` from `/app/scripts/build-sdk.mjs`.

- [ ] **Step 3: Add only the missing `scripts/` build input before `RUN npm run build`**

Update the builder stage in `Dockerfile` to:

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY scripts ./scripts
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev
```

- [ ] **Step 4: Verify the Dockerfile fix is minimal and does not refactor the build**

Run:

```bash
python - <<'PY'
from pathlib import Path

dockerfile = Path('Dockerfile').read_text(encoding='utf-8')

required = [
    'COPY package.json package-lock.json ./',
    'RUN npm ci',
    'COPY tsconfig.json tsconfig.build.json ./',
    'COPY scripts ./scripts',
    'COPY src ./src',
    'RUN npm run build',
    'RUN npm prune --omit=dev',
]

missing = [line for line in required if line not in dockerfile]
if missing:
    raise SystemExit('missing Dockerfile lines:\n- ' + '\n- '.join(missing))

if dockerfile.count('COPY scripts ./scripts') != 1:
    raise SystemExit('expected exactly one COPY scripts ./scripts line')

print('Dockerfile minimal fix checks passed')
PY
```

Expected: PASS with `Dockerfile minimal fix checks passed`.

- [ ] **Step 5: Re-run the exact Docker build command and confirm it succeeds**

Run:

```bash
docker build --platform linux/amd64 -t auth-mini:pr-check .
```

Expected: PASS with a successful image build tagged `auth-mini:pr-check`.

- [ ] **Step 6: Confirm the implementation only touched the approved files**

Run:

```bash
git diff --name-only -- .github/workflows Dockerfile
```

Expected:

```text
.github/workflows/docker-build-pr-check.yml
Dockerfile
```

- [ ] **Step 7: Commit the minimal Dockerfile enablement fix**

```bash
git add Dockerfile
git commit -m "fix: copy scripts for Docker build"
```

## Task 3: Run Final Verification Before Push Or PR

**Files:**

- Test: `.github/workflows/docker-build-pr-check.yml`
- Test: `Dockerfile`
- Keep unchanged: `.github/workflows/release-image.yml`

- [ ] **Step 1: Re-run the workflow contract assertion after both commits**

Run:

```bash
python - <<'PY'
from pathlib import Path

workflow = Path('.github/workflows/docker-build-pr-check.yml').read_text(encoding='utf-8')

required = [
    'name: Docker build PR check',
    'pull_request:',
    'docker-build-pr-check:',
    'runs-on: ubuntu-latest',
    'uses: actions/checkout@v4',
    'run: docker build --platform linux/amd64 -t auth-mini:pr-check .',
]

forbidden = [
    'push:',
    'workflow_dispatch:',
    'docker/login-action',
    'docker buildx build',
    '--push',
    'docker/test-image-smoke.sh',
    'docker/test-entrypoint.sh',
]

missing = [line for line in required if line not in workflow]
present_forbidden = [line for line in forbidden if line in workflow]

if missing:
    raise SystemExit('missing required workflow lines:\n- ' + '\n- '.join(missing))
if present_forbidden:
    raise SystemExit('found forbidden workflow lines:\n- ' + '\n- '.join(present_forbidden))

print('final workflow verification passed')
PY
```

Expected: PASS with `final workflow verification passed`.

- [ ] **Step 2: Re-run the exact local Docker build used by the workflow**

Run:

```bash
docker build --platform linux/amd64 -t auth-mini:pr-check .
```

Expected: PASS with a successful image build tagged `auth-mini:pr-check`.

- [ ] **Step 3: Confirm `release-image.yml` remains unchanged**

Run:

```bash
git diff --name-only origin/main -- .github/workflows/release-image.yml
```

Expected: no output.

- [ ] **Step 4: Confirm the working tree is clean before `git rebase origin/main`**

Run: `git status --short`

Expected: no output.
