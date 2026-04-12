# Docker Build PR Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new PR-only GitHub Actions workflow that performs the minimal approved Docker build check on `ubuntu-latest` without changing any release workflow behavior.

**Architecture:** Keep the change isolated to one new workflow file under `.github/workflows/` so the PR validation path stays separate from `release-image.yml`. Verify the workflow contract with focused text assertions and the exact local `docker build` command, which is sufficient for this CI-only change without introducing any new scripts or test harness files.

**Tech Stack:** GitHub Actions YAML, Docker CLI, bash, Python 3 for local workflow assertions, git

---

## File Structure

- Create: `.github/workflows/docker-build-pr-check.yml`
  - independent workflow that triggers only on `pull_request`, runs one `ubuntu-latest` job, checks out the repository, and runs the exact approved Docker build command
- Keep unchanged: `.github/workflows/release-image.yml`
  - existing release/publish workflow must not be edited, repurposed, or partially inlined into the new PR workflow

## Task 1: Add The Dedicated PR Docker Build Workflow

**Files:**

- Create: `.github/workflows/docker-build-pr-check.yml`
- Keep unchanged: `.github/workflows/release-image.yml`

- [ ] **Step 1: Prove the new workflow file does not exist before implementation**

Run:

```bash
python - <<'PY'
from pathlib import Path

path = Path('.github/workflows/docker-build-pr-check.yml')
if not path.exists():
    raise SystemExit(f'missing workflow: {path}')
PY
```

Expected: FAIL with `missing workflow: .github/workflows/docker-build-pr-check.yml`.

- [ ] **Step 2: Create the minimal PR-only workflow with the exact approved Docker build step**

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

- [ ] **Step 3: Run a focused assertion script to verify the workflow contract and guard against scope drift**

Run:

```bash
python - <<'PY'
from pathlib import Path

path = Path('.github/workflows/docker-build-pr-check.yml')
workflow = path.read_text()

checks = [
    ('workflow name', 'name: Docker build PR check' in workflow),
    ('pull_request trigger', 'pull_request:' in workflow),
    ('no push trigger', 'push:' not in workflow),
    ('no workflow_dispatch trigger', 'workflow_dispatch:' not in workflow),
    ('single ubuntu job', 'jobs:\n  docker-build-pr-check:\n    runs-on: ubuntu-latest' in workflow),
    ('checkout step', 'uses: actions/checkout@v4' in workflow),
    ('docker build step', 'run: docker build --platform linux/amd64 -t auth-mini:pr-check .' in workflow),
    ('no GHCR login', 'docker/login-action' not in workflow),
    ('no buildx publish', '--push' not in workflow and 'docker buildx build' not in workflow),
    ('no smoke tests', 'docker/test-image-smoke.sh' not in workflow),
    ('no entrypoint validation drift', 'docker/test-entrypoint.sh' not in workflow),
]

missing = [name for name, ok in checks if not ok]
if missing:
    raise SystemExit('docker-build-pr-check workflow is missing required behavior:\n- ' + '\n- '.join(missing))

print('docker-build-pr-check workflow checks passed')
PY
```

Expected: PASS with `docker-build-pr-check workflow checks passed`.

- [ ] **Step 4: Run the exact local Docker build command used by the workflow**

Run:

```bash
docker build --platform linux/amd64 -t auth-mini:pr-check .
```

Expected: PASS with a successful Docker image build for tag `auth-mini:pr-check`.

- [ ] **Step 5: Confirm the change is isolated to the new workflow and does not modify the release workflow**

Run:

```bash
git diff --name-only -- .github/workflows
```

Expected:

```text
.github/workflows/docker-build-pr-check.yml
```

- [ ] **Step 6: Commit only the new workflow after the focused checks pass**

```bash
git add .github/workflows/docker-build-pr-check.yml
git commit -m "ci: add Docker build PR check"
```

## Task 2: Run Final Verification On The Workflow Contract

**Files:**

- Test: `.github/workflows/docker-build-pr-check.yml`
- Keep unchanged: `.github/workflows/release-image.yml`

- [ ] **Step 1: Re-run a final assertion pass against the committed workflow file**

Run:

```bash
python - <<'PY'
from pathlib import Path

workflow = Path('.github/workflows/docker-build-pr-check.yml').read_text()

required_lines = [
    'name: Docker build PR check',
    'pull_request:',
    'jobs:',
    'docker-build-pr-check:',
    'runs-on: ubuntu-latest',
    'uses: actions/checkout@v4',
    'run: docker build --platform linux/amd64 -t auth-mini:pr-check .',
]

forbidden_lines = [
    'push:',
    'workflow_dispatch:',
    'docker/login-action',
    'docker buildx build',
    '--push',
    'docker/test-image-smoke.sh',
    'docker/test-entrypoint.sh',
]

missing = [line for line in required_lines if line not in workflow]
forbidden = [line for line in forbidden_lines if line in workflow]

if missing:
    raise SystemExit('missing required lines:\n- ' + '\n- '.join(missing))
if forbidden:
    raise SystemExit('found forbidden lines:\n- ' + '\n- '.join(forbidden))

print('final docker-build-pr-check verification passed')
PY
```

Expected: PASS with `final docker-build-pr-check verification passed`.

- [ ] **Step 2: Confirm the working tree is clean after commit**

Run: `git status --short`

Expected: no output.
