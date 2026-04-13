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
    created_at: string;
    expires_at: string;
  }>;
};

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
        refresh: vi.fn(),
        logout,
      },
      webauthn: { register: vi.fn(), authenticate: vi.fn() },
      ed25519: { register: vi.fn(), start: vi.fn(), verify: vi.fn() },
    })),
    listeners,
    logout,
    meFetch,
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
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    receivedAt: '2026-04-12T00:00:00.000Z',
    expiresAt: '2026-04-12T01:00:00.000Z',
  };
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
          created_at: '2026-04-12T00:00:00.000Z',
          expires_at: '2026-04-12T01:00:00.000Z',
        },
      ],
    });

    renderRoute();

    expect(screen.getByText('Loading current user…')).toBeInTheDocument();
    expect(await screen.findByText(/"email": "user@example.com"/)).toBeInTheDocument();
    expect(screen.getByText('session-current')).toBeInTheDocument();
    expect(sdkMocks.meFetch).toHaveBeenCalledTimes(1);
  });

  it('shows a route-owned /me load error', async () => {
    sdkMocks.sessionState.current = authenticatedSession();
    sdkMocks.meFetch.mockRejectedValueOnce(new Error('Unable to load current user.'));

    renderRoute();

    expect(await screen.findByText('Unable to load current user.')).toBeInTheDocument();
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
          {
            id: 'session-current',
            created_at: '2026-04-12T00:00:00.000Z',
            expires_at: '2026-04-12T01:00:00.000Z',
          },
          {
            id: 'session-peer',
            created_at: '2026-04-12T00:05:00.000Z',
            expires_at: '2026-04-12T01:05:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [],
        active_sessions: [
          {
            id: 'session-current',
            created_at: '2026-04-12T00:00:00.000Z',
            expires_at: '2026-04-12T01:00:00.000Z',
          },
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
          {
            id: 'session-current',
            created_at: '2026-04-12T00:00:00.000Z',
            expires_at: '2026-04-12T01:00:00.000Z',
          },
          {
            id: 'session-peer',
            created_at: '2026-04-12T00:05:00.000Z',
            expires_at: '2026-04-12T01:05:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [],
        active_sessions: [
          {
            id: 'session-current',
            created_at: '2026-04-12T00:00:00.000Z',
            expires_at: '2026-04-12T01:00:00.000Z',
          },
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
