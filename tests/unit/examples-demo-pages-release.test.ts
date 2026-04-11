import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('examples demo Pages release contract', () => {
  it('keeps demo:build as the root-first release entrypoint', () => {
    const packageJson = JSON.parse(readRepoFile('package.json')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['demo:build']).toBe(
      'npm run build && npm --prefix examples/demo run build',
    );
  });

  it('builds Pages from the root entrypoint and uploads examples/demo/dist', () => {
    const workflow = readRepoFile('.github/workflows/pages.yml');

    expect(workflow).toContain('uses: actions/setup-node@v4');
    expect(workflow).toContain("node-version: '20.10.0'");
    expect(workflow).toContain('cache: npm');
    expect(workflow).toContain('run: npm ci');
    expect(workflow).toContain('run: npm --prefix examples/demo ci');
    expect(workflow).toContain('run: npm run demo:build');
    expect(workflow).toContain('path: examples/demo/dist');
    expect(workflow).not.toContain('path: demo');
  });

  it('documents examples/demo as the current interactive demo source', () => {
    const readme = readRepoFile('README.md');

    expect(readme).toContain(
      '[Live demo](https://auth-mini.zccz14.com/?sdk-origin=https%3A%2F%2Fauth.zccz14.com)',
    );
    expect(readme).toContain('`docs/` is the canonical static reference source.');
    expect(readme).toContain(
      '`examples/demo/` is the current interactive demo source and Pages publish target.',
    );
    expect(readme).not.toContain('[`demo/`](demo/) is an interactive companion');
  });
});
