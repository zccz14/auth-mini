import { describe, expect, it } from 'vitest';
import { inferBaseUrl } from '../../src/sdk/base-url.js';
import {
  bootstrapSingletonSdk,
  createSingletonSdk,
} from '../../src/sdk/singleton-entry.js';
import { fakeStorage } from '../helpers/sdk.js';

describe('sdk base url inference', () => {
  it('infers origin base path from /sdk/singleton-iife.js', () => {
    expect(inferBaseUrl('https://auth.example.com/sdk/singleton-iife.js')).toBe(
      'https://auth.example.com',
    );
  });

  it('preserves same-origin proxy prefixes', () => {
    expect(
      inferBaseUrl('https://app.example.com/api/sdk/singleton-iife.js'),
    ).toBe('https://app.example.com/api');
  });

  it('throws when the script path does not end with /sdk/singleton-iife.js', () => {
    expect(() => inferBaseUrl('https://app.example.com/app.js')).toThrow(
      'sdk_init_failed',
    );
  });

  it('fails bootstrap clearly when the current script url cannot be determined', () => {
    expect(() => bootstrapSingletonSdk({ currentScript: null })).toThrow(
      'sdk_init_failed',
    );
  });

  it('fails direct singleton creation when baseUrl is omitted', () => {
    expect(() => createSingletonSdk({ storage: fakeStorage() })).toThrow(
      'sdk_init_failed: Cannot determine SDK base URL',
    );
  });

  it('does not expose the legacy internal factory export', async () => {
    const sdkModule = await import('../../src/sdk/singleton-entry.js');
    const legacyFactoryExport = ['create', 'Mini', 'Auth', 'Internal'].join('');

    expect(sdkModule).not.toHaveProperty(legacyFactoryExport);
  });
});
