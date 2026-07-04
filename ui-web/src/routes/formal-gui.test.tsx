import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppRouter } from '@/app/router';
import { AdminRoute } from './admin';
import { HomeRoute } from './home';
import { LoginRoute } from './login';
import { SetupRoute } from './setup';

const sdk = {
  admin: {
    config: { fetch: vi.fn(), save: vi.fn() },
    databaseUrl: () => 'https://auth.example.com/admin/database',
    jwks: { list: vi.fn(), rotate: vi.fn() },
    setup: { fetch: vi.fn(), initialize: vi.fn() },
    users: vi.fn(),
  },
  ed25519: { register: vi.fn(), start: vi.fn(), verify: vi.fn() },
  email: { start: vi.fn(), verify: vi.fn() },
  me: { fetch: vi.fn() },
  passkey: { authenticate: vi.fn(), register: vi.fn() },
  session: {
    getState: vi.fn(),
    logout: vi.fn(),
    onChange: vi.fn(),
    refresh: vi.fn(),
  },
};

vi.mock('@/app/providers/demo-provider', () => ({
  DemoProvider: ({ children }: { children: ReactNode }) => children,
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
    setupState: {
      admin_ed25519: null,
      admin_user_id: 'admin-user',
      issuer: 'https://auth.example.com',
      rp_id: 'auth.example.com',
      smtp: null,
    },
  }),
}));

function LocationProbe() {
  const location = useLocation();

  return (
    <output aria-label="Current location">
      {location.pathname + location.search + location.hash}
    </output>
  );
}

describe('formal GUI routes', () => {
  it('renders the dedicated initialization page', () => {
    render(<SetupRoute />);

    expect(
      screen.getByRole('heading', { name: 'Initialize auth-mini' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Generate ED25519 key' }),
    ).toBeInTheDocument();
  });

  it('renders the dedicated login page with all sign-in methods', () => {
    render(
      <MemoryRouter
        initialEntries={[
          '/login?redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback',
        ]}
      >
        <LoginRoute />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Email',
      'ED25519',
    ]);
    expect(
      screen.queryByRole('tab', { name: 'PassKey' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sign In with PassKey' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'ED25519' })).toBeInTheDocument();
  });

  it('renders the home page with credential and session management', async () => {
    sdk.me.fetch.mockResolvedValue({
      active_sessions: [],
      ed25519_credentials: [],
      email: 'user@example.com',
      user_id: 'user-1',
      webauthn_credentials: [],
    });

    render(<HomeRoute />);

    expect(screen.getByRole('heading', { name: 'Email' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'PassKey' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'ED25519' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Active Sessions' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Verified email is active.'),
    ).toBeInTheDocument();
  });

  it('renders the administrator page', async () => {
    sdk.admin.config.fetch.mockResolvedValue({
      admin_ed25519: null,
      admin_user_id: 'admin-user',
      issuer: 'https://auth.example.com',
      rp_id: 'auth.example.com',
      smtp: null,
    });
    sdk.admin.jwks.list.mockResolvedValue({
      keys: [
        { slot: 'CURRENT', public_jwk: { kid: 'current-kid', kty: 'OKP' } },
        { slot: 'STANDBY', public_jwk: { kid: 'standby-kid', kty: 'OKP' } },
      ],
    });
    sdk.admin.jwks.rotate.mockResolvedValue({
      keys: [
        { slot: 'CURRENT', public_jwk: { kid: 'standby-kid', kty: 'OKP' } },
        { slot: 'STANDBY', public_jwk: { kid: 'fresh-standby-kid', kty: 'OKP' } },
      ],
    });
    sdk.admin.users.mockResolvedValue({ users: [] });
    const user = userEvent.setup();

    render(<AdminRoute />);

    expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Users' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'JWKs' })).toBeInTheDocument();
    expect(screen.getByText('CURRENT')).toBeInTheDocument();
    expect(screen.getByText('STANDBY')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'JWK Rotate' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'JWK Rotate' }));

    expect(sdk.admin.jwks.rotate).toHaveBeenCalledOnce();
    expect(await screen.findByText(/fresh-standby-kid/)).toBeInTheDocument();
  });

  it('redirects unknown pages to the default page', async () => {
    sdk.me.fetch.mockResolvedValue({
      active_sessions: [],
      ed25519_credentials: [],
      email: 'user@example.com',
      user_id: 'user-1',
      webauthn_credentials: [],
    });

    render(
      <MemoryRouter initialEntries={['/missing/page?next=%2Fadmin#setup']}>
        <AppRouter />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Email' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Current location')).toHaveTextContent('/');
  });
});
