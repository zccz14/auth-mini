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

describe('examples demo dev helper script', () => {
  it('uses npm run build -- --watch for demo orchestration and backs it with a real sdk watch pipeline', () => {
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
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';

    const appendOutput = (chunk: Buffer) => {
      output += chunk.toString();
    };

    child.stdout.on('data', appendOutput);
    child.stderr.on('data', appendOutput);

    try {
      await waitFor(async () => {
        if (child.exitCode !== null) {
          throw new Error(`build watch exited early:\n${output}`);
        }

        try {
          await Promise.all([stat(singletonIifePath), stat(singletonDtsPath)]);
          return true;
        } catch {
          return false;
        }
      }, 20000);

      expect(child.exitCode).toBeNull();

      const initialIifeMtime = (await stat(singletonIifePath)).mtimeMs;
      const initialDtsMtime = (await stat(singletonDtsPath)).mtimeMs;

      await writeFile(singletonGlobalPath, `${originalSource}\n`, 'utf8');

      await waitFor(async () => {
        if (child.exitCode !== null) {
          throw new Error(`build watch exited before rebuild:\n${output}`);
        }

        const [nextIifeStat, nextDtsStat] = await Promise.all([
          stat(singletonIifePath),
          stat(singletonDtsPath),
        ]);

        return (
          nextIifeStat.mtimeMs > initialIifeMtime &&
          nextDtsStat.mtimeMs > initialDtsMtime
        );
      }, 20000);
    } finally {
      try {
        if (child.exitCode === null) {
          child.kill('SIGTERM');
          await waitForExit(child, 5000);
        }
      } finally {
        await writeFile(singletonGlobalPath, originalSource, 'utf8');
      }
    }
  }, 30000);
});
