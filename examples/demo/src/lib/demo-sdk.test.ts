import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDemoSdk } from './demo-sdk';

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
      me: {
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
        active_sessions: [],
      },
    },
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
      me: sessionState.current.me,
    };
  });

  const createBrowserSdk = vi.fn(() => ({
    email: { start: vi.fn(), verify: vi.fn() },
    passkey: { register: vi.fn(), authenticate: vi.fn() },
    me: { get: vi.fn(() => sessionState.current.me), reload: vi.fn() },
    session: {
      getState: () => sessionState.current,
      onChange: vi.fn(() => vi.fn()),
      refresh,
      logout: vi.fn(),
    },
    webauthn: { register: vi.fn(), authenticate: vi.fn() },
  }));

  return { createBrowserSdk, refresh, sessionState };
});

vi.mock('auth-mini/sdk/browser', () => ({
  createBrowserSdk: sdkMocks.createBrowserSdk,
}));

describe('createDemoSdk', () => {
  beforeEach(() => {
    sdkMocks.createBrowserSdk.mockClear();
    sdkMocks.refresh.mockClear();
    sdkMocks.sessionState.current = {
      status: 'authenticated',
      authenticated: true,
      sessionId: 'session-1',
      accessToken: 'stale-access-token',
      refreshToken: 'refresh-token',
      receivedAt: '2026-04-11T00:00:00.000Z',
      expiresAt: '2026-04-11T01:00:00.000Z',
      me: {
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
        active_sessions: [],
      },
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
      const sdk = createDemoSdk('https://auth.example.com');

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
