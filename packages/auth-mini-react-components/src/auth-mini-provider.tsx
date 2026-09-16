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
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import {
  AuthMiniCallbackError,
  getAuthMiniLoginStateKey,
  resolveAuthMiniAudiences,
  getAuthMiniLoginUrl,
  readAuthMiniRedirectCallback,
} from './auth-callback.js';
import { Toaster } from './components/ui/sonner.js';

export type AuthMiniProviderProps = {
  authMiniBaseUrl: string;
  children: ReactNode;
  /** Legacy single audience. Cannot be combined with audiences. */
  audience?: string;
  /** Explicit resource audiences. Must include the callback hostname. */
  audiences?: readonly string[];
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
  audiences,
  callbackUrl,
  autoRedirectToLogin,
  children,
  onAuthError,
  onAuthStateChange,
}: AuthMiniProviderProps) {
  const [sdk, setSdk] = useState<AuthMiniApi | null>(null);
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const audienceRef = useLatest(audience);
  const audiencesRef = useLatest(audiences);
  const callbackUrlRef = useLatest(callbackUrl);
  const autoRedirectToLoginRef = useLatest(autoRedirectToLogin);
  const errorHandlerRef = useLatest(onAuthError);
  const stateHandlerRef = useLatest(onAuthStateChange);
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
          audiences: resolveAuthMiniAudiences(
            audienceRef.current,
            audiencesRef.current,
            new URL(returnTo).hostname,
          ),
          callbackUrl: returnTo,
          state,
        }),
      );
    } catch (cause) {
      reportError(cause);
    }
  }, [audienceRef, audiencesRef, authMiniBaseUrl, callbackUrlRef, reportError]);

  useEffect(() => {
    autoRedirectStartedRef.current = false;
    let unsubscribe: (() => void) | undefined;
    let alive = true;
    let callbackHandled = false;
    let latestSession: SessionSnapshot;
    let source: { current: SessionSnapshot } | null = null;
    let claims: string | null = null;
    let verifiedAccessToken: string | null = null;
    let verification: SessionSnapshot | null = null;

    setSdk(null);
    setSession(null);
    setError(null);
    setIsAuthenticated(false);

    const publish = (next: SessionSnapshot, nextClaims: string | null) => {
      if (
        source &&
        source.current.sessionId === next.sessionId &&
        source.current.status === next.status &&
        source.current.authenticated === next.authenticated &&
        claims === nextClaims
      ) {
        source.current = next;
        return;
      }
      source = { current: next };
      claims = nextClaims;
      setSession(createSessionView(source));
      setIsAuthenticated(next.authenticated && nextClaims !== null);
    };

    try {
      const nextSdk = createBrowserSdk(authMiniBaseUrl);
      const issuer = new URL(authMiniBaseUrl).toString().replace(/\/$/, '');
      const jwks = createRemoteJWKSet(new URL(`${issuer}/jwks`));
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
      const verifySession = async (next: SessionSnapshot) => {
        verification = next;
        try {
          const { payload } = await jwtVerify(next.accessToken!, jwks, {
            issuer,
            audience: resolveAuthMiniAudiences(
              audienceRef.current,
              audiencesRef.current,
            ),
          });
          if (!alive || verification !== next) return;
          verifiedAccessToken = next.accessToken;
          publish(
            { ...latestSession, status: 'authenticated' },
            sessionClaims(payload),
          );
        } catch {
          if (!alive || verification !== next) return;
          verifiedAccessToken = null;
          publish({ ...latestSession, authenticated: false }, null);
        }
      };
      const synchronize = (next: SessionSnapshot) => {
        if (!alive) return;
        latestSession = next;
        stateHandlerRef.current?.(next);
        redirectAnonymousSession(next);

        if (!next.authenticated || !next.accessToken) {
          verification = null;
          verifiedAccessToken = null;
          publish(next, null);
          return;
        }
        const sameSession = source?.current.sessionId === next.sessionId;
        if (sameSession && next.accessToken === verifiedAccessToken) {
          verification = null;
          publish({ ...next, status: 'authenticated' }, claims);
          return;
        }
        if (!sameSession || claims === null) {
          publish(next, null);
        }
        if (
          verification?.accessToken === next.accessToken &&
          verification.sessionId === next.sessionId
        )
          return;
        void verifySession(next);
      };

      setSdk(nextSdk);
      synchronize(nextSdk.session.getState());
      unsubscribe = nextSdk.session.onChange(synchronize);

      void acceptCallback(nextSdk, authMiniBaseUrl)
        .then((acceptedCallback) => {
          if (!alive) return;
          callbackHandled = true;
          if (!acceptedCallback) {
            redirectAnonymousSession(latestSession);
          }
        })
        .catch((cause: unknown) => {
          if (alive) reportError(cause);
        });
    } catch (cause) {
      reportError(cause);
    }

    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [
    audienceRef,
    audiencesRef,
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
  const isReady =
    session !== null &&
    (session.status !== 'recovering' || session.authenticated);
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

// INVARIANT: the source advances only in the SDK subscription or after JWT
// verification. Stable getters let existing event handlers read rotated tokens
// without mutating React state or notifying consumers for token-only changes.
function createSessionView(source: {
  current: SessionSnapshot;
}): SessionSnapshot {
  return Object.freeze({
    get status() {
      return source.current.status;
    },
    get authenticated() {
      return source.current.authenticated;
    },
    get sessionId() {
      return source.current.sessionId;
    },
    get accessToken() {
      return source.current.accessToken;
    },
    get refreshToken() {
      return source.current.refreshToken;
    },
    get receivedAt() {
      return source.current.receivedAt;
    },
    get expiresAt() {
      return source.current.expiresAt;
    },
  });
}

function sessionClaims(payload: JWTPayload): string {
  return JSON.stringify([
    payload.sub,
    payload.sid,
    payload.iss,
    payload.aud,
    payload.amr,
    payload.auth_admin,
  ]);
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
