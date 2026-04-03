import { describe, expect, it, vi } from 'vitest';
import { createStateStore } from '../../src/sdk/state.js';
import { fakeStorage } from '../helpers/sdk.js';

describe('sdk state store', () => {
  it('hydrates anonymous state when storage is empty', () => {
    const sdk = createStateStore(fakeStorage());

    expect(sdk.getState().status).toBe('anonymous');
    expect(sdk.getState().me).toBeNull();
  });

  it('hydrates recovering state when a refresh token exists', () => {
    const sdk = createStateStore(
      fakeStorage({
        refreshToken: 'rt',
        expiresAt: '2026-04-03T00:00:00.000Z',
      }),
    );

    expect(sdk.getState().status).toBe('recovering');
  });

  it('notifies subscribers on transition', () => {
    const sdk = createStateStore(fakeStorage());
    const listener = vi.fn();

    sdk.onChange(listener);
    sdk.setAuthenticated({
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: 'x',
      me: {
        user_id: 'u',
        email: 'u@example.com',
        webauthn_credentials: [],
        active_sessions: [],
      },
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'authenticated',
        authenticated: true,
      }),
    );
  });

  it('returns an unsubscribe function from onChange', () => {
    const sdk = createStateStore(fakeStorage());
    const listener = vi.fn();
    const unsubscribe = sdk.onChange(listener);

    unsubscribe();
    sdk.setAnonymous();

    expect(listener).not.toHaveBeenCalled();
  });
});
