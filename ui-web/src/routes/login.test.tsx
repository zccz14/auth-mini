import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
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
    } as MockSessionState,
  };

  const emailStart = vi.fn();
  const emailVerify = vi.fn();
  const passkeyAuthenticate = vi.fn();
  const ed25519Start = vi.fn();
  const ed25519Verify = vi.fn();
  const setupFetch = vi.fn();
  const clearLocal = vi.fn();

  return {
    createDemoSdk: vi.fn(() => ({
      admin: { setup: { fetch: setupFetch } },
      email: { start: emailStart, verify: emailVerify },
      ed25519: {
        register: vi.fn(),
        start: ed25519Start,
        verify: ed25519Verify,
      },
      currentUser: { fetch: vi.fn() },
      passkey: { register: vi.fn(), authenticate: passkeyAuthenticate },
      session: {
        getState: () => sessionState.current,
        onChange: vi.fn(() => vi.fn()),
        refresh: vi.fn(),
        logout: vi.fn(),
        clearLocal,
      },
      webauthn: { register: vi.fn(), authenticate: vi.fn() },
    })),
    emailStart,
    emailVerify,
    passkeyAuthenticate,
    ed25519Start,
    ed25519Verify,
    setupFetch,
    clearLocal,
    persistDemoSession: vi.fn(),
    sendLoginCallback: vi.fn(),
    sessionState,
  };
});

vi.mock('@/lib/demo-sdk', () => ({
  createDemoSdk: sdkMocks.createDemoSdk,
  persistDemoSession: sdkMocks.persistDemoSession,
}));

vi.mock('@/lib/demo-ed25519', () => ({
  deriveEd25519PublicKey: vi.fn(() => Promise.resolve('public-key')),
  signEd25519Challenge: vi.fn(() => Promise.resolve('signature-1')),
  validateBase64Url32: vi.fn(() => ''),
}));

vi.mock('@/lib/login-callback', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/login-callback')>();

  return {
    ...actual,
    sendLoginCallback: sdkMocks.sendLoginCallback,
  };
});

function loginPath(
  redirectUri = 'https://app.example.com/callback',
  audience?: string,
) {
  const params = new URLSearchParams({
    redirect_uri: redirectUri,
    state: 'state-1',
  });
  if (audience) {
    params.set('aud', audience);
  }
  return `/login?${params.toString()}`;
}

function renderLogin(path = loginPath()) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>,
  );
}

async function expectButtonEnabled(name: string) {
  const button = await screen.findByRole('button', { name });
  await waitFor(() => expect(button).toBeEnabled());
  return button;
}

const INPUT_OTP_SELECTION_SYNC_DELAY_MS = 60;

afterEach(async () => {
  // input-otp schedules an uncancelled 50ms selection sync on blur/unmount.
  await act(async () => {
    await new Promise((resolve) =>
      setTimeout(resolve, INPUT_OTP_SELECTION_SYNC_DELAY_MS),
    );
  });
});

async function typeOneTimeCode(
  user: ReturnType<typeof userEvent.setup>,
  value: string,
) {
  const input = screen.getByLabelText('One-time code');
  await user.type(input, value);
  await waitFor(() => {
    expect(input).toHaveValue(value);
    expect(input).toHaveAttribute('data-input-otp-mss', '6');
    expect(input).toHaveAttribute('data-input-otp-mse', '6');
  });
  // input-otp schedules a final uncancelled 50ms selection sync after typing.
  await act(async () => {
    await new Promise((resolve) =>
      setTimeout(resolve, INPUT_OTP_SELECTION_SYNC_DELAY_MS),
    );
  });
}

describe('LoginRoute', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    localStorage.clear();
    sdkMocks.createDemoSdk.mockClear();
    sdkMocks.emailStart.mockReset();
    sdkMocks.emailVerify.mockReset();
    sdkMocks.passkeyAuthenticate.mockReset();
    sdkMocks.ed25519Start.mockReset();
    sdkMocks.ed25519Verify.mockReset();
    sdkMocks.setupFetch.mockReset();
    sdkMocks.clearLocal.mockReset();
    sdkMocks.setupFetch.mockResolvedValue({
      admin_ed25519: null,
      admin_user_id: 'admin-user',
      brand_background_image: '',
      brand_name: 'auth-mini',
      issuer: 'https://auth.example.com',
      rp_id: 'auth.example.com',
      smtp: null,
    });
    sdkMocks.persistDemoSession.mockReset();
    sdkMocks.persistDemoSession.mockImplementation(
      (_storage, _baseUrl, tokens) => {
        sdkMocks.sessionState.current = {
          status: 'authenticated',
          authenticated: true,
          sessionId: tokens.session_id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          receivedAt: new Date(Date.now()).toISOString(),
          expiresAt: new Date(
            Date.now() + tokens.expires_in * 1000,
          ).toISOString(),
        };
      },
    );
    sdkMocks.sendLoginCallback.mockReset();
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

  it('renders as a popup login page outside the demo shell', async () => {
    renderLogin();

    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Home' }),
    ).not.toBeInTheDocument();
  });

  it('always identifies the HTTPS application domain', async () => {
    renderLogin(loginPath('https://APP.Example.com:443/callback'));

    expect(
      await screen.findByText('You are signing in to'),
    ).toBeInTheDocument();
    expect(screen.getByText('app.example.com')).toBeInTheDocument();
  });

  it('identifies Auth Mini itself when no redirect is requested', async () => {
    renderLogin('/login');

    expect(
      await screen.findByText('You are signing in to Auth Mini'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('This session is for Auth Mini itself.'),
    ).toBeInTheDocument();
    expect(screen.getByText('auth.example.com')).toBeInTheDocument();
  });

  it('identifies a local app and its requested audience in both languages', async () => {
    const user = userEvent.setup();
    renderLogin(loginPath('http://localhost:5173/callback', 'app.ntnl.io'));

    expect(
      await screen.findByText('Local development app'),
    ).toBeInTheDocument();
    expect(screen.getByText('localhost:5173')).toBeInTheDocument();
    expect(screen.getByText('Requesting access to')).toBeInTheDocument();
    expect(screen.getByText('app.ntnl.io')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Language'), 'zh-CN');

    expect(screen.getByText('本地开发应用')).toBeInTheDocument();
    expect(screen.getByText('请求访问')).toBeInTheDocument();
  });

  it('renders configured brand name and login background image', async () => {
    sdkMocks.setupFetch.mockResolvedValueOnce({
      admin_ed25519: null,
      admin_user_id: 'admin-user',
      brand_background_image: 'https://cdn.example.com/login.jpg',
      brand_name: 'Example Auth',
      issuer: 'https://auth.example.com',
      rp_id: 'auth.example.com',
      smtp: null,
    });

    renderLogin();

    expect(await screen.findByText('Example Auth')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Example Auth logo' }),
    ).toHaveAttribute('src', '/auth-mini-logo.png');
    expect(screen.getByRole('main')).toHaveStyle({
      backgroundImage: 'url("https://cdn.example.com/login.jpg")',
    });
  });

  it('redirects with a JWT after email verification succeeds', async () => {
    const user = userEvent.setup();
    sdkMocks.emailStart.mockResolvedValueOnce({ ok: true });
    sdkMocks.emailVerify.mockResolvedValueOnce({
      sessionId: 'session-email',
      accessToken: 'jwt-email',
      refreshToken: 'refresh-email',
      receivedAt: '2026-06-30T00:00:00.000Z',
      expiresAt: '2026-06-30T01:00:00.000Z',
    });

    renderLogin();

    await user.type(screen.getByLabelText('Email address'), 'user@example.com');
    await user.click(await expectButtonEnabled('Send email code'));
    expect(
      await screen.findByText('Check your email for the one-time code.'),
    ).toBeInTheDocument();

    await typeOneTimeCode(user, '123456');
    await user.click(await expectButtonEnabled('Verify and continue'));

    expect(sdkMocks.emailVerify).toHaveBeenCalledWith({
      email: 'user@example.com',
      code: '123456',
      redirect_uri: 'https://app.example.com/callback',
    });
    expect(sdkMocks.sendLoginCallback).toHaveBeenCalledWith(
      'https://app.example.com/callback#access_token=jwt-email&token_type=Bearer&session_id=session-email&refresh_token=refresh-email&expires_in=3600&expires_at=2026-06-30T01%3A00%3A00.000Z&state=state-1',
    );
    expect(sdkMocks.clearLocal).toHaveBeenCalledTimes(1);
  });

  it('redirects when redirect_uri is on the document query before the hash route', async () => {
    const user = userEvent.setup();
    sdkMocks.emailStart.mockResolvedValueOnce({ ok: true });
    sdkMocks.emailVerify.mockResolvedValueOnce({
      sessionId: 'session-document-query',
      accessToken: 'jwt-document-query',
      refreshToken: 'refresh-document-query',
      receivedAt: '2026-06-30T00:00:00.000Z',
      expiresAt: '2026-06-30T01:00:00.000Z',
    });
    window.history.pushState(
      {},
      '',
      '/web/?redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback&state=state-document#/login',
    );

    renderLogin('/login');

    await user.type(screen.getByLabelText('Email address'), 'user@example.com');
    await user.click(await expectButtonEnabled('Send email code'));
    await typeOneTimeCode(user, '123456');
    await user.click(await expectButtonEnabled('Verify and continue'));

    expect(sdkMocks.sendLoginCallback).toHaveBeenCalledWith(
      'https://app.example.com/callback#access_token=jwt-document-query&token_type=Bearer&session_id=session-document-query&refresh_token=refresh-document-query&expires_in=3600&expires_at=2026-06-30T01%3A00%3A00.000Z&state=state-document',
    );
  });

  it('redirects with a JWT after passkey authentication succeeds', async () => {
    const user = userEvent.setup();
    sdkMocks.passkeyAuthenticate.mockResolvedValueOnce({
      sessionId: 'session-passkey',
      accessToken: 'jwt-passkey',
      refreshToken: 'refresh-passkey',
      receivedAt: '2026-06-30T00:00:00.000Z',
      expiresAt: '2026-06-30T01:00:00.000Z',
    });

    renderLogin();

    await user.click(await expectButtonEnabled('Sign In with PassKey'));

    expect(sdkMocks.passkeyAuthenticate).toHaveBeenCalledWith({
      redirect_uri: 'https://app.example.com/callback',
    });
    expect(sdkMocks.clearLocal).toHaveBeenCalledTimes(1);
    expect(sdkMocks.sendLoginCallback).toHaveBeenCalledWith(
      'https://app.example.com/callback#access_token=jwt-passkey&token_type=Bearer&session_id=session-passkey&refresh_token=refresh-passkey&expires_in=3600&expires_at=2026-06-30T01%3A00%3A00.000Z&state=state-1',
    );
  });

  it('hides passkey sign-in when rp_id is not configured', async () => {
    sdkMocks.setupFetch.mockResolvedValueOnce({
      admin_ed25519: null,
      admin_user_id: 'admin-user',
      issuer: 'https://auth.example.com',
      rp_id: '',
      smtp: null,
    });

    renderLogin();

    await waitFor(() => expect(sdkMocks.setupFetch).toHaveBeenCalled());

    expect(
      screen.queryByRole('button', { name: 'Sign In with PassKey' }),
    ).not.toBeInTheDocument();
  });

  it('redirects with a JWT after ED25519 authentication succeeds', async () => {
    const user = userEvent.setup();
    sdkMocks.ed25519Start.mockResolvedValueOnce({
      request_id: 'request-1',
      challenge: 'challenge-1',
    });
    sdkMocks.ed25519Verify.mockResolvedValueOnce({
      session_id: 'session-ed25519',
      access_token: 'jwt-ed25519',
      refresh_token: 'refresh-ed25519',
      expires_in: 900,
      token_type: 'Bearer',
    });
    vi.spyOn(Date, 'now').mockReturnValue(
      new Date('2026-06-30T00:00:00.000Z').getTime(),
    );

    renderLogin(loginPath('https://app.example.com/#/callback?next=%2Fapp'));

    await user.click(screen.getByRole('tab', { name: 'ED25519' }));
    await user.type(
      screen.getByLabelText('Seed (base64url 32-byte)'),
      '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM',
    );
    await user.click(await expectButtonEnabled('Sign in with ED25519'));

    expect(sdkMocks.ed25519Start).toHaveBeenCalledWith({
      public_key: 'public-key',
    });
    expect(sdkMocks.ed25519Verify).toHaveBeenCalledWith({
      request_id: 'request-1',
      signature: 'signature-1',
      redirect_uri: 'https://app.example.com/#/callback?next=%2Fapp',
    });
    expect(sdkMocks.persistDemoSession).not.toHaveBeenCalled();
    expect(sdkMocks.clearLocal).toHaveBeenCalledTimes(1);
    expect(sdkMocks.sendLoginCallback).toHaveBeenCalledWith(
      'https://app.example.com/#/callback?next=%2Fapp&access_token=jwt-ed25519&token_type=Bearer&session_id=session-ed25519&refresh_token=refresh-ed25519&expires_in=900&expires_at=2026-06-30T00%3A15%3A00.000Z&state=state-1',
    );

    vi.mocked(Date.now).mockRestore();
  });

  it('signs in locally when redirect_uri is missing', async () => {
    const user = userEvent.setup();
    sdkMocks.emailStart.mockResolvedValueOnce({ ok: true });
    sdkMocks.emailVerify.mockResolvedValueOnce({
      sessionId: 'session-local',
      accessToken: 'jwt-local',
      refreshToken: 'refresh-local',
      receivedAt: '2026-06-30T00:00:00.000Z',
      expiresAt: '2026-06-30T01:00:00.000Z',
    });

    renderLogin('/login');

    await user.type(screen.getByLabelText('Email address'), 'user@example.com');
    await user.click(await expectButtonEnabled('Send email code'));
    await typeOneTimeCode(user, '123456');
    await user.click(await expectButtonEnabled('Verify and continue'));

    expect(sdkMocks.persistDemoSession).toHaveBeenCalledWith(
      localStorage,
      'http://localhost:3000/',
      {
        session_id: 'session-local',
        access_token: 'jwt-local',
        refresh_token: 'refresh-local',
        expires_in: 3600,
        token_type: 'Bearer',
      },
    );
    expect(sdkMocks.emailVerify).toHaveBeenCalledWith({
      email: 'user@example.com',
      code: '123456',
    });
    expect(sdkMocks.sendLoginCallback).not.toHaveBeenCalled();
    expect(sdkMocks.clearLocal).not.toHaveBeenCalled();
    expect(
      await screen.findByRole('heading', { name: 'Account' }),
    ).toBeInTheDocument();
  });

  it('passes redirect_uri and aud when a local app verifies login', async () => {
    const user = userEvent.setup();
    sdkMocks.emailStart.mockResolvedValueOnce({ ok: true });
    sdkMocks.emailVerify.mockResolvedValueOnce({
      sessionId: 'session-local-app',
      accessToken: 'jwt-local-app',
      refreshToken: 'refresh-local-app',
      receivedAt: '2026-06-30T00:00:00.000Z',
      expiresAt: '2026-06-30T01:00:00.000Z',
    });

    renderLogin(loginPath('http://127.0.0.1:4173/callback', 'app.ntnl.io'));

    await user.type(screen.getByLabelText('Email address'), 'user@example.com');
    await user.click(await expectButtonEnabled('Send email code'));
    await typeOneTimeCode(user, '123456');
    await user.click(await expectButtonEnabled('Verify and continue'));

    expect(sdkMocks.emailVerify).toHaveBeenCalledWith({
      email: 'user@example.com',
      code: '123456',
      redirect_uri: 'http://127.0.0.1:4173/callback',
      aud: 'app.ntnl.io',
    });
  });
});
