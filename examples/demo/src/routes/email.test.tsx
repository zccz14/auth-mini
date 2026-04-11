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

  const emailStart = vi.fn();
  const emailVerify = vi.fn();

  return {
    createBrowserSdk: vi.fn(() => ({
      email: { start: emailStart, verify: emailVerify },
      passkey: { register: vi.fn(), authenticate: vi.fn() },
      me: { get: vi.fn(() => null), reload: vi.fn() },
      session: {
        getState: () => sessionState.current,
        onChange: vi.fn(() => vi.fn()),
        refresh: vi.fn(),
        logout: vi.fn(),
      },
      webauthn: { register: vi.fn(), authenticate: vi.fn() },
    })),
    emailStart,
    emailVerify,
    sessionState,
  };
});

vi.mock('auth-mini/sdk/browser', () => ({
  createBrowserSdk: sdkMocks.createBrowserSdk,
}));

describe('EmailRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    sdkMocks.createBrowserSdk.mockClear();
    sdkMocks.emailStart.mockReset();
    sdkMocks.emailVerify.mockReset();
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

  it('disables the start button until auth origin is configured', () => {
    render(
      <MemoryRouter initialEntries={['/email']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: 'Start email sign-in' }),
    ).toBeDisabled();
  });

  it('renders email start results after a successful submit', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.emailStart.mockResolvedValueOnce({ ok: true, requestId: 'otp-1' });

    render(
      <MemoryRouter initialEntries={['/email']}>
        <AppRouter />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Email address'), 'user@example.com');
    await user.click(
      screen.getByRole('button', { name: 'Start email sign-in' }),
    );

    expect(sdkMocks.emailStart).toHaveBeenCalledWith({
      email: 'user@example.com',
    });
    expect(await screen.findByText(/"requestId": "otp-1"/)).toBeInTheDocument();
  });

  it('renders verify errors from the sdk', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.emailVerify.mockRejectedValueOnce(new Error('Invalid code'));

    render(
      <MemoryRouter initialEntries={['/email']}>
        <AppRouter />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Email address'), 'user@example.com');
    await user.type(screen.getByLabelText('One-time code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify OTP' }));

    expect(sdkMocks.emailVerify).toHaveBeenCalledWith({
      email: 'user@example.com',
      code: '123456',
    });
    expect(await screen.findByText('Invalid code')).toBeInTheDocument();
  });
});
