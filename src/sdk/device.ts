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
    me: {
      get() {
        return state.getState().me;
      },
      async reload() {
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
        return session.refresh();
      },
      logout() {
        return session.logout();
      },
    },
  };
}
