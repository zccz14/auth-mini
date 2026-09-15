import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { AuthMiniProvider, useAuthMini } from 'auth-mini-react-components';
import { resolveServerBaseUrl } from '@/lib/app-config';
import { extendAppSdk, type AdminSetupState, type AppSdk } from '@/lib/app-sdk';

const ANONYMOUS_SESSION = {
  status: 'anonymous',
  authenticated: false,
  sessionId: null,
  accessToken: null,
  refreshToken: null,
  receivedAt: null,
  expiresAt: null,
} as const;

type AppContextValue = {
  sdk: AppSdk | null;
  setupState: AdminSetupState | null;
  setupLoading: boolean;
  setupError: string;
  reloadSetupState: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [serverBaseUrl] = useState(() =>
    resolveServerBaseUrl(window.location.href),
  );

  return (
    <AuthMiniProvider
      authMiniBaseUrl={serverBaseUrl}
      autoRedirectToLogin={false}
    >
      <AppServicesProvider>{children}</AppServicesProvider>
    </AuthMiniProvider>
  );
}

function AppServicesProvider({ children }: PropsWithChildren) {
  const { sdk: browserSdk, authMiniBaseUrl } = useAuthMini();
  const sdk = useMemo(
    () => browserSdk && extendAppSdk(browserSdk, authMiniBaseUrl),
    [browserSdk, authMiniBaseUrl],
  );
  const [setupState, setSetupState] = useState<AdminSetupState | null>(null);
  const [setupLoading, setSetupLoading] = useState(true);
  const [setupError, setSetupError] = useState('');

  async function loadSetupState(nextSdk: AppSdk, active = () => true) {
    setSetupLoading(true);
    setSetupError('');
    try {
      const nextSetupState = await nextSdk.admin.setup.fetch();
      if (active()) setSetupState(nextSetupState);
    } catch (cause) {
      if (active()) {
        setSetupState(null);
        setSetupError(
          cause instanceof Error
            ? cause.message
            : 'Unable to load server setup.',
        );
      }
    } finally {
      if (active()) setSetupLoading(false);
    }
  }

  useEffect(() => {
    if (!sdk) return;
    let active = true;
    void loadSetupState(sdk, () => active);
    return () => {
      active = false;
    };
  }, [sdk]);

  return (
    <AppContext.Provider
      value={{
        sdk,
        setupState,
        setupLoading,
        setupError,
        reloadSetupState: async () => {
          if (sdk) await loadSetupState(sdk);
        },
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const { session, authMiniBaseUrl } = useAuthMini();
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return {
    ...value,
    serverBaseUrl: authMiniBaseUrl,
    session: session ?? ANONYMOUS_SESSION,
  };
}
