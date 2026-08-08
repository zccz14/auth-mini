import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthMiniButton } from '../src/auth-mini-button.js';
import { AuthMiniProvider } from '../src/auth-mini-provider.js';

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

function renderButton() {
  return render(
    <AuthMiniProvider authMiniBaseUrl="https://auth.example.test">
      <AuthMiniButton />
    </AuthMiniProvider>,
  );
}

describe('AuthMiniButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', 'https://app.example.test/');
    window.sessionStorage.clear();
    session.getState.mockReturnValue(anonymous);
    session.onChange.mockReturnValue(() => undefined);
  });

  it('opens an accessible settings dialog for an authenticated shared session', async () => {
    session.getState.mockReturnValue(authenticated);
    renderButton();

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

  it('reads the provider session instead of creating another SDK', async () => {
    renderButton();

    await screen.findByRole('button', { name: 'Sign in with Auth Mini' });
    expect(session.getState).toHaveBeenCalledOnce();
    expect(session.onChange).toHaveBeenCalledOnce();
  });

  it('stays disabled while the shared session is recovering', async () => {
    session.getState.mockReturnValue({
      ...anonymous,
      status: 'recovering' as const,
    });
    renderButton();

    expect(
      await screen.findByRole('button', { name: 'Checking session…' }),
    ).toBeDisabled();
  });

  it('requires an AuthMiniProvider', () => {
    expect(() => render(<AuthMiniButton />)).toThrow(
      'useAuthMini must be used within an AuthMiniProvider',
    );
  });
});
