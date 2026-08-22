import type { RedirectSessionInput } from 'auth-mini/sdk/browser';

const callbackParameterNames = [
  'access_token',
  'expires_at',
  'expires_in',
  'refresh_token',
  'session_id',
  'state',
  'token_type',
];

export type AuthMiniRedirectCallback = {
  state: string;
  tokens: RedirectSessionInput;
  cleanUrl: string;
};

export class AuthMiniCallbackError extends Error {
  constructor(
    message: string,
    readonly cleanUrl: string,
  ) {
    super(message);
    this.name = 'AuthMiniCallbackError';
  }
}

export function getAuthMiniLoginStateKey(authMiniBaseUrl: string): string {
  return `auth-mini.react.login.state:${normalizedBaseUrl(authMiniBaseUrl)}`;
}

export function getAuthMiniSecurityUrl(authMiniBaseUrl: string): string {
  const url = new URL('/web/', authMiniBaseUrl);
  url.hash = '/';
  return url.toString();
}

export function resolveAuthMiniAudience(
  audience: string | undefined,
  hostname: string = window.location.hostname,
): string | undefined {
  if (audience !== undefined) {
    return audience;
  }

  return isLoopbackHostname(hostname)
    ? hostname.replace(/^\[|\]$/g, '')
    : undefined;
}

function isLoopbackHostname(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
}

export function getAuthMiniLoginUrl(input: {
  authMiniBaseUrl: string;
  audience?: string;
  callbackUrl: string;
  state: string;
}): string {
  const url = new URL('/web/', input.authMiniBaseUrl);
  const parameters = new URLSearchParams({
    redirect_uri: input.callbackUrl,
    state: input.state,
  });
  if (input.audience) {
    parameters.set('aud', input.audience);
  }
  url.hash = `/login?${parameters.toString()}`;
  return url.toString();
}

export function readAuthMiniRedirectCallback(
  href: string,
): AuthMiniRedirectCallback | null {
  const url = new URL(href);
  const source = getCallbackParameters(url);
  if (!source || !source.parameters.has('access_token')) {
    return null;
  }

  for (const name of callbackParameterNames) {
    source.parameters.delete(name);
  }
  source.write(url);
  const cleanUrl = url.toString();
  const tokens = readTokens(source.originalParameters);
  const state = source.originalParameters.get('state');
  if (!tokens || !state) {
    throw new AuthMiniCallbackError(
      'Invalid Auth Mini login callback',
      cleanUrl,
    );
  }

  return {
    state,
    tokens,
    cleanUrl,
  };
}

function getCallbackParameters(url: URL): {
  parameters: URLSearchParams;
  originalParameters: URLSearchParams;
  write: (next: URL) => void;
} | null {
  const hash = url.hash.slice(1);
  if (!hash) {
    return null;
  }

  const queryIndex = hash.indexOf('?');
  if (queryIndex >= 0) {
    const route = hash.slice(0, queryIndex);
    const parameters = new URLSearchParams(hash.slice(queryIndex + 1));
    return {
      parameters,
      originalParameters: new URLSearchParams(parameters),
      write(next) {
        const search = parameters.toString();
        next.hash = search ? `${route}?${search}` : route;
      },
    };
  }

  const parameters = new URLSearchParams(hash);
  return {
    parameters,
    originalParameters: new URLSearchParams(parameters),
    write(next) {
      next.hash = parameters.toString();
    },
  };
}

function readTokens(parameters: URLSearchParams): RedirectSessionInput | null {
  const accessToken = parameters.get('access_token');
  const sessionId = parameters.get('session_id');
  const refreshToken = parameters.get('refresh_token');
  const expiresIn = Number(parameters.get('expires_in'));

  if (
    !accessToken ||
    parameters.get('token_type') !== 'Bearer' ||
    !sessionId ||
    !refreshToken ||
    !Number.isFinite(expiresIn) ||
    expiresIn <= 0
  ) {
    return null;
  }

  return {
    access_token: accessToken,
    session_id: sessionId,
    refresh_token: refreshToken,
    expires_in: expiresIn,
  };
}

function normalizedBaseUrl(value: string): string {
  const url = new URL(value);
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  return url.toString();
}
