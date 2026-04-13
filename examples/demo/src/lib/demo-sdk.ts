import { createBrowserSdk } from 'auth-mini/sdk/browser';

type DemoEd25519Api = {
  register(input: { name: string; public_key: string }): Promise<unknown>;
  start(input: { credential_id: string }): Promise<{
    request_id: string;
    challenge: string;
  }>;
  verify(input: {
    request_id: string;
    signature: string;
  }): Promise<DemoSessionTokens>;
};

export type DemoSdk = ReturnType<typeof createBrowserSdk> & {
  ed25519: DemoEd25519Api;
};

export type DemoSessionTokens = {
  session_id: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
};

function browserSdkStorageKey(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  return `auth-mini.sdk:${url.toString()}`;
}

export function persistDemoSession(
  storage: Storage,
  authOrigin: string,
  tokens: DemoSessionTokens,
) {
  const receivedAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + tokens.expires_in * 1000,
  ).toISOString();

  storage.setItem(
    browserSdkStorageKey(authOrigin),
    JSON.stringify({
      sessionId: tokens.session_id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      receivedAt,
      expiresAt,
    }),
  );
}

export function createDemoSdk(authOrigin: string): DemoSdk {
  const sdk = createBrowserSdk(authOrigin);

  function isRetryableAuthError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      error.status === 401 &&
      (!('error' in error) || error.error !== 'session_superseded')
    );
  }

  async function requireAccessToken(forceRefresh = false): Promise<string> {
    const snapshot = sdk.session.getState();

    if (!snapshot.refreshToken && !snapshot.accessToken) {
      throw new Error('Missing authenticated session');
    }

    if (!forceRefresh && snapshot.accessToken) {
      return snapshot.accessToken;
    }

    const refreshed = await sdk.session.refresh();

    if (!refreshed.accessToken) {
      throw new Error('Missing authenticated session');
    }

    return refreshed.accessToken;
  }

  async function postJson<T>(
    path: string,
    body: unknown,
    accessToken?: string | null,
  ) {
    const response = await fetch(new URL(path, authOrigin), {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as T | { error?: string };
    if (!response.ok) {
      if (typeof payload === 'object' && payload !== null) {
        throw { status: response.status, ...payload };
      }

      throw { status: response.status, error: 'request_failed' };
    }

    return payload as T;
  }

  return {
    ...sdk,
    ed25519: {
      async register(input: { name: string; public_key: string }) {
        const requestBody = {
          name: input.name,
          public_key: input.public_key,
        };

        try {
          return await postJson(
            '/ed25519/credentials',
            requestBody,
            await requireAccessToken(),
          );
        } catch (error) {
          if (
            !isRetryableAuthError(error) ||
            !sdk.session.getState().refreshToken
          ) {
            throw error;
          }

          return await postJson(
            '/ed25519/credentials',
            requestBody,
            await requireAccessToken(true),
          );
        }
      },
      start(input: { credential_id: string }) {
        return postJson<{ request_id: string; challenge: string }>(
          '/ed25519/start',
          input,
        );
      },
      verify(input: { request_id: string; signature: string }) {
        return postJson<DemoSessionTokens>('/ed25519/verify', input);
      },
    },
  };
}
