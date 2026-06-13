import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const tmpDirs: string[] = [];
const scriptPath = resolve(process.cwd(), 'scripts/check-release-version.mjs');

function createFixture(version: string) {
  const root = resolve(process.cwd(), '.tmp/release-version-tests', randomUUID());
  tmpDirs.push(root);
  mkdirSync(resolve(root, 'rust-backend'), { recursive: true });
  writeFileSync(
    resolve(root, 'package.json'),
    `${JSON.stringify({ name: 'auth-mini', version }, null, 2)}\n`,
  );
  writeFileSync(
    resolve(root, 'rust-backend/Cargo.toml'),
    `[package]\nname = "auth-mini"\nversion = "${version}"\nedition = "2021"\n`,
  );
  writeFileSync(
    resolve(root, 'rust-backend/Cargo.lock'),
    `version = 4\n\n[[package]]\nname = "auth-mini"\nversion = "${version}"\n`,
  );

  return root;
}

function runCheck(cwd: string, tag: string) {
  return spawnSync(process.execPath, [scriptPath, tag], {
    cwd,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

describe('release version check', () => {
  it('accepts a vX.Y.Z tag that matches all manifests', () => {
    const result = runCheck(createFixture('0.3.0'), 'v0.3.0');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('release version check passed: v0.3.0');
  });

  it('rejects a non-semver release tag', () => {
    const result = runCheck(createFixture('0.3.0'), 'release-0.3.0');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('release tag must match vX.Y.Z');
  });

  it('rejects a package manifest mismatch', () => {
    const result = runCheck(createFixture('0.3.0'), 'v0.3.1');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('package.json version must be 0.3.1');
  });
});
