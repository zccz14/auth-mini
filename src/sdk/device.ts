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
  let disposed = false;

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
    state,
  });

  const assertUsable = () => {
    if (disposed) {
      throw createSdkError(
        'disposed_session',
        'Device SDK instance has been disposed',
      );
    }
  };

  const ready = (async () => {
    assertUsable();
    await authenticateDevice({
      credentialId: options.credentialId,
      http,
      privateKey: options.privateKey,
      session,
    });
  })();

  async function dispose(): Promise<void> {
    if (disposed) {
      return;
    }

    disposed = true;

    try {
      await session.logout();
    } finally {
      state.setAnonymous();
    }
  }

  return {
    ready,
    dispose,
    async [Symbol.asyncDispose]() {
      await dispose();
    },
    me: {
      get() {
        return state.getState().me;
      },
      async reload() {
        assertUsable();
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
      refresh() {
        assertUsable();
        return session.refresh();
      },
      logout() {
        assertUsable();
        return session.logout();
      },
    },
  };
}
