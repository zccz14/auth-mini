import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readWorkflow = () =>
  readFileSync(
    resolve(process.cwd(), '.github/workflows/docker-build-pr-check.yml'),
    'utf8',
  );

describe('docker build PR check workflow', () => {
  it('builds through the runtime artifact image script for the relocated Dockerfile', () => {
    const workflow = readWorkflow();
    const prepareStep =
      'run: bash scripts/prepare-linux-runtime-artifact.sh';
    const buildStep =
      'run: SKIP_PREPARE_RUNTIME_ARTIFACT=1 bash scripts/build-runtime-image.sh auth-mini:pr-check';

    expect(workflow).toContain(prepareStep);
    expect(workflow).toContain(buildStep);
    expect(workflow.indexOf(prepareStep)).toBeLessThan(workflow.indexOf(buildStep));
    expect(workflow).not.toContain(
      'docker build --platform linux/amd64 -t auth-mini:pr-check .',
    );
  });
});
