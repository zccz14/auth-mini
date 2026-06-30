import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminRoute } from './admin';
import { CredentialsRoute } from './credentials';
import { HomeRoute } from './home';
import { LoginRoute } from './login';
import { SetupRoute } from './setup';

const sdk = {
  admin: {
    config: { fetch: vi.fn(), save: vi.fn() },
    databaseUrl: () => 'https://auth.example.com/admin/database',
    setup: { fetch: vi.fn(), initialize: vi.fn() },
    users: vi.fn(),
  },
  ed25519: { register: vi.fn(), start: vi.fn(), verify: vi.fn() },
  email: { start: vi.fn(), verify: vi.fn() },
  me: { fetch: vi.fn() },
  passkey: { authenticate: vi.fn(), register: vi.fn() },
  session: { getState: vi.fn(), logout: vi.fn(), onChange: vi.fn(), refresh: vi.fn() },
};

vi.mock('@/app/providers/demo-provider', () => ({
  useDemo: () => ({
    adoptDemoSession: vi.fn(),
    clearLocalAuthState: vi.fn(),
    config: {
      resolvedServerBaseUrl: 'https://auth.example.com/',
      serverBaseUrl: '..',
      status: 'ready',
    },
    reloadSetupState: vi.fn(),
    sdk,
    session: {
      accessToken: 'token',
      authenticated: true,
      refreshToken: 'refresh-token',
      sessionId: 'session-current',
    },
    setupError: '',
    setupLoading: false,
    setupState: { admin_user_id: 'admin-user' },
  }),
}));

describe('formal GUI routes', () => {
  it('renders the dedicated initialization page', () => {
    render(<SetupRoute />);

    expect(screen.getByRole('heading', { name: 'Initialize auth-mini' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate ED25519 key' })).toBeInTheDocument();
  });

  it('renders the dedicated login page with all sign-in methods', () => {
    render(<LoginRoute />);

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Passkey' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'ED25519' })).toBeInTheDocument();
  });

  it('renders the user account home page', () => {
    sdk.me.fetch.mockResolvedValue({
      active_sessions: [],
      ed25519_credentials: [],
      email: 'user@example.com',
      user_id: 'user-1',
      webauthn_credentials: [],
    });

    render(<HomeRoute />);

    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument();
  });

  it('renders the merged credential management page', () => {
    sdk.me.fetch.mockResolvedValue({
      active_sessions: [],
      ed25519_credentials: [],
      email: 'user@example.com',
      user_id: 'user-1',
      webauthn_credentials: [],
    });

    render(<CredentialsRoute />);

    expect(screen.getByRole('heading', { name: 'Credentials' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Passkeys' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ED25519' })).toBeInTheDocument();
  });

  it('renders the administrator page', async () => {
    sdk.admin.config.fetch.mockResolvedValue({
      admin_ed25519: null,
      admin_user_id: 'admin-user',
      issuer: 'https://auth.example.com',
      origins: [],
      smtp: null,
    });
    sdk.admin.users.mockResolvedValue({ users: [] });

    render(<AdminRoute />);

    expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument();
  });
});
