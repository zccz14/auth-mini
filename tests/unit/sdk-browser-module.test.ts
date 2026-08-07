import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createBrowserSdk } from '../../src/sdk/browser.js';
import type { AuthMiniApi } from '../../src/sdk/types.js';
import {
  fakeStorage,
  jsonResponse,
  seedBrowserSdkStorage,
} from '../helpers/sdk.js';

describe('browser module sdk', () => {
  it('preserves base-path prefixes in browser sdk requests without window side effects', async () => {
    const storage = fakeStorage();
    const fetch = vi.fn<typeof globalThis.fetch>(async (...args) => {
      void args;
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('localStorage', storage);

    const sdk = createBrowserSdk('https://sdk.example.test:9443/auth/base');

    try {
      expect(typeof sdk.email.start).toBe('function');
      expect(typeof sdk.session.onChange).toBe('function');
      expect(sdk).not.toHaveProperty('me');
      expect('AuthMini' in globalThis).toBe(false);

      await expect(
        sdk.email.start({ email: 'user@example.com' }),
      ).resolves.toEqual({ ok: true });

      expect(fetch).toHaveBeenCalledTimes(1);

      const firstCall = fetch.mock.calls[0];

      expect(firstCall).toBeDefined();
      if (!firstCall) {
        throw new Error('expected fetch to be called');
      }

      const [requestUrl, requestInit] = firstCall;
      const normalizedRequestUrl =
        requestUrl instanceof URL ? requestUrl : new URL(String(requestUrl));

      expect(requestUrl).toBeInstanceOf(URL);
      expect(normalizedRequestUrl.href).toBe(
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
      expect(
        fetch.mock.calls.map(([input]) => new URL(String(input)).pathname),
      ).not.toContain('/me');

      fetch.mockClear();

      const secondSdk = createBrowserSdk('https://b.example.test/auth');
      await (secondSdk as AuthMiniApi & { ready: Promise<void> }).ready;

      expect(fetch).not.toHaveBeenCalled();
      expect(secondSdk.session.getState().status).toBe('anonymous');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('clears a browser session locally without invalidating it on the server', async () => {
    const storage = fakeStorage();
    const fetch = vi.fn(async () => jsonResponse({ ok: true }));
    seedBrowserSdkStorage(storage, 'https://auth.example.com', {
      sessionId: 'session-external',
      accessToken: 'access-external',
      refreshToken: 'refresh-external',
      receivedAt: '2036-04-03T00:00:00.000Z',
      expiresAt: '2036-04-03T00:15:00.000Z',
    });
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('localStorage', storage);

    try {
      const sdk = createBrowserSdk('https://auth.example.com');

      sdk.session.clearLocal();

      expect(sdk.session.getState()).toMatchObject({
        status: 'anonymous',
        sessionId: null,
      });
      const recovered = createBrowserSdk('https://auth.example.com');
      await (recovered as AuthMiniApi & { ready: Promise<void> }).ready;
      expect(recovered.session.getState().status).toBe('anonymous');
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('browser startup recovery keeps token-only state without requesting /me', async () => {
    const storage = fakeStorage();

    seedBrowserSdkStorage(storage, 'https://auth.example.com', {
      sessionId: 'session-1',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      receivedAt: '2036-04-03T00:00:00.000Z',
      expiresAt: '2036-04-03T00:15:00.000Z',
    });
    const fetch = vi.fn(async (input: string | URL) => {
      new URL(String(input));

      return jsonResponse({ error: 'unexpected' }, 500);
    });

    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('localStorage', storage);

    try {
      const sdk = createBrowserSdk(
        'https://auth.example.com',
      ) as AuthMiniApi & {
        ready: Promise<void>;
      };
      const ready = sdk.ready;

      await expect(ready).resolves.toBeUndefined();
      expect(sdk.session.getState()).toMatchObject({
        status: 'authenticated',
        authenticated: true,
        sessionId: 'session-1',
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      });
      expect(sdk.session.getState()).not.toHaveProperty('me');
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('refreshes browser sessions ten seconds before expiry and reschedules', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-03T00:00:00.000Z'));

    const storage = fakeStorage();
    seedBrowserSdkStorage(storage, 'https://auth.example.com', {
      sessionId: 'session-1',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      receivedAt: '2026-04-03T00:00:00.000Z',
      expiresAt: '2026-04-03T00:00:30.000Z',
    });
    let refreshCount = 0;
    const fetch = vi.fn(async (input: string | URL) => {
      const url = new URL(String(input));
      if (url.pathname === '/session/refresh') {
        refreshCount += 1;
        return jsonResponse({
          session_id: 'session-1',
          access_token: `access-${refreshCount + 1}`,
          refresh_token: `refresh-${refreshCount + 1}`,
          expires_in: 30,
        });
      }
      return jsonResponse({ error: 'unexpected' }, 500);
    });

    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('localStorage', storage);

    try {
      const sdk = createBrowserSdk(
        'https://auth.example.com',
      ) as AuthMiniApi & { ready: Promise<void> };
      await sdk.ready;

      await vi.advanceTimersByTimeAsync(19_999);
      expect(fetch).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(sdk.session.getState()).toMatchObject({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      });

      await vi.advanceTimersByTimeAsync(19_999);
      expect(fetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('stops browser background refresh after local session clear', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-03T00:00:00.000Z'));

    const storage = fakeStorage();
    seedBrowserSdkStorage(storage, 'https://auth.example.com', {
      sessionId: 'session-1',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      receivedAt: '2026-04-03T00:00:00.000Z',
      expiresAt: '2026-04-03T00:00:30.000Z',
    });
    const fetch = vi.fn(async () => jsonResponse({ ok: true }));

    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('localStorage', storage);

    try {
      const sdk = createBrowserSdk(
        'https://auth.example.com',
      ) as AuthMiniApi & { ready: Promise<void> };
      await sdk.ready;
      sdk.session.clearLocal();

      await vi.advanceTimersByTimeAsync(30_000);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('retries browser background refresh after a transient failure', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-03T00:00:00.000Z'));

    const storage = fakeStorage();
    seedBrowserSdkStorage(storage, 'https://auth.example.com', {
      sessionId: 'session-1',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      receivedAt: '2026-04-03T00:00:00.000Z',
      expiresAt: '2026-04-03T00:00:30.000Z',
    });
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse({ error: 'internal_error' }, 500))
      .mockResolvedValueOnce(
        jsonResponse({
          session_id: 'session-1',
          access_token: 'access-2',
          refresh_token: 'refresh-2',
          expires_in: 30,
        }),
      );

    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('localStorage', storage);

    try {
      const sdk = createBrowserSdk(
        'https://auth.example.com',
      ) as AuthMiniApi & { ready: Promise<void> };
      await sdk.ready;

      await vi.advanceTimersByTimeAsync(20_000);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(sdk.session.getState().status).toBe('authenticated');

      await vi.advanceTimersByTimeAsync(9_999);
      expect(fetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(sdk.session.getState()).toMatchObject({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      });
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('coordinates browser background refresh for same-tab SDK instances', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-03T00:00:00.000Z'));

    const storage = fakeStorage();
    seedBrowserSdkStorage(storage, 'https://auth.example.com', {
      sessionId: 'session-1',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      receivedAt: '2026-04-03T00:00:00.000Z',
      expiresAt: '2026-04-03T00:00:30.000Z',
    });
    const fetch = vi.fn(async () =>
      jsonResponse({
        session_id: 'session-1',
        access_token: 'access-2',
        refresh_token: 'refresh-2',
        expires_in: 30,
      }),
    );

    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('localStorage', storage);

    try {
      const first = createBrowserSdk(
        'https://auth.example.com',
      ) as AuthMiniApi & { ready: Promise<void> };
      await first.ready;
      const second = createBrowserSdk(
        'https://auth.example.com',
      ) as AuthMiniApi & { ready: Promise<void> };
      await second.ready;

      await vi.advanceTimersByTimeAsync(20_000);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(second.session.getState()).toMatchObject({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      });
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('adopts a validated redirect callback into Browser SDK persistence', async () => {
    const storage = fakeStorage();
    const fetch = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('localStorage', storage);

    try {
      const sdk = createBrowserSdk('https://auth.example.com');

      await expect(
        sdk.session.acceptRedirectCallback({
          access_token: 'access-token',
          session_id: 'session-id',
          refresh_token: 'refresh-token',
          expires_in: 900,
        }),
      ).resolves.toMatchObject({
        sessionId: 'session-id',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      expect(sdk.session.getState()).toMatchObject({
        status: 'authenticated',
        sessionId: 'session-id',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(fetch).not.toHaveBeenCalled();
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
      /type\s+BrowserSdkFactoryOptions[\s\S]*from '\.\/browser-runtime\.js'/,
    );
    expect(source).toContain('createBrowserSdkInternal');
    expect(source).toContain("from './types.js'");
    expect(source).not.toContain('BrowserSdkFactoryOptions');
    expect(source).toContain(
      'export function createBrowserSdk(serverBaseUrl: string): AuthMiniApi',
    );
  });

  it('keeps shared test helpers free of served singleton utilities', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'tests/helpers/sdk.ts'),
      'utf8',
    );

    expect(source).not.toContain('executeServedSdk');
  });

  it('does not reference the removed legacy bundle name in this test file', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'tests/unit/sdk-browser-module.test.ts'),
      'utf8',
    );

    const forbidden = ['singleton', 'iife.js'].join('-');

    expect(source).not.toContain(forbidden);
  });

  it('does not export createDeviceSdk from the browser module', () => {
    expect(createBrowserSdk).toBeTypeOf('function');
    expect(
      readFileSync(resolve(process.cwd(), 'src/sdk/browser.ts'), 'utf8'),
    ).not.toContain('createDeviceSdk');
  });
});
