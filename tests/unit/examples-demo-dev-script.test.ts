import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('examples demo dev helper script', () => {
  it('runs both the sdk build watch and demo dev server', () => {
    const script = readFileSync(
      resolve(process.cwd(), 'scripts/dev-examples-demo.mjs'),
      'utf8',
    );

    expect(script).toContain('npm run build -- --watch');
    expect(script).toContain('npm --prefix examples/demo run dev');
  });
});
