import { describe, expect, it, vi } from 'vitest';
import { createSingletonSdk } from '../../src/sdk/singleton-entry.js';
import { createStateStore } from '../../src/sdk/state.js';
import type { MeResponse } from '../../src/sdk/types.js';
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
      receivedAt: '2026-04-03T00:00:00.000Z',
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

  it('exposes session.getState and session.onChange on the public singleton api', () => {
    const sdk = createSingletonSdk({
      storage: fakeStorage({
        refreshToken: 'rt',
        expiresAt: '2026-04-03T00:00:00.000Z',
      }),
    });
    const listener = vi.fn();
    const unsubscribe = sdk.session.onChange(listener);

    expect(sdk.session.getState()).toMatchObject({
      status: 'recovering',
      refreshToken: 'rt',
    });
    expect(typeof unsubscribe).toBe('function');
  });

  it('returns immutable snapshots from the state store', () => {
    const sdk = createStateStore(fakeStorage());

    sdk.setAuthenticated({
      accessToken: 'a',
      refreshToken: 'r',
      receivedAt: '2026-04-03T00:00:00.000Z',
      expiresAt: 'x',
      me: {
        user_id: 'u',
        email: 'u@example.com',
        webauthn_credentials: [],
        active_sessions: [],
      },
    });

    const snapshot = sdk.getState();
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(() => {
      (snapshot as { status: string }).status = 'anonymous';
    }).toThrow();
    expect(sdk.getState().status).toBe('authenticated');
  });

  it('ignores invalid persisted storage payloads', () => {
    const storage = fakeStorage();
    storage.setItem('auth-mini.sdk', JSON.stringify({ refreshToken: 123 }));

    const sdk = createStateStore(storage);

    expect(sdk.getState().status).toBe('anonymous');
    expect(sdk.getState().refreshToken).toBeNull();
  });

  it('clones caller-owned me objects before freezing internal state', () => {
    const sdk = createStateStore(fakeStorage());
    const me: MeResponse = {
      user_id: 'u',
      email: 'u@example.com',
      webauthn_credentials: [],
      active_sessions: [],
    };

    sdk.setAuthenticated({
      accessToken: 'a',
      refreshToken: 'r',
      receivedAt: '2026-04-03T00:00:00.000Z',
      expiresAt: 'x',
      me,
    });

    me.email = 'mutated@example.com';
    me.webauthn_credentials.push('new-device');

    expect(Object.isFrozen(me)).toBe(false);
    expect(sdk.getState().me).toMatchObject({ email: 'u@example.com' });
    expect(sdk.getState().me?.webauthn_credentials).toEqual([]);
  });
});
