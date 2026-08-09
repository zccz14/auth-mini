import { afterEach, describe, expect, it, vi } from 'vitest';
import { openPasskeyRegistrationPage } from '../src/index.js';

describe('openPasskeyRegistrationPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens and focuses Auth Mini’s dedicated registration popup', () => {
    const focus = vi.fn();
    const popup = { focus } as unknown as Window;
    const open = vi.spyOn(window, 'open').mockReturnValue(popup);

    expect(openPasskeyRegistrationPage('https://auth.example.test')).toBe(
      popup,
    );
    expect(open).toHaveBeenCalledWith(
      'https://auth.example.test/web/#/passkey/register',
      'auth-mini-passkey-registration',
      'popup,width=520,height=720,resizable=yes,scrollbars=yes',
    );
    expect(focus).toHaveBeenCalledOnce();
  });

  it('returns null when the browser blocks the popup', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    expect(openPasskeyRegistrationPage('https://auth.example.test')).toBeNull();
  });
});
