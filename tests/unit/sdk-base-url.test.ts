import { describe, expect, it } from 'vitest';
import { inferBaseUrl } from '../../src/sdk/base-url.js';
import { bootstrapSingletonSdk } from '../../src/sdk/singleton-entry.js';

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
});
