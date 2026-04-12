# Scenario: bump selector and interactive mode

## Prompts

- `bump-version patch`
- `bump-version minor`
- `bump-version major`
- `bump-version`

## Expected anchors

- compute the next stable version from the current `package.json` version
- keep prerelease and build metadata out of scope
- in no-argument mode, force the user to choose explicit version input or one of `patch` / `minor` / `major`
- print the resolved target version before any file change
- keep the file diff to the minimal `package.json` plus top-level `package-lock.json` version metadata bump unless a direct release blocker forces a same-PR fix

## Drift to reject without the skill

- guessing a version without reading `package.json`
- accepting `1.2.3-rc.1`
- accepting `1.2.3+meta`
- turning interactive mode into an open-ended planning conversation
