import { execFile } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const repoOpenApiPath = resolve(repoRoot, 'openapi.yaml');
const distOpenApiPath = resolve(repoRoot, 'dist/openapi.yaml');
const createdTarballs = new Set<string>();

afterEach(async () => {
  await Promise.all(
    [...createdTarballs].map(async (tarballPath) => {
      await rm(tarballPath, { force: true });
      createdTarballs.delete(tarballPath);
    }),
  );
});

describe('openapi build artifact', () => {
  it('copies the repo spec into dist and includes it in the packed tarball', async () => {
    await rm(distOpenApiPath, { force: true });

    await execFileAsync(resolveShellCommand('npm'), ['run', 'build'], {
      cwd: repoRoot,
    });

    const [repoOpenApi, distOpenApi] = await Promise.all([
      readFile(repoOpenApiPath, 'utf8'),
      readFile(distOpenApiPath, 'utf8'),
    ]);

    expect(distOpenApi).toBe(repoOpenApi);

    const packResult = await execFileAsync(
      resolveShellCommand('npm'),
      ['pack', '--json'],
      { cwd: repoRoot },
    );
    const tarballPath = resolve(repoRoot, getPackedFilename(packResult.stdout));
    createdTarballs.add(tarballPath);

    const tarResult = await execFileAsync(resolveShellCommand('tar'), [
      '-tf',
      tarballPath,
    ]);

    expect(tarResult.stdout.split(/\r?\n/)).toContain(
      'package/dist/openapi.yaml',
    );
  });
});

function getPackedFilename(stdout: string): string {
  const jsonStart = stdout.indexOf('[');

  if (jsonStart === -1) {
    throw new Error(`npm pack did not return JSON output: ${stdout}`);
  }

  const parsed = JSON.parse(stdout.slice(jsonStart)) as Array<{
    filename?: string;
  }>;
  const filename = parsed[0]?.filename;

  if (!filename) {
    throw new Error(`npm pack did not return a tarball filename: ${stdout}`);
  }

  return filename;
}

function resolveShellCommand(command: string): string {
  return process.platform === 'win32' ? `${command}.cmd` : command;
}
