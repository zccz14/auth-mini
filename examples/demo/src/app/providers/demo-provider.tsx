import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { getInitialDemoConfig } from '@/lib/demo-config';
import { createDemoSdk, type DemoSdk } from '@/lib/demo-sdk';
import { getStoredAuthOrigin } from '@/lib/demo-storage';

type DemoContextValue = {
  config: ReturnType<typeof getInitialDemoConfig>;
  sdk: DemoSdk | null;
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

  const storageOrigin = getStoredAuthOrigin(
    typeof window === 'undefined' ? undefined : window.localStorage,
  );
  const config = getInitialDemoConfig({
    hash: location.hash,
    search: location.search,
    storageOrigin,
    pageOrigin: location.origin,
  });

  const value = useMemo<DemoContextValue>(
    () => ({
      config,
      sdk: config.status === 'ready' ? createDemoSdk(config.authOrigin) : null,
    }),
    [config],
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
