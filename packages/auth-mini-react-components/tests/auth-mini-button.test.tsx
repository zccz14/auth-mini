import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthMiniButton } from '../src/auth-mini-button.js';

const session = {
  getState: vi.fn(),
  onChange: vi.fn(),
  acceptRedirectCallback: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  clearLocal: vi.fn(),
};

vi.mock('auth-mini/sdk/browser', () => ({
  createBrowserSdk: vi.fn(() => ({ session })),
}));

const anonymous = {
  status: 'anonymous' as const,
  authenticated: false,
  sessionId: null,
  accessToken: null,
  refreshToken: null,
  receivedAt: null,
  expiresAt: null,
};

const authenticated = {
  ...anonymous,
  status: 'authenticated' as const,
  authenticated: true,
  sessionId: 'session',
  accessToken: 'access',
  refreshToken: 'refresh',
};

describe('AuthMiniButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', 'https://app.example.test/');
    window.sessionStorage.clear();
    session.getState.mockReturnValue(anonymous);
    session.onChange.mockReturnValue(() => undefined);
  });

  it('opens an accessible settings dialog for an authenticated session', async () => {
    session.getState.mockReturnValue(authenticated);
    render(<AuthMiniButton authMiniBaseUrl="https://auth.example.test" />);

    await screen.findByRole('button', { name: 'Account' });
    fireEvent.click(screen.getByRole('button', { name: 'Account' }));

    expect(screen.getByRole('dialog')).toHaveTextContent('You are signed in');
    expect(
      screen.getByRole('link', { name: 'Manage security settings' }),
    ).toHaveAttribute('href', 'https://auth.example.test/web/#/');
    expect(
      screen.getByRole('link', { name: 'Manage security settings' }),
    ).toHaveAttribute('target', '_blank');
  });

  it('adopts only a callback with the matching one-time state', async () => {
    window.history.replaceState(
      null,
      '',
      'https://app.example.test/callback#access_token=access&token_type=Bearer&session_id=session&refresh_token=refresh&expires_in=900&state=state-123',
    );
    window.sessionStorage.setItem(
      'auth-mini.react.login.state:https://auth.example.test/',
      'state-123',
    );
    render(<AuthMiniButton authMiniBaseUrl="https://auth.example.test" />);

    await waitFor(() =>
      expect(session.acceptRedirectCallback).toHaveBeenCalledWith({
        access_token: 'access',
        session_id: 'session',
        refresh_token: 'refresh',
        expires_in: 900,
      }),
    );
    expect(window.location.href).toBe('https://app.example.test/callback');
    expect(window.sessionStorage).toHaveLength(0);
  });

  it('rejects an untrusted callback before it reaches the SDK', async () => {
    window.history.replaceState(
      null,
      '',
      'https://app.example.test/callback#access_token=access&token_type=Bearer&session_id=session&refresh_token=refresh&expires_in=900&state=untrusted',
    );
    window.sessionStorage.setItem(
      'auth-mini.react.login.state:https://auth.example.test/',
      'state-123',
    );
    render(<AuthMiniButton authMiniBaseUrl="https://auth.example.test" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid Auth Mini login state',
    );
    expect(session.acceptRedirectCallback).not.toHaveBeenCalled();
  });
});
