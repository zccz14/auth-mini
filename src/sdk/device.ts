import { createSdkError } from './errors.js';
import { createHttpClient } from './http.js';
import { createSessionController } from './session.js';
import { createStateStore } from './state.js';
import { authenticateDevice } from './device-auth.js';
import type {
  DeviceSdkApi,
  DeviceSdkOptions,
  PersistedSdkState,
} from './types.js';

export type {
  DevicePrivateKeyJwk,
  DeviceSdkApi,
  DeviceSdkOptions,
  Listener,
  MeResponse,
  SessionResult,
  SessionSnapshot,
  SdkStatus,
} from './types.js';

export function createDeviceSdk(options: DeviceSdkOptions): DeviceSdkApi {
  let persisted: PersistedSdkState | null = null;

  const state = createStateStore({
    clear() {
      persisted = null;
    },
    read() {
      return persisted;
    },
    write(next) {
      persisted = next;
    },
  });
  let disposed = false;
  let disposePromise: Promise<void> | null = null;

  const guardedState = {
    getState() {
      return state.getState();
    },
    onChange(listener: DeviceSdkApi['session']['onChange'] extends (
      listener: infer T,
    ) => () => void
      ? T
      : never) {
      return state.onChange(listener);
    },
    applyPersistedState(next: PersistedSdkState | null) {
      if (disposed) {
        return;
      }

      state.applyPersistedState(next);
    },
    setAuthenticated(next: Parameters<typeof state.setAuthenticated>[0]) {
      if (disposed) {
        return;
      }

      state.setAuthenticated(next);
    },
    setRecovering(next: Parameters<typeof state.setRecovering>[0]) {
      if (disposed) {
        return;
      }

      state.setRecovering(next);
    },
    setAnonymous() {
      if (disposed) {
        return;
      }

      state.setAnonymous();
    },
    setAnonymousLocal() {
      if (disposed) {
        return;
      }

      state.setAnonymousLocal();
    },
  };

  const fetch = options.fetch ?? globalThis.fetch?.bind(globalThis);

  if (!fetch) {
    throw createSdkError('sdk_init_failed', 'fetch is unavailable');
  }

  const http = createHttpClient({
    baseUrl: options.serverBaseUrl,
    fetch,
  });
  const session = createSessionController({
    http,
    now: options.now ?? (() => Date.now()),
    state: guardedState,
  });

  const ready = (async () => {
    await authenticateDevice({
      credentialId: options.credentialId,
      http,
      privateKey: options.privateKey,
      session,
    });
  })();

  return {
    ready,
    dispose,
    [Symbol.asyncDispose]() {
      return dispose();
    },
    me: {
      get() {
        return state.getState().me;
      },
      async reload() {
        assertNotDisposed();

        const me = await session.reloadMe();

        if (!me) {
          throw createSdkError('missing_session', 'Missing authenticated user');
        }

        return me;
      },
    },
    session: {
      getState() {
        return state.getState();
      },
      onChange(listener) {
        return state.onChange(listener);
      },
      async refresh() {
        assertNotDisposed();
        return await session.refresh();
      },
      async logout() {
        assertNotDisposed();
        return await session.logout();
      },
    },
  };

  function assertNotDisposed(): void {
    if (!disposed) {
      return;
    }

    throw createSdkError('disposed_session', 'Device SDK instance has been disposed');
  }

  function dispose(): Promise<void> {
    if (disposePromise) {
      return disposePromise;
    }

    disposed = true;
    disposePromise = (async () => {
      try {
        await session.logout();
      } catch {
        // Deterministic local disposal hides remote failures.
      } finally {
        persisted = null;
        state.setAnonymous();
      }
    })();

    return disposePromise;
  }
}
