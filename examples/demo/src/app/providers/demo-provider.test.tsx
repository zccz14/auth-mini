import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const EMBEDDED_SERVER_BASE_URL = 'https://demo.example.com/';

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

  it('uses the parent path of the embedded web app as the SDK base URL', () => {
    render(
      <DemoProvider
        initialLocation={{
          hash: '#/setup',
          href: 'https://demo.example.com/web/#/setup',
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
      EMBEDDED_SERVER_BASE_URL,
    );
  });

  it('exposes sdk session state and reacts to session changes', () => {
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
          href: 'https://demo.example.com/web/#/',
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
      EMBEDDED_SERVER_BASE_URL,
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
          href: 'https://demo.example.com/web/#/',
          search: '',
          origin: 'https://demo.example.com',
        }}
      >
        <Probe />
      </DemoProvider>,
    );

    await user.click(
      screen.getByRole('button', { name: 'Adopt demo session' }),
    );

    expect(sdkMocks.createBrowserSdk).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('session-status')).toHaveTextContent(
      'authenticated',
    );
    expect(screen.getByTestId('has-user')).toHaveTextContent('no');
    expect(
      JSON.parse(
        localStorage.getItem('auth-mini.sdk:https://demo.example.com/') ?? '',
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
    render(
      <React.StrictMode>
        <DemoProvider
          initialLocation={{
            hash: '#/',
            href: 'https://demo.example.com/web/#/',
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

  it('keeps the app ready when localStorage access throws', () => {
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
            href: 'https://demo.example.com/web/#/',
            search: '',
            origin: 'https://demo.example.com',
          }}
        >
          <Probe />
        </DemoProvider>,
      );

      expect(screen.getByTestId('config-status')).toHaveTextContent('ready');
      expect(sdkMocks.createBrowserSdk).toHaveBeenCalledWith(
        EMBEDDED_SERVER_BASE_URL,
      );
    } finally {
      if (localStorageDescriptor) {
        Object.defineProperty(window, 'localStorage', localStorageDescriptor);
      }
    }
  });

  it('clears local auth state through the current SDK', async () => {
    const user = userEvent.setup();
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
          href: 'https://demo.example.com/web/#/session',
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
    expect(sdkMocks.createBrowserSdk).toHaveBeenLastCalledWith(
      EMBEDDED_SERVER_BASE_URL,
    );
  });
});
