import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppRouter } from '@/app/router';
import { I18nProvider } from '@/lib/i18n';
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
      brand_background_image: '',
      brand_name: 'auth-mini',
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

function renderRoute(ui: ReactNode) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.lang = 'en';
});

describe('formal GUI routes', () => {
  it('renders the dedicated initialization page', () => {
    renderRoute(<SetupRoute />);

    expect(
      screen.getByRole('heading', { name: 'Initialize auth-mini' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Generate ED25519 key' }),
    ).toBeInTheDocument();
  });

  it('renders the dedicated login page with all sign-in methods', () => {
    renderRoute(
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

  it('switches the login form to Chinese without leaving the route', async () => {
    const user = userEvent.setup();
    renderRoute(
      <MemoryRouter initialEntries={['/login']}>
        <LoginRoute />
      </MemoryRouter>,
    );

    await user.selectOptions(screen.getByLabelText('Language'), 'zh-CN');

    expect(screen.getByRole('heading', { name: '登录' })).toBeInTheDocument();
    expect(screen.getByLabelText('邮箱地址')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '发送邮箱验证码' }),
    ).toBeInTheDocument();
  });

  it('renders the home page with credential and session management', async () => {
    sdk.me.fetch.mockResolvedValue({
      active_sessions: [],
      ed25519_credentials: [],
      email: 'user@example.com',
      user_id: 'user-1',
      webauthn_credentials: [],
    });

    renderRoute(<HomeRoute />);

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
      brand_background_image: '',
      brand_name: 'auth-mini',
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
        {
          slot: 'STANDBY',
          public_jwk: { kid: 'fresh-standby-kid', kty: 'OKP' },
        },
      ],
    });
    sdk.admin.config.save.mockResolvedValue({
      admin_ed25519: null,
      admin_user_id: 'admin-user',
      brand_background_image: 'https://cdn.example.com/login.jpg',
      brand_name: 'Example Auth',
      issuer: 'https://auth.example.com',
      rp_id: 'auth.example.com',
      smtp: null,
    });
    sdk.admin.users.mockResolvedValue({ users: [] });
    const user = userEvent.setup();

    renderRoute(<AdminRoute />);

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
    expect(screen.getByLabelText('Brand name')).toHaveValue('auth-mini');

    await user.clear(screen.getByLabelText('Brand name'));
    await user.type(screen.getByLabelText('Brand name'), 'Example Auth');
    await user.type(
      screen.getByLabelText('Brand background image'),
      'https://cdn.example.com/login.jpg',
    );
    await user.click(
      screen.getByRole('button', { name: 'Save configuration' }),
    );

    await waitFor(() =>
      expect(sdk.admin.config.save).toHaveBeenCalledWith({
        issuer: 'https://auth.example.com',
        rp_id: 'auth.example.com',
        brand_name: 'Example Auth',
        brand_background_image: 'https://cdn.example.com/login.jpg',
        smtp: null,
      }),
    );

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
