import { describe, expect, it, vi } from 'vitest';
import { createBrowserSdkInternal } from '../../src/sdk/singleton-entry.js';
import { createStateStore } from '../../src/sdk/state.js';
import type { PersistedSdkState } from '../../src/sdk/types.js';
import {
  createSharedStorageHarness,
  fakeStorage,
  seedBrowserSdkStorage,
} from '../helpers/sdk.js';

describe('sdk state store', () => {
  it('hydrates anonymous state when storage is empty', () => {
    const sdk = createStateStore(fakeStorage());

    expect(sdk.getState().status).toBe('anonymous');
    expect(sdk.getState()).not.toHaveProperty('me');
  });

  it('hydrates recovering state when a refresh token exists', () => {
    const sdk = createStateStore(
      fakeStorage({
        sessionId: 'session-1',
        refreshToken: 'rt',
        expiresAt: '2026-04-03T00:00:00.000Z',
      }),
    );

    expect(sdk.getState().status).toBe('recovering');
    expect(sdk.getState().sessionId).toBe('session-1');
  });

  it('ignores legacy cached me payloads during state-store hydration', () => {
    const storage = fakeStorage();
    storage.setItem(
      'auth-mini.sdk',
      JSON.stringify({
        sessionId: 'session-1',
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        receivedAt: '2026-04-03T00:00:00.000Z',
        expiresAt: '2026-04-03T00:15:00.000Z',
        me: {
          user_id: 'u',
          email: 'u@example.com',
          webauthn_credentials: [
            {
              id: 'cred-1',
              credential_id: 'device-1',
              transports: ['usb'],
              created_at: '2026-04-03T00:00:00.000Z',
            },
          ],
          ed25519_credentials: [],
          active_sessions: [],
        },
      }),
    );

    const sdk = createStateStore(storage);

    expect(sdk.getState()).toMatchObject({
      status: 'recovering',
      sessionId: 'session-1',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    });
    expect(sdk.getState()).not.toHaveProperty('me');
  });

  it('treats persisted sessions without a sessionId as invalid', () => {
    const sdk = createStateStore(
      fakeStorage({
        refreshToken: 'rt',
        expiresAt: '2026-04-03T00:00:00.000Z',
      }),
    );

    expect(sdk.getState()).toMatchObject({
      status: 'anonymous',
      sessionId: null,
      refreshToken: null,
    });
  });

  it('hydrates anonymous state from an in-memory persistence adapter', () => {
    const sdk = createStateStore({
      clear() {},
      read() {
        return null;
      },
      write() {},
    });

    expect(sdk.getState()).toMatchObject({
      status: 'anonymous',
      refreshToken: null,
    });
  });

  it('does not leak authenticated device state across separate memory adapters', () => {
    let firstState: PersistedSdkState | null = null;
    const first = createStateStore({
      clear() {
        firstState = null;
      },
      read() {
        return firstState;
      },
      write(next: PersistedSdkState) {
        firstState = next;
      },
    });
    const second = createStateStore({
      clear() {},
      read() {
        return null;
      },
      write() {},
    });

    first.setAuthenticated({
      sessionId: 'session-1',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      receivedAt: '2026-04-12T00:00:00.000Z',
      expiresAt: '2026-04-12T00:15:00.000Z',
    });

    expect(second.getState().status).toBe('anonymous');
  });

  it('notifies subscribers on transition', () => {
    const sdk = createStateStore(fakeStorage());
    const listener = vi.fn();

    sdk.onChange(listener);
    sdk.setAuthenticated({
      sessionId: 'session-1',
      accessToken: 'a',
      refreshToken: 'r',
      receivedAt: '2026-04-03T00:00:00.000Z',
      expiresAt: 'x',
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
    const storage = fakeStorage();
    seedBrowserSdkStorage(storage, 'https://auth.example.com', {
      sessionId: 'session-1',
      refreshToken: 'rt',
      expiresAt: '2026-04-03T00:00:00.000Z',
    });

    const sdk = createBrowserSdkInternal('https://auth.example.com', {
      storage,
    });
    const listener = vi.fn();
    const unsubscribe = sdk.session.onChange(listener);

    expect(sdk.session.getState()).toMatchObject({
      status: 'recovering',
      refreshToken: 'rt',
    });
    expect(typeof unsubscribe).toBe('function');
  });

  it('returns immutable session snapshots from the public singleton api', () => {
    const storage = fakeStorage();
    seedBrowserSdkStorage(storage, 'https://auth.example.com', {
      sessionId: 'session-1',
      refreshToken: 'rt',
      expiresAt: '2026-04-03T00:00:00.000Z',
    });

    const sdk = createBrowserSdkInternal('https://auth.example.com', {
      storage,
    });
    const snapshot = sdk.session.getState();

    expect(() => {
      (snapshot as { status: string }).status = 'anonymous';
    }).toThrow();
    expect(sdk.session.getState()).toMatchObject({
      status: 'recovering',
      refreshToken: 'rt',
    });
  });

  it('state store snapshots no longer expose me', () => {
    const storage = fakeStorage();
    const sdk = createStateStore(storage);

    expect(sdk.getState()).not.toHaveProperty('me');
  });

  it('returns immutable snapshots from the state store', () => {
    const sdk = createStateStore(fakeStorage());

    sdk.setAuthenticated({
      sessionId: 'session-1',
      accessToken: 'a',
      refreshToken: 'r',
      receivedAt: '2026-04-03T00:00:00.000Z',
      expiresAt: 'x',
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

  it('clones caller-owned authenticated state before freezing internal state', () => {
    const sdk = createStateStore(fakeStorage());
    const authenticated: PersistedSdkState = {
      sessionId: 'session-1',
      accessToken: 'a',
      refreshToken: 'r',
      receivedAt: '2026-04-03T00:00:00.000Z',
      expiresAt: 'x',
    };

    sdk.setAuthenticated(authenticated);

    authenticated.sessionId = 'mutated-session';
    authenticated.accessToken = 'mutated-access';

    expect(Object.isFrozen(authenticated)).toBe(false);
    expect(sdk.getState()).toMatchObject({
      sessionId: 'session-1',
      accessToken: 'a',
    });
    expect(sdk.getState()).not.toHaveProperty('me');
  });

  it('does not freeze or alias caller-owned persisted state from applyPersistedState', () => {
    const sdk = createStateStore(fakeStorage());
    const persisted: PersistedSdkState = {
      sessionId: 'session-2',
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
      receivedAt: '2026-04-03T00:00:00.000Z',
      expiresAt: '2026-04-03T00:15:00.000Z',
    };

    sdk.applyPersistedState(persisted);

    persisted.sessionId = 'mutated-session';
    persisted.accessToken = 'mutated-access';

    expect(Object.isFrozen(persisted)).toBe(false);
    expect(sdk.getState()).toMatchObject({
      status: 'recovering',
      sessionId: 'session-2',
      accessToken: 'access-2',
    });
    expect(sdk.getState()).not.toHaveProperty('me');
  });

  it('does not freeze or alias adapter-owned persisted state during memory adapter hydration', () => {
    const persisted: PersistedSdkState = {
      sessionId: 'session-3',
      accessToken: 'access-3',
      refreshToken: 'refresh-3',
      receivedAt: '2026-04-03T00:00:00.000Z',
      expiresAt: '2026-04-03T00:15:00.000Z',
    };
    const sdk = createStateStore({
      clear() {},
      read() {
        return persisted;
      },
      write() {},
    });

    persisted.sessionId = 'mutated-session';
    persisted.accessToken = 'mutated-access';

    expect(Object.isFrozen(persisted)).toBe(false);
    expect(sdk.getState().status).toBe('recovering');
    expect(sdk.getState()).toMatchObject({
      sessionId: 'session-3',
      accessToken: 'access-3',
    });
    expect(sdk.getState()).not.toHaveProperty('me');
  });

  it('adopts external persisted session updates through the store api', () => {
    const shared = createSharedStorageHarness();
    const sdk = createStateStore(fakeStorage());
    const listener = vi.fn();

    sdk.onChange(listener);
    shared.onStorageUpdate((next) => {
      sdk.applyPersistedState(next);
    });

    shared.write({
      sessionId: 'session-2',
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
      receivedAt: '2026-04-03T00:00:00.000Z',
      expiresAt: '2026-04-03T00:15:00.000Z',
    });
    shared.dispatchStorageUpdate();

    expect(sdk.getState()).toMatchObject({
      status: 'recovering',
      authenticated: false,
      sessionId: 'session-2',
      refreshToken: 'refresh-2',
    });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'recovering',
        sessionId: 'session-2',
      }),
    );
  });

  it('drops only local in-memory state when setAnonymousLocal is used', () => {
    const shared = createSharedStorageHarness({
      sessionId: 'session-3',
      accessToken: 'access-3',
      refreshToken: 'refresh-3',
      receivedAt: '2026-04-03T00:00:00.000Z',
      expiresAt: '2026-04-03T00:15:00.000Z',
    });
    const sdk = createStateStore(shared.storage);

    sdk.setAnonymousLocal();

    expect(sdk.getState()).toMatchObject({
      status: 'anonymous',
      sessionId: null,
      refreshToken: null,
    });
    expect(shared.read()).toMatchObject({
      sessionId: 'session-3',
      refreshToken: 'refresh-3',
    });
  });
});
