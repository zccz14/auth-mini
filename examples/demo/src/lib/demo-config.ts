export type DemoConfigStatus = 'ready' | 'waiting';

export type DemoConfig = {
  authOrigin: string;
  configError: string;
  pageOrigin: string;
  status: DemoConfigStatus;
};

function readHashAuthOrigin(hash: string) {
  const queryIndex = hash.indexOf('?');
  if (queryIndex < 0) {
    return '';
  }

  const params = new URLSearchParams(hash.slice(queryIndex + 1));
  return params.get('auth-origin') ?? '';
}

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
  void search;

  const candidateOrigin = readHashAuthOrigin(hash) || storageOrigin;

  if (!candidateOrigin) {
    return {
      authOrigin: '',
      configError:
        'auth-origin must be configured before interactive flows are enabled.',
      pageOrigin,
      status: 'waiting',
    };
  }

  return {
    authOrigin: candidateOrigin,
    configError: '',
    pageOrigin,
    status: 'ready',
  };
}
