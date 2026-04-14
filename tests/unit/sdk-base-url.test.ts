import { describe, expect, it } from 'vitest';
import {
  createBrowserSdkInternal,
  renderSingletonIifeSource,
} from '../../src/sdk/singleton-entry.js';
import { executeServedSdk, fakeStorage } from '../helpers/sdk.js';

describe('sdk base url inference', () => {
  it('fails served sdk bootstrap clearly when the current script url cannot be determined', () => {
    expect(() =>
      executeServedSdk(renderSingletonIifeSource(), { currentScriptSrc: null }),
    ).toThrow(
      'sdk_init_failed',
    );
  });

  it('fails direct browser sdk creation when baseUrl is omitted', () => {
    expect(() =>
      createBrowserSdkInternal(undefined as never, { storage: fakeStorage() }),
    ).toThrow('sdk_init_failed: Cannot determine SDK base URL');
  });

  it('keeps proxy path prefixes when the served singleton infers its base url', async () => {
    const fetch = async (input: URL | RequestInfo) => {
      const requestUrl = input instanceof URL ? input : new URL(String(input));

      return new Response(JSON.stringify({ href: requestUrl.href }), {
        headers: { 'content-type': 'application/json' },
      });
    };
    const windowObject = executeServedSdk(renderSingletonIifeSource(), {
      currentScriptSrc: 'https://app.example.com/api/sdk/singleton-iife.js',
      fetch,
      storage: fakeStorage(),
    });

    await expect(
      windowObject.AuthMini.email.start({ email: 'user@example.com' }),
    ).resolves.toEqual({
      href: 'https://app.example.com/api/email/start',
    });
  });

  it('does not expose the legacy internal factory export', async () => {
    const sdkModule = await import('../../src/sdk/singleton-entry.js');
    const legacyFactoryExport = ['create', 'Mini', 'Auth', 'Internal'].join('');

    expect(sdkModule).not.toHaveProperty(legacyFactoryExport);
  });
});
