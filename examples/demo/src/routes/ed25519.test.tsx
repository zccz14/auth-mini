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
  ed25519_credentials: Array<{
    id: string;
    name: string;
    public_key: string;
  }>;
  active_sessions: Array<unknown>;
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

  const ed25519Register = vi.fn();
  const ed25519Start = vi.fn();
  const ed25519Verify = vi.fn();
  const meFetch = vi.fn<() => Promise<MockMe>>();

  return {
    createDemoSdk: vi.fn(() => ({
      email: { start: vi.fn(), verify: vi.fn() },
      ed25519: {
        register: ed25519Register,
        start: ed25519Start,
        verify: ed25519Verify,
      },
      me: { fetch: meFetch },
      passkey: { register: vi.fn(), authenticate: vi.fn() },
      session: {
        getState: () => sessionState.current,
        onChange: vi.fn((listener: (nextSession: MockSessionState) => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        }),
        refresh: vi.fn(),
        logout: vi.fn(),
      },
      webauthn: { register: vi.fn(), authenticate: vi.fn() },
    })),
    ed25519Register,
    ed25519Start,
    ed25519Verify,
    meFetch,
    persistDemoSession: vi.fn(),
    sessionState,
  };
});

vi.mock('@/lib/demo-sdk', () => ({
  createDemoSdk: sdkMocks.createDemoSdk,
  persistDemoSession: sdkMocks.persistDemoSession,
}));

function getJsonPanel(title: string) {
  const heading = screen.getByRole('heading', { level: 3, name: title });
  const panel = heading.closest('section');
  expect(panel).not.toBeNull();
  return panel as HTMLElement;
}

function authenticatedSession(): MockSessionState {
  return {
    status: 'authenticated',
    authenticated: true,
    sessionId: 'session-1',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    receivedAt: '2026-04-12T00:00:00.000Z',
    expiresAt: '2026-04-12T01:00:00.000Z',
  };
}

function renderRoute() {
  render(
    <MemoryRouter initialEntries={['/ed25519']}>
      <AppRouter />
    </MemoryRouter>,
  );
}

describe('Ed25519Route', () => {
  beforeEach(() => {
    localStorage.clear();
    sdkMocks.createDemoSdk.mockClear();
    sdkMocks.ed25519Register.mockReset();
    sdkMocks.ed25519Start.mockReset();
    sdkMocks.ed25519Verify.mockReset();
    sdkMocks.meFetch.mockReset();
    sdkMocks.persistDemoSession.mockReset();
    sdkMocks.sessionState.current = {
      status: 'anonymous',
      authenticated: false,
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
    };
  });

  it('disables register when setup is not ready or no session is present', () => {
    renderRoute();

    expect(screen.getByRole('button', { name: 'Register credential' })).toBeDisabled();
    expect(screen.getByText('Registering an ED25519 credential requires an existing session.')).toBeInTheDocument();
  });

  it('loads current credentials from route-owned /me state', async () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession();
    sdkMocks.meFetch.mockResolvedValueOnce({
      user_id: 'user-1',
      email: 'user@example.com',
      webauthn_credentials: [],
      ed25519_credentials: [
        {
          id: 'cred-1',
          name: 'Laptop signer',
          public_key: 'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
        },
      ],
      active_sessions: [],
    });

    renderRoute();

    const currentCredentialsPanel = getJsonPanel('current credentials');
    expect(screen.getByText('Loading current credentials…')).toBeInTheDocument();
    await waitFor(() => {
      expect(within(currentCredentialsPanel).getByText(/Laptop signer/)).toBeInTheDocument();
    });
  });

  it('shows the /me error without falling through to an empty credentials panel', async () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession();
    sdkMocks.meFetch.mockRejectedValueOnce(new Error('Unable to load current credentials.'));

    renderRoute();

    const currentCredentialsPanel = getJsonPanel('current credentials');
    expect(await screen.findByText('Unable to load current credentials.')).toBeInTheDocument();
    expect(within(currentCredentialsPanel).queryByText('[]')).not.toBeInTheDocument();
    expect(within(currentCredentialsPanel).getByText('null')).toBeInTheDocument();
  });

  it('refreshes local /me after registration succeeds', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession();
    sdkMocks.meFetch
      .mockResolvedValueOnce({
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [],
        active_sessions: [],
      })
      .mockResolvedValueOnce({
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [
          {
            id: 'cred-1',
            name: 'Laptop signer',
            public_key: 'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
          },
        ],
        active_sessions: [],
      });
    sdkMocks.ed25519Register.mockResolvedValueOnce({
      id: 'cred-1',
      name: 'Laptop signer',
      public_key: 'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
    });

    renderRoute();

    const currentCredentialsPanel = getJsonPanel('current credentials');
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
    expect(sdkMocks.meFetch).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(within(currentCredentialsPanel).getByText(/cred-1/)).toBeInTheDocument();
    });
  });

  it('preserves registration success when follow-up /me refresh fails', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = authenticatedSession();
    sdkMocks.meFetch
      .mockResolvedValueOnce({
        user_id: 'user-1',
        email: 'user@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [],
        active_sessions: [],
      })
      .mockRejectedValueOnce(new Error('Unable to refresh current credential data.'));
    sdkMocks.ed25519Register.mockResolvedValueOnce({
      id: 'cred-1',
      name: 'Laptop signer',
      public_key: 'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
    });

    renderRoute();

    await user.type(screen.getByLabelText('Credential name'), 'Laptop signer');
    await user.type(
      screen.getByLabelText('Public key (base64url 32-byte)'),
      'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
    );
    await user.click(screen.getByRole('button', { name: 'Register credential' }));

    expect(await screen.findByText('Credential registered, but current credential data could not be refreshed.')).toBeInTheDocument();
    expect(screen.queryByText('Unable to refresh current credential data.')).not.toBeInTheDocument();
    expect(await screen.findByText(/"id": "cred-1"/)).toBeInTheDocument();
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
    sdkMocks.persistDemoSession.mockImplementation((_storage, _origin, tokens) => {
      sdkMocks.sessionState.current = {
        status: 'authenticated',
        authenticated: true,
        sessionId: tokens.session_id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        receivedAt: '2026-04-12T00:00:00.000Z',
        expiresAt: '2026-04-12T01:00:00.000Z',
      };
    });
    sdkMocks.meFetch.mockResolvedValueOnce({
      user_id: 'user-2',
      email: 'user2@example.com',
      webauthn_credentials: [],
      ed25519_credentials: [],
      active_sessions: [],
    });

    renderRoute();

    await user.type(screen.getByLabelText('Credential id'), 'cred-1');
    await user.type(
      screen.getByLabelText('Seed (base64url 32-byte)'),
      '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM',
    );
    await user.click(screen.getByRole('button', { name: 'Sign in with private key' }));

    expect(sdkMocks.ed25519Start).toHaveBeenCalledWith({ credential_id: 'cred-1' });
    await waitFor(() => {
      expect(sdkMocks.ed25519Verify).toHaveBeenCalledWith({
        request_id: 'request-1',
        signature: expect.stringMatching(/^[A-Za-z0-9_-]+$/),
      });
    });
    expect(await screen.findByText(/"status": "authenticated"/)).toBeInTheDocument();
    expect(await screen.findByText(/"session_id": "session-2"/)).toBeInTheDocument();
  });
});
