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
  me: MockMe | null;
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
      me: null,
    } as MockSessionState,
  };
  const fetch = vi.fn();
  const refresh = vi.fn();
  const reloadMe = vi.fn(async () => {
    if (!sessionState.current.me) {
      throw new Error('No current user');
    }

    return sessionState.current.me;
  });

  function emitSession() {
    for (const listener of listeners) {
      listener(sessionState.current);
    }
  }

  return {
    createBrowserSdk: vi.fn(() => ({
      email: { start: vi.fn(), verify: vi.fn() },
      passkey: { register: vi.fn(), authenticate: vi.fn() },
      me: { get: vi.fn(() => sessionState.current.me), reload: reloadMe },
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
    emitSession,
    refresh,
    reloadMe,
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

function authenticatedSession(
  overrides?: Partial<MockMe>,
  options?: { accessToken?: string },
): MockSessionState {
  return {
    status: 'authenticated',
    authenticated: true,
    sessionId: 'session-1',
    accessToken: options?.accessToken ?? fakeAccessToken(['email_otp']),
    refreshToken: 'refresh-token',
    receivedAt: '2026-04-12T00:00:00.000Z',
    expiresAt: '2026-04-12T01:00:00.000Z',
    me: {
      user_id: 'user-1',
      email: 'user@example.com',
      webauthn_credentials: [],
      ed25519_credentials: [],
      active_sessions: [],
      ...overrides,
    },
  };
}

function expectDeleteConfirmation(
  confirmSpy: { mock: { calls: Array<[string?]> } },
  credentialLabel: string,
) {
  expect(confirmSpy.mock.calls).toHaveLength(1);
  expect(confirmSpy.mock.calls[0]?.[0]).toEqual(expect.any(String));
  expect(confirmSpy.mock.calls[0]?.[0]).toContain('Delete');
  expect(confirmSpy.mock.calls[0]?.[0]).toContain(credentialLabel);
}

function expectDeleteRequest(
  fetchMock: typeof sdkMocks.fetch,
  pathname: string,
  accessToken: string,
) {
  expect(fetchMock).toHaveBeenCalledTimes(1);

  const [target, init] = fetchMock.mock.calls[0] ?? [];
  const requestUrl =
    typeof target === 'string' || target instanceof URL
      ? new URL(target, 'https://auth.example.com')
      : new URL(String(target.url), 'https://auth.example.com');
  const request = new Request(requestUrl, init);

  expect(requestUrl.pathname).toBe(pathname);
  expect(request.method).toBe('DELETE');
  expect(request.headers.get('authorization')).toBe(`Bearer ${accessToken}`);
}

describe('CredentialsRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    sdkMocks.createBrowserSdk.mockClear();
    sdkMocks.fetch.mockReset();
    sdkMocks.refresh.mockReset();
    sdkMocks.reloadMe.mockReset();
    sdkMocks.reloadMe.mockImplementation(async () => {
      if (!sdkMocks.sessionState.current.me) {
        throw new Error('No current user');
      }

      return sdkMocks.sessionState.current.me;
    });
    sdkMocks.sessionState.current = {
      status: 'anonymous',
      authenticated: false,
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
      me: null,
    };
    vi.stubGlobal('fetch', sdkMocks.fetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows sign-in-required copy for all sections and no destructive actions when anonymous', () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');

    render(
      <MemoryRouter initialEntries={['/credentials']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Sign in to inspect the current account email.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Sign in to inspect current passkeys.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Sign in to inspect current Ed25519 credentials.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /delete passkey/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /delete device key/i }),
    ).not.toBeInTheDocument();
  });

  it('renders email, passkey, and ed25519 tables from the current /me snapshot', () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession({
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
    });

    render(
      <MemoryRouter initialEntries={['/credentials']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByRole('cell', { name: 'user@example.com' })).toBeInTheDocument();
    expect(screen.getByText('Primary email')).toBeInTheDocument();
    expect(screen.getByText('Read-only')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Credential ID' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'RP ID' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader', { name: 'Last Used' })).toHaveLength(2);
    expect(screen.getAllByRole('columnheader', { name: 'Created At' })).toHaveLength(2);
    expect(screen.getByText(/passkey-credential-abc/i)).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
    expect(screen.getByText('2026-04-11T08:30:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('2026-04-10T12:00:00.000Z')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Delete passkey passkey-credential-abcdef123456',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Public Key' })).toBeInTheDocument();
    expect(screen.getByText('Build runner')).toBeInTheDocument();
    expect(screen.getByText(/MCowBQYDK2VwAyEA/i)).toBeInTheDocument();
    expect(screen.getByText('2026-04-11T08:30:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('2026-04-09T09:15:00.000Z')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Delete device key Build runner' }),
    ).toBeInTheDocument();
  });

  it('shows the existing ed25519 credential row from the current snapshot without local row filtering', () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = {
      ...authenticatedSession(),
      me: {
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [
          {
            id: 'device-row-1',
            name: 'Build runner',
            public_key: 'MCowBQYDK2VwAyEAlongPublicKeyValueForTesting1234567890=',
            last_used_at: null,
            created_at: '2026-04-09T09:15:00.000Z',
          },
        ],
        active_sessions: [],
      },
    };

    render(
      <MemoryRouter initialEntries={['/credentials']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByText('Build runner')).toBeInTheDocument();
    expect(screen.getByText(/MCowBQYDK2VwAyEA/i)).toBeInTheDocument();
  });

  it('keeps the page pinned to the shared session until reload emits an updated snapshot', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');

    sdkMocks.sessionState.current = authenticatedSession({
      webauthn_credentials: [
        {
          id: 'passkey-row-1',
          credential_id: 'first-passkey',
          rp_id: 'app.example.com',
          last_used_at: null,
          created_at: '2026-04-10T12:00:00.000Z',
        },
      ],
      ed25519_credentials: [],
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    sdkMocks.fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const refreshedSession = authenticatedSession({
      webauthn_credentials: [],
      ed25519_credentials: [],
    });
    sdkMocks.reloadMe.mockImplementationOnce(async () => {
      return refreshedSession.me!;
    });

    render(
      <MemoryRouter initialEntries={['/credentials']}>
        <AppRouter />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole('button', { name: 'Delete passkey first-passkey' }),
    );

    expectDeleteConfirmation(confirmSpy, 'passkey');
    await expect(sdkMocks.reloadMe.mock.results[0]?.value).resolves.toEqual(
      expect.objectContaining({
        webauthn_credentials: [],
      }),
    );
    expect(
      screen.getByRole('button', { name: 'Delete passkey first-passkey' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('No passkeys are currently bound to this account.'),
    ).not.toBeInTheDocument();

    act(() => {
      sdkMocks.sessionState.current = refreshedSession;
      sdkMocks.emitSession();
    });

    expect(
      await screen.findByText('No passkeys are currently bound to this account.'),
    ).toBeInTheDocument();
  });

  it('deletes a passkey after confirm and reloads /me from the server', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession({
      webauthn_credentials: [
        {
          id: 'passkey-row-1',
          credential_id: 'passkey-credential-abcdef123456',
          rp_id: 'example.com',
          last_used_at: null,
          created_at: '2026-04-10T12:00:00.000Z',
        },
      ],
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    sdkMocks.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    sdkMocks.reloadMe.mockImplementationOnce(async () => {
      sdkMocks.sessionState.current = authenticatedSession({
        webauthn_credentials: [],
      });
      sdkMocks.emitSession();
      return sdkMocks.sessionState.current.me!;
    });

    render(
      <MemoryRouter initialEntries={['/credentials']}>
        <AppRouter />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Delete passkey passkey-credential-abcdef123456',
      }),
    );

    expectDeleteConfirmation(confirmSpy, 'passkey');
    expectDeleteRequest(
      sdkMocks.fetch,
      '/webauthn/credentials/passkey-row-1',
      sdkMocks.sessionState.current.accessToken!,
    );
    expect(sdkMocks.reloadMe).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText('No passkeys are currently bound to this account.'),
    ).toBeInTheDocument();
  });

  it('deletes an ed25519 credential after confirm and reloads /me from the server', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession({
      ed25519_credentials: [
        {
          id: 'device-row-1',
          name: 'Build runner',
          public_key: 'MCowBQYDK2VwAyEAlongPublicKeyValueForTesting1234567890=',
          last_used_at: null,
          created_at: '2026-04-09T09:15:00.000Z',
        },
      ],
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    sdkMocks.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    sdkMocks.reloadMe.mockImplementationOnce(async () => {
      sdkMocks.sessionState.current = authenticatedSession({
        ed25519_credentials: [],
      });
      sdkMocks.emitSession();
      return sdkMocks.sessionState.current.me!;
    });

    render(
      <MemoryRouter initialEntries={['/credentials']}>
        <AppRouter />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole('button', { name: 'Delete device key Build runner' }),
    );

    expectDeleteConfirmation(confirmSpy, 'Ed25519');
    expectDeleteRequest(
      sdkMocks.fetch,
      '/ed25519/credentials/device-row-1',
      sdkMocks.sessionState.current.accessToken!,
    );
    expect(sdkMocks.reloadMe).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(
        'No Ed25519 credentials are currently bound to this account.',
      ),
    ).toBeInTheDocument();
  });

  it('does not expose destructive credential actions for pure ed25519 sessions', () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession(
      {
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
      },
      { accessToken: fakeAccessToken(['ed25519']) },
    );

    render(
      <MemoryRouter initialEntries={['/credentials']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByRole('columnheader', { name: 'Action' })).toBeInTheDocument();
    expect(screen.getByText(/passkey-credential-abc/i)).toBeInTheDocument();
    expect(screen.getByText('Build runner')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: 'Delete passkey passkey-credential-abcdef123456',
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete device key Build runner' }),
    ).not.toBeInTheDocument();
  });

  it('keeps delete actions available for legacy tokens without amr after refresh yields manageable amr', async () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession(
      {
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
      },
      { accessToken: fakeLegacyAccessToken() },
    );
    sdkMocks.refresh.mockImplementationOnce(async () => {
      sdkMocks.sessionState.current = authenticatedSession(
        sdkMocks.sessionState.current.me ?? undefined,
        { accessToken: fakeAccessToken(['email_otp']) },
      );
      return {
        accessToken: sdkMocks.sessionState.current.accessToken,
      };
    });

    render(
      <MemoryRouter initialEntries={['/credentials']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('button', {
        name: 'Delete passkey passkey-credential-abcdef123456',
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Delete device key Build runner' }),
    ).toBeInTheDocument();
    expect(sdkMocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps delete actions unavailable for legacy tokens when refresh yields pure ed25519 amr', async () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession(
      {
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
      },
      { accessToken: fakeLegacyAccessToken() },
    );
    sdkMocks.refresh.mockImplementationOnce(async () => {
      sdkMocks.sessionState.current = authenticatedSession(
        sdkMocks.sessionState.current.me ?? undefined,
        { accessToken: fakeAccessToken(['ed25519']) },
      );
      return {
        accessToken: sdkMocks.sessionState.current.accessToken,
      };
    });

    render(
      <MemoryRouter initialEntries={['/credentials']}>
        <AppRouter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(sdkMocks.refresh).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.queryByRole('button', {
        name: 'Delete passkey passkey-credential-abcdef123456',
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete device key Build runner' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the email section read-only even when the user has a primary email', () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession();

    render(
      <MemoryRouter initialEntries={['/credentials']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByText('Managed via email OTP sign-in')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /delete email/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /unbind email/i }),
    ).not.toBeInTheDocument();
  });

  it('does not send a delete request when the native confirm is cancelled', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession({
      webauthn_credentials: [
        {
          id: 'passkey-row-1',
          credential_id: 'passkey-credential-abcdef123456',
          rp_id: 'example.com',
          last_used_at: null,
          created_at: '2026-04-10T12:00:00.000Z',
        },
      ],
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/credentials']}>
        <AppRouter />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Delete passkey passkey-credential-abcdef123456',
      }),
    );

    expectDeleteConfirmation(confirmSpy, 'passkey');
    expect(sdkMocks.fetch).not.toHaveBeenCalled();
    expect(sdkMocks.reloadMe).not.toHaveBeenCalled();
  });

  it('blocks a second delete in the same section while passkey delete is in flight', async () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession({
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
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    let resolveFetch: ((value: Response) => void) | undefined;
    sdkMocks.fetch.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    sdkMocks.reloadMe.mockImplementationOnce(async () => sdkMocks.sessionState.current.me!);

    render(
      <MemoryRouter initialEntries={['/credentials']}>
        <AppRouter />
      </MemoryRouter>,
    );

    const passkeyDeleteButton = screen.getByRole('button', {
      name: 'Delete passkey passkey-credential-abcdef123456',
    });
    const secondPasskeyDeleteButton = screen.getByRole('button', {
      name: 'Delete passkey passkey-credential-xyz987654321',
    });
    const deviceDeleteButton = screen.getByRole('button', {
      name: 'Delete device key Build runner',
    });

    act(() => {
      fireEvent.click(passkeyDeleteButton);
      fireEvent.click(secondPasskeyDeleteButton);
    });

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(sdkMocks.fetch).toHaveBeenCalledTimes(1);
    expect(secondPasskeyDeleteButton).toBeDisabled();
    expect(deviceDeleteButton).not.toBeDisabled();

    await act(async () => {
      resolveFetch?.(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    });
  });
});
