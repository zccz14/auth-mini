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

const { createBrowserSdk, session } = vi.hoisted(() => {
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
    session,
  };
});

vi.mock('auth-mini/sdk/browser', () => ({
  createBrowserSdk,
}));

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

function SessionReader({ name }: { name: string }) {
  const { error, isReady, session, signIn } = useAuthMini();
  return (
    <>
      <output data-testid={name}>{session?.status ?? 'initializing'}</output>
      <output data-testid={`${name}-ready`}>{String(isReady)}</output>
      {error ? <p role="alert">{error.message}</p> : null}
      <button onClick={signIn} type="button">
        Sign in
      </button>
    </>
  );
}

describe('AuthMiniProvider', () => {
  let listener: ((next: SessionSnapshot) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    listener = undefined;
    window.history.replaceState(null, '', 'https://app.example.test/');
    window.sessionStorage.clear();
    session.getState.mockReturnValue(recovering);
    session.onChange.mockImplementation((nextListener) => {
      listener = nextListener;
      return () => undefined;
    });
    session.acceptRedirectCallback.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('initializes one SDK and shares its session with every descendant', () => {
    render(
      <AuthMiniProvider authMiniBaseUrl="https://auth.example.test">
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
      <AuthMiniProvider authMiniBaseUrl="https://auth.example.test">
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
      <AuthMiniProvider authMiniBaseUrl="https://auth.example.test">
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
        <AuthMiniProvider authMiniBaseUrl="https://auth.example.test">
          <SessionReader name="session" />
        </AuthMiniProvider>
      </StrictMode>,
    );

    await waitFor(() =>
      expect(session.acceptRedirectCallback).toHaveBeenCalledOnce(),
    );
  });

  it('creates the documented login state before redirecting', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('crypto', { randomUUID: () => 'state-123' });
    session.getState.mockReturnValue(anonymous);

    render(
      <AuthMiniProvider
        audience="app.example.test"
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

  it('unsubscribes when the provider is removed', () => {
    const unsubscribe = vi.fn();
    session.onChange.mockReturnValue(unsubscribe);
    const view = render(
      <AuthMiniProvider authMiniBaseUrl="https://auth.example.test">
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
