import { describe, expect, it } from 'vitest';
import { createBrowserSdkInternal } from '../../src/sdk/browser-runtime.js';
import { fakeStorage } from '../helpers/sdk.js';

describe('sdk base url inference', () => {
  it('fails direct browser sdk creation when baseUrl is omitted', () => {
    expect(() =>
      createBrowserSdkInternal(undefined as never, { storage: fakeStorage() }),
    ).toThrow('sdk_init_failed: Cannot determine SDK base URL');
  });
});
