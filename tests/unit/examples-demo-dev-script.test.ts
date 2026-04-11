import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

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
});
