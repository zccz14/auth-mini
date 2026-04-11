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
    const docsSectionStart = readme.indexOf('## Docs and next steps');

    expect(docsSectionStart).toBeGreaterThanOrEqual(0);

    const docsSectionEnd = readme.indexOf('\n## ', docsSectionStart + 1);
    const docsSection = readme.slice(
      docsSectionStart,
      docsSectionEnd === -1 ? undefined : docsSectionEnd,
    );

    expect(readme).toMatch(/\[Live demo\]\([^\n)]+\)/);
    expect(docsSection).toMatch(/live demo/i);
    expect(docsSection).toMatch(/`docs\/`[^\n]*canonical static reference source/);
    expect(docsSection).not.toMatch(
      /\[`demo\/`\]\(demo\/\)\s+is an interactive companion/i,
    );
    expect(docsSection).toMatch(
      /`docs\/`[\s\S]*`examples\/demo\/`[\s\S]*current interactive demo source[\s\S]*(live demo|Pages publish target)/i,
    );
  });
});
