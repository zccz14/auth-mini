import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('examples demo dev helper script', () => {
  it('orchestrates a long-running sdk watch alongside the demo dev server', () => {
    const script = readFileSync(
      resolve(process.cwd(), 'scripts/dev-examples-demo.mjs'),
      'utf8',
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['demo:dev']).toBe(
      'node scripts/dev-examples-demo.mjs',
    );
    expect(script).toContain(
      'tsc -p tsconfig.build.json --declaration --watch --preserveWatchOutput',
    );
    expect(script).toContain('npm --prefix examples/demo run dev');
    expect(script).not.toContain('npm run build -- --watch');
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
