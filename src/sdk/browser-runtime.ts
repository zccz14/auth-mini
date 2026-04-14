import { parseMeResponse } from './me.js';
import type {
  AuthMiniApi,
  AuthMiniInternal,
  EmailStartInput,
  EmailStartResponse,
  EmailVerifyInput,
  FetchLike,
  InternalSdkDeps,
  Listener,
  MeResponse,
  NavigatorCredentialsLike,
  PasskeyOptionsInput,
  PersistedSdkState,
  SessionResult,
  SessionSnapshot,
  WebauthnVerifyResponse,
} from './types.js';

export type BrowserSdkFactoryOptions = {
  fetch?: FetchLike;
  now?: () => number;
  storage?: Storage;
};

type SdkError = Error & {
  code: string;
  error?: string;
  status?: number;
};

type BrowserSdkRuntimeInput = BrowserSdkFactoryOptions & {
  baseUrl: string;
  recoveryTimeoutMs?: number;
};

type StorageSync = {
  getSnapshot?(): PersistedSdkState | null;
  subscribe(listener: (next: PersistedSdkState | null) => void): () => void;
};

type InternalRuntimeDeps = InternalSdkDeps & {
  recoveryTimeoutMs?: number;
  storageKey?: string;
  storageSync?: StorageSync | null;
};

type RequestOptions = {
  accessToken?: string | null;
  body?: unknown;
};

type HttpClient = {
  getJson(path: string, options?: Omit<RequestOptions, 'body'>): Promise<unknown>;
  postJson(path: string, body: unknown, options?: Omit<RequestOptions, 'body'>): Promise<unknown>;
};

type SessionStore = {
  getState(): SessionSnapshot;
  onChange(listener: Listener): () => void;
  setRecovering(next: PersistedSdkState): void;
  setAuthenticated(next: PersistedSdkState): void;
  setAnonymous(): void;
  applyPersistedState(next: PersistedSdkState | null): void;
  setAnonymousLocal(): void;
};

type SessionController = {
  getState(): SessionSnapshot;
  onChange(listener: Listener): () => void;
  acceptSessionResponse(
    response: unknown,
    options?: { clearOnMeFailure?: 'auth-invalidating' },
  ): Promise<SessionResult>;
  refresh(): Promise<SessionResult>;
  recover(): Promise<void>;
  fetchMe(): Promise<MeResponse>;
  logout(): Promise<void>;
};

type SessionControllerInput = {
  http: HttpClient;
  now: () => number;
  readSharedState?: () => PersistedSdkState | null | undefined;
  recoveryTimeoutMs?: number;
  state: SessionStore;
  waitForExternalStorage?: (timeoutMs: number) => Promise<void>;
};

type SessionLike = Pick<SessionController, 'acceptSessionResponse' | 'refresh' | 'fetchMe' | 'logout'>;

type WebauthnPublicKeyCredential = {
  id: string;
  rawId: ArrayBuffer | ArrayBufferView;
  type: string;
  response: {
    clientDataJSON: ArrayBuffer | ArrayBufferView;
    getTransports?: () => string[];
    attestationObject?: ArrayBuffer | ArrayBufferView | null;
    authenticatorData?: ArrayBuffer | ArrayBufferView | null;
    signature?: ArrayBuffer | ArrayBufferView | null;
    userHandle?: ArrayBuffer | ArrayBufferView | null;
  };
  getClientExtensionResults?: () => unknown;
  clientExtensionResults?: unknown;
};

type RegistrationPublicKey = Record<string, unknown> & {
  challenge: string;
  user: Record<string, unknown> & { id: string };
  excludeCredentials?: Array<Record<string, unknown> & { id: string }>;
};

type AuthenticationPublicKey = Record<string, unknown> & {
  challenge: string;
  allowCredentials?: Array<Record<string, unknown> & { id: string }>;
};

type RegistrationOptionsResponse = {
  request_id: string;
  publicKey: RegistrationPublicKey;
};

type AuthenticationOptionsResponse = {
  request_id: string;
  publicKey: AuthenticationPublicKey;
};

type CredentialOptions = CredentialCreationOptions | CredentialRequestOptions;

let runtimeCache: ReturnType<typeof createRuntime> | null = null;

export function createAuthMiniInternal(
  input: InternalSdkDeps,
): AuthMiniInternal {
  return getRuntime().createAuthMiniInternal(input) as AuthMiniInternal;
}

export function createBrowserSdkInternal(
  baseUrl: string,
  options: BrowserSdkFactoryOptions = {},
): AuthMiniInternal {
  return getRuntime().createBrowserSdkInternal({
    ...options,
    baseUrl,
  }) as AuthMiniInternal;
}

function getRuntime() {
  runtimeCache ??= createRuntime();
  return runtimeCache;
}

function createRuntime(parseMeResponseImpl = parseMeResponse) {
  const SDK_STORAGE_KEY = 'auth-mini.sdk';

  function createSdkError(code: string, message: string): SdkError {
    const error = new Error(`${code}: ${message}`) as SdkError;
    error.name = 'AuthMiniSdkError';
    error.code = code;
    return error;
  }

  function createRequestError(status: number, payload: unknown): SdkError {
    const error = createSdkError(
      'request_failed',
      typeof (payload as { error?: unknown })?.error === 'string'
        ? (payload as { error: string }).error
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

  function resolveSdkStorage(input: {
    storage?: Storage;
    getDefaultStorage: () => Storage | undefined;
  }) {
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

  function resolveFetch(fetchImpl: FetchLike | undefined) {
    const resolved = fetchImpl ?? globalThis.fetch?.bind(globalThis);
    if (!resolved) {
      throw createSdkError('sdk_init_failed', 'fetch is unavailable');
    }
    return resolved;
  }

  function getStorageKey(baseUrl: string) {
    return `${SDK_STORAGE_KEY}:${normalizeBaseUrl(baseUrl).toString()}`;
  }

  function normalizeBaseUrl(baseUrl: string) {
    const url = new URL(baseUrl);
    url.search = '';
    url.hash = '';
    url.pathname = url.pathname.endsWith('/')
      ? url.pathname
      : `${url.pathname}/`;
    return url;
  }

  function readPersistedSdkState(storage: Storage, storageKey: string) {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    try {
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object') {
        return null;
      }
      const valueRecord = value as Record<string, unknown>;
      const sessionId = toNullableString(valueRecord.sessionId);
      const accessToken = toNullableString(valueRecord.accessToken);
      const refreshToken = toNullableString(valueRecord.refreshToken);
      const receivedAt = toNullableString(valueRecord.receivedAt);
      const expiresAt = toNullableString(valueRecord.expiresAt);
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

  function writePersistedSdkState(
    storage: Storage,
    storageKey: string,
    snapshot: PersistedSdkState,
  ) {
    storage.setItem(storageKey, JSON.stringify(snapshot));
  }

  function clearPersistedSdkState(storage: Storage, storageKey: string) {
    storage.removeItem(storageKey);
  }

  function createStateStore(storage: Storage, storageKey: string): SessionStore {
    const listeners = new Set<Listener>();
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

    function hydrateSnapshot(persisted: PersistedSdkState | null) {
      if (!persisted?.refreshToken || !persisted.sessionId) {
        return createSnapshot('anonymous');
      }
      return freezeSnapshot({
        status: 'recovering',
        authenticated: false,
        ...persisted,
      });
    }

    function updatePersisted(
      next: SessionSnapshot & PersistedSdkState,
    ) {
      const persisted = clonePersisted(next);
      writePersistedSdkState(storage, storageKey, persisted);
      updateState({
        status: next.status,
        authenticated: next.authenticated,
        ...persisted,
      });
    }

    function updateState(next: SessionSnapshot) {
      state = freezeSnapshot(next);
      for (const listener of listeners) {
        listener(cloneSnapshot(state));
      }
    }
  }

  function createHttpClient(input: { baseUrl: string; fetch: FetchLike }): HttpClient {
    return {
      getJson(path, options = {}) {
        return sendJson('GET', path, options);
      },
      postJson(path, body, options = {}) {
        return sendJson('POST', path, { ...options, body });
      },
    };

    async function sendJson(
      method: string,
      path: string,
      options: RequestOptions,
    ) {
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

    function createHeaders(options: RequestOptions): Record<string, string> {
      const headers: Record<string, string> = { accept: 'application/json' };
      if (options.body !== undefined) {
        headers['content-type'] = 'application/json';
      }
      if (options.accessToken) {
        headers.authorization = `Bearer ${options.accessToken}`;
      }
      return headers;
    }

    async function readJson(response: Response) {
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

  function shouldRefresh(now: number, expiresAt: number, receivedAt: number) {
    const lifetimeMs = expiresAt - receivedAt;
    const thresholdMs = lifetimeMs < 10 * 60_000 ? lifetimeMs / 2 : 5 * 60_000;
    return now >= expiresAt - thresholdMs;
  }

  function needsRefresh(snapshot: PersistedSdkState, now: number) {
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

  function normalizeTokenResponse(payload: unknown, now: () => number): SessionResult {
    const value = payload as Record<string, unknown> | null;
    if (!value || typeof value !== 'object') {
      throw createSdkError('request_failed', 'Invalid session payload');
    }
    if (
      typeof value.access_token !== 'string' ||
      typeof value.session_id !== 'string' ||
      typeof value.refresh_token !== 'string' ||
      typeof value.expires_in !== 'number'
    ) {
      throw createSdkError('request_failed', 'Invalid session payload');
    }
    const receivedAtMs = now();
    return {
      sessionId: value.session_id,
      accessToken: value.access_token,
      refreshToken: value.refresh_token,
      receivedAt: new Date(receivedAtMs).toISOString(),
      expiresAt: new Date(
        receivedAtMs + value.expires_in * 1000,
      ).toISOString(),
    };
  }

  function createSessionController(input: SessionControllerInput): SessionController {
    let refreshPromise: Promise<SessionResult> | null = null;
    let supersededRecoveryPromise: Promise<void> | null = null;
    const controller: SessionController = {
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
          return await fetchMe((await controller.refresh()).accessToken as string);
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

    async function fetchMe(accessToken: string) {
      if (!accessToken) {
        throw createSdkError('missing_session', 'Missing access token');
      }

      return parseMeResponseImpl(
        await input.http.getJson('/me', { accessToken }),
      );
    }

    async function startSupersededRecovery(snapshot: SessionSnapshot) {
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

    function adoptRecoveredSharedState(snapshot: SessionSnapshot) {
      const shared = input.readSharedState?.();

      if (!shared?.sessionId || !shared.refreshToken) {
        return 'none';
      }

      if (!hasSharedSessionChanged(snapshot, shared)) {
        return 'none';
      }

      if (
        shared.accessToken &&
        !needsRefresh(shared, input.now())
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

  function createEmailModule(input: {
    http: HttpClient;
    session: Pick<SessionController, 'acceptSessionResponse'>;
  }) {
    return {
      start(payload: EmailStartInput): Promise<EmailStartResponse> {
        return input.http.postJson('/email/start', payload) as Promise<EmailStartResponse>;
      },
      async verify(payload: EmailVerifyInput): Promise<SessionResult> {
        const response = await input.http.postJson('/email/verify', payload);
        return await input.session.acceptSessionResponse(response);
      },
    };
  }

  function createWebauthnModule(input: {
    http: HttpClient;
    navigatorCredentials?: NavigatorCredentialsLike;
    now: () => number;
    publicKeyCredential?: unknown;
    session: Pick<SessionController, 'acceptSessionResponse' | 'refresh'>;
    state: SessionStore;
  }): AuthMiniApi['passkey'] {
    return {
      async authenticate(payload: PasskeyOptionsInput = {}) {
        ensureWebauthnSupport('authenticate');
        const options = await input.http.postJson(
          '/webauthn/authenticate/options',
          createOptionsPayload(payload),
        ) as AuthenticationOptionsResponse;
        const credential = await requestCredential(
          'authenticate',
          input.navigatorCredentials?.get,
          {
            publicKey: decodeAuthenticationOptions(
              options.publicKey,
            ) as PublicKeyCredentialRequestOptions,
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
      async register(payload: PasskeyOptionsInput = {}) {
        ensureWebauthnSupport('register');
        const optionsAccessToken = await requireAccessToken();
        const options = await input.http.postJson(
          '/webauthn/register/options',
          createOptionsPayload(payload),
          { accessToken: optionsAccessToken },
        ) as RegistrationOptionsResponse;
        const credential = await requestCredential(
          'register',
          input.navigatorCredentials?.create,
          {
            publicKey: decodeRegistrationOptions(
              options.publicKey,
            ) as unknown as PublicKeyCredentialCreationOptions,
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
        ) as Promise<WebauthnVerifyResponse>;
      },
    };

    function ensureWebauthnSupport(mode: 'authenticate' | 'register') {
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

    async function requestCredential<T extends CredentialOptions>(
      mode: 'authenticate' | 'register',
      invoke: ((options?: T) => Promise<unknown>) | undefined,
      options: T,
    ): Promise<WebauthnPublicKeyCredential> {
      if (!invoke) {
        throw createSdkError(
          'webauthn_unsupported',
          'WebAuthn is unavailable in this browser',
        );
      }
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
        return credential as WebauthnPublicKeyCredential;
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

    function createOptionsPayload(payload: PasskeyOptionsInput) {
      const rpId =
        typeof payload?.rpId === 'string' && payload.rpId.length > 0
          ? payload.rpId
          : globalThis.location?.hostname;

      return { rp_id: rpId };
    }
  }

  function createAuthMiniInternal(input: InternalRuntimeDeps) {
    const storageKey = input.storageKey ?? SDK_STORAGE_KEY;
    const state = createStateStore(input.storage, storageKey);
    const externalStorageListeners = new Set<() => void>();
    const http = createHttpClient({
      baseUrl: input.baseUrl,
      fetch: input.fetch,
    });
    const adoptExternalState = (next: PersistedSdkState | null) => {
      if (
        next?.sessionId &&
        next.refreshToken &&
        next.accessToken &&
        !needsRefresh(next, (input.now ?? (() => Date.now()))())
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
        return new Promise<void>((resolve) => {
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
        onChange(listener: Listener) {
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

  function createBrowserSdkInternal(input: BrowserSdkRuntimeInput) {
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

  function createBrowserStorageSync(
    browser: typeof globalThis,
    storage: Storage,
    storageKey: string,
  ): StorageSync | null {
    if (typeof browser?.addEventListener !== 'function') {
      return null;
    }

    return {
      getSnapshot() {
        return readPersistedSdkState(storage, storageKey);
      },
      subscribe(listener) {
        const handleStorage = (event: StorageEvent) => {
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

  function toNullableString(value: unknown) {
    if (value === undefined || value === null) {
      return null;
    }
    return typeof value === 'string' ? value : undefined;
  }

  function decodeRegistrationOptions(publicKey: RegistrationPublicKey) {
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

  function decodeAuthenticationOptions(publicKey: AuthenticationPublicKey) {
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

  function serializeCredential(credential: WebauthnPublicKeyCredential) {
    const response = credential.response;
    const serialized: {
      id: string;
      rawId: string;
      type: string;
      response: Record<string, unknown>;
      clientExtensionResults?: unknown;
    } = {
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

  function isWebauthnCancelledError(error: unknown) {
    const value = error as { code?: unknown; name?: unknown } | null;
    return (
      value?.code === 'webauthn_cancelled' ||
      value?.name === 'AbortError' ||
      value?.name === 'NotAllowedError'
    );
  }

  function isAuthInvalidatingError(error: unknown) {
    const value = error as { error?: unknown; status?: unknown } | null;
    return (
      value?.error === 'invalid_refresh_token' ||
      value?.error === 'session_invalidated' ||
      (value?.status === 401 && value?.error !== 'session_superseded')
    );
  }

  function isContractDriftError(error: unknown) {
    const value = error as { code?: unknown; message?: unknown } | null;
    return (
      value?.code === 'request_failed' &&
      (value?.message === 'request_failed: Invalid session payload' ||
        value?.message === 'request_failed: Invalid /me payload')
    );
  }

  function isSessionSupersededError(error: unknown) {
    const value = error as { error?: unknown } | null;
    return value?.error === 'session_superseded';
  }

  function hasSharedSessionChanged(
    snapshot: PersistedSdkState,
    shared: PersistedSdkState,
  ) {
    return (
      snapshot.sessionId !== shared.sessionId ||
      snapshot.accessToken !== shared.accessToken ||
      snapshot.refreshToken !== shared.refreshToken ||
      snapshot.receivedAt !== shared.receivedAt ||
      snapshot.expiresAt !== shared.expiresAt
    );
  }

  function isSameRecoveringSession(
    current: SessionSnapshot,
    snapshot: PersistedSdkState,
  ) {
    return (
      current.status === 'recovering' &&
      current.sessionId === snapshot.sessionId
    );
  }

  function decodeBase64Url(value: string) {
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

  function encodeBase64Url(value: ArrayBuffer | ArrayBufferView) {
    const bytes =
      value instanceof Uint8Array
        ? value
        : value instanceof ArrayBuffer
          ? new Uint8Array(value)
          : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    const base64 =
      typeof Buffer !== 'undefined'
        ? Buffer.from(bytes).toString('base64')
        : globalThis.btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function createSnapshot(status: SessionSnapshot['status']): SessionSnapshot {
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

  function clonePersisted(snapshot: PersistedSdkState): PersistedSdkState {
    return {
      sessionId: snapshot.sessionId,
      accessToken: snapshot.accessToken,
      refreshToken: snapshot.refreshToken,
      receivedAt: snapshot.receivedAt,
      expiresAt: snapshot.expiresAt,
    };
  }

  function freezeSnapshot<T extends SessionSnapshot>(snapshot: T): T {
    return Object.freeze(snapshot);
  }

  function cloneSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
    return freezeSnapshot({
      status: snapshot.status,
      authenticated: snapshot.authenticated,
      ...clonePersisted(snapshot),
    });
  }

  return {
    createAuthMiniInternal,
    createBrowserSdkInternal,
  };
}
