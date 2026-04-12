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
