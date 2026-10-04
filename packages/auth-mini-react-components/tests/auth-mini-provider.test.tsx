import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionSnapshot } from 'auth-mini/sdk/browser';
import { AuthMiniProvider, useAuthMini } from '../src/auth-mini-provider.js';

const { createBrowserSdk, session, jwtVerify } = vi.hoisted(() => {
  const session = {
    getState: vi.fn(),
    onChange: vi.fn(),
    acceptRedirectCallback: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    clearLocal: vi.fn(),
  };

  return {
    createBrowserSdk: vi.fn(() => ({ session })),
    jwtVerify: vi.fn(),
    session,
  };
});

vi.mock('auth-mini/sdk/browser', () => ({
  createBrowserSdk,
}));

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => vi.fn()),
  jwtVerify,
}));

function timeResponse() {
  const now = Date.now();
  return new Response(
    JSON.stringify({
      now: Math.floor(now / 1000),
      now_ms: now,
      iso: new Date(now).toISOString(),
    }),
    { headers: { 'content-type': 'application/json' } },
  );
}

const recovering = {
  status: 'recovering' as const,
  authenticated: false,
  sessionId: null,
  accessToken: null,
  refreshToken: null,
  receivedAt: null,
  expiresAt: null,
};

const anonymous = {
  ...recovering,
  status: 'anonymous' as const,
};

const authenticated = {
  ...recovering,
  status: 'authenticated' as const,
  authenticated: true,
  sessionId: 'session',
  accessToken: 'access',
  refreshToken: 'refresh',
};

function VerificationReader() {
  const { verificationFailure } = useAuthMini();
  return (
    <output data-testid="verification">
      {verificationFailure
        ? `${verificationFailure.code ?? ''}|${verificationFailure.reason}`
        : 'none'}
    </output>
  );
}

function SessionReader({ name }: { name: string }) {
  const { error, isAuthenticated, isReady, session, signIn } = useAuthMini();
  return (
    <>
      <output data-testid={name}>{session?.status ?? 'initializing'}</output>
      <output data-testid={`${name}-ready`}>{String(isReady)}</output>
      <output data-testid={`${name}-authenticated`}>
        {String(isAuthenticated)}
      </output>
      {error ? <p role="alert">{error.message}</p> : null}
      <button onClick={signIn} type="button">
        Sign in
      </button>
    </>
  );
}

function PasskeyRegistrationButton({
  onOpen,
}: {
  onOpen: (popup: Window | null) => void;
}) {
  const { openPasskeyRegistrationPage } = useAuthMini();
  return (
    <button onClick={() => onOpen(openPasskeyRegistrationPage())} type="button">
      Register passkey
    </button>
  );
}

describe('AuthMiniProvider', () => {
  let listener: ((next: SessionSnapshot) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(timeResponse()));
    jwtVerify.mockResolvedValue({ payload: {} });
    listener = undefined;
    window.history.replaceState(null, '', 'https://app.example.test/');
    window.sessionStorage.clear();
    session.getState.mockReturnValue(recovering);
    session.onChange.mockImplementation((nextListener) => {
      listener = nextListener;
      return () => undefined;
    });
    session.acceptRedirectCallback.mockResolvedValue({});
    // The Browser SDK publishes an anonymous snapshot when clearLocal is
    // applied; replay that contract so an audience restart drives the login
    // redirect through the existing anonymous-session path.
    session.clearLocal.mockImplementation(() => listener?.(anonymous));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('initializes one SDK and shares its session with every descendant', () => {
    render(
      <AuthMiniProvider
        autoRedirectToLogin={false}
        authMiniBaseUrl="https://auth.example.test"
      >
        <SessionReader name="first" />
        <SessionReader name="second" />
      </AuthMiniProvider>,
    );

    expect(createBrowserSdk).toHaveBeenCalledOnce();
    expect(session.onChange).toHaveBeenCalledOnce();
    expect(screen.getByTestId('first')).toHaveTextContent('recovering');
    expect(screen.getByTestId('second')).toHaveTextContent('recovering');
    expect(screen.getByTestId('first-ready')).toHaveTextContent('false');

    act(() => listener?.(authenticated));

    expect(screen.getByTestId('first')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('second')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('first-ready')).toHaveTextContent('true');
  });

  it('exposes a verification failure for diagnostics and clears it after a successful retry', async () => {
    const expired = Object.assign(
      new Error('"exp" claim timestamp check failed'),
      { name: 'JWTExpired', code: 'ERR_JWT_EXPIRED' },
    );
    jwtVerify.mockRejectedValueOnce(expired);

    render(
      <AuthMiniProvider
        autoRedirectToLogin={false}
        authMiniBaseUrl="https://auth.example.test"
      >
        <VerificationReader />
      </AuthMiniProvider>,
    );

    act(() => listener?.(authenticated));
    await waitFor(() =>
      expect(screen.getByTestId('verification')).toHaveTextContent(
        'ERR_JWT_EXPIRED',
      ),
    );
    expect(screen.getByTestId('verification')).toHaveTextContent(
      'JWTExpired: "exp" claim timestamp check failed',
    );

    jwtVerify.mockResolvedValue({ payload: {} });
    act(() => listener?.({ ...authenticated, accessToken: 'access-2' }));
    await waitFor(() =>
      expect(screen.getByTestId('verification')).toHaveTextContent('none'),
    );
  });

  it('deletes a session that misses configured audiences and starts a login', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('crypto', { randomUUID: () => 'state-123' });
    jwtVerify.mockResolvedValue({ payload: { aud: ['other.example.test'] } });

    render(
      <AuthMiniProvider
        audiences={['app.example.test', 'other.example.test']}
        autoRedirectToLogin
        authMiniBaseUrl="https://auth.example.test"
      >
        <SessionReader name="session" />
      </AuthMiniProvider>,
    );
    await act(async () => {});

    act(() => listener?.(authenticated));

    await waitFor(() => expect(session.clearLocal).toHaveBeenCalledOnce());
    expect(session.logout).not.toHaveBeenCalled();
    expect(
      window.sessionStorage.getItem(
        'auth-mini.react.audience-relogin:https://auth.example.test/',
      ),
    ).toBe('1');
    expect(
      window.sessionStorage.getItem(
        'auth-mini.react.login.state:https://auth.example.test/',
      ),
    ).toBe('state-123');
  });

  it('deletes a session that jose rejects on the audience claim', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('crypto', { randomUUID: () => 'state-123' });
    const audienceRejection = Object.assign(
      new Error('unexpected "aud" claim value'),
      {
        name: 'JWTClaimValidationFailed',
        code: 'ERR_JWT_CLAIM_VALIDATION_FAILED',
        claim: 'aud',
      },
    );
    jwtVerify.mockRejectedValueOnce(audienceRejection);

    render(
      <AuthMiniProvider
        audience="app.example.test"
        autoRedirectToLogin
        authMiniBaseUrl="https://auth.example.test"
      >
        <VerificationReader />
      </AuthMiniProvider>,
    );
    await act(async () => {});

    act(() => listener?.(authenticated));

    await waitFor(() => expect(session.clearLocal).toHaveBeenCalledOnce());
    expect(
      window.sessionStorage.getItem(
        'auth-mini.react.login.state:https://auth.example.test/',
      ),
    ).toBe('state-123');
    expect(screen.getByTestId('verification')).toHaveTextContent('none');
  });

  it('does not restart a second time and reports the missed audiences', async () => {
    window.sessionStorage.setItem(
      'auth-mini.react.audience-relogin:https://auth.example.test/',
      '1',
    );
    jwtVerify.mockResolvedValue({ payload: { aud: ['other.example.test'] } });

    render(
      <AuthMiniProvider
        audiences={['app.example.test', 'other.example.test']}
        autoRedirectToLogin
        authMiniBaseUrl="https://auth.example.test"
      >
        <VerificationReader />
      </AuthMiniProvider>,
    );
    await act(async () => {});

    act(() => listener?.(authenticated));

    await waitFor(() =>
      expect(screen.getByTestId('verification')).toHaveTextContent(
        'ERR_JWT_CLAIM_VALIDATION_FAILED',
      ),
    );
    expect(screen.getByTestId('verification')).toHaveTextContent(
      'missing app.example.test',
    );
    expect(session.clearLocal).not.toHaveBeenCalled();
    expect(session.logout).not.toHaveBeenCalled();
    expect(
      window.sessionStorage.getItem(
        'auth-mini.react.login.state:https://auth.example.test/',
      ),
    ).toBeNull();
    expect(
      window.sessionStorage.getItem(
        'auth-mini.react.audience-relogin:https://auth.example.test/',
      ),
    ).toBe('1');
  });

  it('clears the restart marker once every configured audience is covered', async () => {
    window.sessionStorage.setItem(
      'auth-mini.react.audience-relogin:https://auth.example.test/',
      '1',
    );
    jwtVerify.mockResolvedValue({
      payload: { aud: ['app.example.test', 'other.example.test'] },
    });

    render(
      <AuthMiniProvider
        audiences={['app.example.test', 'other.example.test']}
        autoRedirectToLogin={false}
        authMiniBaseUrl="https://auth.example.test"
      >
        <SessionReader name="session" />
      </AuthMiniProvider>,
    );
    await act(async () => {});

    act(() => listener?.(authenticated));

    await waitFor(() =>
      expect(screen.getByTestId('session-authenticated')).toHaveTextContent(
        'true',
      ),
    );
    expect(
      window.sessionStorage.getItem(
        'auth-mini.react.audience-relogin:https://auth.example.test/',
      ),
    ).toBeNull();
    expect(session.clearLocal).not.toHaveBeenCalled();
  });

  it('skips the audience-coverage check when no audience set is configured', async () => {
    jwtVerify.mockResolvedValue({
      payload: { aud: ['unrelated.example.test'] },
    });

    render(
      <AuthMiniProvider
        autoRedirectToLogin={false}
        authMiniBaseUrl="https://auth.example.test"
      >
        <SessionReader name="session" />
      </AuthMiniProvider>,
    );
    await act(async () => {});

    act(() => listener?.(authenticated));

    await waitFor(() =>
      expect(screen.getByTestId('session-authenticated')).toHaveTextContent(
        'true',
      ),
    );
    expect(session.clearLocal).not.toHaveBeenCalled();
    expect(
      window.sessionStorage.getItem(
        'auth-mini.react.audience-relogin:https://auth.example.test/',
      ),
    ).toBeNull();
  });

  it('adopts a trusted redirect for the whole application', async () => {
    window.history.replaceState(
      null,
      '',
      'https://app.example.test/callback#access_token=access&token_type=Bearer&session_id=session&refresh_token=refresh&expires_in=900&state=state-123',
    );
    window.sessionStorage.setItem(
      'auth-mini.react.login.state:https://auth.example.test/',
      'state-123',
    );
    window.sessionStorage.setItem('host-app-value', 'preserved');
    session.getState.mockReturnValue(anonymous);

    render(
      <AuthMiniProvider
        autoRedirectToLogin
        authMiniBaseUrl="https://auth.example.test"
      >
        <SessionReader name="session" />
      </AuthMiniProvider>,
    );

    await waitFor(() =>
      expect(session.acceptRedirectCallback).toHaveBeenCalledWith({
        access_token: 'access',
        session_id: 'session',
        refresh_token: 'refresh',
        expires_in: 900,
      }),
    );
    expect(window.location.href).toBe('https://app.example.test/callback');
    expect(window.sessionStorage.getItem('host-app-value')).toBe('preserved');
    expect(
      window.sessionStorage.getItem(
        'auth-mini.react.login.state:https://auth.example.test/',
      ),
    ).toBeNull();
  });

  it('rejects an untrusted redirect before it reaches the SDK', async () => {
    window.history.replaceState(
      null,
      '',
      'https://app.example.test/callback#access_token=access&token_type=Bearer&session_id=session&refresh_token=refresh&expires_in=900&state=untrusted',
    );
    window.sessionStorage.setItem(
      'auth-mini.react.login.state:https://auth.example.test/',
      'state-123',
    );

    render(
      <AuthMiniProvider
        autoRedirectToLogin
        authMiniBaseUrl="https://auth.example.test"
      >
        <SessionReader name="session" />
      </AuthMiniProvider>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid Auth Mini login state',
    );
    expect(session.acceptRedirectCallback).not.toHaveBeenCalled();
    expect(window.location.href).toBe('https://app.example.test/callback');
  });

  it('accepts a callback only once in StrictMode', async () => {
    window.history.replaceState(
      null,
      '',
      'https://app.example.test/callback#access_token=access&token_type=Bearer&session_id=session&refresh_token=refresh&expires_in=900&state=state-123',
    );
    window.sessionStorage.setItem(
      'auth-mini.react.login.state:https://auth.example.test/',
      'state-123',
    );

    render(
      <StrictMode>
        <AuthMiniProvider
          autoRedirectToLogin={false}
          authMiniBaseUrl="https://auth.example.test"
        >
          <SessionReader name="session" />
        </AuthMiniProvider>
      </StrictMode>,
    );

    await waitFor(() =>
      expect(session.acceptRedirectCallback).toHaveBeenCalledOnce(),
    );
  });

  it('redirects an anonymous session to login when enabled', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('crypto', { randomUUID: () => 'state-123' });
    session.getState.mockReturnValue(anonymous);

    render(
      <AuthMiniProvider
        autoRedirectToLogin
        authMiniBaseUrl="https://auth.example.test"
      >
        <SessionReader name="session" />
      </AuthMiniProvider>,
    );

    await waitFor(() =>
      expect(
        window.sessionStorage.getItem(
          'auth-mini.react.login.state:https://auth.example.test/',
        ),
      ).toBe('state-123'),
    );
  });

  it('waits for an anonymous state after session recovery before redirecting', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('crypto', { randomUUID: () => 'state-123' });
    session.getState.mockReturnValue(recovering);

    render(
      <AuthMiniProvider
        autoRedirectToLogin
        authMiniBaseUrl="https://auth.example.test"
      >
        <SessionReader name="session" />
      </AuthMiniProvider>,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(
      window.sessionStorage.getItem(
        'auth-mini.react.login.state:https://auth.example.test/',
      ),
    ).toBeNull();

    act(() => listener?.(anonymous));

    await waitFor(() =>
      expect(
        window.sessionStorage.getItem(
          'auth-mini.react.login.state:https://auth.example.test/',
        ),
      ).toBe('state-123'),
    );
  });

  it('leaves an anonymous session in the application when disabled', async () => {
    session.getState.mockReturnValue(anonymous);

    render(
      <AuthMiniProvider
        autoRedirectToLogin={false}
        authMiniBaseUrl="https://auth.example.test"
      >
        <SessionReader name="session" />
      </AuthMiniProvider>,
    );

    await Promise.resolve();

    expect(
      window.sessionStorage.getItem(
        'auth-mini.react.login.state:https://auth.example.test/',
      ),
    ).toBeNull();
  });

  it('creates the documented login state before redirecting', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('crypto', { randomUUID: () => 'state-123' });
    session.getState.mockReturnValue(anonymous);

    render(
      <AuthMiniProvider
        audience="app.example.test"
        autoRedirectToLogin={false}
        authMiniBaseUrl="https://auth.example.test"
        callbackUrl="http://localhost:5173/auth/callback"
      >
        <SessionReader name="session" />
      </AuthMiniProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      window.sessionStorage.getItem(
        'auth-mini.react.login.state:https://auth.example.test/',
      ),
    ).toBe('state-123');
  });

  it('opens and focuses the registration popup from the configured base URL', () => {
    const focus = vi.fn();
    const popup = { focus } as unknown as Window;
    const onOpen = vi.fn();
    const open = vi.spyOn(window, 'open').mockReturnValue(popup);

    render(
      <AuthMiniProvider
        autoRedirectToLogin={false}
        authMiniBaseUrl="https://auth.example.test"
      >
        <PasskeyRegistrationButton onOpen={onOpen} />
      </AuthMiniProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Register passkey' }));

    expect(open).toHaveBeenCalledWith(
      'https://auth.example.test/web/#/passkey/register',
      'auth-mini-passkey-registration',
      'popup,width=520,height=720,resizable=yes,scrollbars=yes',
    );
    expect(focus).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenCalledWith(popup);
  });

  it('returns null from the hook when the browser blocks the registration popup', () => {
    const onOpen = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue(null);

    render(
      <AuthMiniProvider
        autoRedirectToLogin={false}
        authMiniBaseUrl="https://auth.example.test"
      >
        <PasskeyRegistrationButton onOpen={onOpen} />
      </AuthMiniProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Register passkey' }));

    expect(onOpen).toHaveBeenCalledWith(null);
  });

  it('unsubscribes when the provider is removed', () => {
    const unsubscribe = vi.fn();
    session.onChange.mockReturnValue(unsubscribe);
    const view = render(
      <AuthMiniProvider
        autoRedirectToLogin={false}
        authMiniBaseUrl="https://auth.example.test"
      >
        <SessionReader name="session" />
      </AuthMiniProvider>,
    );

    view.unmount();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('requires the Provider for the public hook', () => {
    expect(() => render(<SessionReader name="session" />)).toThrow(
      'useAuthMini must be used within an AuthMiniProvider',
    );
  });
});
