/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { parseMeResponse, renderMeParserSource } from './me.js';
import type {
  AuthMiniApi,
  AuthMiniInternal,
  FetchLike,
  InternalSdkDeps,
} from './types.js';

type BrowserSdkFactoryOptions = {
  fetch?: FetchLike;
  now?: () => number;
  storage?: Storage;
};

type BootstrapInput = {
  currentScript: { src?: string | null } | null;
  fetch?: FetchLike;
  now?: () => number;
  storage?: Storage;
};

type SingletonInput = BrowserSdkFactoryOptions & {
  baseUrl: string;
};

declare global {
  interface Window {
    AuthMini: AuthMiniApi;
  }
}

let runtimeCache: ReturnType<typeof createRuntime> | null = null;

export function createAuthMiniInternal(
  input: InternalSdkDeps,
): AuthMiniInternal {
  return getRuntime().createAuthMiniInternal(input) as AuthMiniInternal;
}

export function createSingletonSdk(input: SingletonInput): AuthMiniInternal {
  return createBrowserSdkInternal(input.baseUrl, input);
}

export function createBrowserSdkInternal(
  baseUrl: string,
  options: BrowserSdkFactoryOptions = {},
): AuthMiniInternal {
  return getRuntime().createSingletonSdk({
    ...options,
    baseUrl,
  }) as AuthMiniInternal;
}

export function bootstrapSingletonSdk(input: BootstrapInput) {
  return getRuntime().bootstrapSingletonSdk(input) as {
    baseUrl: string;
    sdk: AuthMiniInternal;
  };
}

export function renderSingletonIifeSource(): string {
  return `(()=>{${renderMeParserSource()}return (${createRuntime.toString()})(parseMeResponse).installOnWindow(window, document);})()`;
}

function getRuntime() {
  runtimeCache ??= createRuntime();
  return runtimeCache;
}

function createRuntime(parseMeResponseImpl = parseMeResponse) {
  const SDK_PATH_SUFFIX = '/sdk/singleton-iife.js';
  const SDK_STORAGE_KEY = 'auth-mini.sdk';

  function createSdkError(code, message) {
    const error = new Error(`${code}: ${message}`);
    error.name = 'AuthMiniSdkError';
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

  function getStorageKey(baseUrl) {
    return `${SDK_STORAGE_KEY}:${normalizeBaseUrl(baseUrl).toString()}`;
  }

  function normalizeBaseUrl(baseUrl) {
    const url = new URL(baseUrl);
    url.search = '';
    url.hash = '';
    url.pathname = url.pathname.endsWith('/')
      ? url.pathname
      : `${url.pathname}/`;
    return url;
  }

  function readPersistedSdkState(storage, storageKey) {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    try {
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object') {
        return null;
      }
      const sessionId = toNullableString(value.sessionId);
      const accessToken = toNullableString(value.accessToken);
      const refreshToken = toNullableString(value.refreshToken);
      const receivedAt = toNullableString(value.receivedAt);
      const expiresAt = toNullableString(value.expiresAt);
      if (
        sessionId === undefined ||
        accessToken === undefined ||
        refreshToken === undefined ||
        receivedAt === undefined ||
        expiresAt === undefined
      ) {
        return null;
      }
      if (refreshToken && !sessionId) {
        return null;
      }
      return {
        sessionId,
        accessToken,
        refreshToken,
        receivedAt,
        expiresAt,
      };
    } catch {
      return null;
    }
  }

  function writePersistedSdkState(storage, storageKey, snapshot) {
    storage.setItem(storageKey, JSON.stringify(snapshot));
  }

  function clearPersistedSdkState(storage, storageKey) {
    storage.removeItem(storageKey);
  }

  function createStateStore(storage, storageKey) {
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
        clearPersistedSdkState(storage, storageKey);
        updateState(createSnapshot('anonymous'));
      },
      applyPersistedState(next) {
        updateState(hydrateSnapshot(next));
      },
      setAnonymousLocal() {
        updateState(createSnapshot('anonymous'));
      },
    };

    function hydrateState() {
      return hydrateSnapshot(readPersistedSdkState(storage, storageKey));
    }

    function hydrateSnapshot(persisted) {
      if (!persisted?.refreshToken || !persisted.sessionId) {
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
      writePersistedSdkState(storage, storageKey, persisted);
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
      const response = await input.fetch(
        new URL(path.replace(/^\//, ''), input.baseUrl),
        {
          method,
          headers: createHeaders(options),
          ...(options.body === undefined
            ? {}
            : {
                body: JSON.stringify(options.body),
              }),
        },
      );
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
    const expiresAt = Date.parse(snapshot.expiresAt);
    const receivedAt = Date.parse(snapshot.receivedAt);
    if (!Number.isFinite(expiresAt) || !Number.isFinite(receivedAt)) {
      return true;
    }
    return shouldRefresh(now, expiresAt, receivedAt);
  }

  function normalizeTokenResponse(payload, now) {
    if (!payload || typeof payload !== 'object') {
      throw createSdkError('request_failed', 'Invalid session payload');
    }
    if (
      typeof payload.access_token !== 'string' ||
      typeof payload.session_id !== 'string' ||
      typeof payload.refresh_token !== 'string' ||
      typeof payload.expires_in !== 'number'
    ) {
      throw createSdkError('request_failed', 'Invalid session payload');
    }
    const receivedAtMs = now();
    return {
      sessionId: payload.session_id,
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
    let supersededRecoveryPromise = null;
    const controller = {
      getState() {
        return input.state.getState();
      },
      onChange(listener) {
        return input.state.onChange(listener);
      },
      async acceptSessionResponse(response, options = {}) {
        const session = normalizeTokenResponse(response, input.now);
        input.state.setRecovering(session);
        try {
          input.state.setAuthenticated(session);
          return session;
        } catch (error) {
          if (
            options.clearOnMeFailure !== 'auth-invalidating' ||
            isAuthInvalidatingError(error)
          ) {
            input.state.setAnonymous();
          }
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
        if (!snapshot.sessionId) {
          throw createSdkError('missing_session', 'Missing session id');
        }
        refreshPromise = (async () => {
          try {
            const response = await input.http.postJson('/session/refresh', {
              session_id: snapshot.sessionId,
              refresh_token: snapshot.refreshToken,
            });
            return await controller.acceptSessionResponse(response, {
              clearOnMeFailure: 'auth-invalidating',
            });
          } catch (error) {
            if (isSessionSupersededError(error)) {
              const recoveryPromise = startSupersededRecovery(snapshot);

              supersededRecoveryPromise = recoveryPromise.finally(() => {
                if (supersededRecoveryPromise === recoveryPromise) {
                  supersededRecoveryPromise = null;
                }
              });
            } else if (
              isAuthInvalidatingError(error) ||
              isContractDriftError(error)
            ) {
              input.state.setAnonymous();
            }
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
        try {
          if (!snapshot.accessToken || needsRefresh(snapshot, input.now())) {
            await controller.refresh();
            return;
          }
          input.state.setAuthenticated({
            sessionId: snapshot.sessionId,
            accessToken: snapshot.accessToken,
            refreshToken: snapshot.refreshToken,
            receivedAt:
              snapshot.receivedAt ?? new Date(input.now()).toISOString(),
            expiresAt:
              snapshot.expiresAt ?? new Date(input.now()).toISOString(),
          });
        } catch (error) {
          if (isSessionSupersededError(error)) {
            await supersededRecoveryPromise;

            const current = input.state.getState();

            if (isSameRecoveringSession(current, snapshot)) {
              input.state.setAnonymousLocal();
            }

            return;
          }

          if (isAuthInvalidatingError(error) || isContractDriftError(error)) {
            input.state.setAnonymous();

            if (isContractDriftError(error)) {
              throw error;
            }
          }
        }
      },
      async fetchMe() {
        const snapshot = input.state.getState();
        if (!snapshot.refreshToken) {
          throw createSdkError('missing_session', 'Missing refresh token');
        }
        if (!snapshot.accessToken || needsRefresh(snapshot, input.now())) {
          return await fetchMe((await controller.refresh()).accessToken);
        }
        if (!snapshot.sessionId) {
          throw createSdkError('missing_session', 'Missing session id');
        }
        return await fetchMe(snapshot.accessToken);
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

      return parseMeResponseImpl(
        await input.http.getJson('/me', { accessToken }),
      );
    }

    async function startSupersededRecovery(snapshot) {
      input.state.setRecovering({
        sessionId: snapshot.sessionId,
        accessToken: snapshot.accessToken,
        refreshToken: snapshot.refreshToken ?? '',
        receivedAt: snapshot.receivedAt ?? new Date(input.now()).toISOString(),
        expiresAt: snapshot.expiresAt ?? new Date(input.now()).toISOString(),
      });

      const timeoutMs = input.recoveryTimeoutMs ?? 50;
      const deadline = Date.now() + timeoutMs;

      while (true) {
        const current = input.state.getState();

        if (!isSameRecoveringSession(current, snapshot)) {
          return;
        }

        const adoption = adoptRecoveredSharedState(snapshot);

        if (adoption === 'usable') {
          return;
        }

        const remainingMs = deadline - Date.now();

        if (remainingMs <= 0) {
          break;
        }

        await input.waitForExternalStorage?.(remainingMs);
      }

      input.state.setAnonymousLocal();
    }

    function adoptRecoveredSharedState(snapshot) {
      const shared = input.readSharedState?.();

      if (!shared?.sessionId || !shared.refreshToken) {
        return 'none';
      }

      if (!hasSharedSessionChanged(snapshot, shared)) {
        return 'none';
      }

      if (
        shared.accessToken &&
        !needsRefresh(
          {
            status: 'recovering',
            authenticated: false,
            sessionId: shared.sessionId,
            accessToken: shared.accessToken,
            refreshToken: shared.refreshToken,
            receivedAt: shared.receivedAt,
            expiresAt: shared.expiresAt,
          },
          input.now(),
        )
      ) {
        input.state.setAuthenticated({
          sessionId: shared.sessionId,
          accessToken: shared.accessToken,
          refreshToken: shared.refreshToken,
          receivedAt: shared.receivedAt ?? new Date(input.now()).toISOString(),
          expiresAt: shared.expiresAt ?? new Date(input.now()).toISOString(),
        });
        return 'usable';
      }

      input.state.applyPersistedState(shared);
      return 'provisional';
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

  function createWebauthnModule(input) {
    return {
      async authenticate(payload = {}) {
        ensureWebauthnSupport('authenticate');
        const options = await input.http.postJson(
          '/webauthn/authenticate/options',
          createOptionsPayload(payload),
        );
        const credential = await requestCredential(
          'authenticate',
          input.navigatorCredentials.get,
          {
            publicKey: decodeAuthenticationOptions(options.publicKey),
          },
        );
        const response = await input.http.postJson(
          '/webauthn/authenticate/verify',
          {
            request_id: options.request_id,
            credential: serializeCredential(credential),
          },
        );
        return await input.session.acceptSessionResponse(response);
      },
      async register(payload = {}) {
        ensureWebauthnSupport('register');
        const optionsAccessToken = await requireAccessToken();
        const options = await input.http.postJson(
          '/webauthn/register/options',
          createOptionsPayload(payload),
          { accessToken: optionsAccessToken },
        );
        const credential = await requestCredential(
          'register',
          input.navigatorCredentials.create,
          {
            publicKey: decodeRegistrationOptions(options.publicKey),
          },
        );
        const verifyAccessToken = await requireAccessToken();
        return await input.http.postJson(
          '/webauthn/register/verify',
          {
            request_id: options.request_id,
            credential: serializeCredential(credential),
          },
          { accessToken: verifyAccessToken },
        );
      },
    };

    function ensureWebauthnSupport(mode) {
      const hasMethod =
        mode === 'register'
          ? typeof input.navigatorCredentials?.create === 'function'
          : typeof input.navigatorCredentials?.get === 'function';
      if (!input.publicKeyCredential || !hasMethod) {
        throw createSdkError(
          'webauthn_unsupported',
          'WebAuthn is unavailable in this browser',
        );
      }
    }

    async function requestCredential(mode, invoke, options) {
      try {
        const credential = await invoke(options);
        if (!credential) {
          throw createSdkError(
            'webauthn_cancelled',
            mode === 'register'
              ? 'Passkey registration cancelled'
              : 'Passkey authentication cancelled',
          );
        }
        return credential;
      } catch (error) {
        if (isWebauthnCancelledError(error)) {
          throw createSdkError(
            'webauthn_cancelled',
            mode === 'register'
              ? 'Passkey registration cancelled'
              : 'Passkey authentication cancelled',
          );
        }
        throw error;
      }
    }

    async function requireAccessToken() {
      const snapshot = input.state.getState();
      if (!snapshot.refreshToken && !snapshot.accessToken) {
        throw createSdkError(
          'missing_session',
          'Missing authenticated session',
        );
      }
      if (!snapshot.accessToken || needsRefresh(snapshot, input.now())) {
        return (await input.session.refresh()).accessToken;
      }
      return snapshot.accessToken;
    }

    function createOptionsPayload(payload) {
      const rpId =
        typeof payload?.rpId === 'string' && payload.rpId.length > 0
          ? payload.rpId
          : globalThis.location?.hostname;

      return { rp_id: rpId };
    }
  }

  function createAuthMiniInternal(input) {
    const storageKey = input.storageKey ?? SDK_STORAGE_KEY;
    const state = createStateStore(input.storage, storageKey);
    const externalStorageListeners = new Set();
    const http = createHttpClient({
      baseUrl: input.baseUrl,
      fetch: input.fetch,
    });
    const adoptExternalState = (next) => {
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
          input.now ?? (() => Date.now())(),
        )
      ) {
        state.setAuthenticated({
          sessionId: next.sessionId,
          accessToken: next.accessToken,
          refreshToken: next.refreshToken,
          receivedAt:
            next.receivedAt ??
            new Date((input.now ?? (() => Date.now()))()).toISOString(),
          expiresAt:
            next.expiresAt ??
            new Date((input.now ?? (() => Date.now()))()).toISOString(),
        });
      } else {
        state.applyPersistedState(next);
      }
      for (const listener of externalStorageListeners) {
        listener();
      }
    };

    input.storageSync?.subscribe(adoptExternalState);

    const session = createSessionController({
      http,
      now: input.now ?? (() => Date.now()),
      readSharedState: () =>
        input.storageSync?.getSnapshot?.() ??
        readPersistedSdkState(input.storage, storageKey),
      recoveryTimeoutMs: input.recoveryTimeoutMs,
      state,
      waitForExternalStorage(timeoutMs) {
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
    const now = input.now ?? (() => Date.now());
    const passkey = createWebauthnModule({
      http,
      navigatorCredentials: input.navigatorCredentials,
      now,
      publicKeyCredential: input.publicKeyCredential,
      session,
      state,
    });
    const api = {
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
      passkey,
      webauthn: passkey,
    };
    const ready =
      input.autoRecover !== false && state.getState().status === 'recovering'
        ? Promise.resolve().then(() => session.recover())
        : Promise.resolve();

    void ready.catch(() => {});

    return Object.assign(api, { ready });
  }

  function createSingletonSdk(input = {}) {
    const browser = typeof window === 'undefined' ? globalThis : window;
    const baseUrl = input.baseUrl;

    if (!baseUrl) {
      throw createSdkError('sdk_init_failed', 'Cannot determine SDK base URL');
    }

    const normalizedBaseUrl = normalizeBaseUrl(baseUrl).toString();
    const storageKey = getStorageKey(normalizedBaseUrl);

    const storage = resolveSdkStorage({
      storage: input.storage,
      getDefaultStorage: () => browser.localStorage,
    });

    return createAuthMiniInternal({
      baseUrl: normalizedBaseUrl,
      fetch: resolveFetch(input.fetch),
      navigatorCredentials: browser.navigator?.credentials,
      now: input.now,
      publicKeyCredential: browser.PublicKeyCredential,
      recoveryTimeoutMs: input.recoveryTimeoutMs,
      storage,
      storageKey,
      storageSync: createBrowserStorageSync(browser, storage, storageKey),
    });
  }

  function createBrowserStorageSync(browser, storage, storageKey) {
    if (typeof browser?.addEventListener !== 'function') {
      return null;
    }

    return {
      getSnapshot() {
        return readPersistedSdkState(storage, storageKey);
      },
      subscribe(listener) {
        const handleStorage = (event) => {
          if (event.key !== storageKey || event.storageArea !== storage) {
            return;
          }

          listener(readPersistedSdkState(storage, storageKey));
        };

        browser.addEventListener('storage', handleStorage);
        return () => {
          browser.removeEventListener('storage', handleStorage);
        };
      },
    };
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
    window.AuthMini = bootstrapSingletonSdk({
      currentScript: document.currentScript,
      fetch: resolveFetch(window.fetch?.bind(window)),
    }).sdk;
    /* v1 supports direct browser loading from allowed origins. */
  }

  function toNullableString(value) {
    if (value === undefined || value === null) {
      return null;
    }
    return typeof value === 'string' ? value : undefined;
  }

  function decodeRegistrationOptions(publicKey) {
    return {
      ...publicKey,
      challenge: decodeBase64Url(publicKey.challenge),
      user: {
        ...publicKey.user,
        id: decodeBase64Url(publicKey.user.id),
      },
      excludeCredentials: Array.isArray(publicKey.excludeCredentials)
        ? publicKey.excludeCredentials.map((item) => ({
            ...item,
            id: decodeBase64Url(item.id),
          }))
        : undefined,
    };
  }

  function decodeAuthenticationOptions(publicKey) {
    return {
      ...publicKey,
      challenge: decodeBase64Url(publicKey.challenge),
      allowCredentials: Array.isArray(publicKey.allowCredentials)
        ? publicKey.allowCredentials.map((item) => ({
            ...item,
            id: decodeBase64Url(item.id),
          }))
        : undefined,
    };
  }

  function serializeCredential(credential) {
    const response = credential.response;
    const serialized = {
      id: credential.id,
      rawId: encodeBase64Url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: encodeBase64Url(response.clientDataJSON),
      },
    };

    if (typeof credential.getClientExtensionResults === 'function') {
      serialized.clientExtensionResults =
        credential.getClientExtensionResults();
    } else if (credential.clientExtensionResults) {
      serialized.clientExtensionResults = credential.clientExtensionResults;
    }

    if (typeof response.getTransports === 'function') {
      serialized.response.transports = response.getTransports();
    }
    if ('attestationObject' in response && response.attestationObject) {
      serialized.response.attestationObject = encodeBase64Url(
        response.attestationObject,
      );
    }
    if ('authenticatorData' in response && response.authenticatorData) {
      serialized.response.authenticatorData = encodeBase64Url(
        response.authenticatorData,
      );
    }
    if ('signature' in response && response.signature) {
      serialized.response.signature = encodeBase64Url(response.signature);
    }
    if ('userHandle' in response && response.userHandle) {
      serialized.response.userHandle = encodeBase64Url(response.userHandle);
    }
    return serialized;
  }

  function isWebauthnCancelledError(error) {
    return (
      error?.code === 'webauthn_cancelled' ||
      error?.name === 'AbortError' ||
      error?.name === 'NotAllowedError'
    );
  }

  function isAuthInvalidatingError(error) {
    return (
      error?.error === 'invalid_refresh_token' ||
      error?.error === 'session_invalidated' ||
      (error?.status === 401 && error?.error !== 'session_superseded')
    );
  }

  function isContractDriftError(error) {
    return (
      error?.code === 'request_failed' &&
      (error?.message === 'request_failed: Invalid session payload' ||
        error?.message === 'request_failed: Invalid /me payload')
    );
  }

  function isSessionSupersededError(error) {
    return error?.error === 'session_superseded';
  }

  function hasSharedSessionChanged(snapshot, shared) {
    return (
      snapshot.sessionId !== shared.sessionId ||
      snapshot.accessToken !== shared.accessToken ||
      snapshot.refreshToken !== shared.refreshToken ||
      snapshot.receivedAt !== shared.receivedAt ||
      snapshot.expiresAt !== shared.expiresAt
    );
  }

  function isSameRecoveringSession(current, snapshot) {
    return (
      current.status === 'recovering' &&
      current.sessionId === snapshot.sessionId
    );
  }

  function decodeBase64Url(value) {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const buffer =
      typeof Buffer !== 'undefined'
        ? Buffer.from(padded, 'base64')
        : Uint8Array.from(globalThis.atob(padded), (char) =>
            char.charCodeAt(0),
          );
    return new Uint8Array(buffer);
  }

  function encodeBase64Url(value) {
    const bytes =
      value instanceof Uint8Array
        ? value
        : value instanceof ArrayBuffer
          ? new Uint8Array(value)
          : new Uint8Array(value.buffer ?? value);
    const base64 =
      typeof Buffer !== 'undefined'
        ? Buffer.from(bytes).toString('base64')
        : globalThis.btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function createSnapshot(status) {
    return freezeSnapshot({
      status,
      authenticated: status === 'authenticated',
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
    });
  }

  function clonePersisted(snapshot) {
    return {
      sessionId: snapshot.sessionId,
      accessToken: snapshot.accessToken,
      refreshToken: snapshot.refreshToken,
      receivedAt: snapshot.receivedAt,
      expiresAt: snapshot.expiresAt,
    };
  }

  function freezeSnapshot(snapshot) {
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
    createAuthMiniInternal,
    createSingletonSdk,
    bootstrapSingletonSdk,
    installOnWindow,
  };
}
