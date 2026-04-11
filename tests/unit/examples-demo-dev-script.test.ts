import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const singletonGlobalPath = resolve(repoRoot, 'src/sdk/singleton-global.ts');
const singletonIifePath = resolve(repoRoot, 'dist/sdk/singleton-iife.js');
const singletonDtsPath = resolve(repoRoot, 'dist/sdk/singleton-iife.d.ts');

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

async function waitForExit(child: ReturnType<typeof spawn>, timeoutMs: number) {
  if (child.exitCode !== null) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.off('exit', handleExit);
      reject(new Error(`child did not exit within ${timeoutMs}ms`));
    }, timeoutMs);

    const handleExit = () => {
      clearTimeout(timer);
      resolve();
    };

    child.once('exit', handleExit);
  });
}

function isProcessGroupAlive(pid: number) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    return !(
      error instanceof Error &&
      'code' in error &&
      error.code === 'ESRCH'
    );
  }
}

function killProcessGroup(pid: number, signal: NodeJS.Signals) {
  try {
    process.kill(-pid, signal);
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

async function sdkArtifactsExist() {
  try {
    await Promise.all([stat(singletonIifePath), stat(singletonDtsPath)]);
    return true;
  } catch {
    return false;
  }
}

async function readArtifactMtimes() {
  const [iifeStat, dtsStat] = await Promise.all([
    stat(singletonIifePath),
    stat(singletonDtsPath),
  ]);

  return {
    iife: iifeStat.mtimeMs,
    dts: dtsStat.mtimeMs,
  };
}

async function waitForWatchStartup(
  child: ReturnType<typeof spawn>,
  getOutput: () => string,
  timeoutMs: number,
) {
  await waitFor(async () => {
    if (child.exitCode !== null) {
      throw new Error(`build watch exited early:\n${getOutput()}`);
    }

    return getOutput().length > 0 || (await sdkArtifactsExist());
  }, timeoutMs);
}

async function waitForArtifactRebuild(
  child: ReturnType<typeof spawn>,
  getOutput: () => string,
  baseline: { iife: number; dts: number },
  timeoutMs: number,
) {
  await waitFor(async () => {
    if (child.exitCode !== null) {
      throw new Error(`build watch exited before rebuild:\n${getOutput()}`);
    }

    const nextMtimes = await readArtifactMtimes();

    return nextMtimes.iife > baseline.iife && nextMtimes.dts > baseline.dts;
  }, timeoutMs);
}

async function stopChild(child: ReturnType<typeof spawn>, timeoutMs: number) {
  if (!child.pid) {
    if (child.exitCode !== null) {
      return;
    }

    child.kill('SIGTERM');
    await waitForExit(child, timeoutMs);
    return;
  }

  const waitForShutdown = async () => {
    await Promise.all([
      waitForExit(child, timeoutMs),
      waitFor(async () => !isProcessGroupAlive(child.pid!), timeoutMs),
    ]);
  };

  if (!isProcessGroupAlive(child.pid) && child.exitCode !== null) {
    return;
  }

  killProcessGroup(child.pid, 'SIGTERM');

  try {
    await waitForShutdown();
  } catch {
    if (!isProcessGroupAlive(child.pid) && child.exitCode !== null) {
      return;
    }

    killProcessGroup(child.pid, 'SIGKILL');
    await waitForShutdown();
  }
}

describe('examples demo dev helper script', () => {
  it('stops the full watch process group during cleanup', async () => {
    const child = spawn('sh', ['-c', 'sleep 30 & wait'], {
      cwd: repoRoot,
      detached: true,
      stdio: 'ignore',
    });

    try {
      await waitFor(async () => isProcessGroupAlive(child.pid!), 2000);
      await stopChild(child, 1000);
      await waitFor(async () => !isProcessGroupAlive(child.pid!), 2000);
    } finally {
      if (child.exitCode === null && isProcessGroupAlive(child.pid!)) {
        killProcessGroup(child.pid!, 'SIGKILL');
      }
    }
  });

  it('uses npm run build -- --watch for demo orchestration and backs it with a real sdk watch pipeline', () => {
    const testSource = readFileSync(new URL(import.meta.url), 'utf8');
    const legacyReadySignal = ['Watching for file', 'changes'].join(' ');
    const devScript = readFileSync(
      resolve(process.cwd(), 'scripts/dev-examples-demo.mjs'),
      'utf8',
    );
    const buildScript = readFileSync(
      resolve(process.cwd(), 'scripts/build-sdk.mjs'),
      'utf8',
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.build).toBe('node scripts/build-sdk.mjs');
    expect(packageJson.scripts?.['demo:dev']).toBe(
      'node scripts/dev-examples-demo.mjs',
    );
    expect(devScript).toContain('npm run build -- --watch');
    expect(devScript).toContain('npm --prefix examples/demo run dev');
    expect(devScript).not.toContain(
      'tsc -p tsconfig.build.json --declaration --watch --preserveWatchOutput',
    );
    expect(buildScript).toContain("process.argv.includes('--watch')");
    expect(buildScript).toContain(
      'tsc -p tsconfig.build.json --declaration --watch --preserveWatchOutput',
    );
    expect(buildScript).toContain('node dist/sdk/build-singleton-iife.js');
    expect(buildScript).toContain('node dist/sdk/build-singleton-dts.js');
    expect(testSource).not.toContain(legacyReadySignal);
  });

  it('keeps demo:typecheck scoped to the demo app only', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['demo:typecheck']).toBe(
      'npm --prefix examples/demo run typecheck',
    );
  });

  it('keeps npm run build -- --watch alive and rebuilds sdk artifacts', async () => {
    if (import.meta.url.includes('examples/demo/node_modules/auth-mini')) {
      return;
    }

    const originalSource = readFileSync(singletonGlobalPath, 'utf8');
    const child = spawn('npm', ['run', 'build', '--', '--watch'], {
      cwd: repoRoot,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';

    const appendOutput = (chunk: Buffer) => {
      output += chunk.toString();
    };

    child.stdout.on('data', appendOutput);
    child.stderr.on('data', appendOutput);

    try {
      await waitForWatchStartup(child, () => output, 20000);

      expect(child.exitCode).toBeNull();

      const watchProbes = ['watch probe 1', 'watch probe 2'];
      let rebuildError: unknown;

      for (const probe of watchProbes) {
        const baseline = await readArtifactMtimes();
        await writeFile(
          singletonGlobalPath,
          `${originalSource}\n// ${probe}`,
          'utf8',
        );

        try {
          await waitForArtifactRebuild(child, () => output, baseline, 10000);
          rebuildError = undefined;
          break;
        } catch (error) {
          rebuildError = error;
        }
      }

      if (rebuildError) {
        throw rebuildError;
      }
    } finally {
      try {
        await stopChild(child, 5000);
      } finally {
        await writeFile(singletonGlobalPath, originalSource, 'utf8');
      }
    }
  }, 30000);
});
