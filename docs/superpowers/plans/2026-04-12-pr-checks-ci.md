# PR Checks CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `.github/workflows/pr-checks.yml` so pull requests targeting `main` run the approved single-job CI sequence with read-only permissions and stale-run cancellation.

**Architecture:** Keep this feature isolated to one new workflow file under `.github/workflows/`, following the naming and step style already used by `publish.yml` and `release-image.yml`. Verify behavior with targeted file assertions against the YAML text instead of adding new test harness files, because the approved scope is only the PR workflow itself.

**Tech Stack:** GitHub Actions YAML, Node 24 setup via `actions/setup-node@v4`, npm scripts, bash, Python 3 for local workflow assertions

---

## File Structure

- Create: `.github/workflows/pr-checks.yml`
  - new PR-only workflow with `pull_request` → `main` trigger, `contents: read`, concurrency cancellation, one `ubuntu-latest` job, Node 24 + npm cache setup, and the exact approved command order

## Task 1: Add The PR Checks Workflow

**Files:**

- Create: `.github/workflows/pr-checks.yml`

- [ ] **Step 1: Prove the workflow does not exist yet before implementation**

Run:

```bash
python - <<'PY'
from pathlib import Path

path = Path('.github/workflows/pr-checks.yml')
if not path.exists():
    raise SystemExit(f'missing workflow: {path}')
PY
```

Expected: FAIL with `missing workflow: .github/workflows/pr-checks.yml`.

- [ ] **Step 2: Create the workflow with the approved trigger, permissions, concurrency, and command order**

Create `.github/workflows/pr-checks.yml` with exactly:

```yaml
name: PR checks

on:
  pull_request:
    branches:
      - main

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  pr-checks:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24.x
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run lint
        run: npm run lint

      - name: Run typecheck
        run: npm run typecheck

      - name: Run tests
        run: npm test

      - name: Build package
        run: npm run build

      - name: Check release workflow invariants
        run: bash docker/check-release-workflow.sh

      - name: Check docs invariants
        run: bash docker/check-docs.sh post
```

- [ ] **Step 3: Run a focused workflow assertion script against the new file**

Run:

```bash
python - <<'PY'
from pathlib import Path

path = Path('.github/workflows/pr-checks.yml')
workflow = path.read_text()

checks = [
    ('pull_request trigger', 'pull_request:' in workflow),
    ('main branch filter', 'branches:\n      - main' in workflow),
    ('no push trigger', 'push:' not in workflow),
    ('no workflow_dispatch trigger', 'workflow_dispatch:' not in workflow),
    ('contents read permission', 'permissions:\n  contents: read' in workflow),
    ('concurrency group', 'group: ${{ github.workflow }}-${{ github.event.pull_request.number }}' in workflow),
    ('cancel old runs', 'cancel-in-progress: true' in workflow),
    ('single ubuntu job', 'jobs:\n  pr-checks:\n    runs-on: ubuntu-latest' in workflow),
    ('checkout step', 'uses: actions/checkout@v4' in workflow),
    ('setup-node step', 'uses: actions/setup-node@v4' in workflow),
    ('node 24', 'node-version: 24.x' in workflow),
    ('npm cache', 'cache: npm' in workflow),
    ('release workflow check', 'bash docker/check-release-workflow.sh' in workflow),
    ('docs check', 'bash docker/check-docs.sh post' in workflow),
    ('no docker smoke test drift', 'docker/test-image-smoke.sh' not in workflow),
    ('no path filters drift', 'paths:' not in workflow and 'paths-ignore:' not in workflow),
]

command_order = [
    'run: npm ci',
    'run: npm run lint',
    'run: npm run typecheck',
    'run: npm test',
    'run: npm run build',
    'run: bash docker/check-release-workflow.sh',
    'run: bash docker/check-docs.sh post',
]

positions = [workflow.find(command) for command in command_order]
checks.append(('all commands present', all(position != -1 for position in positions)))
checks.append(('command order preserved', positions == sorted(positions)))

missing = [name for name, ok in checks if not ok]
if missing:
    raise SystemExit('pr-checks workflow is missing required behavior:\n- ' + '\n- '.join(missing))

print('pr-checks workflow checks passed')
PY
```

Expected: PASS with `pr-checks workflow checks passed`.

- [ ] **Step 4: Verify the workflow is the only new CI file introduced by this feature**

Run: `git diff --name-only -- .github/workflows`

Expected:

```text
.github/workflows/pr-checks.yml
```

- [ ] **Step 5: Commit the workflow after the focused assertions pass**

```bash
git add .github/workflows/pr-checks.yml
git commit -m "ci: add pull request checks workflow"
```

## Task 2: Run Final Verification For The New Workflow Contract

**Files:**

- Test: `.github/workflows/pr-checks.yml`

- [ ] **Step 1: Re-run the targeted workflow assertions as a fresh final check**

Run:

```bash
python - <<'PY'
from pathlib import Path

workflow = Path('.github/workflows/pr-checks.yml').read_text()

required_lines = [
    'name: PR checks',
    'pull_request:',
    '      - main',
    'contents: read',
    'cancel-in-progress: true',
    'uses: actions/checkout@v4',
    'uses: actions/setup-node@v4',
    'node-version: 24.x',
    'cache: npm',
    'run: npm ci',
    'run: npm run lint',
    'run: npm run typecheck',
    'run: npm test',
    'run: npm run build',
    'run: bash docker/check-release-workflow.sh',
    'run: bash docker/check-docs.sh post',
]

missing = [line for line in required_lines if line not in workflow]
forbidden = [
    line for line in ['push:', 'workflow_dispatch:', 'paths:', 'paths-ignore:', 'docker/test-image-smoke.sh']
    if line in workflow
]

if missing:
    raise SystemExit('missing required lines:\n- ' + '\n- '.join(missing))
if forbidden:
    raise SystemExit('found forbidden lines:\n- ' + '\n- '.join(forbidden))

print('final pr-checks verification passed')
PY
```

Expected: PASS with `final pr-checks verification passed`.

- [ ] **Step 2: Confirm the committed branch is clean except for expected branch divergence**

Run: `git status --short`

Expected: no output.
