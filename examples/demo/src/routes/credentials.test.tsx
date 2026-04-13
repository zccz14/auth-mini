import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AUTH_ORIGIN_KEY } from '@/lib/demo-storage';
import { AppRouter } from '@/app/router';

type MockMe = {
  user_id: string;
  email: string;
  webauthn_credentials: Array<{
    id: string;
    credential_id: string;
    rp_id: string;
    last_used_at: string | null;
    created_at: string;
  }>;
  ed25519_credentials: Array<{
    id: string;
    name: string;
    public_key: string;
    last_used_at: string | null;
    created_at: string;
  }>;
  active_sessions: Array<unknown>;
};

type MockSessionState = {
  status: string;
  authenticated: boolean;
  sessionId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  receivedAt: string | null;
  expiresAt: string | null;
};

const sdkMocks = vi.hoisted(() => {
  const listeners = new Set<(nextSession: MockSessionState) => void>();
  const sessionState = {
    current: {
      status: 'anonymous',
      authenticated: false,
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
    } as MockSessionState,
  };
  const fetch = vi.fn();
  const refresh = vi.fn();
  const meFetch = vi.fn<() => Promise<MockMe>>();

  return {
    createBrowserSdk: vi.fn(() => ({
      email: { start: vi.fn(), verify: vi.fn() },
      passkey: { register: vi.fn(), authenticate: vi.fn() },
      me: { fetch: meFetch },
      session: {
        getState: () => sessionState.current,
        onChange: vi.fn((listener: (nextSession: MockSessionState) => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        }),
        refresh,
        logout: vi.fn(),
      },
      webauthn: { register: vi.fn(), authenticate: vi.fn() },
    })),
    fetch,
    meFetch,
    refresh,
    sessionState,
  };
});

vi.mock('auth-mini/sdk/browser', () => ({
  createBrowserSdk: sdkMocks.createBrowserSdk,
}));

function encodeJwtSegment(value: unknown) {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');
}

function fakeAccessToken(amr: string[]) {
  return [
    encodeJwtSegment({ alg: 'none', typ: 'JWT' }),
    encodeJwtSegment({ amr }),
    'signature',
  ].join('.');
}

function fakeLegacyAccessToken() {
  return [
    encodeJwtSegment({ alg: 'none', typ: 'JWT' }),
    encodeJwtSegment({ sub: 'user-1' }),
    'signature',
  ].join('.');
}

function authenticatedSession(me?: Partial<MockMe>, options?: { accessToken?: string }): MockSessionState {
  void me;
  return {
    status: 'authenticated',
    authenticated: true,
    sessionId: 'session-1',
    accessToken: options?.accessToken ?? fakeAccessToken(['email_otp']),
    refreshToken: 'refresh-token',
    receivedAt: '2026-04-12T00:00:00.000Z',
    expiresAt: '2026-04-12T01:00:00.000Z',
  };
}

function meSnapshot(overrides?: Partial<MockMe>): MockMe {
  return {
    user_id: 'user-1',
    email: 'user@example.com',
    webauthn_credentials: [],
    ed25519_credentials: [],
    active_sessions: [],
    ...overrides,
  };
}

function expectDeleteConfirmation(confirmSpy: { mock: { calls: Array<[string?]> } }, credentialLabel: string) {
  expect(confirmSpy.mock.calls).toHaveLength(1);
  expect(confirmSpy.mock.calls[0]?.[0]).toContain('Delete');
  expect(confirmSpy.mock.calls[0]?.[0]).toContain(credentialLabel);
}

function expectDeleteRequest(fetchMock: typeof sdkMocks.fetch, pathname: string, accessToken: string) {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [target, init] = fetchMock.mock.calls[0] ?? [];
  const requestUrl = typeof target === 'string' || target instanceof URL
    ? new URL(target, 'https://auth.example.com')
    : new URL(String(target.url), 'https://auth.example.com');
  const request = new Request(requestUrl, init);

  expect(requestUrl.pathname).toBe(pathname);
  expect(request.method).toBe('DELETE');
  expect(request.headers.get('authorization')).toBe(`Bearer ${accessToken}`);
}

function renderRoute() {
  render(
    <MemoryRouter initialEntries={['/credentials']}>
      <AppRouter />
    </MemoryRouter>,
  );
}

describe('CredentialsRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    sdkMocks.createBrowserSdk.mockClear();
    sdkMocks.fetch.mockReset();
    sdkMocks.meFetch.mockReset();
    sdkMocks.refresh.mockReset();
    sdkMocks.sessionState.current = {
      status: 'anonymous',
      authenticated: false,
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
    };
    vi.stubGlobal('fetch', sdkMocks.fetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows sign-in-required copy for all sections and no destructive actions when anonymous', () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');

    renderRoute();

    expect(screen.getByText('Sign in to inspect the current account email.')).toBeInTheDocument();
    expect(screen.getByText('Sign in to inspect current passkeys.')).toBeInTheDocument();
    expect(screen.getByText('Sign in to inspect current Ed25519 credentials.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete passkey/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete device key/i })).not.toBeInTheDocument();
    expect(sdkMocks.meFetch).not.toHaveBeenCalled();
  });

  it('loads /me inside the route and renders credential tables', async () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession();
    sdkMocks.meFetch.mockResolvedValueOnce(
      meSnapshot({
        webauthn_credentials: [
          {
            id: 'passkey-row-1',
            credential_id: 'passkey-credential-abcdef123456',
            rp_id: 'example.com',
            last_used_at: null,
            created_at: '2026-04-10T12:00:00.000Z',
          },
        ],
        ed25519_credentials: [
          {
            id: 'device-row-1',
            name: 'Build runner',
            public_key: 'MCowBQYDK2VwAyEAlongPublicKeyValueForTesting1234567890=',
            last_used_at: '2026-04-11T08:30:00.000Z',
            created_at: '2026-04-09T09:15:00.000Z',
          },
        ],
      }),
    );

    renderRoute();

    expect(screen.getByText('Loading current account…')).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'user@example.com' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete passkey passkey-credential-abcdef123456' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete device key Build runner' })).toBeInTheDocument();
  });

  it('shows a route-owned /me load error', async () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession();
    sdkMocks.meFetch.mockRejectedValueOnce(new Error('Unable to load current account.'));

    renderRoute();

    expect(await screen.findByText('Unable to load current account.')).toBeInTheDocument();
    expect(screen.queryByText('This account does not currently have a bound email.')).not.toBeInTheDocument();
    expect(screen.queryByText('No passkeys are currently bound to this account.')).not.toBeInTheDocument();
    expect(screen.queryByText('No Ed25519 credentials are currently bound to this account.')).not.toBeInTheDocument();
  });

  it('reloads local /me after deleting a passkey', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession();
    sdkMocks.meFetch
      .mockResolvedValueOnce(
        meSnapshot({
          webauthn_credentials: [
            {
              id: 'passkey-row-1',
              credential_id: 'first-passkey',
              rp_id: 'app.example.com',
              last_used_at: null,
              created_at: '2026-04-10T12:00:00.000Z',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(meSnapshot({ email: 'updated@example.com' }));
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    sdkMocks.fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    renderRoute();

    await user.click(
      await screen.findByRole('button', { name: 'Delete passkey first-passkey' }),
    );

    expectDeleteConfirmation(confirmSpy, 'passkey');
    expectDeleteRequest(sdkMocks.fetch, '/webauthn/credentials/passkey-row-1', sdkMocks.sessionState.current.accessToken!);
    expect(sdkMocks.meFetch).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('updated@example.com')).toBeInTheDocument();
  });

  it('reloads local /me after deleting an ed25519 credential', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession();
    sdkMocks.meFetch
      .mockResolvedValueOnce(
        meSnapshot({
          ed25519_credentials: [
            {
              id: 'device-row-1',
              name: 'Build runner',
              public_key: 'MCowBQYDK2VwAyEAlongPublicKeyValueForTesting1234567890=',
              last_used_at: null,
              created_at: '2026-04-09T09:15:00.000Z',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(meSnapshot({ ed25519_credentials: [] }));
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    sdkMocks.fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    renderRoute();

    await user.click(
      await screen.findByRole('button', { name: 'Delete device key Build runner' }),
    );

    expectDeleteConfirmation(confirmSpy, 'Ed25519');
    expectDeleteRequest(sdkMocks.fetch, '/ed25519/credentials/device-row-1', sdkMocks.sessionState.current.accessToken!);
    expect(sdkMocks.meFetch).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('No Ed25519 credentials are currently bound to this account.')).toBeInTheDocument();
  });

  it('preserves delete success when follow-up /me refresh fails', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession();
    sdkMocks.meFetch
      .mockResolvedValueOnce(
        meSnapshot({
          webauthn_credentials: [
            {
              id: 'passkey-row-1',
              credential_id: 'first-passkey',
              rp_id: 'app.example.com',
              last_used_at: null,
              created_at: '2026-04-10T12:00:00.000Z',
            },
          ],
        }),
      )
      .mockRejectedValueOnce(new Error('Unable to refresh current account data.'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    sdkMocks.fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    renderRoute();

    await user.click(
      await screen.findByRole('button', { name: 'Delete passkey first-passkey' }),
    );

    expect(await screen.findByText('Credential deleted, but current account data could not be refreshed.')).toBeInTheDocument();
    expect(screen.queryByText('Delete failed')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete passkey first-passkey' })).toBeInTheDocument();
  });

  it('keeps delete actions available for legacy tokens after refresh yields manageable amr', async () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession(undefined, { accessToken: fakeLegacyAccessToken() });
    sdkMocks.meFetch.mockResolvedValueOnce(
      meSnapshot({
        webauthn_credentials: [
          {
            id: 'passkey-row-1',
            credential_id: 'passkey-credential-abcdef123456',
            rp_id: 'example.com',
            last_used_at: null,
            created_at: '2026-04-10T12:00:00.000Z',
          },
        ],
        ed25519_credentials: [
          {
            id: 'device-row-1',
            name: 'Build runner',
            public_key: 'MCowBQYDK2VwAyEAlongPublicKeyValueForTesting1234567890=',
            last_used_at: null,
            created_at: '2026-04-09T09:15:00.000Z',
          },
        ],
      }),
    );
    sdkMocks.refresh.mockResolvedValueOnce({ accessToken: fakeAccessToken(['email_otp']) });

    renderRoute();

    expect(await screen.findByRole('button', { name: 'Delete passkey passkey-credential-abcdef123456' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Delete device key Build runner' })).toBeInTheDocument();
    expect(sdkMocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('blocks a second delete in the same section while passkey delete is in flight', async () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession();
    sdkMocks.meFetch.mockResolvedValueOnce(
      meSnapshot({
        webauthn_credentials: [
          {
            id: 'passkey-row-1',
            credential_id: 'passkey-credential-abcdef123456',
            rp_id: 'example.com',
            last_used_at: null,
            created_at: '2026-04-10T12:00:00.000Z',
          },
          {
            id: 'passkey-row-2',
            credential_id: 'passkey-credential-xyz987654321',
            rp_id: 'example.com',
            last_used_at: '2026-04-11T13:00:00.000Z',
            created_at: '2026-04-11T12:00:00.000Z',
          },
        ],
        ed25519_credentials: [
          {
            id: 'device-row-1',
            name: 'Build runner',
            public_key: 'MCowBQYDK2VwAyEAlongPublicKeyValueForTesting1234567890=',
            last_used_at: null,
            created_at: '2026-04-09T09:15:00.000Z',
          },
        ],
      }),
    );
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    let resolveFetch: ((value: Response) => void) | undefined;
    sdkMocks.fetch.mockImplementationOnce(
      () => new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    renderRoute();

    await screen.findByRole('button', { name: 'Delete passkey passkey-credential-abcdef123456' });
    const passkeyDeleteButton = screen.getByRole('button', { name: 'Delete passkey passkey-credential-abcdef123456' });
    const secondPasskeyDeleteButton = screen.getByRole('button', { name: 'Delete passkey passkey-credential-xyz987654321' });
    const deviceDeleteButton = screen.getByRole('button', { name: 'Delete device key Build runner' });

    act(() => {
      fireEvent.click(passkeyDeleteButton);
      fireEvent.click(secondPasskeyDeleteButton);
    });

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(sdkMocks.fetch).toHaveBeenCalledTimes(1);
    expect(secondPasskeyDeleteButton).toBeDisabled();
    expect(deviceDeleteButton).not.toBeDisabled();

    await act(async () => {
      resolveFetch?.(new Response(null, { status: 204 }));
    });
  });
});
