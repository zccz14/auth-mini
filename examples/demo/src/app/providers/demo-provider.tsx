import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';
import { getInitialDemoConfig } from '@/lib/demo-config';
import {
  createDemoSdk,
  persistDemoSession,
  type DemoSdk,
  type DemoSessionTokens,
} from '@/lib/demo-sdk';
import {
  clearStoredAuthOrigin,
  getStoredAuthOrigin,
  setStoredAuthOrigin,
} from '@/lib/demo-storage';

const ANONYMOUS_SESSION = {
  status: 'anonymous',
  authenticated: false,
  sessionId: null,
  accessToken: null,
  refreshToken: null,
  receivedAt: null,
  expiresAt: null,
  me: null,
} as const;

function clearHashAuthOrigin(hash: string) {
  const queryIndex = hash.indexOf('?');
  if (queryIndex < 0) {
    return hash;
  }

  const pathname = hash.slice(0, queryIndex);
  const params = new URLSearchParams(hash.slice(queryIndex + 1));
  params.delete('auth-origin');
  const nextQuery = params.toString();

  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

type DemoSession = ReturnType<DemoSdk['session']['getState']>;

type DemoContextValue = {
  config: ReturnType<typeof getInitialDemoConfig>;
  sdk: DemoSdk | null;
  session: DemoSession;
  user: DemoSession['me'];
  adoptDemoSession: (tokens: DemoSessionTokens) => Promise<void>;
  clearLocalAuthState: () => Promise<void>;
  setAuthOrigin: (authOrigin: string) => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

type DemoLocation = {
  hash: string;
  search: string;
  origin: string;
};

export function DemoProvider({
  children,
  initialLocation,
}: PropsWithChildren<{ initialLocation?: DemoLocation }>) {
  const location = initialLocation ?? {
    hash: window.location.hash,
    search: window.location.search,
    origin: window.location.origin,
  };

  const [sdk, setSdk] = useState<DemoSdk | null>(null);
  const [session, setSession] = useState<DemoSession>(ANONYMOUS_SESSION);
  const [authOriginOverride, setAuthOriginOverride] = useState<string | null>(
    null,
  );
  const [hashOverride, setHashOverride] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  let storage: Storage | undefined;
  if (typeof window !== 'undefined') {
    try {
      storage = window.localStorage;
    } catch {
      storage = undefined;
    }
  }

  const storageOrigin =
    authOriginOverride === null
      ? getStoredAuthOrigin(storage)
      : authOriginOverride;
  const hash = hashOverride ?? location.hash;
  const config = getInitialDemoConfig({
    hash,
    search: location.search,
    storageOrigin,
    pageOrigin: location.origin,
  });

  function attachSdk(nextSdk: DemoSdk) {
    unsubscribeRef.current?.();
    setSdk(nextSdk);
    setSession(nextSdk.session.getState());
    unsubscribeRef.current = nextSdk.session.onChange((nextSession) => {
      setSession(nextSession);
    });
  }

  useEffect(() => {
    if (!storage) {
      return;
    }

    if (config.status === 'ready') {
      setStoredAuthOrigin(config.authOrigin, storage);
      return;
    }

    clearStoredAuthOrigin(storage);
  }, [config.authOrigin, config.status, storage]);

  useEffect(() => {
    if (config.status !== 'ready') {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      setSdk(null);
      setSession(ANONYMOUS_SESSION);
      return;
    }

    const nextSdk = createDemoSdk(config.authOrigin);
    attachSdk(nextSdk);

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [config.authOrigin, config.status]);

  const value = useMemo<DemoContextValue>(
    () => ({
      config,
      adoptDemoSession: async (tokens) => {
        if (!storage || config.status !== 'ready') {
          throw new Error('Demo setup is not ready');
        }

        persistDemoSession(storage, config.authOrigin, tokens);
        const nextSdk = createDemoSdk(config.authOrigin);
        await nextSdk.me.reload();
        attachSdk(nextSdk);
      },
      clearLocalAuthState: async () => {
        const nextHash = clearHashAuthOrigin(
          typeof window === 'undefined' ? hash : window.location.hash,
        );

        if (
          typeof window !== 'undefined' &&
          nextHash !== window.location.hash
        ) {
          window.history.replaceState(
            window.history.state,
            '',
            `${window.location.pathname}${window.location.search}${nextHash}`,
          );
        }

        setAuthOriginOverride('');
        setHashOverride(nextHash);
        clearStoredAuthOrigin(storage);

        if (!sdk) {
          setSession(ANONYMOUS_SESSION);
          return;
        }

        await sdk.session.logout();
        setSession(sdk.session.getState());
      },
      sdk,
      session,
      setAuthOrigin: (authOrigin) => {
        setAuthOriginOverride(authOrigin.trim());
      },
      user: session.me,
    }),
    [config, sdk, session],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) {
    throw new Error('useDemo must be used inside DemoProvider');
  }

  return value;
}
