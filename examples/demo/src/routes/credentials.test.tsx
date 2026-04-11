import { act, fireEvent, render, screen } from '@testing-library/react';
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
  const reloadMe = vi.fn(async () => {
    if (!sessionState.current.me) {
      throw new Error('No current user');
    }

    return sessionState.current.me;
  });

  return {
    createBrowserSdk: vi.fn(() => ({
      email: { start: vi.fn(), verify: vi.fn() },
      passkey: { register: vi.fn(), authenticate: vi.fn() },
      me: { get: vi.fn(() => sessionState.current.me), reload: reloadMe },
      session: {
        getState: () => sessionState.current,
        onChange: vi.fn(() => vi.fn()),
        refresh: vi.fn(),
        logout: vi.fn(),
      },
      webauthn: { register: vi.fn(), authenticate: vi.fn() },
    })),
    fetch,
    reloadMe,
    sessionState,
  };
});

vi.mock('auth-mini/sdk/browser', () => ({
  createBrowserSdk: sdkMocks.createBrowserSdk,
}));

function authenticatedSession(overrides?: Partial<MockMe>): MockSessionState {
  return {
    status: 'authenticated',
    authenticated: true,
    sessionId: 'session-1',
    accessToken: 'access-token',
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
  confirmSpy: ReturnType<typeof vi.spyOn>,
  credentialLabel: string,
) {
  expect(confirmSpy).toHaveBeenCalledTimes(1);
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
    expect(screen.getByText(/passkey-credential-abc/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Delete passkey passkey-credential-abcdef123456',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Build runner')).toBeInTheDocument();
    expect(screen.getByText(/MCowBQYDK2VwAyEA/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Delete device key Build runner' }),
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
      'access-token',
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
      'access-token',
    );
    expect(sdkMocks.reloadMe).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(
        'No Ed25519 credentials are currently bound to this account.',
      ),
    ).toBeInTheDocument();
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
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession({
      webauthn_credentials: [
        {
          id: 'passkey-row-1',
          credential_id: 'passkey-credential-abcdef123456',
          created_at: '2026-04-10T12:00:00.000Z',
        },
        {
          id: 'passkey-row-2',
          credential_id: 'passkey-credential-xyz987654321',
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
