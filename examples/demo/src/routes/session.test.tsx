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
  me: {
    user_id: string;
    email: string;
    webauthn_credentials: Array<unknown>;
    active_sessions: Array<unknown>;
  } | null;
};

type MockActiveSession = {
  id: string;
  created_at: string;
  expires_at: string;
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
      me: null,
    } as MockSessionState,
  };

  const notify = () => {
    for (const listener of listeners) {
      listener(sessionState.current);
    }
  };

  const reloadMe = vi.fn(async () => {
    if (!sessionState.current.me) {
      throw new Error('No current user');
    }

    notify();
    return sessionState.current.me;
  });

  const logout = vi.fn(async () => {
    sessionState.current = {
      status: 'anonymous',
      authenticated: false,
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
      me: null,
    };
    notify();
  });

  return {
    createDemoSdk: vi.fn(() => ({
      email: { start: vi.fn(), verify: vi.fn() },
      passkey: { register: vi.fn(), authenticate: vi.fn() },
      me: { get: vi.fn(() => sessionState.current.me), reload: reloadMe },
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
    })),
    listeners,
    logout,
    notify,
    reloadMe,
    sessionState,
  };
});

vi.mock('@/lib/demo-sdk', () => ({
  createDemoSdk: sdkMocks.createDemoSdk,
  persistDemoSession: vi.fn(),
}));

describe('SessionRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    sdkMocks.createDemoSdk.mockClear();
    sdkMocks.logout.mockClear();
    sdkMocks.reloadMe.mockClear();
    sdkMocks.listeners.length = 0;
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
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
  });

  it('renders the anonymous session snapshot by default', () => {
    render(
      <MemoryRouter initialEntries={['/session']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByText('Current session')).toBeInTheDocument();
    expect(screen.getByText('Current user')).toBeInTheDocument();
    expect(screen.getByText(/"status": "anonymous"/)).toBeInTheDocument();
    expect(screen.getByText('null')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Clear local auth state' }),
    ).toBeInTheDocument();
  });

  it('renders the authenticated session and current user details', () => {
    sdkMocks.sessionState.current = {
      status: 'authenticated',
      authenticated: true,
      sessionId: 'session-1',
      accessToken: 'access-token',
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

    render(
      <MemoryRouter initialEntries={['/session']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByText(/"status": "authenticated"/)).toBeInTheDocument();
    expect(screen.getByText(/"sessionId": "session-1"/)).toBeInTheDocument();
    expect(screen.getAllByText(/"email": "user@example.com"/)).toHaveLength(2);
  });

  it('shows the current panels and an empty active sessions state when anonymous', () => {
    render(
      <MemoryRouter initialEntries={['/session']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByText('Current session')).toBeInTheDocument();
    expect(screen.getByText('Current user')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Active sessions' })).toBeInTheDocument();
    expect(screen.getByText('No active sessions.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kick' })).not.toBeInTheDocument();
  });

  it('shows the empty active sessions state when authenticated me has no active sessions', () => {
    sdkMocks.sessionState.current = {
      status: 'authenticated',
      authenticated: true,
      sessionId: 'session-current',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      receivedAt: '2026-04-12T00:00:00.000Z',
      expiresAt: '2026-04-12T01:00:00.000Z',
      me: {
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
        active_sessions: [],
      },
    };

    render(
      <MemoryRouter initialEntries={['/session']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Active sessions' })).toBeInTheDocument();
    expect(screen.getByText('No active sessions.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kick' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/"email": "user@example.com"/)).toHaveLength(2);
  });

  it('renders every active session row in original order, including the current session', () => {
    sdkMocks.sessionState.current = {
      status: 'authenticated',
      authenticated: true,
      sessionId: 'session-current',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      receivedAt: '2026-04-12T00:00:00.000Z',
      expiresAt: '2026-04-12T01:00:00.000Z',
      me: {
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
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
        ] satisfies MockActiveSession[],
      },
    };

    render(
      <MemoryRouter initialEntries={['/session']}>
        <AppRouter />
      </MemoryRouter>,
    );

    const sessionIdCells = screen.getAllByText(/^session-/);

    expect(screen.getByRole('columnheader', { name: 'Session ID' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Created At' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Expires At' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Action' })).toBeInTheDocument();
    expect(screen.getByText('session-current')).toBeInTheDocument();
    expect(screen.getByText('session-peer')).toBeInTheDocument();
    expect(screen.getByText('2026-04-12T00:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('2026-04-12T01:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('2026-04-12T00:05:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('2026-04-12T01:05:00.000Z')).toBeInTheDocument();
    expect(sessionIdCells.map((cell) => cell.textContent)).toEqual([
      'session-current',
      'session-peer',
    ]);
    expect(screen.getAllByRole('button', { name: 'Kick' })).toHaveLength(2);
    expect(screen.getByText(/"sessionId": "session-current"/)).toBeInTheDocument();
    expect(screen.getAllByText(/"email": "user@example.com"/)).toHaveLength(2);
  });

  it('kicks one session, shows row-level pending, and reloads the shared snapshot', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = {
      status: 'authenticated',
      authenticated: true,
      sessionId: 'session-current',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      receivedAt: '2026-04-12T00:00:00.000Z',
      expiresAt: '2026-04-12T01:00:00.000Z',
      me: {
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
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
        ] satisfies MockActiveSession[],
      },
    };

    let resolveLogout: ((response: Response) => void) | undefined;
    const logoutPromise = new Promise<Response>((resolve) => {
      resolveLogout = resolve;
    });

    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const request = input instanceof Request ? input : null;
      const normalizedUrl = request ? request.url : String(input);
      const normalizedMethod = request?.method ?? init?.method;
      const normalizedHeaders = new Headers(request?.headers ?? init?.headers);

      expect(normalizedUrl).toBe('https://auth.example.com/session/session-peer/logout');
      expect(normalizedMethod).toBe('POST');
      expect(normalizedHeaders.get('authorization')).toBe('Bearer access-token');

      sdkMocks.sessionState.current = {
        ...sdkMocks.sessionState.current,
        me: {
          ...sdkMocks.sessionState.current.me!,
          active_sessions: [
            {
              id: 'session-current',
              created_at: '2026-04-12T00:00:00.000Z',
              expires_at: '2026-04-12T01:00:00.000Z',
            },
          ],
        },
      };

      return logoutPromise;
    });

    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/session']}>
        <AppRouter />
      </MemoryRouter>,
    );

    const clickPromise = user.click(screen.getAllByRole('button', { name: 'Kick' })[1]!);

    expect(await screen.findByRole('button', { name: 'Kicking...' })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('button', { name: 'Kick' })[0]).toBeEnabled();

    resolveLogout?.(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await clickPromise;
    await screen.findByText('session-current');
    expect(screen.queryByText('session-peer')).not.toBeInTheDocument();
    expect(sdkMocks.reloadMe).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Unable to kick session.')).not.toBeInTheDocument();
    expect(screen.getAllByText(/"active_sessions": \[/)).toHaveLength(2);
    expect(screen.getAllByText(/"id": "session-current"/)).toHaveLength(2);
    expect(screen.queryByText(/"id": "session-peer"/)).not.toBeInTheDocument();
  });

  it('shows a section-scoped kick error and allows retry', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = {
      status: 'authenticated',
      authenticated: true,
      sessionId: 'session-current',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      receivedAt: '2026-04-12T00:00:00.000Z',
      expiresAt: '2026-04-12T01:00:00.000Z',
      me: {
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
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
        ] satisfies MockActiveSession[],
      },
    };

    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'request_failed' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/session']}>
        <AppRouter />
      </MemoryRouter>,
    );

    const sessionsSection = screen.getByRole('region', { name: 'Active sessions' });

    const kickButton = screen.getAllByRole('button', { name: 'Kick' })[1]!;
    await user.click(kickButton);

    const sectionError = await within(sessionsSection).findByText(
      'Unable to kick session.',
    );

    expect(sectionError).toBeInTheDocument();
    expect(screen.getAllByText('Unable to kick session.')).toHaveLength(1);
    expect(screen.getByText('session-peer')).toBeInTheDocument();
    expect(sdkMocks.reloadMe).not.toHaveBeenCalled();

    sdkMocks.sessionState.current = {
      ...sdkMocks.sessionState.current,
      me: {
        ...sdkMocks.sessionState.current.me!,
        active_sessions: [
          {
            id: 'session-current',
            created_at: '2026-04-12T00:00:00.000Z',
            expires_at: '2026-04-12T01:00:00.000Z',
          },
        ],
      },
    };

    await user.click(screen.getAllByRole('button', { name: 'Kick' })[1]!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('session-current')).toBeInTheDocument();
    expect(screen.queryByText('session-peer')).not.toBeInTheDocument();
    expect(within(sessionsSection).queryByText('Unable to kick session.')).not.toBeInTheDocument();
  });

  it('clears stored auth state and falls back to the hosted default auth origin', async () => {
    const user = userEvent.setup();
    sdkMocks.sessionState.current = {
      status: 'authenticated',
      authenticated: true,
      sessionId: 'session-1',
      accessToken: 'access-token',
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

    render(
      <MemoryRouter initialEntries={['/session']}>
        <AppRouter />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole('button', { name: 'Clear local auth state' }),
    );

    expect(sdkMocks.logout).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(AUTH_ORIGIN_KEY)).toBe(
      'https://auth.zccz14.com',
    );
    expect(sdkMocks.createDemoSdk).toHaveBeenLastCalledWith(
      'https://auth.zccz14.com',
    );
    expect(screen.getByText(/"status": "anonymous"/)).toBeInTheDocument();
    expect(screen.getAllByText('null').length).toBeGreaterThan(0);
  });
});
