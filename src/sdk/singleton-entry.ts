/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import type {
  FetchLike,
  InternalSdkDeps,
  MiniAuthApi,
  MiniAuthInternal,
} from './types.js';

type BootstrapInput = {
  currentScript: { src?: string | null } | null;
  fetch?: FetchLike;
  now?: () => number;
  storage?: Storage;
};

type SingletonInput = {
  baseUrl?: string;
  fetch?: FetchLike;
  now?: () => number;
  storage?: Storage;
};

declare global {
  interface Window {
    MiniAuth: MiniAuthApi;
  }
}

let runtimeCache: ReturnType<typeof createRuntime> | null = null;

export function createMiniAuthInternal(
  input: InternalSdkDeps,
): MiniAuthInternal {
  return getRuntime().createMiniAuthInternal(input) as MiniAuthInternal;
}

export function createSingletonSdk(
  input: SingletonInput = {},
): MiniAuthInternal {
  return getRuntime().createSingletonSdk(input) as MiniAuthInternal;
}

export function bootstrapSingletonSdk(input: BootstrapInput) {
  return getRuntime().bootstrapSingletonSdk(input) as {
    baseUrl: string;
    sdk: MiniAuthInternal;
  };
}

export function renderSingletonIifeSource(): string {
  return `(${createRuntime.toString()})().installOnWindow(window, document);`;
}

function getRuntime() {
  runtimeCache ??= createRuntime();
  return runtimeCache;
}

function createRuntime() {
  const SDK_PATH_SUFFIX = '/sdk/singleton-iife.js';
  const SDK_STORAGE_KEY = 'mini-auth.sdk';

  function createSdkError(code, message) {
    const error = new Error(`${code}: ${message}`);
    error.name = 'MiniAuthSdkError';
    error.code = code;
    return error;
  }

  function createRequestError(status, payload) {
    const error = createSdkError(
      'request_failed',
      typeof payload?.error === 'string'
        ? payload.error
        : `Request failed with status ${status}`,
    );
    error.status = status;
    if (payload && typeof payload === 'object') {
      Object.assign(error, payload);
    }
    if (!('error' in error)) {
      error.error = 'request_failed';
    }
    return error;
  }

  function inferBaseUrl(scriptUrl) {
    const url = new URL(scriptUrl);
    if (!url.pathname.endsWith(SDK_PATH_SUFFIX)) {
      throw createSdkError('sdk_init_failed', 'Cannot infer SDK base URL');
    }
    const basePath = url.pathname.slice(0, -SDK_PATH_SUFFIX.length);
    return `${url.origin}${basePath}`;
  }

  function resolveSdkStorage(input) {
    if (input.storage) {
      return input.storage;
    }
    let storage;
    try {
      storage = input.getDefaultStorage();
    } catch {
      throw createSdkError('sdk_init_failed', 'localStorage is unavailable');
    }
    if (!storage) {
      throw createSdkError('sdk_init_failed', 'localStorage is unavailable');
    }
    return storage;
  }

  function resolveFetch(fetchImpl) {
    const resolved = fetchImpl ?? globalThis.fetch?.bind(globalThis);
    if (!resolved) {
      throw createSdkError('sdk_init_failed', 'fetch is unavailable');
    }
    return resolved;
  }

  function readPersistedSdkState(storage) {
    const raw = storage.getItem(SDK_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object') {
        return null;
      }
      const accessToken = toNullableString(value.accessToken);
      const refreshToken = toNullableString(value.refreshToken);
      const receivedAt = toNullableString(value.receivedAt);
      const expiresAt = toNullableString(value.expiresAt);
      const me = toMe(value.me);
      if (
        accessToken === undefined ||
        refreshToken === undefined ||
        receivedAt === undefined ||
        expiresAt === undefined ||
        me === undefined
      ) {
        return null;
      }
      return {
        accessToken,
        refreshToken,
        receivedAt,
        expiresAt,
        me,
      };
    } catch {
      return null;
    }
  }

  function writePersistedSdkState(storage, snapshot) {
    storage.setItem(SDK_STORAGE_KEY, JSON.stringify(snapshot));
  }

  function clearPersistedSdkState(storage) {
    storage.removeItem(SDK_STORAGE_KEY);
  }

  function createStateStore(storage) {
    const listeners = new Set();
    let state = hydrateState();

    return {
      getState() {
        return cloneSnapshot(state);
      },
      onChange(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      setRecovering(next) {
        updatePersisted({
          status: 'recovering',
          authenticated: false,
          ...clonePersisted(next),
        });
      },
      setAuthenticated(next) {
        updatePersisted({
          status: 'authenticated',
          authenticated: true,
          ...clonePersisted(next),
        });
      },
      setAnonymous() {
        clearPersistedSdkState(storage);
        updateState(createSnapshot('anonymous'));
      },
    };

    function hydrateState() {
      const persisted = readPersistedSdkState(storage);
      if (!persisted?.refreshToken) {
        return createSnapshot('anonymous');
      }
      return freezeSnapshot({
        status: 'recovering',
        authenticated: false,
        ...persisted,
      });
    }

    function updatePersisted(next) {
      const persisted = clonePersisted(next);
      writePersistedSdkState(storage, persisted);
      updateState({
        status: next.status,
        authenticated: next.authenticated,
        ...persisted,
      });
    }

    function updateState(next) {
      state = freezeSnapshot(next);
      for (const listener of listeners) {
        listener(cloneSnapshot(state));
      }
    }
  }

  function createHttpClient(input) {
    return {
      getJson(path, options = {}) {
        return sendJson('GET', path, options);
      },
      postJson(path, body, options = {}) {
        return sendJson('POST', path, { ...options, body });
      },
    };

    async function sendJson(method, path, options) {
      const response = await input.fetch(new URL(path, input.baseUrl), {
        method,
        headers: createHeaders(options),
        ...(options.body === undefined
          ? {}
          : {
              body: JSON.stringify(options.body),
            }),
      });
      const payload = await readJson(response);
      if (!response.ok) {
        throw createRequestError(response.status, payload);
      }
      return payload;
    }

    function createHeaders(options) {
      const headers = { accept: 'application/json' };
      if (options.body !== undefined) {
        headers['content-type'] = 'application/json';
      }
      if (options.accessToken) {
        headers.authorization = `Bearer ${options.accessToken}`;
      }
      return headers;
    }

    async function readJson(response) {
      const text = await response.text();
      if (!text) {
        return null;
      }
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    }
  }

  function shouldRefresh(now, expiresAt, receivedAt) {
    const lifetimeMs = expiresAt - receivedAt;
    const thresholdMs = lifetimeMs < 10 * 60_000 ? lifetimeMs / 2 : 5 * 60_000;
    return now >= expiresAt - thresholdMs;
  }

  function needsRefresh(snapshot, now) {
    if (!snapshot.expiresAt || !snapshot.receivedAt) {
      return true;
    }
    return shouldRefresh(
      now,
      Date.parse(snapshot.expiresAt),
      Date.parse(snapshot.receivedAt),
    );
  }

  function normalizeTokenResponse(payload, now) {
    if (!payload || typeof payload !== 'object') {
      throw createSdkError('request_failed', 'Invalid session payload');
    }
    if (
      typeof payload.access_token !== 'string' ||
      typeof payload.refresh_token !== 'string' ||
      typeof payload.expires_in !== 'number'
    ) {
      throw createSdkError('request_failed', 'Invalid session payload');
    }
    const receivedAtMs = now();
    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      receivedAt: new Date(receivedAtMs).toISOString(),
      expiresAt: new Date(
        receivedAtMs + payload.expires_in * 1000,
      ).toISOString(),
    };
  }

  function createSessionController(input) {
    let refreshPromise = null;
    const controller = {
      getState() {
        return input.state.getState();
      },
      onChange(listener) {
        return input.state.onChange(listener);
      },
      async acceptSessionResponse(response) {
        const session = normalizeTokenResponse(response, input.now);
        input.state.setRecovering({
          ...session,
          me: input.state.getState().me,
        });
        try {
          const me = await fetchMe(session.accessToken);
          const result = { ...session, me };
          input.state.setAuthenticated(result);
          return result;
        } catch (error) {
          input.state.setAnonymous();
          throw error;
        }
      },
      async refresh() {
        if (refreshPromise) {
          return refreshPromise;
        }
        const snapshot = input.state.getState();
        if (!snapshot.refreshToken) {
          throw createSdkError('missing_session', 'Missing refresh token');
        }
        refreshPromise = (async () => {
          try {
            const response = await input.http.postJson('/session/refresh', {
              refresh_token: snapshot.refreshToken,
            });
            return await controller.acceptSessionResponse(response);
          } catch (error) {
            input.state.setAnonymous();
            throw error;
          } finally {
            refreshPromise = null;
          }
        })();
        return refreshPromise;
      },
      async recover() {
        const snapshot = input.state.getState();
        if (!snapshot.refreshToken) {
          input.state.setAnonymous();
          return;
        }
        if (!snapshot.accessToken || needsRefresh(snapshot, input.now())) {
          await controller.refresh();
          return;
        }
        try {
          const me = await fetchMe(snapshot.accessToken);
          input.state.setAuthenticated({
            accessToken: snapshot.accessToken,
            refreshToken: snapshot.refreshToken,
            receivedAt:
              snapshot.receivedAt ?? new Date(input.now()).toISOString(),
            expiresAt:
              snapshot.expiresAt ?? new Date(input.now()).toISOString(),
            me,
          });
        } catch {
          input.state.setAnonymous();
        }
      },
      async reloadMe() {
        const snapshot = input.state.getState();
        if (!snapshot.refreshToken) {
          throw createSdkError('missing_session', 'Missing refresh token');
        }
        if (!snapshot.accessToken || needsRefresh(snapshot, input.now())) {
          return (await controller.refresh()).me;
        }
        const me = await fetchMe(snapshot.accessToken);
        input.state.setAuthenticated({
          accessToken: snapshot.accessToken,
          refreshToken: snapshot.refreshToken,
          receivedAt:
            snapshot.receivedAt ?? new Date(input.now()).toISOString(),
          expiresAt: snapshot.expiresAt ?? new Date(input.now()).toISOString(),
          me,
        });
        return me;
      },
      async logout() {
        const snapshot = input.state.getState();
        if (!snapshot.refreshToken && !snapshot.accessToken) {
          input.state.setAnonymous();
          return;
        }
        try {
          let accessToken = snapshot.accessToken;
          if (
            snapshot.refreshToken &&
            (!accessToken || needsRefresh(snapshot, input.now()))
          ) {
            try {
              accessToken = (await controller.refresh()).accessToken;
            } catch {
              accessToken = null;
            }
          }
          if (accessToken) {
            await input.http.postJson('/session/logout', undefined, {
              accessToken,
            });
          }
        } catch {
          // Deterministic local clear hides remote logout failures.
        } finally {
          input.state.setAnonymous();
        }
      },
    };

    return controller;

    async function fetchMe(accessToken) {
      if (!accessToken) {
        throw createSdkError('missing_session', 'Missing access token');
      }
      return await input.http.getJson('/me', { accessToken });
    }
  }

  function createEmailModule(input) {
    return {
      start(payload) {
        return input.http.postJson('/email/start', payload);
      },
      async verify(payload) {
        const response = await input.http.postJson('/email/verify', payload);
        return await input.session.acceptSessionResponse(response);
      },
    };
  }

  function createMiniAuthInternal(input) {
    const state = createStateStore(input.storage);
    const http = createHttpClient({
      baseUrl: input.baseUrl,
      fetch: input.fetch,
    });
    const session = createSessionController({
      http,
      now: input.now ?? (() => Date.now()),
      state,
    });
    const api = {
      email: createEmailModule({ http, session }),
      me: {
        get() {
          return state.getState().me;
        },
        reload() {
          return session.reloadMe();
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
      webauthn: {},
    };
    const ready =
      input.autoRecover !== false && state.getState().status === 'recovering'
        ? session.recover()
        : Promise.resolve();
    return Object.assign(api, { ready });
  }

  function createSingletonSdk(input = {}) {
    return createMiniAuthInternal({
      baseUrl: input.baseUrl ?? 'https://mini-auth.local',
      fetch: resolveFetch(input.fetch),
      now: input.now,
      storage: resolveSdkStorage({
        storage: input.storage,
        getDefaultStorage: () => window.localStorage,
      }),
    });
  }

  function bootstrapSingletonSdk(input) {
    const scriptUrl = input.currentScript?.src;
    if (!scriptUrl) {
      throw createSdkError(
        'sdk_init_failed',
        'Cannot determine SDK script URL',
      );
    }
    const baseUrl = inferBaseUrl(scriptUrl);
    return {
      baseUrl,
      sdk: createSingletonSdk({
        baseUrl,
        fetch: input.fetch,
        now: input.now,
        storage: input.storage,
      }),
    };
  }

  function installOnWindow(window, document) {
    window.MiniAuth = bootstrapSingletonSdk({
      currentScript: document.currentScript,
      fetch: resolveFetch(window.fetch?.bind(window)),
    }).sdk;
    /* v1 supports same-origin or same-origin proxy deployment only. */
  }

  function toNullableString(value) {
    if (value === undefined || value === null) {
      return null;
    }
    return typeof value === 'string' ? value : undefined;
  }

  function toMe(value) {
    if (value === undefined || value === null) {
      return null;
    }
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    if (
      typeof value.user_id !== 'string' ||
      typeof value.email !== 'string' ||
      !Array.isArray(value.webauthn_credentials) ||
      !Array.isArray(value.active_sessions)
    ) {
      return undefined;
    }
    return {
      user_id: value.user_id,
      email: value.email,
      webauthn_credentials: [...value.webauthn_credentials],
      active_sessions: [...value.active_sessions],
    };
  }

  function createSnapshot(status) {
    return freezeSnapshot({
      status,
      authenticated: status === 'authenticated',
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
      me: null,
    });
  }

  function clonePersisted(snapshot) {
    return {
      accessToken: snapshot.accessToken,
      refreshToken: snapshot.refreshToken,
      receivedAt: snapshot.receivedAt,
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
  }

  function freezeSnapshot(snapshot) {
    if (snapshot.me) {
      Object.freeze(snapshot.me.webauthn_credentials);
      Object.freeze(snapshot.me.active_sessions);
      Object.freeze(snapshot.me);
    }
    return Object.freeze(snapshot);
  }

  function cloneSnapshot(snapshot) {
    return freezeSnapshot({
      status: snapshot.status,
      authenticated: snapshot.authenticated,
      ...clonePersisted(snapshot),
    });
  }

  return {
    createMiniAuthInternal,
    createSingletonSdk,
    bootstrapSingletonSdk,
    installOnWindow,
  };
}
