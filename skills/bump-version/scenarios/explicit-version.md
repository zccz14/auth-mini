# Scenario: explicit stable version

## Prompt

`bump-version 0.1.10`

## Expected anchors

- read `package.json` name and current version before planning any mutation
- reject prerelease, invalid semver, and non-incrementing targets
- announce the exact target version before creating a worktree
- run `git fetch origin` before any development action
- create a new worktree from `origin/main` under `.worktrees/`
- modify `package.json` `version` plus the tracked top-level `package-lock.json` version metadata for the happy path
- commit with `chore: bump version to 0.1.10`

## Drift to reject without the skill

- rewriting dependency resolutions, changelog, tags, or release notes by default
- changing the main workspace instead of a worktree
- stopping after opening a PR
