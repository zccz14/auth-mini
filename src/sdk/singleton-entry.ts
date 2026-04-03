import { inferBaseUrl } from './base-url.js';
import { createSdkError } from './errors.js';
import { createStateStore } from './state.js';

type BootstrapInput = {
  currentScript: { src?: string | null } | null;
  storage?: Storage;
};

export function bootstrapSingletonSdk(input: BootstrapInput) {
  const scriptUrl = input.currentScript?.src;

  if (!scriptUrl) {
    throw createSdkError('sdk_init_failed', 'Cannot determine SDK script URL');
  }

  return {
    baseUrl: inferBaseUrl(scriptUrl),
    sdk: createSingletonSdk({ storage: input.storage }),
  };
}

export function createSingletonSdk(input: { storage?: Storage } = {}) {
  const state = createStateStore(requireStorage(input.storage));

  return {
    email: {},
    webauthn: {},
    me: {},
    session: {
      getState: () => state.getState(),
      onChange: (
        listener: (snapshot: ReturnType<typeof state.getState>) => void,
      ) => state.onChange(listener),
    },
  };
}

export function renderSingletonIifeSource(): string {
  return `(() => {
  const SDK_STORAGE_KEY = 'mini-auth.sdk';
  function createSdkError(code, message) {
    const error = new Error(code + ': ' + message);
    error.name = 'MiniAuthSdkError';
    error.code = code;
    return error;
  }
  function inferBaseUrl(scriptUrl) {
    const url = new URL(scriptUrl);
    if (!url.pathname.endsWith('/sdk/singleton-iife.js')) {
      throw createSdkError('sdk_init_failed', 'Cannot infer SDK base URL');
    }
    const basePath = url.pathname.slice(0, -'/sdk/singleton-iife.js'.length);
    return '' + url.origin + basePath;
  }
  function cloneSnapshot(snapshot) {
    const next = {
      status: snapshot.status,
      authenticated: snapshot.authenticated,
      accessToken: snapshot.accessToken,
      refreshToken: snapshot.refreshToken,
      expiresAt: snapshot.expiresAt,
      me: snapshot.me
        ? {
            user_id: snapshot.me.user_id,
            email: snapshot.me.email,
            webauthn_credentials: [...snapshot.me.webauthn_credentials],
            active_sessions: [...snapshot.me.active_sessions],
          }
        : null,
    };
    if (next.me) {
      Object.freeze(next.me.webauthn_credentials);
      Object.freeze(next.me.active_sessions);
      Object.freeze(next.me);
    }
    return Object.freeze(next);
  }
  function isRecord(value) {
    return typeof value === 'object' && value !== null;
  }
  function toNullableString(value) {
    if (value === undefined || value === null) return null;
    return typeof value === 'string' ? value : undefined;
  }
  function toMeResponse(value) {
    if (value === undefined || value === null) return null;
    if (!isRecord(value)) return undefined;
    if (typeof value.user_id !== 'string' || typeof value.email !== 'string' || !Array.isArray(value.webauthn_credentials) || !Array.isArray(value.active_sessions)) {
      return undefined;
    }
    return {
      user_id: value.user_id,
      email: value.email,
      webauthn_credentials: [...value.webauthn_credentials],
      active_sessions: [...value.active_sessions],
    };
  }
  function readPersistedSdkState(storage) {
    const raw = storage.getItem(SDK_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!isRecord(parsed)) return null;
      const accessToken = toNullableString(parsed.accessToken);
      const refreshToken = toNullableString(parsed.refreshToken);
      const expiresAt = toNullableString(parsed.expiresAt);
      const me = toMeResponse(parsed.me);
      if (accessToken === undefined || refreshToken === undefined || expiresAt === undefined || me === undefined) {
        return null;
      }
      return { accessToken, refreshToken, expiresAt, me };
    } catch {
      return null;
    }
  }
  function createStateStore(storage) {
    const listeners = new Set();
    const persisted = readPersistedSdkState(storage);
    let state = cloneSnapshot(
      persisted && persisted.refreshToken
        ? {
            status: 'recovering',
            authenticated: false,
            accessToken: persisted.accessToken,
            refreshToken: persisted.refreshToken,
            expiresAt: persisted.expiresAt,
            me: persisted.me,
          }
        : {
            status: 'anonymous',
            authenticated: false,
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
            me: null,
          },
    );
    return {
      getState() { return cloneSnapshot(state); },
      onChange(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  }
  function createSingletonSdk(input = {}) {
    const state = createStateStore(input.storage || localStorage);
    return {
      email: {},
      webauthn: {},
      me: {},
      session: {
        getState: () => state.getState(),
        onChange: (listener) => state.onChange(listener),
      },
    };
  }
  function bootstrapSingletonSdk(input) {
    const scriptUrl = input.currentScript && input.currentScript.src;
    if (!scriptUrl) {
      throw createSdkError('sdk_init_failed', 'Cannot determine SDK script URL');
    }
    return {
      baseUrl: inferBaseUrl(scriptUrl),
      sdk: createSingletonSdk({ storage: input.storage }),
    };
  }
  /* v1 supports same-origin or same-origin proxy deployment only. */
  window.MiniAuth = bootstrapSingletonSdk({
    currentScript: document.currentScript,
    storage: localStorage,
  }).sdk;
})();`;
}

function requireStorage(storage: Storage | undefined): Storage {
  if (storage) {
    return storage;
  }

  if (typeof localStorage === 'undefined') {
    throw createSdkError('sdk_init_failed', 'localStorage is unavailable');
  }

  return localStorage;
}
