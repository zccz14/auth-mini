import type { AuthMiniApi, SessionSnapshot } from 'auth-mini/sdk/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extendAppSdk } from './app-sdk';

const sdkMocks = vi.hoisted(() => {
  const sessionState = {
    current: {
      status: 'authenticated',
      authenticated: true,
      sessionId: 'session-1',
      accessToken: 'stale-access-token',
      refreshToken: 'refresh-token',
      receivedAt: '2026-04-11T00:00:00.000Z',
      expiresAt: '2026-04-11T01:00:00.000Z',
    } as SessionSnapshot,
  };

  const refresh = vi.fn(async () => {
    sessionState.current = {
      ...sessionState.current,
      accessToken: 'fresh-access-token',
    };

    return {
      sessionId: 'session-1',
      accessToken: 'fresh-access-token',
      refreshToken: 'refresh-token',
      receivedAt: '2026-04-11T01:00:00.000Z',
      expiresAt: '2026-04-11T02:00:00.000Z',
    };
  });

  const sdk: AuthMiniApi = {
    email: { start: vi.fn(), verify: vi.fn() },
    passkey: { register: vi.fn(), authenticate: vi.fn() },
    session: {
      getState: () => sessionState.current,
      onChange: vi.fn(() => vi.fn()),
      refresh,
      logout: vi.fn(),
      acceptRedirectCallback: vi.fn(),
      clearLocal: vi.fn(),
    },
    webauthn: { register: vi.fn(), authenticate: vi.fn() },
  };

  return { sdk, refresh, sessionState };
});

describe('extendAppSdk', () => {
  beforeEach(() => {
    vi.useRealTimers();
    sdkMocks.refresh.mockClear();
    sdkMocks.sessionState.current = {
      status: 'authenticated',
      authenticated: true,
      sessionId: 'session-1',
      accessToken: 'stale-access-token',
      refreshToken: 'refresh-token',
      receivedAt: '2026-04-11T00:00:00.000Z',
      expiresAt: '2026-04-11T01:00:00.000Z',
    };
  });

  it('refreshes and retries register when the current access token is stale', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'invalid_access_token' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'cred-1' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    vi.stubGlobal('fetch', fetch);

    try {
      const sdk = extendAppSdk(sdkMocks.sdk, 'https://auth.example.com');

      await expect(
        sdk.ed25519.register({
          name: 'Laptop signer',
          public_key: 'public-key-value',
        }),
      ).resolves.toEqual({ id: 'cred-1' });

      expect(sdkMocks.refresh).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch.mock.calls[0]?.[1]).toMatchObject({
        headers: expect.objectContaining({
          authorization: 'Bearer stale-access-token',
        }),
        body: JSON.stringify({
          name: 'Laptop signer',
          public_key: 'public-key-value',
        }),
      });
      expect(fetch.mock.calls[1]?.[1]).toMatchObject({
        headers: expect.objectContaining({
          authorization: 'Bearer fresh-access-token',
        }),
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
