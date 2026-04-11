export type DemoConfigStatus = 'ready' | 'waiting';

export type DemoConfig = {
  authOrigin: string;
  configError: string;
  pageOrigin: string;
  status: DemoConfigStatus;
};

export function getInitialDemoConfig({
  hash,
  search,
  storageOrigin,
  pageOrigin,
}: {
  hash: string;
  search: string;
  storageOrigin: string;
  pageOrigin: string;
}): DemoConfig {
  void hash;
  void search;

  if (!storageOrigin) {
    return {
      authOrigin: '',
      configError:
        'auth-origin must be configured before interactive flows are enabled.',
      pageOrigin,
      status: 'waiting',
    };
  }

  return {
    authOrigin: storageOrigin,
    configError: '',
    pageOrigin,
    status: 'ready',
  };
}
