import type { DemoSessionTokens } from '@/lib/demo-sdk';

export type LoginRequest =
  | {
      status: 'ready';
      redirectUri: string;
      state: string | null;
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

export function parseLoginRequest(search: string): LoginRequest {
  const params = new URLSearchParams(search);
  const redirectUri = params.get('redirect_uri')?.trim() ?? '';

  if (!redirectUri) {
    return {
      status: 'invalid',
      error: 'redirect_uri is required.',
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

  return {
    status: 'ready',
    redirectUri: parsed.toString(),
    state: params.get('state'),
  };
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
