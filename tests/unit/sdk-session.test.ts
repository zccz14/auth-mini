import { describe, expect, it, vi } from 'vitest';
import {
  countLogoutCalls,
  countRefreshCalls,
  createAuthMiniForTest,
  createSharedStorageHarness,
  fakeAlmostExpiredStorage,
  fakeAuthenticatedStorage,
  fakeAuthenticatedStorageWithMe,
  jsonResponse,
} from '../helpers/sdk.js';

describe('sdk session flows', () => {
  it('starts in recovering and settles authenticated after boot recovery', async () => {
    const sdk = createAuthMiniForTest({
      autoRecover: true,
      storage: fakeAuthenticatedStorage({
        accessToken: null,
      }),
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            session_id: 's2',
            access_token: 'a2',
            refresh_token: 'r2',
            expires_in: 900,
            token_type: 'Bearer',
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            user_id: 'u1',
            email: 'u@example.com',
            webauthn_credentials: [],
            ed25519_credentials: [],
            active_sessions: [],
          }),
        ),
    });

    expect(sdk.session.getState().status).toBe('recovering');
    await sdk.ready;
    expect(sdk.session.getState().status).toBe('authenticated');
  });

  it('shares one in-flight refresh across concurrent authenticated calls', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          session_id: 's2',
          access_token: 'a2',
          refresh_token: 'r2',
          expires_in: 900,
          token_type: 'Bearer',
        }),
      )
      .mockResolvedValueOnce(
          jsonResponse({
            user_id: 'u1',
            email: 'u@example.com',
            webauthn_credentials: [],
            ed25519_credentials: [],
            active_sessions: [],
          }),
        );
    const sdk = createAuthMiniForTest({
      fetch,
      now: () => Date.parse('2026-04-03T00:02:00.000Z'),
      storage: fakeAuthenticatedStorage({
        receivedAt: '2026-04-03T00:00:00.000Z',
        expiresAt: '2026-04-03T00:03:00.000Z',
      }),
    });

    await Promise.all([sdk.me.reload(), sdk.me.reload()]);
    expect(countRefreshCalls(fetch)).toBe(1);
  });

  it('refresh success also reloads me', async () => {
    const sdk = createAuthMiniForTest({
      storage: fakeAuthenticatedStorage(),
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            session_id: 's2',
            access_token: 'a2',
            refresh_token: 'r2',
            expires_in: 900,
            token_type: 'Bearer',
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            user_id: 'u1',
            email: 'u@example.com',
            webauthn_credentials: [],
            ed25519_credentials: [],
            active_sessions: [],
          }),
        ),
    });

    await sdk.session.refresh();
    expect(sdk.me.get()?.email).toBe('u@example.com');
  });

  it('preserves authenticated state when refresh fails with a transient 5xx error', async () => {
    const sdk = createAuthMiniForTest({
      storage: fakeAuthenticatedStorageWithMe(),
      fetch: vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ error: 'internal_error' }, 500)),
    });

    await expect(sdk.session.refresh()).rejects.toMatchObject({
      error: 'internal_error',
    });
    expect(sdk.session.getState()).toMatchObject({
      status: 'recovering',
      refreshToken: 'refresh-token',
      accessToken: 'access-token',
    });
    expect(sdk.me.get()?.email).toBe('u@example.com');
  });

  it('me.get returns cached state synchronously', () => {
    const sdk = createAuthMiniForTest({
      storage: fakeAuthenticatedStorageWithMe(),
    });

    expect(sdk.me.get()?.email).toBe('u@example.com');
  });

  it('me.reload fetches and updates cached me', async () => {
    const sdk = createAuthMiniForTest({
      storage: fakeAuthenticatedStorageWithMe(),
      fetch: vi.fn().mockResolvedValueOnce(
          jsonResponse({
            user_id: 'u1',
            email: 'updated@example.com',
            webauthn_credentials: [],
            ed25519_credentials: [],
            active_sessions: [],
          }),
        ),
    });

    const me = await sdk.me.reload();
    expect(me.email).toBe('updated@example.com');
    expect(sdk.me.get()?.email).toBe('updated@example.com');
  });

  it('rejects /me payloads that omit ed25519_credentials', async () => {
    const sdk = createAuthMiniForTest({
      storage: fakeAuthenticatedStorageWithMe(),
      fetch: vi.fn().mockResolvedValueOnce(
        jsonResponse({
          user_id: 'u1',
          email: 'updated@example.com',
          webauthn_credentials: [],
          active_sessions: [],
        }),
      ),
    });

    await expect(sdk.me.reload()).rejects.toMatchObject({
      error: 'request_failed',
    });
  });

  it('rejects /me payloads that omit active_sessions', async () => {
    const sdk = createAuthMiniForTest({
      storage: fakeAuthenticatedStorageWithMe(),
      fetch: vi.fn().mockResolvedValueOnce(
        jsonResponse({
          user_id: 'u1',
          email: 'updated@example.com',
          webauthn_credentials: [],
          ed25519_credentials: [],
        }),
      ),
    });

    await expect(sdk.me.reload()).rejects.toMatchObject({
      error: 'request_failed',
    });
  });

  it('retains ed25519 credentials on cached me state after reload', async () => {
    const sdk = createAuthMiniForTest({
      storage: fakeAuthenticatedStorageWithMe(),
      fetch: vi.fn().mockResolvedValueOnce(
        jsonResponse({
          user_id: 'u1',
          email: 'updated@example.com',
          webauthn_credentials: [],
          ed25519_credentials: [
            {
              id: 'cred-1',
              name: 'Laptop signer',
              public_key: 'public-key',
              created_at: '2026-04-12T00:00:00.000Z',
              last_used_at: null,
            },
          ],
          active_sessions: [],
        }),
      ),
    });

    const me = (await sdk.me.reload()) as {
      ed25519_credentials?: Array<{ id: string }>;
    };

    expect(me.ed25519_credentials).toEqual([
      expect.objectContaining({ id: 'cred-1' }),
    ]);
    expect(
      (sdk.me.get() as { ed25519_credentials?: Array<{ id: string }> } | null)
        ?.ed25519_credentials,
    ).toEqual([expect.objectContaining({ id: 'cred-1' })]);
    expect(
      (
        sdk.session.getState().me as {
          ed25519_credentials?: Array<{ id: string }>;
        } | null
      )?.ed25519_credentials,
    ).toEqual([expect.objectContaining({ id: 'cred-1' })]);
  });

  it('preserves recoverable state when refresh succeeds but me reload fails transiently', async () => {
    const sdk = createAuthMiniForTest({
      storage: fakeAuthenticatedStorage(),
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            session_id: 's2',
            access_token: 'a2',
            refresh_token: 'r2',
            expires_in: 900,
            token_type: 'Bearer',
          }),
        )
        .mockResolvedValueOnce(jsonResponse({ error: 'internal_error' }, 500)),
    });

    await expect(sdk.session.refresh()).rejects.toMatchObject({
      error: 'internal_error',
    });
    expect(sdk.session.getState()).toMatchObject({
      status: 'recovering',
      accessToken: 'a2',
      refreshToken: 'r2',
    });
  });

  it('clears state and emits anonymous when refresh token is rejected', async () => {
    const sdk = createAuthMiniForTest({
      storage: fakeAuthenticatedStorage(),
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ error: 'invalid_refresh_token' }, 401),
        ),
    });
    const listener = vi.fn();

    sdk.session.onChange(listener);
    await expect(sdk.session.refresh()).rejects.toMatchObject({
      error: 'invalid_refresh_token',
    });
    expect(sdk.session.getState().status).toBe('anonymous');
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'anonymous' }),
    );
  });

  it('keeps the loser recovering until shared storage adopts the winner refresh', async () => {
    const shared = createSharedStorageHarness({
      sessionId: 'session-1',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      receivedAt: '2026-04-03T00:00:00.000Z',
      expiresAt: '2026-04-03T00:03:00.000Z',
      me: null,
    });
    const loser = shared.createSdk({
      recoveryTimeoutMs: 100,
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ error: 'session_superseded' }, 401),
        ),
    });
    const winner = shared.createSdk({
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            session_id: 'session-1',
            access_token: 'access-2',
            refresh_token: 'refresh-2',
            expires_in: 900,
            token_type: 'Bearer',
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            user_id: 'u1',
            email: 'u@example.com',
            webauthn_credentials: [],
            ed25519_credentials: [],
            active_sessions: [],
          }),
        ),
      now: () => Date.parse('2026-04-03T00:02:00.000Z'),
    });

    await expect(loser.session.refresh()).rejects.toMatchObject({
      error: 'session_superseded',
    });
    expect(loser.session.getState()).toMatchObject({
      status: 'recovering',
      sessionId: 'session-1',
      refreshToken: 'refresh-1',
    });

    await winner.session.refresh();
    shared.dispatchStorageUpdate();

    expect(loser.session.getState()).toMatchObject({
      status: 'authenticated',
      sessionId: 'session-1',
      refreshToken: 'refresh-2',
    });
  });

  it('timeout path clears only the loser in-memory state after superseded refresh', async () => {
    vi.useFakeTimers();

    try {
      const shared = createSharedStorageHarness({
        sessionId: 'session-1',
        accessToken: null,
        refreshToken: 'refresh-1',
        receivedAt: '2026-04-03T00:00:00.000Z',
        expiresAt: '2026-04-03T00:03:00.000Z',
        me: null,
      });
      const loser = shared.createSdk({
        recoveryTimeoutMs: 25,
        fetch: vi
          .fn()
          .mockResolvedValueOnce(
            jsonResponse({ error: 'session_superseded' }, 401),
          ),
      });

      await expect(loser.session.refresh()).rejects.toMatchObject({
        error: 'session_superseded',
      });
      await vi.advanceTimersByTimeAsync(25);

      expect(loser.session.getState()).toMatchObject({
        status: 'anonymous',
        sessionId: null,
        refreshToken: null,
      });
      expect(shared.read()).toMatchObject({
        sessionId: 'session-1',
        refreshToken: 'refresh-1',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps waiting after a provisional shared snapshot and only times out locally', async () => {
    vi.useFakeTimers();

    try {
      const shared = createSharedStorageHarness({
        sessionId: 'session-1',
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        receivedAt: '2026-04-03T00:00:00.000Z',
        expiresAt: '2026-04-03T00:03:00.000Z',
        me: null,
      });
      const sdk = shared.createSdk({
        autoRecover: true,
        recoveryTimeoutMs: 25,
        fetch: vi
          .fn()
          .mockResolvedValueOnce(
            jsonResponse({ error: 'session_superseded' }, 401),
          ),
      });
      let readySettled = false;

      void sdk.ready.then(() => {
        readySettled = true;
      });

      await vi.runAllTicks();

      shared.write({
        sessionId: 'session-1',
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
        receivedAt: '2026-04-03T00:02:00.000Z',
        expiresAt: '2026-04-03T00:17:00.000Z',
        me: null,
      });
      shared.dispatchStorageUpdate();
      await vi.runAllTicks();

      expect(sdk.session.getState()).toMatchObject({
        status: 'recovering',
        sessionId: 'session-1',
        refreshToken: 'refresh-2',
      });
      expect(readySettled).toBe(false);

      await vi.advanceTimersByTimeAsync(25);
      await sdk.ready;
      await vi.runAllTicks();

      expect(sdk.session.getState()).toMatchObject({
        status: 'anonymous',
        sessionId: null,
        refreshToken: null,
      });
      expect(shared.read()).toMatchObject({
        sessionId: 'session-1',
        refreshToken: 'refresh-2',
      });
      expect(readySettled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('preserves recoverable state when boot me reload fails transiently', async () => {
    const sdk = createAuthMiniForTest({
      autoRecover: true,
      storage: fakeAuthenticatedStorageWithMe(),
      fetch: vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ error: 'internal_error' }, 500)),
    });

    await expect(sdk.ready).resolves.toBeUndefined();
    expect(sdk.session.getState()).toMatchObject({
      status: 'recovering',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(sdk.me.get()?.email).toBe('u@example.com');
  });

  it('drops legacy persisted sessions without sessionId during boot recovery', async () => {
    const sdk = createAuthMiniForTest({
      autoRecover: true,
      storage: fakeAuthenticatedStorageWithMe(undefined, { sessionId: null }),
    });

    await expect(sdk.ready).resolves.toBeUndefined();
    expect(sdk.session.getState()).toMatchObject({
      status: 'anonymous',
      sessionId: null,
      accessToken: null,
      refreshToken: null,
    });
    expect(sdk.me.get()).toBeNull();
  });

  it('treats invalid persisted timestamps as needing refresh during recovery', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          session_id: 's2',
          access_token: 'a2',
          refresh_token: 'r2',
          expires_in: 900,
          token_type: 'Bearer',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          user_id: 'u1',
          email: 'u@example.com',
          webauthn_credentials: [],
          ed25519_credentials: [],
          active_sessions: [],
        }),
      );
    const sdk = createAuthMiniForTest({
      autoRecover: true,
      fetch,
      storage: fakeAuthenticatedStorageWithMe(undefined, {
        receivedAt: 'not-a-date',
        expiresAt: 'still-not-a-date',
      }),
    });

    await sdk.ready;
    expect(countRefreshCalls(fetch)).toBe(1);
    expect(sdk.session.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'a2',
      refreshToken: 'r2',
    });
  });

  it('logout clears local state even when remote logout fails', async () => {
    const sdk = createAuthMiniForTest({
      storage: fakeAuthenticatedStorage(),
      fetch: vi.fn().mockRejectedValueOnce(new Error('network down')),
    });

    await expect(sdk.session.logout()).resolves.toBeUndefined();
    expect(sdk.session.getState().status).toBe('anonymous');
  });

  it('logout refreshes first when access token is near expiry', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          session_id: 's2',
          access_token: 'a2',
          refresh_token: 'r2',
          expires_in: 900,
          token_type: 'Bearer',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          user_id: 'u1',
          email: 'u@example.com',
          webauthn_credentials: [],
          ed25519_credentials: [],
          active_sessions: [],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const sdk = createAuthMiniForTest({
      storage: fakeAlmostExpiredStorage(),
      fetch,
      now: () => Date.parse('2026-04-03T00:02:00.000Z'),
    });

    await sdk.session.logout();
    expect(countRefreshCalls(fetch)).toBe(1);
    expect(countLogoutCalls(fetch)).toBe(1);
  });
});
