import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createBrowserSdk } from '../../src/sdk/browser.js';
import type { AuthMiniApi } from '../../src/sdk/types.js';
import { fakeStorage, jsonResponse } from '../helpers/sdk.js';

describe('browser module sdk', () => {
  it('preserves base-path prefixes in browser sdk requests without window side effects', async () => {
    const storage = fakeStorage();
    const fetch = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('localStorage', storage);

    const sdk = createBrowserSdk('https://sdk.example.test:9443/auth/base');

    try {
      expect(typeof sdk.email.start).toBe('function');
      expect(typeof sdk.session.onChange).toBe('function');
      expect('AuthMini' in globalThis).toBe(false);

      await expect(
        sdk.email.start({ email: 'user@example.com' }),
      ).resolves.toEqual({ ok: true });

      expect(fetch).toHaveBeenCalledTimes(1);

      const [requestUrl, requestInit] = fetch.mock.calls[0] ?? [];

      expect(requestUrl).toBeInstanceOf(URL);
      expect(requestUrl.href).toBe(
        'https://sdk.example.test:9443/auth/base/email/start',
      );
      expect(requestInit).toMatchObject({
        method: 'POST',
      });
      expect('AuthMini' in globalThis).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps persisted browser session state isolated per base URL', async () => {
    const storage = fakeStorage();
    const fetch = vi.fn(async (input: URL | RequestInfo) => {
      const requestUrl = input instanceof URL ? input : new URL(String(input));

      if (requestUrl.pathname.endsWith('/email/verify')) {
        return jsonResponse({
          session_id: 'session-a',
          access_token: 'access-a',
          refresh_token: 'refresh-a',
          expires_in: 3600,
          me: {
            user_id: 'user-a',
            email: 'user@example.com',
            webauthn_credentials: [],
            active_sessions: [],
          },
        });
      }

      if (requestUrl.pathname.endsWith('/session/refresh')) {
        return jsonResponse({
          session_id: 'session-b',
          access_token: 'access-b',
          refresh_token: 'refresh-b',
          expires_in: 3600,
        });
      }

      if (requestUrl.pathname.endsWith('/me')) {
        return jsonResponse({
          user_id: 'user-a',
          email: 'user@example.com',
          webauthn_credentials: [],
          active_sessions: [],
        });
      }

      return jsonResponse({ ok: true });
    });

    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('localStorage', storage);

    try {
      const firstSdk = createBrowserSdk('https://a.example.test/auth');

      await firstSdk.email.verify({
        email: 'user@example.com',
        code: '123456',
      });

      fetch.mockClear();

      const secondSdk = createBrowserSdk('https://b.example.test/auth');
      await (secondSdk as AuthMiniApi & { ready: Promise<void> }).ready;

      expect(fetch).not.toHaveBeenCalled();
      expect(secondSdk.session.getState().status).toBe('anonymous');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps the browser module declaration free of singleton global typings', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/sdk/browser.ts'),
      'utf8',
    );

    expect(source).not.toMatch(
      /type\s+BrowserSdkFactoryOptions[\s\S]*from '\.\/singleton-entry\.js'/,
    );
    expect(source).toContain('createBrowserSdkInternal');
    expect(source).toContain("from './types.js'");
    expect(source).not.toContain('BrowserSdkFactoryOptions');
    expect(source).toContain(
      'export function createBrowserSdk(serverBaseUrl: string): AuthMiniApi',
    );
  });
});
