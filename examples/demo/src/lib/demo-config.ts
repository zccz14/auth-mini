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

function parseConfiguredOrigin(candidateOrigin: string) {
  const trimmedOrigin = candidateOrigin.trim();

  if (!trimmedOrigin) {
    return {
      authOrigin: '',
      configError:
        'auth-origin must be configured before interactive flows are enabled.',
      status: 'waiting' as const,
    };
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(trimmedOrigin);
  } catch {
    return {
      authOrigin: '',
      configError: 'auth-origin must be a valid http or https origin.',
      status: 'waiting' as const,
    };
  }

  if (!['http:', 'https:'].includes(parsedOrigin.protocol)) {
    return {
      authOrigin: '',
      configError: 'auth-origin must be a valid http or https origin.',
      status: 'waiting' as const,
    };
  }

  const hasOriginOnlyShape =
    parsedOrigin.pathname === '/' && !parsedOrigin.search && !parsedOrigin.hash;

  if (!hasOriginOnlyShape) {
    return {
      authOrigin: '',
      configError:
        'auth-origin must be an origin without a path, search, or hash.',
      status: 'waiting' as const,
    };
  }

  return {
    authOrigin: parsedOrigin.origin,
    configError: '',
    status: 'ready' as const,
  };
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
  const configState = parseConfiguredOrigin(candidateOrigin);

  return {
    authOrigin: configState.authOrigin,
    configError: configState.configError,
    pageOrigin,
    status: configState.status,
  };
}
