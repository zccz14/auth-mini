# Bump Version Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a project-local `bump-version` skill that safely bumps the root package version metadata to the next stable version and drives the full worktree, PR, merge, and npm-registry confirmation flow required by the approved spec.

**Architecture:** Keep the implementation documentation-first and repo-local. Start with pressure-scenario fixtures plus a verifier script that fails while the skill is missing or incomplete, then add one focused `skills/bump-version/SKILL.md` that encodes version parsing, worktree-only execution, scope-limited PR follow-up, and post-merge registry polling. Avoid inventing a release framework; the skill should orchestrate existing git, GitHub, and npm commands for this single-package repo.

**Tech Stack:** Markdown, Node.js, git, GitHub CLI, npm registry HTTP API

---

## File Structure

- Create: `skills/bump-version/SKILL.md`
  - Project-local skill contract for explicit version, `patch` / `minor` / `major`, and no-argument interactive release flows.
- Create: `skills/bump-version/scripts/verify-bump-version-skill.mjs`
  - Repo-local verifier that reads the pressure scenarios and `SKILL.md`, then fails if required workflow anchors are missing.
- Create: `skills/bump-version/scenarios/explicit-version.md`
  - Pressure scenario for a direct stable semver input like `bump-version 0.1.10`.
- Create: `skills/bump-version/scenarios/bump-selector.md`
  - Pressure scenario for `patch` / `minor` / `major` and no-argument interactive selection.
- Create: `skills/bump-version/scenarios/registry-blocker.md`
  - Pressure scenario for PR follow-up, scope triage, merge, and npm registry visibility/blocker handling.
- Validate only: `AGENTS.md`
  - Reference for required worktree, rebase, PR follow-up, merge, and cleanup rules; do not modify.
- Validate only: `package.json`
  - Source of truth for current package name/version and existing `build` / `test` scripts the skill should rely on rather than replacing.
- Validate only: `package-lock.json`
  - Root lockfile also carries the package version metadata, so the happy path must keep it aligned with `package.json`.
- Validate only: `README.md`
  - Leave untouched unless implementation discovers an existing repo convention that indexes local skills.

## Task 1: Define pressure scenarios and capture the red baseline

**Files:**

- Create: `skills/bump-version/scenarios/explicit-version.md`
- Create: `skills/bump-version/scenarios/bump-selector.md`
- Create: `skills/bump-version/scenarios/registry-blocker.md`
- Create: `skills/bump-version/scripts/verify-bump-version-skill.mjs`

- [ ] **Step 1: Add the three scenario fixtures first**

Create `skills/bump-version/scenarios/explicit-version.md` with this content:

```md
# Scenario: explicit stable version

## Prompt

`bump-version 0.1.10`

## Expected anchors

- read `package.json` name and current version before planning any mutation
- reject prerelease, build metadata, invalid semver, and non-incrementing targets
- announce the exact target version before creating a worktree
- run `git fetch origin` before any development action
- create a new worktree from `origin/main` under `.worktrees/`
- have the dispatched subagent perform development actions inside that worktree
- update only the root `package.json` `version` plus matching root `package-lock.json` version metadata for the happy path
- commit with `chore: bump version to 0.1.10`

## Drift to reject without the skill

- editing changelog, tags, release notes, or non-root lockfiles by default
- changing the main workspace instead of the dispatched worktree
- stopping after opening a PR
```

Create `skills/bump-version/scenarios/bump-selector.md` with this content:

```md
# Scenario: bump selector and interactive mode

## Prompts

- `bump-version patch`
- `bump-version minor`
- `bump-version major`
- `bump-version`

## Expected anchors

- compute the next stable version from the current `package.json` version
- reject prerelease input and build metadata as invalid stable-version targets
- in no-argument mode, force a choice between explicit version input and one of `patch` / `minor` / `major`
- print the resolved target version before any file change
- keep the file diff to the minimal root version-metadata bump unless a direct release blocker forces a same-PR fix

## Drift to reject without the skill

- guessing a version without reading `package.json`
- accepting `1.2.3-rc.1`
- turning interactive mode into an open-ended planning conversation
```

Create `skills/bump-version/scenarios/registry-blocker.md` with this content:

```md
# Scenario: PR follow-up and registry blocker

## Prompt

`bump-version patch`

## Expected anchors

- create the PR and state that merge-time CI performs the publish
- continue checking PR status instead of treating PR creation as completion
- repair only scope-valid failures in the same worktree, branch, and PR
- stop and report external blockers such as permissions, CI publish failure, or npm registry visibility timeout
- merge only when checks, review, and protection rules allow it
- after merge, poll npm registry for the exact package name and target version inside a bounded retry window
- clean up the worktree after the PR reaches terminal state

## Drift to reject without the skill

- local `npm publish`
- force-merging around review or checks
- claiming success before the target version is visible in npm
```

- [ ] **Step 2: Add a verifier script that is red while the skill is missing**

Create `skills/bump-version/scripts/verify-bump-version-skill.mjs` with this exact baseline implementation:

```js
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const skillDir = resolve(import.meta.dirname, '..');
const scenariosDir = resolve(skillDir, 'scenarios');
const skillPath = resolve(skillDir, 'SKILL.md');

const scenarioChecks = [
  ['explicit-version.md', ['## Expected anchors', '## Drift to reject without the skill']],
  ['bump-selector.md', ['`bump-version patch`', '`bump-version`', '## Drift to reject without the skill']],
  ['registry-blocker.md', ['npm registry', 'same worktree, branch, and PR', 'local `npm publish`']],
];

const failures = [];

for (const [file, anchors] of scenarioChecks) {
  const text = readFileSync(resolve(scenariosDir, file), 'utf8');
  for (const anchor of anchors) {
    if (!text.includes(anchor)) {
      failures.push(`${file} is missing anchor: ${anchor}`);
    }
  }
}

if (!existsSync(skillPath)) {
  failures.push('SKILL.md is missing, so the project-local bump-version skill cannot satisfy the scenarios yet');
}

if (failures.length > 0) {
  console.error('bump-version skill verification failed');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('bump-version skill scenarios verified');
```

- [ ] **Step 3: Run the verifier and confirm the intentional red state**

Run: `node skills/bump-version/scripts/verify-bump-version-skill.mjs`

Expected: FAIL with `SKILL.md is missing` in the output, proving the baseline scenarios are defined before the skill exists.

- [ ] **Step 4: Commit nothing yet**

Keep the scenario fixtures and verifier unstaged until the actual skill text is added and the verification loop turns green.

## Task 2: Implement the project-local `bump-version` skill

**Files:**

- Create: `skills/bump-version/SKILL.md`
- Modify: `skills/bump-version/scripts/verify-bump-version-skill.mjs`
- Test: `skills/bump-version/scenarios/explicit-version.md`
- Test: `skills/bump-version/scenarios/bump-selector.md`
- Test: `skills/bump-version/scenarios/registry-blocker.md`

- [ ] **Step 1: Write the skill contract around the approved boundaries**

Create `skills/bump-version/SKILL.md` with this structure and anchor text:

```md
# Skill: bump-version

## Purpose

Release the next stable `auth-mini` version by changing only the root `package.json` and root `package-lock.json` version metadata unless a direct release blocker in the same PR must also be fixed.

## Inputs

- `bump-version 0.1.10`
- `bump-version patch`
- `bump-version minor`
- `bump-version major`
- `bump-version`

## Required flow

1. Read `package.json` and capture `name` plus current `version`.
2. Resolve the target stable version and reject invalid semver, prerelease input, build metadata, or non-incrementing targets.
3. Announce the exact target version.
4. In no-argument mode, force a choice between explicit version input and one of `patch` / `minor` / `major` before any mutation.
5. Run `git fetch origin`.
6. Create a fresh worktree from `origin/main` under `.worktrees/`, then have the dispatched subagent perform all development actions there.
7. Update only the root `package.json` and root `package-lock.json` version metadata on the happy path.
8. Run the smallest required verification for the version-bump diff.
9. Commit with `chore: bump version to <target>`.
10. Run `git fetch origin` and `git rebase origin/main` before pushing.
11. Push, create a PR, and state that merge-time CI performs the actual publish.
12. Follow checks, review, and mergeability to closure instead of stopping at PR creation.
13. Fix only failures that are directly caused by the version bump or are mandatory stable-release blockers already inside scope.
14. Stop and report blockers outside scope, including permissions, third-party failures, and registry visibility timeouts.
15. Merge when repository rules allow it, then delete the worktree after terminal PR state.
16. Poll npm registry for the package name and target version inside a bounded 1-5 minute window before claiming success.

## Hard bans

- no prerelease versions
- no build metadata targets
- no local `npm publish`
- no dist-tag customization
- no direct edits in the main workspace
- no stopping after PR creation
- no force-merge around failed checks, blocking review, or branch protection
```

- [ ] **Step 2: Extend the verifier so it checks the implemented skill text, not just file existence**

Replace the `SKILL.md` existence-only branch in `skills/bump-version/scripts/verify-bump-version-skill.mjs` with these exact anchor checks:

```js
const skillText = readFileSync(skillPath, 'utf8');

const skillAnchors = [
  'Read `package.json` and capture `name` plus current `version`.',
  'reject invalid semver, prerelease input, build metadata, or non-incrementing targets',
  'Run `git fetch origin`.',
  'Create a fresh worktree from `origin/main` under `.worktrees/`',
  'dispatched subagent perform all development actions there',
  'Update only the root `package.json` and root `package-lock.json` version metadata on the happy path.',
  'Commit with `chore: bump version to <target>`.',
  'git rebase origin/main',
  'merge-time CI performs the actual publish',
  'Follow checks, review, and mergeability to closure',
  'no local `npm publish`',
  'bounded 1-5 minute window',
];

for (const anchor of skillAnchors) {
  if (!skillText.includes(anchor)) {
    failures.push(`SKILL.md is missing anchor: ${anchor}`);
  }
}
```

- [ ] **Step 3: Re-run the verifier and confirm the core skill passes the scenario anchors**

Run: `node skills/bump-version/scripts/verify-bump-version-skill.mjs`

Expected: PASS with `bump-version skill scenarios verified`.

- [ ] **Step 4: Inspect the diff to keep the implementation repo-local and minimal**

Run: `git diff -- skills/bump-version`

Expected:

- only `skills/bump-version/SKILL.md`, `skills/bump-version/scripts/verify-bump-version-skill.mjs`, and the three scenario markdown files are present
- no new release pipeline, workflow, or CLI code was added
- the skill text keeps the happy path limited to root version-metadata updates plus required subagent/worktree orchestration

## Task 3: Verify blocker handling and decide whether discoverability docs are actually needed

**Files:**

- Modify: `skills/bump-version/SKILL.md`
- Modify: `skills/bump-version/scripts/verify-bump-version-skill.mjs`
- Validate only: `README.md`

- [ ] **Step 1: Add one explicit blocker triage section to the skill if it is not already clear enough**

Ensure `skills/bump-version/SKILL.md` contains this exact decision block near the PR follow-up section:

```md
## Blocker triage

- If a failing check is caused by the version bump or is a pre-existing stable-release blocker required to complete this release, fix it in the same worktree, branch, and PR.
- If the blocker is outside scope, such as GitHub permission issues, third-party outages, CI publish failure outside the version-bump diff, or npm registry visibility not appearing within the bounded retry window, stop and report the blocker with evidence.
- Never broaden the task into general repository maintenance.
```

- [ ] **Step 2: Lock the blocker anchors in the verifier**

Append these checks to `skills/bump-version/scripts/verify-bump-version-skill.mjs`:

```js
for (const anchor of [
  'fix it in the same worktree, branch, and PR',
  'stop and report the blocker with evidence',
  'Never broaden the task into general repository maintenance.',
]) {
  if (!skillText.includes(anchor)) {
    failures.push(`SKILL.md is missing blocker anchor: ${anchor}`);
  }
}
```

- [ ] **Step 3: Verify that no repo convention currently forces a README or docs update**

Run: `rg -n "skills/|local skill|superpowers skill" README.md docs skills`

Expected: either no existing discoverability convention is found, or the matches point only at the new `skills/bump-version` files. If an existing index is discovered, add the smallest matching doc update in the same branch before continuing; otherwise keep `README.md` unchanged.

- [ ] **Step 4: Run the verifier again after the blocker wording pass**

Run: `node skills/bump-version/scripts/verify-bump-version-skill.mjs`

Expected: PASS, with the blocker triage and bounded-registry behavior still enforced.

## Task 4: Final verification and branch workflow

**Files:**

- Modify: `skills/bump-version/SKILL.md`
- Modify: `skills/bump-version/scripts/verify-bump-version-skill.mjs`
- Modify: `skills/bump-version/scenarios/explicit-version.md`
- Modify: `skills/bump-version/scenarios/bump-selector.md`
- Modify: `skills/bump-version/scenarios/registry-blocker.md`

- [ ] **Step 1: Run the complete local verification slice**

Run: `node skills/bump-version/scripts/verify-bump-version-skill.mjs && git diff --stat -- skills/bump-version`

Expected: PASS from the verifier, followed by a diffstat limited to the five planned files under `skills/bump-version`.

- [ ] **Step 2: Stage only the skill implementation files**

Run:

```bash
git add skills/bump-version/SKILL.md \
  skills/bump-version/scripts/verify-bump-version-skill.mjs \
  skills/bump-version/scenarios/explicit-version.md \
  skills/bump-version/scenarios/bump-selector.md \
  skills/bump-version/scenarios/registry-blocker.md
```

Expected: only the five `skills/bump-version` files are staged.

- [ ] **Step 3: Commit the local skill**

Run:

```bash
git commit -m "feat: add bump-version skill"
```

- [ ] **Step 4: Rebase onto the latest `origin/main` before publishing the branch**

Run: `git fetch origin && git rebase origin/main`

Expected: PASS with the skill commit replayed on the newest `origin/main` base.

- [ ] **Step 5: Push and open a PR that explains the repo-local release scope**

Run:

```bash
gh pr create --title "feat: add bump-version skill" --body "$(cat <<'EOF'
## Summary
- add a project-local `bump-version` skill for stable `package.json` version bumps only
- verify the skill against explicit-version, bump-selector, and registry-blocker pressure scenarios
- keep release automation scope limited to worktree, PR follow-up, merge, and npm visibility confirmation
EOF
)"
```

Expected: PASS with a PR URL.

- [ ] **Step 6: Follow checks, review, mergeability, and cleanup to terminal state**

Run these commands in sequence as the PR advances:

```bash
gh pr checks --watch
gh pr view --json url,reviewDecision,mergeStateStatus,statusCheckRollup
gh pr merge --squash --delete-branch=false
git worktree remove .worktrees/<branch-name>
```

Expected:

- checks finish green, or any scope-valid blocker is fixed in the same worktree and pushed before re-running checks
- merge happens only after review and protection rules allow it
- the worktree is removed only after the PR reaches a true terminal state

## Final Verification

- [ ] Run: `node skills/bump-version/scripts/verify-bump-version-skill.mjs`
- [ ] Expected: PASS with `bump-version skill scenarios verified`.
- [ ] Run: `git diff --name-only --cached`
- [ ] Expected: only the five `skills/bump-version` files are staged for the feature commit.

## Self-Review

- **Spec coverage:** Covers explicit stable versions, `patch` / `minor` / `major`, no-argument interactive selection, `package.json` version-only happy path, mandatory `git fetch origin` + `.worktrees/` flow, same-PR scope-limited failure repair, bounded npm registry polling, blocker reporting, merge, and worktree cleanup.
- **Placeholder scan:** No `TODO`, `TBD`, “implement later”, or vague “write tests” placeholders remain; every task names exact files, snippets, commands, and expected outcomes.
- **Type/name consistency:** Uses one local skill name, `bump-version`, one verifier file, `skills/bump-version/scripts/verify-bump-version-skill.mjs`, and one scenario set under `skills/bump-version/scenarios/` throughout.
