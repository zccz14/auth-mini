import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_ORIGIN_KEY } from '@/lib/demo-storage';
import { DemoProvider, useDemo } from './demo-provider';

type DemoSessionSnapshot = {
  status: string;
  authenticated: boolean;
  sessionId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  receivedAt: string | null;
  expiresAt: string | null;
};

const sdkMocks = vi.hoisted(() => {
  const listeners: Array<(state: DemoSessionSnapshot) => void> = [];
  const unsubscribe = vi.fn();
  const sdkStates: DemoSessionSnapshot[] = [];
  const sessionState = {
    current: {
      status: 'anonymous',
      authenticated: false,
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
    } as DemoSessionSnapshot,
  };

  const onChange = vi.fn((listener: (state: DemoSessionSnapshot) => void) => {
    listeners.push(listener);
    return unsubscribe;
  });

  const logout = vi.fn(async () => {
    sessionState.current = {
      status: 'anonymous',
      authenticated: false,
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
    };
  });

  const createBrowserSdk = vi.fn(() => {
    const snapshot = sdkStates.shift();
    if (snapshot) {
      sessionState.current = snapshot;
    }

    return {
      session: { getState: () => sessionState.current, onChange, logout },
      me: { fetch: vi.fn() },
    };
  });

  return {
    createBrowserSdk,
    listeners,
    logout,
    onChange,
    sdkStates,
    sessionState,
    unsubscribe,
  };
});

vi.mock('auth-mini/sdk/browser', () => ({
  createBrowserSdk: sdkMocks.createBrowserSdk,
}));

function Probe() {
  const demo = useDemo();
  return (
    <div>
      <span data-testid="config-status">{demo.config.status}</span>
      <span data-testid="session-status">{demo.session.status}</span>
      <span data-testid="has-user">{'user' in demo ? 'yes' : 'no'}</span>
      <button
        onClick={() =>
          void demo.adoptDemoSession({
            session_id: 'session-2',
            access_token: 'next-access-token',
            refresh_token: 'next-refresh-token',
            expires_in: 900,
            token_type: 'Bearer',
          })
        }
      >
        Adopt demo session
      </button>
      <button onClick={() => void demo.clearLocalAuthState()}>
        Clear local auth state
      </button>
    </div>
  );
}

describe('DemoProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    sdkMocks.createBrowserSdk.mockClear();
    sdkMocks.onChange.mockClear();
    sdkMocks.logout.mockClear();
    sdkMocks.unsubscribe.mockClear();
    sdkMocks.listeners.length = 0;
    sdkMocks.sdkStates.length = 0;
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

  it('defaults the app to the hosted auth origin when no override is present', () => {
    render(
      <DemoProvider
        initialLocation={{
          hash: '#/setup',
          search: '',
          origin: 'https://demo.example.com',
        }}
      >
        <Probe />
      </DemoProvider>,
    );

    expect(screen.getByTestId('config-status')).toHaveTextContent('ready');
    expect(screen.getByTestId('session-status')).toHaveTextContent('anonymous');
    expect(screen.getByTestId('has-user')).toHaveTextContent('no');
    expect(sdkMocks.createBrowserSdk).toHaveBeenCalledWith(
      'https://auth.zccz14.com',
    );
  });

  it('keeps the app waiting when the hash contains an empty auth-origin', () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');

    render(
      <DemoProvider
        initialLocation={{
          hash: '#/setup?auth-origin=',
          search: '',
          origin: 'https://demo.example.com',
        }}
      >
        <Probe />
      </DemoProvider>,
    );

    expect(screen.getByTestId('config-status')).toHaveTextContent('waiting');
    expect(screen.getByTestId('session-status')).toHaveTextContent('anonymous');
    expect(sdkMocks.createBrowserSdk).not.toHaveBeenCalled();
  });

  it('exposes sdk session state and reacts to session changes', () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = {
      status: 'authenticated',
      authenticated: true,
      sessionId: 'session-1',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      receivedAt: '2026-04-11T00:00:00.000Z',
      expiresAt: '2026-04-11T01:00:00.000Z',
    };

    render(
      <DemoProvider
        initialLocation={{
          hash: '#/',
          search: '',
          origin: 'https://demo.example.com',
        }}
      >
        <Probe />
      </DemoProvider>,
    );

    expect(screen.getByTestId('config-status')).toHaveTextContent('ready');
    expect(screen.getByTestId('session-status')).toHaveTextContent(
      'authenticated',
    );
    expect(screen.getByTestId('has-user')).toHaveTextContent('no');
    expect(sdkMocks.createBrowserSdk).toHaveBeenCalledWith(
      'https://auth.example.com',
    );
    expect(sdkMocks.onChange).toHaveBeenCalledTimes(1);

    act(() => {
      sdkMocks.sessionState.current = {
        ...sdkMocks.sessionState.current,
        status: 'anonymous',
        authenticated: false,
        sessionId: null,
        accessToken: null,
        refreshToken: null,
        receivedAt: null,
        expiresAt: null,
      };
      sdkMocks.listeners[0]?.(sdkMocks.sessionState.current);
    });

    expect(screen.getByTestId('session-status')).toHaveTextContent('anonymous');
    expect(screen.getByTestId('has-user')).toHaveTextContent('no');
  });

  it('adopts persisted session tokens by reattaching an authenticated sdk without exposing user', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sdkStates.push(
      {
        status: 'anonymous',
        authenticated: false,
        sessionId: null,
        accessToken: null,
        refreshToken: null,
        receivedAt: null,
        expiresAt: null,
      },
      {
        status: 'authenticated',
        authenticated: true,
        sessionId: 'session-2',
        accessToken: 'next-access-token',
        refreshToken: 'next-refresh-token',
        receivedAt: '2026-04-11T00:00:00.000Z',
        expiresAt: '2026-04-11T01:00:00.000Z',
      },
    );

    render(
      <DemoProvider
        initialLocation={{
          hash: '#/',
          search: '',
          origin: 'https://demo.example.com',
        }}
      >
        <Probe />
      </DemoProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Adopt demo session' }));

    expect(sdkMocks.createBrowserSdk).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('session-status')).toHaveTextContent(
      'authenticated',
    );
    expect(screen.getByTestId('has-user')).toHaveTextContent('no');
    expect(
      JSON.parse(
        localStorage.getItem('auth-mini.sdk:https://auth.example.com/') ?? '',
      ),
    ).toEqual(
      expect.objectContaining({
        sessionId: 'session-2',
        accessToken: 'next-access-token',
        refreshToken: 'next-refresh-token',
      }),
    );
  });

  it('creates the sdk from effect lifecycle and cleans subscriptions under StrictMode replay', () => {
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');

    render(
      <React.StrictMode>
        <DemoProvider
          initialLocation={{
            hash: '#/',
            search: '',
            origin: 'https://demo.example.com',
          }}
        >
          <Probe />
        </DemoProvider>
      </React.StrictMode>,
    );

    expect(sdkMocks.createBrowserSdk).toHaveBeenCalled();
    expect(sdkMocks.unsubscribe).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('config-status')).toHaveTextContent('ready');
  });

  it('falls back to the hosted auth origin when localStorage access throws', () => {
    const localStorageDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'localStorage',
    );

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('denied');
      },
    });

    try {
      render(
        <DemoProvider
          initialLocation={{
            hash: '#/',
            search: '',
            origin: 'https://demo.example.com',
          }}
        >
          <Probe />
        </DemoProvider>,
      );

      expect(screen.getByTestId('config-status')).toHaveTextContent('ready');
      expect(sdkMocks.createBrowserSdk).toHaveBeenCalledWith(
        'https://auth.zccz14.com',
      );
    } finally {
      if (localStorageDescriptor) {
        Object.defineProperty(window, 'localStorage', localStorageDescriptor);
      }
    }
  });

  it.each([
    'not a url',
    'ftp://auth.example.com',
    'https://auth.example.com/path',
    'https://auth.example.com?foo=bar',
    'https://auth.example.com#fragment',
  ])(
    'does not create the sdk when persisted auth origin is invalid: %s',
    (authOrigin) => {
      localStorage.setItem(AUTH_ORIGIN_KEY, authOrigin);

      render(
        <DemoProvider
          initialLocation={{
            hash: '#/',
            search: '',
            origin: 'https://demo.example.com',
          }}
        >
          <Probe />
        </DemoProvider>,
      );

      expect(screen.getByTestId('config-status')).toHaveTextContent('waiting');
      expect(sdkMocks.createBrowserSdk).not.toHaveBeenCalled();
    },
  );

  it('clears persisted auth origin when local auth state is cleared', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
    sdkMocks.sessionState.current = {
      status: 'authenticated',
      authenticated: true,
      sessionId: 'session-1',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      receivedAt: '2026-04-11T00:00:00.000Z',
      expiresAt: '2026-04-11T01:00:00.000Z',
    };

    render(
      <DemoProvider
        initialLocation={{
          hash: '#/session',
          search: '',
          origin: 'https://demo.example.com',
        }}
      >
        <Probe />
      </DemoProvider>,
    );

    await user.click(
      screen.getByRole('button', { name: 'Clear local auth state' }),
    );

    expect(sdkMocks.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('config-status')).toHaveTextContent('ready');
    expect(screen.getByTestId('session-status')).toHaveTextContent('anonymous');
    expect(localStorage.getItem(AUTH_ORIGIN_KEY)).toBe(
      'https://auth.zccz14.com',
    );
    expect(sdkMocks.createBrowserSdk).toHaveBeenLastCalledWith(
      'https://auth.zccz14.com',
    );
  });

  it('clears hash auth-origin and falls back to the hosted origin', async () => {
    const user = userEvent.setup();

    window.history.replaceState(
      {},
      '',
      '/#/session?auth-origin=https%3A%2F%2Fauth.example.com',
    );

    sdkMocks.sessionState.current = {
      status: 'authenticated',
      authenticated: true,
      sessionId: 'session-1',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      receivedAt: '2026-04-11T00:00:00.000Z',
      expiresAt: '2026-04-11T01:00:00.000Z',
    };

    render(
      <DemoProvider>
        <Probe />
      </DemoProvider>,
    );

    await user.click(
      screen.getByRole('button', { name: 'Clear local auth state' }),
    );

    expect(screen.getByTestId('config-status')).toHaveTextContent('ready');
    expect(sdkMocks.createBrowserSdk).toHaveBeenLastCalledWith(
      'https://auth.zccz14.com',
    );
    expect(window.location.hash).toBe('#/session');
  });
});
