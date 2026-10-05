import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCOUNTS_STORAGE_KEY,
  accountFromAppTokens,
  accountFromSessionSnapshot,
  decodeAccountUserId,
  fetchAccountEmail,
  isInvalidAccountSessionError,
  readStoredAccounts,
  removeStoredAccount,
  upsertStoredAccount,
  writeStoredAccounts,
  type StoredAccount,
} from '@/lib/accounts';

function encodeSegment(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function accessToken(claims: Record<string, unknown>) {
  return `${encodeSegment({ alg: 'EdDSA' })}.${encodeSegment(claims)}.signature`;
}

function storedAccount(overrides: Partial<StoredAccount> = {}): StoredAccount {
  return {
    userId: 'user-1',
    email: null,
    sessionId: 'session-1',
    accessToken: accessToken({ sub: 'user-1' }),
    refreshToken: 'refresh-1',
    receivedAt: '2026-10-01T00:00:00.000Z',
    expiresAt: '2026-10-01T01:00:00.000Z',
    lastUsedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('account storage', () => {
  it('reads an empty list when nothing is stored', () => {
    expect(readStoredAccounts()).toEqual([]);
  });

  it('round-trips accounts and drops malformed entries', () => {
    const account = storedAccount();
    writeStoredAccounts([account]);
    expect(readStoredAccounts()).toEqual([account]);

    localStorage.setItem(
      ACCOUNTS_STORAGE_KEY,
      JSON.stringify({ accounts: [account, { userId: 1 }] }),
    );
    expect(readStoredAccounts()).toEqual([account]);

    localStorage.setItem(ACCOUNTS_STORAGE_KEY, 'not json');
    expect(readStoredAccounts()).toEqual([]);
  });

  it('adds a new account and replaces an existing one by user id', () => {
    const account = storedAccount();
    const added = upsertStoredAccount([], account);
    expect(added).toEqual([account]);

    const rotated = {
      ...account,
      sessionId: 'session-2',
      refreshToken: 'refresh-2',
      lastUsedAt: '2026-10-02T00:00:00.000Z',
    };
    expect(upsertStoredAccount(added, rotated)).toEqual([rotated]);
  });

  it('keeps the same list reference when nothing changes', () => {
    const account = storedAccount();
    const accounts = [account];
    expect(upsertStoredAccount(accounts, { ...account })).toBe(accounts);
  });

  it('keeps a known email when the incoming account has none', () => {
    const account = storedAccount({ email: 'user@example.com' });
    const [updated] = upsertStoredAccount([account], {
      ...account,
      email: null,
      refreshToken: 'refresh-2',
    });
    expect(updated.email).toBe('user@example.com');
    expect(updated.refreshToken).toBe('refresh-2');
  });

  it('removes accounts by user id without touching the rest', () => {
    const first = storedAccount();
    const second = storedAccount({ userId: 'user-2' });
    const accounts = [first, second];
    expect(removeStoredAccount(accounts, 'user-1')).toEqual([second]);
    expect(removeStoredAccount(accounts, 'missing')).toBe(accounts);
  });
});

describe('account derivation', () => {
  it('derives an account from a session snapshot', () => {
    const account = accountFromSessionSnapshot({
      status: 'authenticated',
      authenticated: true,
      sessionId: 'session-9',
      accessToken: accessToken({ sub: 'user-9' }),
      refreshToken: 'refresh-9',
      receivedAt: '2026-10-01T00:00:00.000Z',
      expiresAt: '2026-10-01T01:00:00.000Z',
    });

    expect(account).toMatchObject({
      userId: 'user-9',
      email: null,
      sessionId: 'session-9',
      refreshToken: 'refresh-9',
    });
    expect(account?.lastUsedAt).toBeTruthy();
  });

  it('returns null when the snapshot or token cannot identify a user', () => {
    expect(
      accountFromSessionSnapshot({
        status: 'anonymous',
        authenticated: false,
        sessionId: null,
        accessToken: null,
        refreshToken: null,
        receivedAt: null,
        expiresAt: null,
      }),
    ).toBeNull();

    expect(
      accountFromSessionSnapshot({
        status: 'authenticated',
        authenticated: true,
        sessionId: 'session-9',
        accessToken: 'not-a-jwt',
        refreshToken: 'refresh-9',
        receivedAt: '2026-10-01T00:00:00.000Z',
        expiresAt: '2026-10-01T01:00:00.000Z',
      }),
    ).toBeNull();

    expect(decodeAccountUserId('not-a-jwt')).toBeNull();
  });

  it('derives an account from app tokens with their expiry window', () => {
    const now = Date.parse('2026-10-01T00:00:00.000Z');
    const account = accountFromAppTokens(
      {
        session_id: 'session-3',
        access_token: accessToken({ sub: 'user-3' }),
        refresh_token: 'refresh-3',
        token_type: 'Bearer',
        expires_in: 900,
      },
      now,
    );

    expect(account).toMatchObject({
      userId: 'user-3',
      sessionId: 'session-3',
      receivedAt: '2026-10-01T00:00:00.000Z',
      expiresAt: '2026-10-01T00:15:00.000Z',
    });
  });
});

describe('invalid session errors', () => {
  it('classifies 401 and refresh-token failures as invalid sessions', () => {
    expect(isInvalidAccountSessionError({ status: 401 })).toBe(true);
    expect(
      isInvalidAccountSessionError({
        status: 401,
        error: 'invalid_access_token',
      }),
    ).toBe(true);
    expect(isInvalidAccountSessionError({ error: 'session_invalidated' })).toBe(
      true,
    );
    expect(isInvalidAccountSessionError({ error: 'session_superseded' })).toBe(
      true,
    );
    expect(
      isInvalidAccountSessionError({ error: 'invalid_refresh_token' }),
    ).toBe(true);
    expect(
      isInvalidAccountSessionError({ status: 400, error: 'invalid_request' }),
    ).toBe(false);
    expect(isInvalidAccountSessionError(new TypeError('Failed to fetch'))).toBe(
      false,
    );
    expect(isInvalidAccountSessionError(null)).toBe(false);
  });
});

describe('email enrichment', () => {
  it('reads the email from /me and hides failures', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ email: 'user@example.com' }), {
          status: 200,
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchAccountEmail('https://auth.example.com/', 'token'),
    ).resolves.toBe('user@example.com');

    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));
    await expect(
      fetchAccountEmail('https://auth.example.com/', 'token'),
    ).resolves.toBeNull();

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(
      fetchAccountEmail('https://auth.example.com/', 'token'),
    ).resolves.toBeNull();
  });
});
