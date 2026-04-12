import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readPrepareScript = () =>
  readFileSync(
    resolve(process.cwd(), 'scripts/prepare-linux-runtime-artifact.sh'),
    'utf8',
  );

const readPackageJson = () =>
  JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };

describe('prepare-linux-runtime-artifact', () => {
  it('copies the build entrypoint scripts into /work/src before npm run build', () => {
    const script = readPrepareScript();
    const buildScript = readPackageJson().scripts?.build;

    expect(buildScript).toContain('scripts/build-sdk.mjs');
    expect(script).toContain('cp -R /src/src /src/sql /src/scripts /work/src/;');
    expect(script).toContain('cd /work/src;');
    expect(script.indexOf('/src/scripts')).toBeGreaterThan(-1);
    expect(script.indexOf('/src/scripts')).toBeLessThan(
      script.indexOf('npm run build'),
    );
  });
});
