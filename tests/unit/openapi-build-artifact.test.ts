import { execFile, spawn } from 'node:child_process';
import { cp, mkdir, readFile, rm, rmdir, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const stagedWorkspaceRoot = resolve(repoRoot, '.tmp-vitest');
const createdTarballs = new Set<string>();
const stagedWorkspaces = new Set<string>();

afterEach(async () => {
  await Promise.all(
    [...createdTarballs].map(async (tarballPath) => {
      await rm(tarballPath, { force: true });
      createdTarballs.delete(tarballPath);
    }),
  );

  await Promise.all(
    [...stagedWorkspaces].map(async (workspacePath) => {
      await rm(workspacePath, { force: true, recursive: true });
      stagedWorkspaces.delete(workspacePath);
    }),
  );

  await rmdir(stagedWorkspaceRoot).catch((error: unknown) => {
    if (
      error instanceof Error &&
      'code' in error &&
      (error.code === 'ENOENT' || error.code === 'ENOTEMPTY')
    ) {
      return;
    }

    throw error;
  });
});

describe('openapi build artifact', () => {
  it('copies the repo spec into dist and includes it in the packed tarball', async () => {
    const workspaceRoot = await createStagedWorkspace();
    const repoOpenApiPath = resolve(workspaceRoot, 'openapi.yaml');
    const distOpenApiPath = resolve(workspaceRoot, 'dist/openapi.yaml');

    await rm(distOpenApiPath, { force: true });

    await execFileAsync(resolveShellCommand('npm'), ['run', 'build'], {
      cwd: workspaceRoot,
    });

    const [repoOpenApi, distOpenApi] = await Promise.all([
      readFile(repoOpenApiPath, 'utf8'),
      readFile(distOpenApiPath, 'utf8'),
    ]);

    expect(distOpenApi).toBe(repoOpenApi);

    const packResult = await execFileAsync(
      resolveShellCommand('npm'),
      ['pack', '--json'],
      { cwd: workspaceRoot },
    );
    const tarballPath = resolve(
      workspaceRoot,
      getPackedFilename(packResult.stdout),
    );
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
      bin?: unknown;
      dependencies?: Record<string, string>;
      exports?: Record<string, unknown>;
      oclif?: unknown;
    };

    expect(packedManifest.bin).toBeUndefined();
    expect(packedManifest.oclif).toBeUndefined();
    expect(packedManifest.dependencies).toEqual({});
    expect(Object.keys(packedManifest.exports ?? {}).sort()).toEqual([
      './sdk/api',
      './sdk/browser',
      './sdk/device',
    ]);
  }, 15000);

  it('copies the repo spec into dist when running in watch mode', async () => {
    const workspaceRoot = await createStagedWorkspace();
    const repoOpenApiPath = resolve(workspaceRoot, 'openapi.yaml');
    const distOpenApiPath = resolve(workspaceRoot, 'dist/openapi.yaml');

    await rm(distOpenApiPath, { force: true });

    const child = spawn(
      resolveShellCommand('npm'),
      ['run', 'build', '--', '--watch'],
      {
        cwd: workspaceRoot,
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

async function createStagedWorkspace(): Promise<string> {
  const workspaceRoot = resolve(
    stagedWorkspaceRoot,
    `openapi-build-artifact-${process.pid}-${Date.now()}-${stagedWorkspaces.size}`,
  );

  await mkdir(workspaceRoot, { recursive: true });
  stagedWorkspaces.add(workspaceRoot);
  await mkdir(resolve(workspaceRoot, 'dist'), { recursive: true });

  const filesToCopy = [
    'LICENSE',
    'README.md',
    'openapi.yaml',
    'openapi-ts.config.ts',
    'package-lock.json',
    'package.json',
    'tsconfig.build.json',
    'tsconfig.json',
  ];
  const directoriesToCopy = ['scripts', 'src'];

  await Promise.all([
    ...filesToCopy.map((filePath) =>
      cp(resolve(repoRoot, filePath), resolve(workspaceRoot, filePath)),
    ),
    ...directoriesToCopy.map((directoryPath) =>
      cp(
        resolve(repoRoot, directoryPath),
        resolve(workspaceRoot, directoryPath),
        {
          recursive: true,
        },
      ),
    ),
    symlink(
      resolve(repoRoot, 'node_modules'),
      resolve(workspaceRoot, 'node_modules'),
    ),
  ]);

  return workspaceRoot;
}

function resolveShellCommand(command: string): string {
  return process.platform === 'win32' ? `${command}.cmd` : command;
}
