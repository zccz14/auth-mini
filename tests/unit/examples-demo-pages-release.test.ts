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
    expect(packageJson.scripts?.['demo:build:web']).toBe(
      'npm run build && npm --prefix examples/demo run build:web',
    );
  });

  it('builds embedded web assets before Rust release binaries', () => {
    const workflow = readRepoFile('.github/workflows/release.yml');
    const buildJobStart = workflow.indexOf('  build-rust-binary:');

    expect(buildJobStart).toBeGreaterThanOrEqual(0);

    const buildJob = workflow.slice(buildJobStart);
    const expectedSequence = [
      'uses: actions/setup-node@v4',
      'run: npm ci',
      'run: npm --prefix examples/demo ci',
      'run: npm run demo:build:web',
      'cargo build --manifest-path rust-backend/Cargo.toml --release',
    ];
    const sequenceIndexes = expectedSequence.map((snippet) =>
      buildJob.indexOf(snippet),
    );

    sequenceIndexes.forEach((index) => {
      expect(index).toBeGreaterThanOrEqual(0);
    });

    for (let i = 1; i < sequenceIndexes.length; i += 1) {
      expect(sequenceIndexes[i - 1]).toBeLessThan(sequenceIndexes[i]);
    }
  });

  it('builds Pages from the root entrypoint and uploads examples/demo/dist', () => {
    const workflow = readRepoFile('.github/workflows/pages.yml');
    const deployJobStart = workflow.indexOf('jobs:\n  deploy:');

    expect(deployJobStart).toBeGreaterThanOrEqual(0);

    const deployJob = workflow.slice(deployJobStart);
    const expectedSequence = [
      'run: npm ci',
      'run: npm --prefix examples/demo ci',
      'run: npm run demo:build',
      'path: examples/demo/dist',
    ];
    const sequenceIndexes = expectedSequence.map((snippet) =>
      deployJob.indexOf(snippet),
    );
    const uploadArtifactActionStart = deployJob.indexOf(
      'uses: actions/upload-pages-artifact',
    );

    sequenceIndexes.forEach((index) => {
      expect(index).toBeGreaterThanOrEqual(0);
    });
    expect(uploadArtifactActionStart).toBeGreaterThanOrEqual(0);

    for (let i = 1; i < sequenceIndexes.length; i += 1) {
      expect(sequenceIndexes[i - 1]).toBeLessThan(sequenceIndexes[i]);
    }

    const uploadArtifactStepStart = deployJob.lastIndexOf(
      '      - ',
      uploadArtifactActionStart,
    );
    const nextStepStart = deployJob.indexOf(
      '\n      - ',
      uploadArtifactActionStart + 1,
    );
    const uploadArtifactStep = deployJob.slice(
      uploadArtifactStepStart,
      nextStepStart === -1 ? undefined : nextStepStart,
    );

    expect(deployJob).toContain('uses: actions/setup-node@v4');
    expect(deployJob).toContain("node-version: '24'");
    expect(deployJob).toContain('cache: npm');
    expect(deployJob).toContain('run: npm ci');
    expect(deployJob).toContain('run: npm --prefix examples/demo ci');
    expect(deployJob).toContain('run: npm run demo:build');
    expect(uploadArtifactStep).toContain('uses: actions/upload-pages-artifact');
    expect(uploadArtifactStep).toContain('path: examples/demo/dist');
    expect(uploadArtifactStep).not.toContain(['path', 'demo'].join(': '));
  });

  it('keeps the demo Vite build on relative asset paths for project Pages', () => {
    const viteConfig = readRepoFile('examples/demo/vite.config.ts');

    expect(viteConfig).toMatch(/base:\s*['"]\.\/?['"]/);
  });

  it('documents docs as canonical and examples/demo as the live Pages source', () => {
    const readme = readRepoFile('README.md');
    const docsSectionStart = readme.indexOf('## Docs and next steps');

    expect(docsSectionStart).toBeGreaterThanOrEqual(0);

    const docsSectionEnd = readme.indexOf('\n## ', docsSectionStart + 1);
    const docsSection = readme.slice(
      docsSectionStart,
      docsSectionEnd === -1 ? undefined : docsSectionEnd,
    );

    expect(readme).toMatch(/\[Live demo\]\([^\n)]+\)/);
    expect(readme).not.toMatch(/\[`demo\/`\]\(demo\/\)/);
    expect(docsSection).toMatch(
      /`docs\/`[\s\S]*canonical static reference source/i,
    );
    expect(docsSection).toMatch(
      /`examples\/demo\/`[\s\S]*current interactive demo source/i,
    );
    expect(docsSection).toMatch(
      /`examples\/demo\/`[\s\S]*Pages publish target/i,
    );
  });

  it('documents the published demo without origin override links or /demo/ paths', () => {
    const readme = readRepoFile('README.md');
    const browserSdkDoc = readRepoFile('docs/integration/browser-sdk.md');

    expect(readme).toContain('[Live demo](https://auth-mini.zccz14.com/web/)');
    expect(readme).not.toContain('auth-origin=');
    expect(readme).not.toContain('sdk-origin=');

    expect(browserSdkDoc).toContain('relative base URL `..`');
    expect(browserSdkDoc).not.toContain('auth-origin=');
    expect(browserSdkDoc).not.toContain('sdk-origin=');
    expect(browserSdkDoc).not.toMatch(/import map/i);
    expect(browserSdkDoc).not.toContain('../dist/sdk/browser.js');
    expect(browserSdkDoc).toContain('https://auth.example.com/web/');
    expect(browserSdkDoc).not.toMatch(/https?:\/\/[^\s)`]+\/demo\/(?:\?|\b)/);
  });
});
