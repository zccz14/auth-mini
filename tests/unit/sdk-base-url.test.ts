import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createBrowserSdkInternal } from '../../src/sdk/browser-runtime.js';
import { fakeStorage } from '../helpers/sdk.js';

describe('sdk base url inference', () => {
  it('keeps browser runtime extracted from singleton entry', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../../src/sdk/browser-runtime.ts'),
      'utf8',
    );

    expect(source).not.toContain("from './singleton-entry.js'");
  });

  it('fails direct browser sdk creation when baseUrl is omitted', () => {
    expect(() =>
      createBrowserSdkInternal(undefined as never, { storage: fakeStorage() }),
    ).toThrow('sdk_init_failed: Cannot determine SDK base URL');
  });
});
