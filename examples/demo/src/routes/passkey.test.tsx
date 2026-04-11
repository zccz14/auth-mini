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

  const passkeyRegister = vi.fn();
  const passkeyAuthenticate = vi.fn();

  return {
    createBrowserSdk: vi.fn(() => ({
      email: { start: vi.fn(), verify: vi.fn() },
      passkey: { register: passkeyRegister, authenticate: passkeyAuthenticate },
      me: { get: vi.fn(() => null), reload: vi.fn() },
      session: {
        getState: () => sessionState.current,
        onChange: vi.fn(() => vi.fn()),
        refresh: vi.fn(),
        logout: vi.fn(),
      },
      webauthn: { register: vi.fn(), authenticate: vi.fn() },
    })),
    passkeyRegister,
    passkeyAuthenticate,
    sessionState,
  };
});

vi.mock('auth-mini/sdk/browser', () => ({
  createBrowserSdk: sdkMocks.createBrowserSdk,
}));

describe('PasskeyRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    sdkMocks.createBrowserSdk.mockClear();
    sdkMocks.passkeyRegister.mockReset();
    sdkMocks.passkeyAuthenticate.mockReset();
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
  });

  it('renders both register and sign-in actions', () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');

    render(
      <MemoryRouter initialEntries={['/passkey']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: 'Register passkey' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sign in with passkey' }),
    ).toBeInTheDocument();
  });

  it('keeps passkey registration disabled for anonymous state', () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');

    render(
      <MemoryRouter initialEntries={['/passkey']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: 'Register passkey' }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        'Register a passkey after signing in with an existing session.',
      ),
    ).toBeInTheDocument();
  });

  it('renders passkey register results for authenticated users', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
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
    sdkMocks.passkeyRegister.mockResolvedValueOnce({
      ok: true,
      credentialId: 'cred-1',
    });

    render(
      <MemoryRouter initialEntries={['/passkey']}>
        <AppRouter />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Register passkey' }));

    expect(sdkMocks.passkeyRegister).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(/"credentialId": "cred-1"/),
    ).toBeInTheDocument();
  });
});
