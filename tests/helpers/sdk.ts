import { createAuthMiniInternal } from '../../src/sdk/singleton-entry.js';
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
      me: null,
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
        me: null,
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
    me: null,
    ...seed,
  });
}

export function fakeAuthenticatedStorageWithMe(
  me: MeResponse = createMe(),
  seed: Partial<PersistedSdkState> = {},
): Storage {
  return fakeAuthenticatedStorage({
    me,
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

export function createAuthMiniForTest(options: TestSdkOptions = {}) {
  return createAuthMiniInternal({
    autoRecover: false,
    baseUrl: 'https://auth.example.com',
    fetch: async () => jsonResponse({ ok: true }),
    now: () => Date.parse('2026-04-03T00:00:00.000Z'),
    publicKeyCredential: {},
    navigatorCredentials: fakeNavigatorCredentials(),
    storage: fakeStorage(),
    ...options,
  } as InternalSdkDeps);
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

export function executeServedSdk(
  source: string,
  options: {
    currentScriptSrc?: string | null;
    storage?: Storage;
    storageUnavailable?: boolean;
  } = {},
): Window & typeof globalThis {
  const windowObject = {} as Window & typeof globalThis;
  const storageListeners = new Set<(event: StorageEvent) => void>();
  const document = {
    currentScript:
      options.currentScriptSrc === undefined
        ? { src: 'https://app.example.com/sdk/singleton-iife.js' }
        : options.currentScriptSrc === null
          ? null
          : { src: options.currentScriptSrc },
  };
  if (options.storageUnavailable) {
    Object.defineProperty(windowObject, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('localStorage blocked');
      },
    });
  } else {
    Object.defineProperty(windowObject, 'localStorage', {
      configurable: true,
      value: options.storage ?? fakeStorage(),
    });
  }

  windowObject.addEventListener = ((type: string, listener: EventListener) => {
    if (type === 'storage') {
      storageListeners.add(listener as (event: StorageEvent) => void);
    }
  }) as Window['addEventListener'];
  windowObject.removeEventListener = ((
    type: string,
    listener: EventListener,
  ) => {
    if (type === 'storage') {
      storageListeners.delete(listener as (event: StorageEvent) => void);
    }
  }) as Window['removeEventListener'];
  (
    windowObject as typeof windowObject & {
      dispatchStorageEvent: (event: StorageEvent) => void;
    }
  ).dispatchStorageEvent = (event: StorageEvent) => {
    for (const listener of storageListeners) {
      listener(event);
    }
  };

  const run = new Function('window', 'document', source);
  run(windowObject, document);
  return windowObject;
}
