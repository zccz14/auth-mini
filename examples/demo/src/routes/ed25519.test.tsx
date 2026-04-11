import { render, screen, waitFor } from '@testing-library/react';
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
    ed25519_credentials?: Array<unknown>;
    active_sessions?: Array<unknown>;
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

  const ed25519Register = vi.fn();
  const ed25519Start = vi.fn();
  const ed25519Verify = vi.fn();
  const meReload = vi.fn();

  return {
    createDemoSdk: vi.fn(() => ({
      email: { start: vi.fn(), verify: vi.fn() },
      ed25519: {
        register: ed25519Register,
        start: ed25519Start,
        verify: ed25519Verify,
      },
      me: { get: vi.fn(() => sessionState.current.me), reload: meReload },
      passkey: { register: vi.fn(), authenticate: vi.fn() },
      session: {
        getState: () => sessionState.current,
        onChange: vi.fn(() => vi.fn()),
        refresh: vi.fn(),
        logout: vi.fn(),
      },
      webauthn: { register: vi.fn(), authenticate: vi.fn() },
    })),
    ed25519Start,
    ed25519Verify,
    ed25519Register,
    meReload,
    persistDemoSession: vi.fn(),
    sessionState,
  };
});

vi.mock('@/lib/demo-sdk', () => ({
  createDemoSdk: sdkMocks.createDemoSdk,
  persistDemoSession: sdkMocks.persistDemoSession,
}));

describe('Ed25519Route', () => {
  beforeEach(() => {
    localStorage.clear();
    sdkMocks.createDemoSdk.mockClear();
    sdkMocks.ed25519Register.mockReset();
    sdkMocks.ed25519Start.mockReset();
    sdkMocks.ed25519Verify.mockReset();
    sdkMocks.meReload.mockReset();
    sdkMocks.persistDemoSession.mockReset();
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

  it('disables register when setup is not ready or no session is present', () => {
    render(
      <MemoryRouter initialEntries={['/ed25519']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: 'Register credential' }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        'Registering an ED25519 credential requires an existing session.',
      ),
    ).toBeInTheDocument();
  });

  it('registers a credential for the current signed-in user and refreshes credentials', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = {
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
        ed25519_credentials: [],
        active_sessions: [],
      },
    };
    sdkMocks.ed25519Register.mockResolvedValueOnce({
      id: 'cred-1',
      name: 'Laptop signer',
      public_key: 'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
    });
    sdkMocks.meReload.mockResolvedValueOnce({
      user_id: 'user-1',
      email: 'user@example.com',
      ed25519_credentials: [
        {
          id: 'cred-1',
          name: 'Laptop signer',
          public_key: 'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
        },
      ],
      active_sessions: [],
    });

    render(
      <MemoryRouter initialEntries={['/ed25519']}>
        <AppRouter />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Credential name'), 'Laptop signer');
    await user.type(
      screen.getByLabelText('Public key (base64url 32-byte)'),
      'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
    );
    await user.click(screen.getByRole('button', { name: 'Register credential' }));

    expect(sdkMocks.ed25519Register).toHaveBeenCalledWith({
      name: 'Laptop signer',
      public_key: 'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
    });
    expect(sdkMocks.meReload).toHaveBeenCalledTimes(1);
    expect(await screen.findAllByText(/"id": "cred-1"/)).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: 'Use last registered credential id' }),
    ).toBeEnabled();
  });

  it('keeps register disabled for invalid public key text', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = {
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
        ed25519_credentials: [],
        active_sessions: [],
      },
    };

    render(
      <MemoryRouter initialEntries={['/ed25519']}>
        <AppRouter />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByLabelText('Public key (base64url 32-byte)'),
      'bad-key',
    );

    expect(
      screen.getByText('Expected base64url-encoded 32-byte value'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Register credential' }),
    ).toBeDisabled();
  });

  it('signs in with credential id + seed and updates the shared session panel', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.ed25519Start.mockResolvedValueOnce({
      request_id: 'request-1',
      challenge: 'challenge-value',
    });
    sdkMocks.ed25519Verify.mockResolvedValueOnce({
      session_id: 'session-2',
      access_token: 'access-token-2',
      refresh_token: 'refresh-token-2',
      expires_in: 3600,
      token_type: 'Bearer',
    });
    sdkMocks.meReload.mockImplementation(async () => {
      sdkMocks.sessionState.current = {
        status: 'authenticated',
        authenticated: true,
        sessionId: 'session-2',
        accessToken: 'access-token-2',
        refreshToken: 'refresh-token-2',
        receivedAt: '2026-04-12T00:00:00.000Z',
        expiresAt: '2026-04-12T01:00:00.000Z',
        me: {
          user_id: 'user-2',
          email: 'user2@example.com',
          ed25519_credentials: [],
          active_sessions: [],
        },
      };

      return sdkMocks.sessionState.current.me;
    });

    render(
      <MemoryRouter initialEntries={['/ed25519']}>
        <AppRouter />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Credential id'), 'cred-1');
    await user.type(
      screen.getByLabelText('Seed (base64url 32-byte)'),
      '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM',
    );
    await user.click(
      screen.getByRole('button', { name: 'Sign in with private key' }),
    );

    expect(sdkMocks.ed25519Start).toHaveBeenCalledWith({
      credential_id: 'cred-1',
    });
    await waitFor(() => {
      expect(sdkMocks.ed25519Verify).toHaveBeenCalledWith({
        request_id: 'request-1',
        signature: expect.stringMatching(/^[A-Za-z0-9_-]+$/),
      });
    });
    expect(
      await screen.findByText(/"status": "authenticated"/),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/"session_id": "session-2"/),
    ).toBeInTheDocument();
  });

  it('keeps sign-in disabled when the credential id is blank or the seed is invalid', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');

    render(
      <MemoryRouter initialEntries={['/ed25519']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: 'Sign in with private key' }),
    ).toBeDisabled();

    await user.type(screen.getByLabelText('Seed (base64url 32-byte)'), 'bad-seed');

    expect(
      screen.getByText('Expected base64url-encoded 32-byte value'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sign in with private key' }),
    ).toBeDisabled();
  });

  it('keeps sign-in disabled until setup is ready', () => {
    render(
      <MemoryRouter initialEntries={['/ed25519']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: 'Sign in with private key' }),
    ).toBeDisabled();
    expect(
      screen.getByText('Complete setup before using ED25519 actions.'),
    ).toBeInTheDocument();
  });
});
