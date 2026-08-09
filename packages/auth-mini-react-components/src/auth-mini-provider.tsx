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
import { Toaster } from './components/ui/sonner.js';

export type AuthMiniProviderProps = {
  authMiniBaseUrl: string;
  children: ReactNode;
  audience?: string;
  callbackUrl?: string | (() => string);
  autoRedirectToLogin: boolean;
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
  openPasskeyRegistrationPage: () => Window | null;
};

const AuthMiniContext = createContext<AuthMiniContextValue | undefined>(
  undefined,
);
const passkeyRegistrationPopupName = 'auth-mini-passkey-registration';
const passkeyRegistrationPopupFeatures =
  'popup,width=520,height=720,resizable=yes,scrollbars=yes';

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
  autoRedirectToLogin,
  children,
  onAuthError,
  onAuthStateChange,
}: AuthMiniProviderProps) {
  const [sdk, setSdk] = useState<AuthMiniApi | null>(null);
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const audienceRef = useLatest(audience);
  const callbackUrlRef = useLatest(callbackUrl);
  const autoRedirectToLoginRef = useLatest(autoRedirectToLogin);
  const errorHandlerRef = useLatest(onAuthError);
  const stateHandlerRef = useLatest(onAuthStateChange);
  const mountedRef = useRef(false);
  const activeBaseUrlRef = useRef(authMiniBaseUrl);
  const autoRedirectStartedRef = useRef(false);

  const reportError = useCallback(
    (cause: unknown) => {
      const nextError = toError(cause);
      setError(nextError);
      errorHandlerRef.current?.(nextError);
      return nextError;
    },
    [errorHandlerRef],
  );

  const signIn = useCallback(() => {
    try {
      const state = createLoginState();
      const storageKey = getAuthMiniLoginStateKey(authMiniBaseUrl);
      const returnTo = resolveCallbackUrl(callbackUrlRef.current);
      window.sessionStorage.setItem(storageKey, state);
      window.location.assign(
        getAuthMiniLoginUrl({
          authMiniBaseUrl,
          audience: audienceRef.current,
          callbackUrl: returnTo,
          state,
        }),
      );
    } catch (cause) {
      reportError(cause);
    }
  }, [audienceRef, authMiniBaseUrl, callbackUrlRef, reportError]);

  useEffect(() => {
    mountedRef.current = true;
    activeBaseUrlRef.current = authMiniBaseUrl;
    autoRedirectStartedRef.current = false;
    let unsubscribe: (() => void) | undefined;
    let alive = true;
    let callbackHandled = false;
    let latestSession: SessionSnapshot;

    setSdk(null);
    setSession(null);
    setError(null);

    try {
      const nextSdk = createBrowserSdk(authMiniBaseUrl);
      const redirectAnonymousSession = (nextSession: SessionSnapshot) => {
        if (
          callbackHandled &&
          autoRedirectToLoginRef.current &&
          nextSession.status === 'anonymous' &&
          !autoRedirectStartedRef.current
        ) {
          autoRedirectStartedRef.current = true;
          signIn();
        }
      };
      const synchronize = (nextSession: SessionSnapshot) => {
        if (!alive) {
          return;
        }
        latestSession = nextSession;
        setSession(nextSession);
        stateHandlerRef.current?.(nextSession);
        redirectAnonymousSession(nextSession);
      };

      setSdk(nextSdk);
      synchronize(nextSdk.session.getState());
      unsubscribe = nextSdk.session.onChange(synchronize);

      void acceptCallback(nextSdk, authMiniBaseUrl)
        .then((acceptedCallback) => {
          if (!alive || activeBaseUrlRef.current !== authMiniBaseUrl) {
            return;
          }
          callbackHandled = true;
          if (!acceptedCallback) {
            redirectAnonymousSession(latestSession);
          }
        })
        .catch((cause: unknown) => {
          if (
            mountedRef.current &&
            activeBaseUrlRef.current === authMiniBaseUrl
          ) {
            reportError(cause);
          }
        });
    } catch (cause) {
      reportError(cause);
    }

    return () => {
      alive = false;
      mountedRef.current = false;
      unsubscribe?.();
    };
  }, [
    authMiniBaseUrl,
    autoRedirectToLoginRef,
    reportError,
    signIn,
    stateHandlerRef,
  ]);

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

  const openPasskeyRegistrationPage = useCallback(() => {
    const url = new URL('/web/', authMiniBaseUrl);
    url.hash = '/passkey/register';

    const popup = window.open(
      url.toString(),
      passkeyRegistrationPopupName,
      passkeyRegistrationPopupFeatures,
    );
    popup?.focus();
    return popup;
  }, [authMiniBaseUrl]);

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
      openPasskeyRegistrationPage,
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
      openPasskeyRegistrationPage,
      status,
    ],
  );

  return (
    <AuthMiniContext.Provider value={value}>
      {children}
      <Toaster />
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
): Promise<boolean> {
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
    return Promise.resolve(false);
  }

  const storageKey = getAuthMiniLoginStateKey(authMiniBaseUrl);
  const expectedState = window.sessionStorage.getItem(storageKey);
  window.history.replaceState(null, '', callback.cleanUrl);

  if (!expectedState || callback.state !== expectedState) {
    throw new Error('Invalid Auth Mini login state');
  }

  window.sessionStorage.removeItem(storageKey);
  return sdk.session.acceptRedirectCallback(callback.tokens).then(() => true);
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
