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
    const deployJobStart = workflow.indexOf('jobs:\n  deploy:');

    expect(deployJobStart).toBeGreaterThanOrEqual(0);

    const deployJob = workflow.slice(deployJobStart);
    const uploadArtifactStepStart = deployJob.indexOf('- name: Upload demo artifact');

    expect(uploadArtifactStepStart).toBeGreaterThanOrEqual(0);

    const nextStepStart = deployJob.indexOf(
      '\n      - name:',
      uploadArtifactStepStart + 1,
    );
    const uploadArtifactStep = deployJob.slice(
      uploadArtifactStepStart,
      nextStepStart === -1 ? undefined : nextStepStart,
    );

    expect(deployJob).toContain('uses: actions/setup-node@v4');
    expect(deployJob).toContain("node-version: '20.10.0'");
    expect(deployJob).toContain('cache: npm');
    expect(deployJob).toContain('run: npm ci');
    expect(deployJob).toContain('run: npm --prefix examples/demo ci');
    expect(deployJob).toContain('run: npm run demo:build');
    expect(uploadArtifactStep).toContain('uses: actions/upload-pages-artifact');
    expect(uploadArtifactStep).toContain('path: examples/demo/dist');
    expect(uploadArtifactStep).not.toContain('path: demo');
  });

  it('documents examples/demo as the current interactive demo source', () => {
    const readme = readRepoFile('README.md');

    expect(readme).toContain('`docs/`');
    expect(readme).toContain('static reference source');
    expect(readme).toContain('`examples/demo/`');
    expect(readme).toContain('Pages publish target');
    expect(readme).not.toContain('[`demo/`](demo/) is an interactive companion');
  });
});
