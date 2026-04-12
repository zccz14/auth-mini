import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scenariosDir = resolve(skillDir, 'scenarios');
const skillPath = resolve(skillDir, 'SKILL.md');

const scenarioChecks = [
  [
    'explicit-version.md',
    [
      '`bump-version 0.1.10`',
      'read `package.json` name and current version before planning any mutation',
      'reject prerelease, invalid semver, and non-incrementing targets',
      'announce the exact target version before creating a worktree',
      'run `git fetch origin` before any development action',
      'create a new worktree from `origin/main` under `.worktrees/`',
      'modify `package.json` `version` plus the tracked top-level `package-lock.json` version metadata for the happy path',
      'commit with `chore: bump version to 0.1.10`',
      'rewriting dependency resolutions, changelog, tags, or release notes by default',
      'changing the main workspace instead of a worktree',
      'stopping after opening a PR',
    ],
  ],
  [
    'bump-selector.md',
    [
      '`bump-version patch`',
      '`bump-version minor`',
      '`bump-version major`',
      '`bump-version`',
      'compute the next stable version from the current `package.json` version',
      'keep prerelease and build metadata out of scope',
      'force the user to choose explicit version input or one of `patch` / `minor` / `major`',
      'print the resolved target version before any file change',
      'keep the file diff to the minimal `package.json` plus top-level `package-lock.json` version metadata bump unless a direct release blocker forces a same-PR fix',
      'guessing a version without reading `package.json`',
      'accepting `1.2.3-rc.1`',
      'accepting `1.2.3+meta`',
      'turning interactive mode into an open-ended planning conversation',
    ],
  ],
  [
    'registry-blocker.md',
    [
      '`bump-version patch`',
      'create the PR and state that merge-time CI performs the publish',
      'merge-time CI performs the publish',
      'continue checking PR status instead of treating PR creation as completion',
      'same worktree, branch, and PR',
      'stop and report external blockers such as permissions, CI publish failure, or npm registry visibility timeout',
      'merge only when checks, review, and protection rules allow it',
      'after merge, poll npm registry for the exact package name and target version inside a bounded retry window',
      'exact package name and target version',
      'bounded retry window',
      'clean up the worktree after the PR reaches terminal state',
      'local `npm publish`',
      'force-merging around review or checks',
      'claiming success before the target version is visible in npm',
    ],
  ],
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
} else {
  const skillText = readFileSync(skillPath, 'utf8');

  const skillAnchors = [
    'Read `package.json` and capture `name` plus current `version`.',
    'reject invalid semver, prerelease input, build metadata, or non-incrementing targets',
    'Run `git fetch origin`.',
    'Create a fresh worktree from `origin/main` under `.worktrees/`',
    'dispatched subagent perform all development actions there',
    'Update only the root `package.json` and root `package-lock.json` version metadata on the happy path.',
    'force a choice between explicit version input and one of `patch` / `minor` / `major` before any mutation',
    'Commit with `chore: bump version to <target>`.',
    'git rebase origin/main',
    'merge-time CI performs the actual publish',
    'Follow checks, review, and mergeability to closure',
    'no build metadata targets',
    'no local `npm publish`',
    'bounded 1-5 minute window',
  ];

  for (const anchor of skillAnchors) {
    if (!skillText.includes(anchor)) {
      failures.push(`SKILL.md is missing anchor: ${anchor}`);
    }
  }

  for (const anchor of [
    'fix it in the same worktree, branch, and PR',
    'stop and report the blocker with evidence',
    'Never broaden the task into general repository maintenance.',
  ]) {
    if (!skillText.includes(anchor)) {
      failures.push(`SKILL.md is missing blocker anchor: ${anchor}`);
    }
  }
}

if (failures.length > 0) {
  console.error('bump-version skill verification failed');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('bump-version skill scenarios verified');
