import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, stat, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';

let packedInstallPromise: Promise<string> | null = null;

const npmCommand = resolveShellCommand('npm');

export async function importPackedModule(
  specifier: string,
): Promise<Record<string, unknown>> {
  const installDir = await ensurePackedSdkInstall();
  const script = `import * as mod from ${JSON.stringify(specifier)}; console.log(JSON.stringify(Object.fromEntries(Object.entries(mod).map(([key, value]) => [key, typeof value]))));`;
  const result = await runCommand(
    process.execPath,
    ['--input-type=module', '--eval', script],
    {
      cwd: installDir,
      env: { NODE_ENV: 'production' },
    },
  );

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || 'module import failed');
  }

  return JSON.parse(result.stdout.trim()) as Record<string, unknown>;
}

async function ensurePackedSdkInstall(): Promise<string> {
  if (!packedInstallPromise) {
    packedInstallPromise = preparePackedSdkInstall();
  }

  return packedInstallPromise;
}

async function preparePackedSdkInstall(): Promise<string> {
  await ensurePackedArtifactSource();

  const testTempRoot = resolve(process.cwd(), '.tmp/vitest');
  await mkdir(testTempRoot, { recursive: true });

  const stageDir = await mkdtemp(join(testTempRoot, 'auth-mini-stage-'));
  const installDir = await mkdtemp(join(testTempRoot, 'auth-mini-pack-'));

  try {
    await preparePackedWorkspace(stageDir);

    const packResult = await runCommand(npmCommand, ['pack', '--json'], {
      cwd: stageDir,
    });

    if (packResult.exitCode !== 0) {
      throw new Error(
        packResult.stderr || packResult.stdout || 'npm pack failed',
      );
    }

    const tarball = resolve(stageDir, getPackedFilename(packResult.stdout));

    try {
      const installResult = await runCommand(
        npmCommand,
        getPackedInstallArgs(installDir, tarball),
        { cwd: stageDir },
      );

      if (installResult.exitCode !== 0) {
        throw new Error(
          installResult.stderr || installResult.stdout || 'npm install failed',
        );
      }
    } finally {
      await unlink(tarball).catch(() => undefined);
    }

    return installDir;
  } catch (error) {
    packedInstallPromise = null;
    await rm(stageDir, { force: true, recursive: true });
    await rm(installDir, { force: true, recursive: true });
    throw error;
  }
}

async function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      env: { ...process.env, ...options.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolveRun({
        exitCode: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
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

async function preparePackedWorkspace(stageDir: string): Promise<void> {
  const repoRoot = process.cwd();
  const filesToCopy = [
    'LICENSE',
    'README.md',
    'package.json',
    'package-lock.json',
  ];
  const directoriesToCopy = ['dist'];

  for (const file of filesToCopy) {
    await cp(resolve(repoRoot, file), resolve(stageDir, file));
  }

  for (const directory of directoriesToCopy) {
    await cp(resolve(repoRoot, directory), resolve(stageDir, directory), {
      recursive: true,
    });
  }
}

async function ensurePackedArtifactSource(): Promise<void> {
  if (await exists(resolve(process.cwd(), 'dist/sdk/browser.js'))) {
    return;
  }

  const buildResult = await runCommand(npmCommand, ['run', 'build']);

  if (buildResult.exitCode !== 0) {
    throw new Error(resultMessage(buildResult, 'SDK build failed'));
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

function getPackedInstallArgs(installDir: string, tarball: string): string[] {
  return ['install', '--no-package-lock', '--prefix', installDir, tarball];
}

function resultMessage(
  result: { stdout: string; stderr: string },
  fallback: string,
): string {
  return result.stderr || result.stdout || fallback;
}

function resolveShellCommand(command: 'npm'): string {
  return process.platform === 'win32' ? `${command}.cmd` : command;
}
