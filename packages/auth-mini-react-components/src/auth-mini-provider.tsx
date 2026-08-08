import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  createBrowserSdk,
  type AuthMiniApi,
  type SessionSnapshot,
  type SdkStatus,
} from 'auth-mini/sdk/browser';
import {
  AuthMiniCallbackError,
  getAuthMiniLoginStateKey,
  getAuthMiniLoginUrl,
  readAuthMiniRedirectCallback,
} from './auth-callback.js';

export type AuthMiniProviderProps = {
  authMiniBaseUrl: string;
  children: ReactNode;
  audience?: string;
  callbackUrl?: string | (() => string);
  onAuthError?: (error: Error) => void;
  onAuthStateChange?: (session: SessionSnapshot) => void;
};

export type AuthMiniContextValue = {
  authMiniBaseUrl: string;
  sdk: AuthMiniApi | null;
  session: SessionSnapshot | null;
  status: 'initializing' | SdkStatus;
  isReady: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  signIn: () => void;
  signOut: () => Promise<void>;
};

const AuthMiniContext = createContext<AuthMiniContextValue | undefined>(
  undefined,
);

/**
 * Creates one Browser SDK session source for an application subtree.
 *
 * The Provider validates login redirects before Browser SDK persistence and
 * makes the resulting session available through useAuthMini().
 */
export function AuthMiniProvider({
  authMiniBaseUrl,
  audience,
  callbackUrl,
  children,
  onAuthError,
  onAuthStateChange,
}: AuthMiniProviderProps) {
  const [sdk, setSdk] = useState<AuthMiniApi | null>(null);
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const callbackUrlRef = useLatest(callbackUrl);
  const errorHandlerRef = useLatest(onAuthError);
  const stateHandlerRef = useLatest(onAuthStateChange);
  const mountedRef = useRef(false);
  const activeBaseUrlRef = useRef(authMiniBaseUrl);

  const reportError = useCallback(
    (cause: unknown) => {
      const nextError = toError(cause);
      setError(nextError);
      errorHandlerRef.current?.(nextError);
      return nextError;
    },
    [errorHandlerRef],
  );

  useEffect(() => {
    mountedRef.current = true;
    activeBaseUrlRef.current = authMiniBaseUrl;
    let unsubscribe: (() => void) | undefined;
    let alive = true;

    setSdk(null);
    setSession(null);
    setError(null);

    try {
      const nextSdk = createBrowserSdk(authMiniBaseUrl);
      const synchronize = (nextSession: SessionSnapshot) => {
        if (!alive) {
          return;
        }
        setSession(nextSession);
        stateHandlerRef.current?.(nextSession);
      };

      setSdk(nextSdk);
      synchronize(nextSdk.session.getState());
      unsubscribe = nextSdk.session.onChange(synchronize);

      try {
        void acceptCallback(nextSdk, authMiniBaseUrl).catch(
          (cause: unknown) => {
            if (
              mountedRef.current &&
              activeBaseUrlRef.current === authMiniBaseUrl
            ) {
              reportError(cause);
            }
          },
        );
      } catch (cause) {
        reportError(cause);
      }
    } catch (cause) {
      reportError(cause);
    }

    return () => {
      alive = false;
      mountedRef.current = false;
      unsubscribe?.();
    };
  }, [authMiniBaseUrl, reportError, stateHandlerRef]);

  const signIn = useCallback(() => {
    try {
      const state = createLoginState();
      const storageKey = getAuthMiniLoginStateKey(authMiniBaseUrl);
      const returnTo = resolveCallbackUrl(callbackUrlRef.current);
      window.sessionStorage.setItem(storageKey, state);
      window.location.assign(
        getAuthMiniLoginUrl({
          authMiniBaseUrl,
          audience,
          callbackUrl: returnTo,
          state,
        }),
      );
    } catch (cause) {
      reportError(cause);
    }
  }, [audience, authMiniBaseUrl, callbackUrlRef, reportError]);

  const signOut = useCallback(async () => {
    if (!sdk) {
      const nextError = reportError('Auth Mini is still initializing');
      throw nextError;
    }

    try {
      await sdk.session.logout();
    } catch (cause) {
      throw reportError(cause);
    }
  }, [reportError, sdk]);

  const status = session?.status ?? 'initializing';
  const isReady = session !== null && session.status !== 'recovering';
  const isAuthenticated = session?.status === 'authenticated';
  const value = useMemo<AuthMiniContextValue>(
    () => ({
      authMiniBaseUrl,
      sdk,
      session,
      status,
      isReady,
      isAuthenticated,
      error,
      signIn,
      signOut,
    }),
    [
      authMiniBaseUrl,
      error,
      isAuthenticated,
      isReady,
      sdk,
      session,
      signIn,
      signOut,
      status,
    ],
  );

  return (
    <AuthMiniContext.Provider value={value}>
      {children}
    </AuthMiniContext.Provider>
  );
}

export function useAuthMini(): AuthMiniContextValue {
  const value = useContext(AuthMiniContext);
  if (!value) {
    throw new Error('useAuthMini must be used within an AuthMiniProvider');
  }
  return value;
}

function acceptCallback(
  sdk: AuthMiniApi,
  authMiniBaseUrl: string,
): Promise<void> {
  let callback;
  try {
    callback = readAuthMiniRedirectCallback(window.location.href);
  } catch (cause) {
    if (cause instanceof AuthMiniCallbackError) {
      window.history.replaceState(null, '', cause.cleanUrl);
    }
    throw cause;
  }
  if (!callback) {
    return Promise.resolve();
  }

  const storageKey = getAuthMiniLoginStateKey(authMiniBaseUrl);
  const expectedState = window.sessionStorage.getItem(storageKey);
  window.history.replaceState(null, '', callback.cleanUrl);

  if (!expectedState || callback.state !== expectedState) {
    throw new Error('Invalid Auth Mini login state');
  }

  window.sessionStorage.removeItem(storageKey);
  return sdk.session
    .acceptRedirectCallback(callback.tokens)
    .then(() => undefined);
}

function createLoginState(): string {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error('Secure random values are unavailable');
  }
  return globalThis.crypto.randomUUID();
}

function resolveCallbackUrl(
  value: string | (() => string) | undefined,
): string {
  return typeof value === 'function'
    ? value()
    : (value ?? window.location.href);
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
