import { render, screen } from '@testing-library/react';
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
  });

  return {
    createBrowserSdk: vi.fn(() => ({
      email: { start: vi.fn(), verify: vi.fn() },
      passkey: { register: vi.fn(), authenticate: vi.fn() },
      me: { get: vi.fn(() => sessionState.current.me), reload: vi.fn() },
      session: {
        getState: () => sessionState.current,
        onChange: vi.fn(() => vi.fn()),
        refresh: vi.fn(),
        logout,
      },
      webauthn: { register: vi.fn(), authenticate: vi.fn() },
    })),
    logout,
    sessionState,
  };
});

vi.mock('auth-mini/sdk/browser', () => ({
  createBrowserSdk: sdkMocks.createBrowserSdk,
}));

describe('SessionRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    sdkMocks.createBrowserSdk.mockClear();
    sdkMocks.logout.mockClear();
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

  it('clears stored auth state and returns the session route to waiting/anonymous', async () => {
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
    expect(localStorage.getItem(AUTH_ORIGIN_KEY)).toBeNull();
    expect(
      await screen.findByText(
        'auth-origin must be configured before interactive flows are enabled.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/"status": "anonymous"/)).toBeInTheDocument();
    expect(screen.getAllByText('null').length).toBeGreaterThan(0);
  });
});
