import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
);
const checkGeneratedApiSdkScript = readFileSync(
  resolve(process.cwd(), 'scripts/check-generated-api-sdk.mjs'),
  'utf8',
);
const dtsConsumerTsconfig = JSON.parse(
  readFileSync(
    resolve(process.cwd(), 'tests/fixtures/sdk-dts-consumer/tsconfig.json'),
    'utf8',
  ),
);

describe('sdk api package wiring', () => {
  it('declares generator scripts and publishes the api wrapper export', () => {
    expect(packageJson.devDependencies['@hey-api/openapi-ts']).toBeTruthy();
    expect(packageJson.devDependencies.jiti).toBeTruthy();
    expect(packageJson.scripts['generate:api']).toBe('openapi-ts');
    expect(packageJson.scripts['check:generated:api']).toBe(
      'node scripts/check-generated-api-sdk.mjs',
    );
    expect(packageJson.exports['./sdk/api']).toEqual({
      import: './dist/sdk/api.js',
      types: './dist/sdk/api.d.ts',
    });
  });

  it('reuses the shared openapi generator config in the drift checker', () => {
    expect(checkGeneratedApiSdkScript).toContain('createJiti(import.meta.url)');
    expect(checkGeneratedApiSdkScript).toContain("'../openapi-ts.config.ts'");
    expect(checkGeneratedApiSdkScript).toContain('...openapiTsConfig');
    expect(checkGeneratedApiSdkScript).toContain('output: tempRoot');
  });

  it('wires the api consumer dts fixture once the wrapper exists', () => {
    expect(
      existsSync(
        resolve(
          process.cwd(),
          'tests/fixtures/sdk-dts-consumer/module-api-usage.ts',
        ),
      ),
    ).toBe(true);
    expect(dtsConsumerTsconfig.files).toContain('./module-api-usage.ts');
  });
});
