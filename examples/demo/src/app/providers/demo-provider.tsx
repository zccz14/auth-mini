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

const ANONYMOUS_SESSION = {
  status: 'anonymous',
  authenticated: false,
  sessionId: null,
  accessToken: null,
  refreshToken: null,
  receivedAt: null,
  expiresAt: null,
} as const;

type DemoSession = ReturnType<DemoSdk['session']['getState']>;

type DemoContextValue = {
  config: ReturnType<typeof getInitialDemoConfig>;
  sdk: DemoSdk | null;
  session: DemoSession;
  adoptDemoSession: (tokens: DemoSessionTokens) => Promise<void>;
  clearLocalAuthState: () => Promise<void>;
};

const DemoContext = createContext<DemoContextValue | null>(null);

type DemoLocation = {
  hash: string;
  href?: string;
  search: string;
  origin: string;
};

export function DemoProvider({
  children,
  initialLocation,
}: PropsWithChildren<{ initialLocation?: DemoLocation }>) {
  const location = initialLocation ?? {
    hash: window.location.hash,
    href: window.location.href,
    search: window.location.search,
    origin: window.location.origin,
  };

  const [sdk, setSdk] = useState<DemoSdk | null>(null);
  const [session, setSession] = useState<DemoSession>(ANONYMOUS_SESSION);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  let storage: Storage | undefined;
  if (typeof window !== 'undefined') {
    try {
      storage = window.localStorage;
    } catch {
      storage = undefined;
    }
  }

  const config = getInitialDemoConfig({
    pageHref: location.href ?? `${location.origin}/web/#/`,
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
    const nextSdk = createDemoSdk(config.resolvedServerBaseUrl);
    attachSdk(nextSdk);

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [config.resolvedServerBaseUrl]);

  const value = useMemo<DemoContextValue>(
    () => ({
      config,
      adoptDemoSession: async (tokens) => {
        if (!storage) {
          throw new Error('Demo setup is not ready');
        }

        persistDemoSession(storage, config.resolvedServerBaseUrl, tokens);
        const nextSdk = createDemoSdk(config.resolvedServerBaseUrl);
        attachSdk(nextSdk);
      },
      clearLocalAuthState: async () => {
        if (!sdk) {
          setSession(ANONYMOUS_SESSION);
          return;
        }

        await sdk.session.logout();
        setSession(sdk.session.getState());
      },
      sdk,
      session,
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
