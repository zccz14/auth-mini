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
  type AdminSetupState,
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
  setupState: AdminSetupState | null;
  setupLoading: boolean;
  setupError: string;
  adoptDemoSession: (tokens: DemoSessionTokens) => Promise<void>;
  clearLocalAuthState: () => Promise<void>;
  reloadSetupState: () => Promise<void>;
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
  const [setupState, setSetupState] = useState<AdminSetupState | null>(null);
  const [setupLoading, setSetupLoading] = useState(true);
  const [setupError, setSetupError] = useState('');
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

  async function loadSetupState(nextSdk: DemoSdk, active = () => true) {
    setSetupLoading(true);
    setSetupError('');

    try {
      const nextSetupState = await nextSdk.admin.setup.fetch();
      if (!active()) {
        return;
      }
      setSetupState(nextSetupState);
    } catch (cause) {
      if (!active()) {
        return;
      }
      setSetupState(null);
      setSetupError(
        cause instanceof Error ? cause.message : 'Unable to load server setup.',
      );
    } finally {
      if (active()) {
        setSetupLoading(false);
      }
    }
  }

  useEffect(() => {
    const nextSdk = createDemoSdk(config.resolvedServerBaseUrl);
    let active = true;
    attachSdk(nextSdk);
    void loadSetupState(nextSdk, () => active);

    return () => {
      active = false;
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
      reloadSetupState: async () => {
        if (!sdk) {
          return;
        }

        await loadSetupState(sdk);
      },
      sdk,
      session,
      setupError,
      setupLoading,
      setupState,
    }),
    [config, sdk, session, setupError, setupLoading, setupState],
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
