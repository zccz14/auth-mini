import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AUTH_ORIGIN_KEY } from '@/lib/demo-storage';
import { AppRouter } from '@/app/router';

type MockSessionState = {
  status: string;
  authenticated: boolean;
  sessionId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  receivedAt: string | null;
  expiresAt: string | null;
};

type MockMe = {
  user_id: string;
  email: string;
  webauthn_credentials: Array<unknown>;
  ed25519_credentials: Array<unknown>;
  active_sessions: Array<{
    id: string;
    auth_method: string;
    created_at: string;
    expires_at: string;
    ip: string | null;
    user_agent: string | null;
  }>;
};

type MockActiveSession = MockMe['active_sessions'][number];

const sdkMocks = vi.hoisted(() => {
  const listeners: Array<(state: MockSessionState) => void> = [];
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

  const meFetch = vi.fn<() => Promise<MockMe>>();
  const refresh = vi.fn();
  const logout = vi.fn(async () => {
    sessionState.current = {
      status: 'anonymous',
      authenticated: false,
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
    };
    for (const listener of listeners) {
      listener(sessionState.current);
    }
  });

  return {
    createDemoSdk: vi.fn(() => ({
      email: { start: vi.fn(), verify: vi.fn() },
      passkey: { register: vi.fn(), authenticate: vi.fn() },
      me: { fetch: meFetch },
      session: {
        getState: () => sessionState.current,
        onChange: vi.fn((listener) => {
          listeners.push(listener);
          return vi.fn();
        }),
        refresh,
        logout,
      },
      webauthn: { register: vi.fn(), authenticate: vi.fn() },
      ed25519: { register: vi.fn(), start: vi.fn(), verify: vi.fn() },
    })),
    listeners,
    logout,
    meFetch,
    refresh,
    sessionState,
  };
});

vi.mock('@/lib/demo-sdk', () => ({
  createDemoSdk: sdkMocks.createDemoSdk,
  persistDemoSession: vi.fn(),
}));

function authenticatedSession(): MockSessionState {
  return {
    status: 'authenticated',
    authenticated: true,
    sessionId: 'session-current',
    accessToken: fakeAccessToken(['email_otp']),
    refreshToken: 'refresh-token',
    receivedAt: '2026-04-12T00:00:00.000Z',
    expiresAt: '2026-04-12T01:00:00.000Z',
  };
}

function activeSession(overrides: Partial<MockActiveSession> & Pick<MockActiveSession, 'id' | 'created_at' | 'expires_at'>): MockActiveSession {
  return {
    auth_method: 'email_otp',
    ip: null,
    user_agent: null,
    ...overrides,
  };
}

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

function renderRoute() {
  render(
    <MemoryRouter initialEntries={['/session']}>
      <AppRouter />
    </MemoryRouter>,
  );
}

describe('SessionRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    sdkMocks.createDemoSdk.mockClear();
    sdkMocks.logout.mockClear();
    sdkMocks.meFetch.mockReset();
    sdkMocks.refresh.mockReset();
    sdkMocks.listeners.length = 0;
    sdkMocks.sessionState.current = {
      status: 'anonymous',
      authenticated: false,
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
    };
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
  });

  it('renders the anonymous session snapshot without fetching /me', () => {
    renderRoute();

    expect(screen.getByText('Current session')).toBeInTheDocument();
    expect(screen.getByText('Current user')).toBeInTheDocument();
    expect(screen.getByText(/"status": "anonymous"/)).toBeInTheDocument();
    expect(screen.getByText('No active sessions.')).toBeInTheDocument();
    expect(sdkMocks.meFetch).not.toHaveBeenCalled();
  });

  it('fetches /me inside the route after authenticated render', async () => {
    sdkMocks.sessionState.current = authenticatedSession();
    sdkMocks.meFetch.mockResolvedValueOnce({
      user_id: 'user-1',
      email: 'user@example.com',
      webauthn_credentials: [],
      ed25519_credentials: [],
      active_sessions: [
        {
          id: 'session-current',
          auth_method: 'email_otp',
          created_at: '2026-04-12T00:00:00.000Z',
          expires_at: '2026-04-12T01:00:00.000Z',
          ip: '203.0.113.30',
          user_agent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 SnapshotBrowser/123.45',
        },
        {
          id: 'session-peer',
          auth_method: 'webauthn',
          created_at: '2026-04-12T00:05:00.000Z',
          expires_at: '2026-04-12T01:05:00.000Z',
          ip: '',
          user_agent: '',
        },
      ],
    });

    renderRoute();

    expect(screen.getByText('Loading current user…')).toBeInTheDocument();
    expect(await screen.findByText(/"email": "user@example.com"/)).toBeInTheDocument();
    expect(screen.getByText('session-current')).toBeInTheDocument();
    expect(screen.getByText('email_otp')).toBeInTheDocument();
    expect(screen.getByText('203.0.113.30')).toBeInTheDocument();
    expect(
      screen.getByText('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) ...'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Unavailable')).toHaveLength(2);
    expect(screen.queryByText('null')).not.toBeInTheDocument();
    expect(sdkMocks.meFetch).toHaveBeenCalledTimes(1);
  });

  it('shows a route-owned /me load error', async () => {
    sdkMocks.sessionState.current = authenticatedSession();
    sdkMocks.meFetch.mockRejectedValueOnce(new Error('Unable to load current user.'));

    renderRoute();

    expect(await screen.findByText('Unable to load current user.')).toBeInTheDocument();
    expect(screen.queryByText('No active sessions.')).not.toBeInTheDocument();
  });

  it('ignores a stale /me response after local auth state is cleared', async () => {
    const user = userEvent.setup();
    sdkMocks.sessionState.current = authenticatedSession();

    let resolveMe: ((value: MockMe) => void) | undefined;
    sdkMocks.meFetch.mockImplementationOnce(
      () =>
        new Promise<MockMe>((resolve) => {
          resolveMe = resolve;
        }),
    );

    renderRoute();

    expect(screen.getByText('Loading current user…')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear local auth state' }));

    expect(sdkMocks.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/"status": "anonymous"/)).toBeInTheDocument();

    resolveMe?.({
      user_id: 'user-1',
      email: 'stale@example.com',
      webauthn_credentials: [],
      ed25519_credentials: [],
      active_sessions: [],
    });

    await waitFor(() => {
      expect(screen.queryByText(/stale@example.com/)).not.toBeInTheDocument();
    });
    expect(screen.getByText('No active sessions.')).toBeInTheDocument();
  });

  it('kicks one session and refreshes the local /me snapshot', async () => {
    const user = userEvent.setup();
    sdkMocks.sessionState.current = authenticatedSession();
    sdkMocks.meFetch
      .mockResolvedValueOnce({
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [],
        active_sessions: [
          activeSession({
            id: 'session-current',
            created_at: '2026-04-12T00:00:00.000Z',
            expires_at: '2026-04-12T01:00:00.000Z',
          }),
          activeSession({
            id: 'session-peer',
            created_at: '2026-04-12T00:05:00.000Z',
            expires_at: '2026-04-12T01:05:00.000Z',
          }),
        ],
      })
      .mockResolvedValueOnce({
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [],
        active_sessions: [
          activeSession({
            id: 'session-current',
            created_at: '2026-04-12T00:00:00.000Z',
            expires_at: '2026-04-12T01:00:00.000Z',
          }),
        ],
      });

    let resolveLogout: ((response: Response) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((resolve) => {
        resolveLogout = resolve;
      })),
    );

    renderRoute();

    await screen.findByText('session-peer');
    const buttons = screen.getAllByRole('button', { name: 'Kick' });
    const clickPromise = user.click(buttons[1]!);

    expect(await screen.findByRole('button', { name: 'Kicking...' })).toBeDisabled();

    resolveLogout?.(new Response(null, { status: 204 }));
    await clickPromise;

    await waitFor(() => {
      expect(screen.queryByText('session-peer')).not.toBeInTheDocument();
    });
    expect(sdkMocks.meFetch).toHaveBeenCalledTimes(2);
  });

  it('keeps kick success visible when follow-up /me refresh fails', async () => {
    const user = userEvent.setup();
    sdkMocks.sessionState.current = authenticatedSession();
    sdkMocks.meFetch
      .mockResolvedValueOnce({
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [],
        active_sessions: [
          activeSession({
            id: 'session-current',
            created_at: '2026-04-12T00:00:00.000Z',
            expires_at: '2026-04-12T01:00:00.000Z',
          }),
          activeSession({
            id: 'session-peer',
            created_at: '2026-04-12T00:05:00.000Z',
            expires_at: '2026-04-12T01:05:00.000Z',
          }),
        ],
      })
      .mockRejectedValueOnce(new Error('Unable to refresh current user data.'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })));

    renderRoute();

    await screen.findByText('session-peer');
    await user.click(screen.getAllByRole('button', { name: 'Kick' })[1]!);

    expect(await screen.findByText('Session updated, but current user data could not be refreshed.')).toBeInTheDocument();
    expect(screen.queryByText('Unable to kick session.')).not.toBeInTheDocument();
    expect(screen.getByText('session-peer')).toBeInTheDocument();
  });

  it('refreshes a legacy token before kicking a peer session', async () => {
    const user = userEvent.setup();
    sdkMocks.sessionState.current = {
      ...authenticatedSession(),
      accessToken: fakeLegacyAccessToken(),
    };
    sdkMocks.refresh.mockResolvedValueOnce({ accessToken: fakeAccessToken(['email_otp']) });
    sdkMocks.meFetch
      .mockResolvedValueOnce({
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [],
        active_sessions: [
          activeSession({
            id: 'session-current',
            created_at: '2026-04-12T00:00:00.000Z',
            expires_at: '2026-04-12T01:00:00.000Z',
          }),
          activeSession({
            id: 'session-peer',
            created_at: '2026-04-12T00:05:00.000Z',
            expires_at: '2026-04-12T01:05:00.000Z',
          }),
        ],
      })
      .mockResolvedValueOnce({
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [],
        active_sessions: [
          activeSession({
            id: 'session-current',
            created_at: '2026-04-12T00:00:00.000Z',
            expires_at: '2026-04-12T01:00:00.000Z',
          }),
        ],
      });
    const fetchMock = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    renderRoute();

    await screen.findByText('session-peer');
    await user.click(screen.getAllByRole('button', { name: 'Kick' })[1]!);

    expect(sdkMocks.refresh).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    const request = new Request('https://auth.example.com', init);
    expect(request.headers.get('authorization')).toBe(`Bearer ${fakeAccessToken(['email_otp'])}`);
    await waitFor(() => {
      expect(screen.queryByText('session-peer')).not.toBeInTheDocument();
    });
  });

  it('shows a kick error and allows retry', async () => {
    const user = userEvent.setup();
    sdkMocks.sessionState.current = authenticatedSession();
    sdkMocks.meFetch
      .mockResolvedValueOnce({
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [],
        active_sessions: [
          activeSession({
            id: 'session-current',
            created_at: '2026-04-12T00:00:00.000Z',
            expires_at: '2026-04-12T01:00:00.000Z',
          }),
          activeSession({
            id: 'session-peer',
            created_at: '2026-04-12T00:05:00.000Z',
            expires_at: '2026-04-12T01:05:00.000Z',
          }),
        ],
      })
      .mockResolvedValueOnce({
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [],
        active_sessions: [
          activeSession({
            id: 'session-current',
            created_at: '2026-04-12T00:00:00.000Z',
            expires_at: '2026-04-12T01:00:00.000Z',
          }),
        ],
      });
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    renderRoute();

    await screen.findByText('session-peer');
    const sessionsSection = screen.getByRole('region', { name: 'Active sessions' });

    await user.click(screen.getAllByRole('button', { name: 'Kick' })[1]!);
    expect(await within(sessionsSection).findByText('Unable to kick session.')).toBeInTheDocument();
    expect(sdkMocks.meFetch).toHaveBeenCalledTimes(1);

    await user.click(screen.getAllByRole('button', { name: 'Kick' })[1]!);

    await waitFor(() => {
      expect(within(sessionsSection).queryByText('Unable to kick session.')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByText('session-peer')).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sdkMocks.meFetch).toHaveBeenCalledTimes(2);
  });

  it('clears stored auth state and falls back to the hosted default auth origin', async () => {
    const user = userEvent.setup();
    sdkMocks.sessionState.current = authenticatedSession();
    sdkMocks.meFetch.mockResolvedValueOnce({
      user_id: 'user-1',
      email: 'user@example.com',
      webauthn_credentials: [],
      ed25519_credentials: [],
      active_sessions: [],
    });

    renderRoute();

    await screen.findByText(/"email": "user@example.com"/);
    await user.click(screen.getByRole('button', { name: 'Clear local auth state' }));

    expect(sdkMocks.logout).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(AUTH_ORIGIN_KEY)).toBe('https://auth.zccz14.com');
    expect(sdkMocks.createDemoSdk).toHaveBeenLastCalledWith('https://auth.zccz14.com');
    expect(screen.getByText(/"status": "anonymous"/)).toBeInTheDocument();
  });
});
