import React from 'react';
import { act, render, screen } from '@testing-library/react';
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
  me: {
    user_id: string;
    email: string;
    webauthn_credentials: Array<unknown>;
    active_sessions: Array<unknown>;
  } | null;
};

const sdkMocks = vi.hoisted(() => {
  const listeners: Array<(state: DemoSessionSnapshot) => void> = [];
  const unsubscribe = vi.fn();
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
    } as DemoSessionSnapshot,
  };

  const onChange = vi.fn((listener: (state: DemoSessionSnapshot) => void) => {
    listeners.push(listener);
    return unsubscribe;
  });

  const createBrowserSdk = vi.fn(() => ({
    session: { getState: () => sessionState.current, onChange },
    me: { get: () => sessionState.current.me, reload: vi.fn() },
  }));

  return { createBrowserSdk, listeners, onChange, sessionState, unsubscribe };
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
      <span data-testid="user-email">{demo.user?.email ?? 'none'}</span>
    </div>
  );
}

describe('DemoProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    sdkMocks.createBrowserSdk.mockClear();
    sdkMocks.onChange.mockClear();
    sdkMocks.unsubscribe.mockClear();
    sdkMocks.listeners.length = 0;
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

  it('keeps the app disabled when auth origin is missing', () => {
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

    expect(screen.getByTestId('config-status')).toHaveTextContent('waiting');
    expect(screen.getByTestId('session-status')).toHaveTextContent('anonymous');
    expect(screen.getByTestId('user-email')).toHaveTextContent('none');
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
      me: {
        user_id: 'user-1',
        email: 'first@example.com',
        webauthn_credentials: [],
        active_sessions: [],
      },
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
    expect(screen.getByTestId('user-email')).toHaveTextContent(
      'first@example.com',
    );
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
        me: null,
      };
      sdkMocks.listeners[0]?.(sdkMocks.sessionState.current);
    });

    expect(screen.getByTestId('session-status')).toHaveTextContent('anonymous');
    expect(screen.getByTestId('user-email')).toHaveTextContent('none');
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

  it('falls back to waiting state when localStorage access throws', () => {
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

      expect(screen.getByTestId('config-status')).toHaveTextContent('waiting');
      expect(sdkMocks.createBrowserSdk).not.toHaveBeenCalled();
    } finally {
      if (localStorageDescriptor) {
        Object.defineProperty(window, 'localStorage', localStorageDescriptor);
      }
    }
  });
});
