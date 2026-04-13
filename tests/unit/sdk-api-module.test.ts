import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
);

describe('sdk api package wiring', () => {
  it('declares generator scripts and public export', () => {
    expect(packageJson.devDependencies['@hey-api/openapi-ts']).toBeTruthy();
    expect(packageJson.scripts['generate:api']).toBe('openapi-ts');
    expect(packageJson.scripts['check:generated:api']).toBe(
      'node scripts/check-generated-api-sdk.mjs',
    );
    expect(packageJson.exports['./sdk/api']).toEqual({
      types: './dist/sdk/api.d.ts',
      import: './dist/sdk/api.js',
    });
  });
});
