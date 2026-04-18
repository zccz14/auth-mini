import { execFile, spawn } from 'node:child_process';
import { cp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
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
      dependencies?: Record<string, string>;
    };

    expect(packedManifest.dependencies).toMatchObject({
      yaml: expect.any(String),
    });
  });

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

  it('loads the packaged dist spec from built runtime even when repo source differs', async () => {
    const workspaceRoot = await createStagedWorkspace();
    const repoOpenApiPath = resolve(workspaceRoot, 'openapi.yaml');
    const distOpenApiPath = resolve(workspaceRoot, 'dist/openapi.yaml');

    await execFileAsync(resolveShellCommand('npm'), ['run', 'build'], {
      cwd: workspaceRoot,
    });

    await Promise.all([
      writeFile(
        repoOpenApiPath,
        'openapi: 3.1.0\ninfo:\n  title: repo\n',
        'utf8',
      ),
      writeFile(
        distOpenApiPath,
        'openapi: 3.1.0\ninfo:\n  title: dist\n',
        'utf8',
      ),
    ]);

    const script = [
      "import { pathToFileURL } from 'node:url';",
      `const moduleUrl = pathToFileURL(${JSON.stringify(resolve(workspaceRoot, 'dist/shared/openapi.js'))}).href;`,
      'const { loadOpenApiDocument } = await import(moduleUrl);',
      'const document = await loadOpenApiDocument();',
      'process.stdout.write(JSON.stringify(document));',
    ].join(' ');

    const result = await execFileAsync(
      process.execPath,
      ['--input-type=module', '--eval', script],
      {
        cwd: workspaceRoot,
      },
    );
    const document = JSON.parse(result.stdout) as {
      yamlText: string;
      jsonDocument: { info?: { title?: string } };
    };

    expect(document.yamlText).toBe('openapi: 3.1.0\ninfo:\n  title: dist\n');
    expect(document.jsonDocument.info?.title).toBe('dist');
  });
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
    repoRoot,
    '.tmp-vitest',
    `openapi-build-artifact-${process.pid}-${Date.now()}-${stagedWorkspaces.size}`,
  );

  await mkdir(workspaceRoot, { recursive: true });
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

  stagedWorkspaces.add(workspaceRoot);
  return workspaceRoot;
}

function resolveShellCommand(command: string): string {
  return process.platform === 'win32' ? `${command}.cmd` : command;
}
