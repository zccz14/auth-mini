import { StrictMode } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionSnapshot } from 'auth-mini/sdk/browser';
import { useAuthMini } from 'auth-mini-react-components';
import { AppProvider, useApp } from './app-provider';

const sdkMocks = vi.hoisted(() => {
  const anonymous: SessionSnapshot = {
    status: 'anonymous',
    authenticated: false,
    sessionId: null,
    accessToken: null,
    refreshToken: null,
    receivedAt: null,
    expiresAt: null,
  };
  const state = { current: anonymous };
  const listeners = new Set<(session: SessionSnapshot) => void>();
  function emit(session: SessionSnapshot) {
    state.current = session;
    listeners.forEach((listener) => listener(session));
  }
  const unsubscribe = vi.fn();
  const session = {
    getState: () => state.current,
    onChange: vi.fn((listener: (value: SessionSnapshot) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        unsubscribe();
      };
    }),
    acceptRedirectCallback: vi.fn(async (tokens) => {
      emit({
        status: 'authenticated',
        authenticated: true,
        sessionId: tokens.session_id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        receivedAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + tokens.expires_in * 1000,
        ).toISOString(),
      });
    }),
    logout: vi.fn(async () => emit(anonymous)),
  };
  return {
    anonymous,
    state,
    listeners,
    session,
    emit,
    unsubscribe,
    createBrowserSdk: vi.fn(() => ({ session })),
  };
});

vi.mock('auth-mini/sdk/browser', () => ({
  createBrowserSdk: sdkMocks.createBrowserSdk,
}));

const tokens = {
  session_id: 'session-2',
  access_token: 'new-access-token',
  refresh_token: 'new-refresh-token',
  expires_in: 900,
};

function Probe() {
  const app = useApp();
  const auth = useAuthMini();
  return (
    <>
      <span data-testid="session">{app.session.status}</span>
      <span data-testid="shared">
        {String(
          app.sdk?.session === auth.sdk?.session &&
            app.session === auth.session,
        )}
      </span>
      <span data-testid="setup">{app.setupState?.brand_name}</span>
      <button
        onClick={() => void app.sdk?.session.acceptRedirectCallback(tokens)}
      >
        Sign in
      </button>
      <button onClick={() => void auth.signOut()}>Sign out</button>
      <button onClick={() => void app.sdk?.currentUser.fetch()}>
        Load account
      </button>
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/web/#/');
  sdkMocks.state.current = sdkMocks.anonymous;
  sdkMocks.listeners.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () => new Response(JSON.stringify({ brand_name: 'Example Auth' })),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AppProvider', () => {
  it('uses one public Provider session for the GUI and its management requests', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await screen.findByText('Example Auth');
    expect(sdkMocks.createBrowserSdk).toHaveBeenCalledExactlyOnceWith(
      'http://localhost:3000/',
    );
    expect(sdkMocks.session.onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('shared')).toHaveTextContent('true');

    await user.click(screen.getByText('Sign in'));
    expect(
      sdkMocks.session.acceptRedirectCallback,
    ).toHaveBeenCalledExactlyOnceWith(tokens);
    expect(screen.getByTestId('session')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('shared')).toHaveTextContent('true');
    expect(sdkMocks.createBrowserSdk).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(0);

    act(() =>
      sdkMocks.emit({
        ...sdkMocks.state.current,
        accessToken: 'refreshed-token',
      }),
    );
    await user.click(screen.getByText('Load account'));
    expect(fetch).toHaveBeenLastCalledWith(
      new URL('http://localhost:3000/me'),
      {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer refreshed-token',
        },
      },
    );
    await user.click(screen.getByText('Sign out'));
    expect(sdkMocks.session.logout).toHaveBeenCalledOnce();
    expect(screen.getByTestId('session')).toHaveTextContent('anonymous');
    expect(sdkMocks.createBrowserSdk).toHaveBeenCalledTimes(1);
  });

  it('restores an existing SDK session without a second owner', async () => {
    sdkMocks.state.current = {
      ...sdkMocks.anonymous,
      status: 'authenticated',
      authenticated: true,
      accessToken: 'saved-token',
      sessionId: 'saved-session',
    };
    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await screen.findByText('Example Auth');
    expect(screen.getByTestId('session')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('shared')).toHaveTextContent('true');
    expect(sdkMocks.createBrowserSdk).toHaveBeenCalledOnce();
  });

  it('lets AuthMiniProvider validate and clean a callback before adoption', async () => {
    sessionStorage.setItem(
      'auth-mini.react.login.state:http://localhost:3000/',
      'expected-state',
    );
    const params = new URLSearchParams({
      ...tokens,
      expires_in: '900',
      token_type: 'Bearer',
      state: 'expected-state',
    });
    window.history.replaceState({}, '', `/web/#/account?${params}`);
    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('session')).toHaveTextContent('authenticated'),
    );
    expect(
      sdkMocks.session.acceptRedirectCallback,
    ).toHaveBeenCalledExactlyOnceWith(tokens);
    expect(window.location.hash).toBe('#/account');
    expect(sessionStorage.length).toBe(0);
    expect(sdkMocks.createBrowserSdk).toHaveBeenCalledOnce();
  });

  it('rejects callbacks without matching state', async () => {
    const params = new URLSearchParams({
      ...tokens,
      expires_in: '900',
      token_type: 'Bearer',
      state: 'wrong-state',
    });
    window.history.replaceState({}, '', `/web/#/account?${params}`);
    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await screen.findByText('Example Auth');
    expect(sdkMocks.session.acceptRedirectCallback).not.toHaveBeenCalled();
    expect(screen.getByTestId('session')).toHaveTextContent('anonymous');
    expect(window.location.hash).toBe('#/account');
  });

  it('cleans the public Provider subscription during StrictMode replay and unmount', async () => {
    const view = render(
      <StrictMode>
        <AppProvider>
          <Probe />
        </AppProvider>
      </StrictMode>,
    );
    await screen.findByText('Example Auth');
    expect(sdkMocks.listeners.size).toBe(1);
    expect(sdkMocks.unsubscribe).toHaveBeenCalledOnce();
    view.unmount();
    expect(sdkMocks.listeners.size).toBe(0);
  });
});
