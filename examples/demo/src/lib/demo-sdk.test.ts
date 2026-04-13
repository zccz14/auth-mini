import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDemoSdk, persistDemoSession } from './demo-sdk';

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
    };
  });

  const createBrowserSdk = vi.fn(() => ({
    email: { start: vi.fn(), verify: vi.fn() },
    passkey: { register: vi.fn(), authenticate: vi.fn() },
    me: { fetch: vi.fn() },
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

  it('persists demo sessions without a cached me payload', () => {
    const storage = window.localStorage;

    persistDemoSession(storage, 'https://auth.example.com', {
      session_id: 'session-1',
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 900,
      token_type: 'Bearer',
    });

    const persisted = JSON.parse(
      storage.getItem('auth-mini.sdk:https://auth.example.com/') ?? '',
    );

    expect(persisted).toEqual(
      expect.objectContaining({
        sessionId: 'session-1',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
    );
    expect(persisted).not.toHaveProperty('me');
  });
});
