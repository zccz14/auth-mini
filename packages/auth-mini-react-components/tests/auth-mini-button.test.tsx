import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  accessToken: 'header.eyJzdWIiOiJ1c2VyLTEifQ.signature',
  refreshToken: 'refresh',
};

function renderButton(lang = 'en') {
  return render(
    <AuthMiniProvider
      autoRedirectToLogin={false}
      authMiniBaseUrl="https://auth.example.test"
    >
      <AuthMiniButton lang={lang} />
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
    session.logout.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('opens an account IconButton with the signed-in user ID and actions', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const focus = vi.fn();
    const popup = { focus } as unknown as Window;
    const open = vi.spyOn(window, 'open').mockReturnValue(popup);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    session.getState.mockReturnValue(authenticated);
    renderButton();

    await screen.findByRole('button', { name: 'Account' });
    fireEvent.click(screen.getByRole('button', { name: 'Account' }));

    expect(screen.getByRole('dialog')).toHaveTextContent('You are signed in');
    fireEvent.click(screen.getByRole('button', { name: 'User ID: user-1' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('user-1'));
    expect(
      screen.getByRole('button', { name: 'User ID: Copied' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Manage sign-in methods' }),
    ).toHaveAttribute('href', 'https://auth.example.test/web/#/');
    expect(
      screen.getByRole('link', { name: 'Manage sign-in methods' }),
    ).toHaveAttribute('target', '_blank');
    const addPasskey = screen.getByRole('button', { name: 'Add passkey' });
    expect(addPasskey).toHaveAttribute('data-variant', 'outline');
    fireEvent.click(addPasskey);
    expect(open).toHaveBeenCalledWith(
      'https://auth.example.test/web/#/passkey/register',
      'auth-mini-passkey-registration',
      'popup,width=520,height=720,resizable=yes,scrollbars=yes',
    );
    expect(focus).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Sign Out' })).toHaveAttribute(
      'data-variant',
      'destructive',
    );
  });

  it('uses the requested Chinese text and signs out from the dialog', async () => {
    session.getState.mockReturnValue(authenticated);
    renderButton('zh-CN');

    await screen.findByRole('button', { name: '账户' });
    fireEvent.click(screen.getByRole('button', { name: '账户' }));

    expect(screen.getByRole('link', { name: '管理登录方式' })).toHaveAttribute(
      'href',
      'https://auth.example.test/web/#/',
    );
    expect(screen.getByRole('button', { name: '退出登录' })).toHaveAttribute(
      'data-variant',
      'destructive',
    );
    expect(screen.getByRole('button', { name: '添加通行密钥' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '退出登录' }));
    await waitFor(() => expect(session.logout).toHaveBeenCalledOnce());
  });

  it('reads the provider session instead of creating another SDK', async () => {
    renderButton();

    await screen.findByRole('button', { name: 'Sign In' });
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

  it('falls back to English for an unsupported language', async () => {
    const view = renderButton('fr-FR');

    expect(await view.findByRole('button', { name: 'Sign In' })).toBeEnabled();
  });

  it('requires an AuthMiniProvider', () => {
    expect(() => render(<AuthMiniButton lang="en" />)).toThrow(
      'useAuthMini must be used within an AuthMiniProvider',
    );
  });
});
