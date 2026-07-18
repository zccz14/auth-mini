import type { DemoSessionTokens } from '@/lib/demo-sdk';

export type LoginRequest =
  | {
      status: 'ready';
      state: string | null;
      target:
        | {
            kind: 'self';
          }
        | {
            kind: 'redirect';
            audience: string;
            redirectUri: string;
          }
        | {
            kind: 'loopback';
            audience: string;
            displayHost: string;
            redirectUri: string;
          };
    }
  | {
      status: 'invalid';
      error: string;
    };

export type LoginCallbackTokens =
  | {
      accessToken: string | null;
      expiresAt: string | null;
      receivedAt?: string | null;
      refreshToken: string;
      sessionId: string;
      tokenType?: string;
    }
  | DemoSessionTokens;

export function parseLoginRequest(
  routeSearch: string,
  documentSearch = '',
): LoginRequest {
  const params = new URLSearchParams(routeSearch);
  const documentParams = new URLSearchParams(documentSearch);
  const redirectUri = (
    params.get('redirect_uri') ??
    documentParams.get('redirect_uri') ??
    ''
  ).trim();
  const audienceParam = params.has('aud')
    ? params.get('aud')
    : documentParams.has('aud')
      ? documentParams.get('aud')
      : null;
  const audience = audienceParam ?? '';
  const state = params.get('state') ?? documentParams.get('state');

  if (!redirectUri) {
    if (audienceParam !== null) {
      return {
        status: 'invalid',
        error: 'aud requires a loopback redirect_uri.',
      };
    }

    return {
      status: 'ready',
      state,
      target: { kind: 'self' },
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(redirectUri);
  } catch {
    return {
      status: 'invalid',
      error: 'redirect_uri must be a valid http or https URL.',
    };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return {
      status: 'invalid',
      error: 'redirect_uri must be a valid http or https URL.',
    };
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (isLoopbackHostname(hostname)) {
    const normalizedAudience = normalizeAudience(audience);
    if (audienceParam === null) {
      return {
        status: 'invalid',
        error: 'aud is required for a loopback redirect_uri.',
      };
    }
    if (!normalizedAudience) {
      return {
        status: 'invalid',
        error: 'aud must be a valid hostname without a scheme, port, or path.',
      };
    }

    return {
      status: 'ready',
      state,
      target: {
        kind: 'loopback',
        audience: normalizedAudience,
        displayHost: parsed.host,
        redirectUri: parsed.toString(),
      },
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      status: 'invalid',
      error: 'redirect_uri must use https unless it is a loopback address.',
    };
  }
  if (audienceParam !== null) {
    return {
      status: 'invalid',
      error: 'aud is only allowed with a loopback redirect_uri.',
    };
  }

  return {
    status: 'ready',
    state,
    target: {
      kind: 'redirect',
      audience: hostname,
      redirectUri: parsed.toString(),
    },
  };
}

export function authenticationTarget(
  request: Extract<LoginRequest, { status: 'ready' }>,
) {
  if (request.target.kind === 'self') {
    return {};
  }

  if (request.target.kind === 'redirect') {
    return { redirect_uri: request.target.redirectUri };
  }

  return {
    redirect_uri: request.target.redirectUri,
    aud: request.target.audience,
  };
}

function isLoopbackHostname(hostname: string) {
  return ['localhost', '127.0.0.1', '::1'].includes(hostname);
}

function normalizeAudience(value: string) {
  if (!value || value !== value.trim()) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(
      value.includes(':') ? `https://[${value}]` : `https://${value}`,
    );
  } catch {
    return null;
  }

  if (
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    return null;
  }

  return normalizeHostname(parsed.hostname);
}

export function issuerAudience(issuer: string) {
  return normalizeHostname(new URL(issuer).hostname);
}

function normalizeHostname(hostname: string) {
  const withoutIpv6Brackets = hostname.replace(/^\[|\]$/g, '');
  return withoutIpv6Brackets.toLowerCase().replace(/\.+$/, '');
}

export function toDemoSessionTokens(
  tokens: LoginCallbackTokens,
): DemoSessionTokens {
  if ('accessToken' in tokens) {
    if (!tokens.accessToken) {
      throw new Error('Login did not return an access token.');
    }

    return {
      session_id: tokens.sessionId,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: expiresInFromTokenDates(tokens.expiresAt, tokens.receivedAt),
      token_type: 'Bearer',
    };
  }

  return tokens;
}

export function buildLoginCallbackUrl({
  redirectUri,
  state,
  tokens,
}: {
  redirectUri: string;
  state: string | null;
  tokens: LoginCallbackTokens;
}) {
  const target = new URL(redirectUri);
  const currentFragment = target.hash.slice(1);
  const normalizedTokens = normalizeCallbackTokens(tokens);
  const callbackParams = new URLSearchParams();

  callbackParams.set('access_token', normalizedTokens.accessToken);
  callbackParams.set('token_type', normalizedTokens.tokenType);
  callbackParams.set('session_id', normalizedTokens.sessionId);
  callbackParams.set('refresh_token', normalizedTokens.refreshToken);
  callbackParams.set('expires_in', String(normalizedTokens.expiresIn));
  if (normalizedTokens.expiresAt) {
    callbackParams.set('expires_at', normalizedTokens.expiresAt);
  }
  if (state !== null) {
    callbackParams.set('state', state);
  }

  target.hash = buildCallbackFragment(currentFragment, callbackParams);
  return target.toString();
}

export function sendLoginCallback(callbackUrl: string) {
  window.location.assign(callbackUrl);
}

function normalizeCallbackTokens(tokens: LoginCallbackTokens) {
  if ('accessToken' in tokens) {
    if (!tokens.accessToken) {
      throw new Error('Login did not return an access token.');
    }

    return {
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
      expiresIn: expiresInFromTokenDates(tokens.expiresAt, tokens.receivedAt),
      refreshToken: tokens.refreshToken,
      sessionId: tokens.sessionId,
      tokenType: tokens.tokenType ?? 'Bearer',
    };
  }

  return {
    accessToken: tokens.access_token,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    expiresIn: tokens.expires_in,
    refreshToken: tokens.refresh_token,
    sessionId: tokens.session_id,
    tokenType: tokens.token_type,
  };
}

function expiresInFromTokenDates(
  expiresAt: string | null,
  receivedAt: string | null | undefined,
) {
  if (!expiresAt) {
    throw new Error('Login did not return an expiry.');
  }

  const expiresAtMs = Date.parse(expiresAt);
  const receivedAtMs = receivedAt ? Date.parse(receivedAt) : Date.now();
  if (!Number.isFinite(expiresAtMs) || !Number.isFinite(receivedAtMs)) {
    throw new Error('Login returned an invalid expiry.');
  }

  return Math.max(1, Math.ceil((expiresAtMs - receivedAtMs) / 1000));
}

function buildCallbackFragment(
  currentFragment: string,
  callbackParams: URLSearchParams,
) {
  if (currentFragment.startsWith('/')) {
    const separator = currentFragment.includes('?') ? '&' : '?';
    return currentFragment + separator + callbackParams.toString();
  }

  const fragment = new URLSearchParams(currentFragment);
  for (const [key, value] of callbackParams) {
    fragment.set(key, value);
  }
  return fragment.toString();
}
