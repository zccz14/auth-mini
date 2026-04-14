import { createEmailModule } from '../../src/sdk/email.js';
import { createSdkError } from '../../src/sdk/errors.js';
import { createHttpClient } from '../../src/sdk/http.js';
import {
  createSessionController,
  needsRefresh,
} from '../../src/sdk/session.js';
import { createStateStore } from '../../src/sdk/state.js';
import {
  clearPersistedSdkState,
  readPersistedSdkState,
  writePersistedSdkState,
} from '../../src/sdk/storage.js';
import type {
  InternalSdkDeps,
  MeResponse,
  PersistedSdkState,
} from '../../src/sdk/types.js';
import { vi } from 'vitest';

type StorageSeed = Partial<PersistedSdkState>;
type TestStorageSync = {
  getSnapshot: () => PersistedSdkState | null;
  subscribe: (listener: (next: PersistedSdkState | null) => void) => () => void;
};
type TestSdkOptions = Partial<InternalSdkDeps> & {
  recoveryTimeoutMs?: number;
  storageSync?: TestStorageSync;
};

export function browserSdkStorageKey(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  return `auth-mini.sdk:${url.toString()}`;
}

export function seedBrowserSdkStorage(
  storage: Storage,
  baseUrl: string,
  seed: StorageSeed,
): void {
  storage.setItem(
    browserSdkStorageKey(baseUrl),
    JSON.stringify({
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
      ...seed,
    }),
  );
}

export function fakeStorage(seed: StorageSeed = {}): Storage {
  const data = new Map<string, string>();

  if (Object.keys(seed).length > 0) {
    data.set(
      'auth-mini.sdk',
      JSON.stringify({
        sessionId: null,
        accessToken: null,
        refreshToken: null,
        receivedAt: null,
        expiresAt: null,
        ...seed,
      }),
    );
  }

  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    key(index) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key) {
      data.delete(key);
    },
    setItem(key, value) {
      data.set(key, value);
    },
  };
}

export function fakeAuthenticatedStorage(
  seed: Partial<PersistedSdkState> = {},
): Storage {
  return fakeStorage({
    sessionId: 'session-1',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    receivedAt: '2026-04-03T00:00:00.000Z',
    expiresAt: '2026-04-03T00:15:00.000Z',
    ...seed,
  });
}

export function fakeAlmostExpiredStorage(): Storage {
  return fakeAuthenticatedStorage({
    receivedAt: '2026-04-03T00:00:00.000Z',
    expiresAt: '2026-04-03T00:03:00.000Z',
  });
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

export function createDevicePrivateKeySeed(): string {
  return '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM';
}

export function createAuthMiniForTest(options: TestSdkOptions = {}) {
  const storage = options.storage ?? fakeStorage();
  const now = options.now ?? (() => Date.parse('2026-04-03T00:00:00.000Z'));
  const autoRecover = options.autoRecover ?? false;
  const state = createStateStore(storage);
  const externalStorageListeners = new Set<() => void>();
  const storageSync = options.storageSync;

  storageSync?.subscribe((next) => {
    if (
      next?.sessionId &&
      next.refreshToken &&
      next.accessToken &&
      !needsRefresh(
        {
          status: 'recovering',
          authenticated: false,
          sessionId: next.sessionId,
          accessToken: next.accessToken,
          refreshToken: next.refreshToken,
          receivedAt: next.receivedAt,
          expiresAt: next.expiresAt,
        },
        now(),
      )
    ) {
      state.setAuthenticated({
        sessionId: next.sessionId,
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
        receivedAt: next.receivedAt ?? new Date(now()).toISOString(),
        expiresAt: next.expiresAt ?? new Date(now()).toISOString(),
      });
    } else {
      state.applyPersistedState(next);
    }

    for (const listener of externalStorageListeners) {
      listener();
    }
  });

  const http = createHttpClient({
    baseUrl: 'https://auth.example.com',
    fetch: options.fetch ?? (async () => jsonResponse({ ok: true })),
  });
  const session = createSessionController({
    http,
    now,
    readSharedState: () =>
      storageSync?.getSnapshot() ?? readPersistedSdkState(storage),
    recoveryTimeoutMs: options.recoveryTimeoutMs,
    state,
    waitForExternalStorage(timeoutMs) {
      if (!storageSync) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) {
            return;
          }

          settled = true;
          clearTimeout(timer);
          externalStorageListeners.delete(done);
          resolve();
        };
        const timer = setTimeout(done, timeoutMs);

        externalStorageListeners.add(done);
      });
    },
  });
  const ready =
    autoRecover && state.getState().status === 'recovering'
      ? Promise.resolve().then(() => session.recover())
      : Promise.resolve();

  void ready.catch(() => {});

  const unsupportedWebauthn = {
    async authenticate() {
      throw createSdkError(
        'sdk_init_failed',
        'Passkey helper is unavailable in this focused test harness',
      );
    },
    async register() {
      throw createSdkError(
        'sdk_init_failed',
        'Passkey helper is unavailable in this focused test harness',
      );
    },
  };

  return {
    ready,
    email: createEmailModule({ http, session }),
    me: {
      fetch() {
        return session.fetchMe();
      },
    },
    session: {
      getState() {
        return state.getState();
      },
      onChange(listener: Parameters<typeof state.onChange>[0]) {
        return state.onChange(listener);
      },
      refresh() {
        return session.refresh();
      },
      logout() {
        return session.logout();
      },
    },
    passkey: unsupportedWebauthn,
    webauthn: unsupportedWebauthn,
  };
}

export function createSharedStorageHarness(seed: StorageSeed = {}) {
  const storage = fakeStorage(seed);
  const listeners = new Set<(next: PersistedSdkState | null) => void>();

  return {
    storage,
    clear() {
      clearPersistedSdkState(storage);
    },
    createSdk(options: TestSdkOptions = {}) {
      return createAuthMiniForTest({
        storage,
        storageSync: {
          getSnapshot: () => readPersistedSdkState(storage),
          subscribe(listener: (next: PersistedSdkState | null) => void) {
            listeners.add(listener);
            return () => {
              listeners.delete(listener);
            };
          },
        },
        ...options,
      } as Partial<InternalSdkDeps>);
    },
    dispatchStorageUpdate() {
      const snapshot = readPersistedSdkState(storage);

      for (const listener of listeners) {
        listener(snapshot);
      }
    },
    read() {
      return readPersistedSdkState(storage);
    },
    onStorageUpdate(listener: (next: PersistedSdkState | null) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    write(next: PersistedSdkState) {
      writePersistedSdkState(storage, next);
    },
    remove() {
      clearPersistedSdkState(storage);
    },
  };
}

export function createNotAllowedError(message: string): Error {
  const error = new Error(message);
  error.name = 'NotAllowedError';
  return error;
}

export function cancelledNavigatorCredentials() {
  return {
    async create() {
      throw createNotAllowedError('Passkey creation cancelled');
    },
    async get() {
      throw createNotAllowedError('Passkey sign-in cancelled');
    },
  };
}

export function fakeNavigatorCredentials() {
  return {
    async create(options?: CredentialCreationOptions) {
      const publicKey =
        options?.publicKey as PublicKeyCredentialCreationOptions;
      const rawId = new Uint8Array([1, 2, 3, 4]).buffer;
      const clientDataJSON = new Uint8Array([5, 6, 7, 8]).buffer;
      const attestationObject = new Uint8Array([9, 10, 11, 12]).buffer;

      return {
        id: 'register-credential',
        rawId,
        type: 'public-key',
        response: {
          clientDataJSON,
          attestationObject,
          getTransports() {
            return ['internal'];
          },
        },
        clientExtensionResults: {
          credProps: {
            rk: true,
          },
        },
        __publicKey: publicKey,
      };
    },
    async get(options?: CredentialRequestOptions) {
      const publicKey = options?.publicKey as PublicKeyCredentialRequestOptions;
      const rawId = new Uint8Array([21, 22, 23, 24]).buffer;
      const clientDataJSON = new Uint8Array([25, 26, 27, 28]).buffer;
      const authenticatorData = new Uint8Array([29, 30, 31, 32]).buffer;
      const signature = new Uint8Array([33, 34, 35, 36]).buffer;
      const userHandle = new Uint8Array([37, 38, 39, 40]).buffer;

      return {
        id: 'authenticate-credential',
        rawId,
        type: 'public-key',
        response: {
          clientDataJSON,
          authenticatorData,
          signature,
          userHandle,
        },
        __publicKey: publicKey,
      };
    },
  };
}

export function createWebauthnRequestRecorder() {
  const fetch = vi.fn(async (input: unknown, init?: RequestInit) => {
    const path =
      input instanceof URL ? input.pathname : new URL(String(input)).pathname;

    if (path === '/webauthn/authenticate/options') {
      return jsonResponse({
        request_id: 'request-authenticate',
        publicKey: {
          challenge: 'AQIDBA',
          rpId: 'auth.example.com',
          timeout: 300000,
          userVerification: 'preferred',
          allowCredentials: [
            {
              id: 'BQYHCA',
              type: 'public-key',
            },
          ],
        },
      });
    }

    if (path === '/webauthn/authenticate/verify') {
      return jsonResponse({
        session_id: 'session-authenticated',
        access_token: 'access-authenticated',
        refresh_token: 'refresh-authenticated',
        expires_in: 900,
        token_type: 'Bearer',
      });
    }

    if (path === '/webauthn/register/options') {
      return jsonResponse({
        request_id: 'request-register',
        publicKey: {
          challenge: 'CQoLDA',
          rp: {
            id: 'auth.example.com',
            name: 'auth-mini',
          },
          user: {
            id: 'DQ4PEA',
            name: 'u@example.com',
            displayName: 'u@example.com',
          },
          pubKeyCredParams: [
            {
              type: 'public-key',
              alg: -7,
            },
          ],
          timeout: 300000,
          excludeCredentials: [
            {
              id: 'ERITFA',
              type: 'public-key',
            },
          ],
        },
      });
    }

    if (path === '/webauthn/register/verify') {
      return jsonResponse({ ok: true });
    }

    if (path === '/me') {
      return jsonResponse(createMe());
    }

    throw new Error(
      `Unhandled fetch path: ${path} ${JSON.stringify(init ?? {})}`,
    );
  });

  return fetch;
}

export function readJsonBody(
  fetchMock: {
    mock?: { calls: unknown[][] };
  },
  path: string,
) {
  const call = (fetchMock.mock?.calls ?? []).find(([input]) => {
    const value =
      input instanceof URL ? input.pathname : new URL(String(input)).pathname;
    return value === path;
  });

  if (!call) {
    return null;
  }

  const body = (call[1] as RequestInit | undefined)?.body;
  if (typeof body !== 'string') {
    return null;
  }

  return JSON.parse(body);
}

export function countRefreshCalls(fetchMock: {
  mock?: { calls: unknown[][] };
}): number {
  return readFetchPaths(fetchMock).filter((path) => path === '/session/refresh')
    .length;
}

export function countLogoutCalls(fetchMock: {
  mock?: { calls: unknown[][] };
}): number {
  return readFetchPaths(fetchMock).filter((path) => path === '/session/logout')
    .length;
}

function readFetchPaths(fetchMock: { mock?: { calls: unknown[][] } }) {
  return (fetchMock.mock?.calls ?? []).map(([input]) => {
    if (input instanceof URL) {
      return input.pathname;
    }

    return new URL(String(input)).pathname;
  });
}

function createMe(overrides: Partial<MeResponse> = {}): MeResponse {
  return {
    user_id: 'user-1',
    email: 'u@example.com',
    webauthn_credentials: [],
    ed25519_credentials: [],
    active_sessions: [],
    ...overrides,
  };
}
