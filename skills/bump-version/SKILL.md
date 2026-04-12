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

## Blocker triage

- If a failing check is caused by the version bump or is a pre-existing stable-release blocker required to complete this release, fix it in the same worktree, branch, and PR.
- If the blocker is outside scope, such as GitHub permission issues, third-party outages, CI publish failure outside the version-bump diff, or npm registry visibility not appearing within the bounded retry window, stop and report the blocker with evidence.
- Never broaden the task into general repository maintenance.

## Hard bans

- no prerelease versions
- no build metadata targets
- no local `npm publish`
- no dist-tag customization
- no direct edits in the main workspace
- no stopping after PR creation
- no force-merge around failed checks, blocking review, or branch protection
