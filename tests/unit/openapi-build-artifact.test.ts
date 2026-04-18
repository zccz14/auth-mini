import { execFile, spawn } from 'node:child_process';
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

    const packageJsonResult = await execFileAsync(resolveShellCommand('tar'), [
      '-xOf',
      tarballPath,
      'package/package.json',
    ]);
    const packedManifest = JSON.parse(packageJsonResult.stdout) as {
      dependencies?: Record<string, string>;
    };

    expect(packedManifest.dependencies).toMatchObject({
      yaml: expect.any(String),
    });
  });

  it('copies the repo spec into dist when running in watch mode', async () => {
    await rm(distOpenApiPath, { force: true });

    const child = spawn(
      resolveShellCommand('npm'),
      ['run', 'build', '--', '--watch'],
      {
        cwd: repoRoot,
        detached: true,
        stdio: 'ignore',
      },
    );

    try {
      await waitFor(async () => {
        if (child.exitCode !== null) {
          throw new Error(
            `build watch exited early with code ${child.exitCode}`,
          );
        }

        try {
          const [repoOpenApi, distOpenApi] = await Promise.all([
            readFile(repoOpenApiPath, 'utf8'),
            readFile(distOpenApiPath, 'utf8'),
          ]);

          return distOpenApi === repoOpenApi;
        } catch {
          return false;
        }
      }, 10000);
    } finally {
      stopProcessGroup(child);
    }
  }, 15000);
});

async function waitFor(check: () => Promise<boolean>, timeoutMs: number) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await check()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`timed out after ${timeoutMs}ms`);
}

function stopProcessGroup(child: ReturnType<typeof spawn>) {
  const pid = child.pid;

  if (!pid) {
    child.kill('SIGTERM');
    return;
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !('code' in error) ||
      error.code !== 'ESRCH'
    ) {
      throw error;
    }
  }
}

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
