import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('ui-web release contract', () => {
  it('keeps demo:build as the root-first release entrypoint', () => {
    const packageJson = JSON.parse(readRepoFile('package.json')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['demo:build']).toBe(
      'npm run build && npm --prefix ui-web run build',
    );
    expect(packageJson.scripts?.['demo:build:web']).toBe(
      'npm run build && npm --prefix ui-web run build:web && node scripts/build-web-assets-archive.mjs',
    );
  });

  it('builds embedded web assets before Rust release binaries', () => {
    const workflow = readRepoFile('.github/workflows/release.yml');
    const buildJobStart = workflow.indexOf('  build-rust-binary:');

    expect(buildJobStart).toBeGreaterThanOrEqual(0);

    const buildJob = workflow.slice(buildJobStart);
    const expectedSequence = [
      'uses: actions/setup-node@v4',
      'ui-web/package-lock.json',
      'run: npm ci',
      'run: npm --prefix ui-web ci',
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

  it('publishes Rust release binaries only for Linux and macOS', () => {
    const workflow = readRepoFile('.github/workflows/release.yml');

    expect(workflow).toContain('x86_64-unknown-linux-gnu');
    expect(workflow).toContain('x86_64-apple-darwin');
    expect(workflow).toContain('aarch64-apple-darwin');
    expect(workflow).toContain('Assets include macOS and Linux builds.');
    expect(workflow).toContain('remove-windows-release-assets:');
    expect(workflow).not.toContain('windows-latest');
    expect(workflow).not.toContain('x86_64-pc-windows-msvc');
    expect(workflow).not.toContain('auth-mini-windows-x86_64.zip');
    expect(workflow).not.toContain('auth-mini.exe');
  });

  it('publishes the base-aware auth-mini logo and favicon assets', () => {
    const index = readRepoFile('ui-web/index.html');

    expect(index).toContain('href="%BASE_URL%auth-mini-favicon.png"');
    expect(
      statSync(resolve(process.cwd(), 'ui-web/public/auth-mini-logo.png')).size,
    ).toBeGreaterThan(0);
    expect(
      statSync(resolve(process.cwd(), 'ui-web/public/auth-mini-favicon.png'))
        .size,
    ).toBeGreaterThan(0);
  });

  it('documents docs as canonical and ui-web as the interactive demo source', () => {
    const readme = readRepoFile('README.md');
    const docsSectionStart = readme.indexOf('## Docs and next steps');

    expect(docsSectionStart).toBeGreaterThanOrEqual(0);

    const docsSectionEnd = readme.indexOf('\n## ', docsSectionStart + 1);
    const docsSection = readme.slice(
      docsSectionStart,
      docsSectionEnd === -1 ? undefined : docsSectionEnd,
    );

    expect(readme).not.toMatch(/\[`demo\/`\]\(demo\/\)/);
    expect(docsSection).toMatch(
      /`docs\/`[\s\S]*canonical static reference source/i,
    );
    expect(docsSection).toMatch(
      /`ui-web\/`[\s\S]*current interactive demo source/i,
    );
    expect(docsSection).toContain(
      'the Rust release binary embeds it under `/web/`',
    );
  });

  it('documents the embedded demo without origin override links or /demo/ paths', () => {
    const readme = readRepoFile('README.md');
    const browserSdkDoc = readRepoFile('docs/integration/browser-sdk.md');

    expect(readme).not.toContain('auth-mini.zccz14.com');
    expect(readme).not.toContain('[Live demo]');
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
