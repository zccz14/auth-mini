import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { getInitialDemoConfig } from '@/lib/demo-config';
import { createDemoSdk, type DemoSdk } from '@/lib/demo-sdk';
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

type DemoSession = ReturnType<DemoSdk['session']['getState']>;

type DemoContextValue = {
  config: ReturnType<typeof getInitialDemoConfig>;
  sdk: DemoSdk | null;
  session: DemoSession;
  user: DemoSession['me'];
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
  const config = getInitialDemoConfig({
    hash: location.hash,
    search: location.search,
    storageOrigin,
    pageOrigin: location.origin,
  });

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
      setSdk(null);
      setSession(ANONYMOUS_SESSION);
      return;
    }

    const nextSdk = createDemoSdk(config.authOrigin);
    setSdk(nextSdk);
    setSession(nextSdk.session.getState());

    return nextSdk.session.onChange((nextSession) => {
      setSession(nextSession);
    });
  }, [config.authOrigin, config.status]);

  const value = useMemo<DemoContextValue>(
    () => ({
      config,
      clearLocalAuthState: async () => {
        setAuthOriginOverride('');
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
