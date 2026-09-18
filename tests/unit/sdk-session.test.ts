import { describe, expect, it, vi } from 'vitest';
import {
  countLogoutCalls,
  countRefreshCalls,
  createAuthMiniForTest,
  createSharedStorageHarness,
  fakeAlmostExpiredStorage,
  fakeAuthenticatedStorage,
  jsonResponse,
} from '../helpers/sdk.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('sdk session flows', () => {
  it('starts in recovering and settles authenticated after boot recovery', async () => {
    const sdk = createAuthMiniForTest({
      autoRecover: true,
      storage: fakeAuthenticatedStorage({
        accessToken: null,
      }),
      fetch: vi.fn().mockResolvedValueOnce(
        jsonResponse({
          session_id: 's2',
          access_token: 'a2',
          refresh_token: 'r2',
          expires_in: 900,
          token_type: 'Bearer',
        }),
      ),
    });

    expect(sdk.session.getState().status).toBe('recovering');
    await sdk.ready;
    expect(sdk.session.getState().status).toBe('authenticated');
    expect(sdk.session.getState()).not.toHaveProperty('me');
  });

  it('refresh success keeps session state token-only', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        session_id: 's2',
        access_token: 'a2',
        refresh_token: 'r2',
        expires_in: 900,
        token_type: 'Bearer',
      }),
    );
    const sdk = createAuthMiniForTest({
      storage: fakeAuthenticatedStorage(),
      fetch,
    });

    const refreshed = await sdk.session.refresh();

    expect(refreshed).toMatchObject({
      sessionId: 's2',
      accessToken: 'a2',
      refreshToken: 'r2',
    });
    expect(refreshed).not.toHaveProperty('me');
    expect(sdk.session.getState()).not.toHaveProperty('me');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('preserves authenticated state when refresh fails with a transient 5xx error', async () => {
    const sdk = createAuthMiniForTest({
      storage: fakeAuthenticatedStorage(),
      fetch: vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ error: 'internal_error' }, 500)),
    });

    await expect(sdk.session.refresh()).rejects.toMatchObject({
      error: 'internal_error',
    });
    expect(sdk.session.getState()).toMatchObject({
      status: 'authenticated',
      refreshToken: 'refresh-token',
      accessToken: 'access-token',
    });
    expect(sdk.session.getState()).not.toHaveProperty('me');
  });

  it('does not let a late refresh response overwrite a newer redirect session', async () => {
    const response = deferred<Response>();
    const fetch = vi.fn().mockReturnValue(response.promise);
    const sdk = createAuthMiniForTest({
      storage: fakeAuthenticatedStorage(),
      fetch,
    });

    const refresh = sdk.session.refresh();
    expect(fetch).toHaveBeenCalledTimes(1);

    await sdk.session.acceptRedirectCallback({
      session_id: 'session-new',
      access_token: 'access-new',
      refresh_token: 'refresh-new',
      expires_in: 900,
    });

    response.resolve(
      jsonResponse({
        session_id: 'session-old',
        access_token: 'access-old',
        refresh_token: 'refresh-old',
        expires_in: 900,
      }),
    );

    await expect(refresh).resolves.toMatchObject({
      sessionId: 'session-new',
      accessToken: 'access-new',
      refreshToken: 'refresh-new',
    });
    expect(sdk.session.getState()).toMatchObject({
      status: 'authenticated',
      sessionId: 'session-new',
      accessToken: 'access-new',
      refreshToken: 'refresh-new',
    });
  });

  it('keeps the approved callback session when the old refresh is superseded', async () => {
    const response = deferred<Response>();
    const sdk = createAuthMiniForTest({
      storage: fakeAuthenticatedStorage(),
      fetch: vi.fn().mockReturnValue(response.promise),
    });

    const refresh = sdk.session.refresh();
    await sdk.session.acceptRedirectCallback({
      session_id: 'session-approved',
      access_token: 'access-approved',
      refresh_token: 'refresh-approved',
      expires_in: 900,
    });
    response.resolve(jsonResponse({ error: 'session_superseded' }, 401));

    await expect(refresh).rejects.toMatchObject({
      error: 'session_superseded',
    });
    expect(sdk.session.getState()).toMatchObject({
      status: 'authenticated',
      sessionId: 'session-approved',
      accessToken: 'access-approved',
      refreshToken: 'refresh-approved',
    });
  });

  it('keeps a live access token authenticated while a superseded refresh recovers', async () => {
    vi.useFakeTimers();

    try {
      const sdk = createAuthMiniForTest({
        recoveryTimeoutMs: 25,
        storage: fakeAuthenticatedStorage(),
        fetch: vi
          .fn()
          .mockResolvedValueOnce(
            jsonResponse({ error: 'session_superseded' }, 401),
          ),
      });

      await expect(sdk.session.refresh()).rejects.toMatchObject({
        error: 'session_superseded',
      });
      expect(sdk.session.getState()).toMatchObject({
        status: 'recovering',
        accessToken: 'access-token',
      });

      await vi.advanceTimersByTimeAsync(25);

      expect(sdk.session.getState()).toMatchObject({
        status: 'authenticated',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('startup recovery settles authenticated without any implicit /me load', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        session_id: 's2',
        access_token: 'a2',
        refresh_token: 'r2',
        expires_in: 900,
        token_type: 'Bearer',
      }),
    );
    const sdk = createAuthMiniForTest({
      autoRecover: true,
      storage: fakeAuthenticatedStorage(),
      fetch,
    });

    await expect(sdk.ready).resolves.toBeUndefined();
    expect(sdk.session.getState()).toMatchObject({
      status: 'authenticated',
      authenticated: true,
      sessionId: 'session-1',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(sdk.session.getState()).not.toHaveProperty('me');
  });

  it('preserves recoverable state when refresh succeeds without any trailing /me load', async () => {
    const sdk = createAuthMiniForTest({
      storage: fakeAuthenticatedStorage(),
      fetch: vi.fn().mockResolvedValueOnce(
        jsonResponse({
          session_id: 's2',
          access_token: 'a2',
          refresh_token: 'r2',
          expires_in: 900,
          token_type: 'Bearer',
        }),
      ),
    });

    const refreshed = await sdk.session.refresh();

    expect(refreshed).toMatchObject({
      accessToken: 'a2',
    });
    expect(refreshed).not.toHaveProperty('me');
    expect(sdk.session.getState()).toMatchObject({
      status: 'authenticated',
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
      fetch: vi.fn().mockResolvedValueOnce(
        jsonResponse({
          session_id: 'session-1',
          access_token: 'access-2',
          refresh_token: 'refresh-2',
          expires_in: 900,
          token_type: 'Bearer',
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

  it('keeps provisional shared snapshots in recovering state', async () => {
    vi.useFakeTimers();

    try {
      const shared = createSharedStorageHarness({
        sessionId: 'session-1',
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        receivedAt: '2026-04-03T00:00:00.000Z',
        expiresAt: '2026-04-03T00:03:00.000Z',
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
        accessToken: null,
        refreshToken: 'refresh-2',
        receivedAt: '2026-04-03T00:02:00.000Z',
        expiresAt: '2026-04-03T00:17:00.000Z',
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
        status: 'recovering',
        sessionId: 'session-1',
        refreshToken: 'refresh-2',
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

  it('preserves authenticated recovery state without requiring a boot me fetch', async () => {
    const sdk = createAuthMiniForTest({
      autoRecover: true,
      storage: fakeAuthenticatedStorage(),
    });

    await expect(sdk.ready).resolves.toBeUndefined();
    expect(sdk.session.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(sdk.session.getState()).not.toHaveProperty('me');
  });

  it('drops legacy persisted sessions without sessionId during boot recovery', async () => {
    const sdk = createAuthMiniForTest({
      autoRecover: true,
      storage: fakeAuthenticatedStorage({ sessionId: null }),
    });

    await expect(sdk.ready).resolves.toBeUndefined();
    expect(sdk.session.getState()).toMatchObject({
      status: 'anonymous',
      sessionId: null,
      accessToken: null,
      refreshToken: null,
    });
    expect(sdk.session.getState()).not.toHaveProperty('me');
  });

  it('treats invalid persisted timestamps as needing refresh during recovery', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        session_id: 's2',
        access_token: 'a2',
        refresh_token: 'r2',
        expires_in: 900,
        token_type: 'Bearer',
      }),
    );
    const sdk = createAuthMiniForTest({
      autoRecover: true,
      fetch,
      storage: fakeAuthenticatedStorage({
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
