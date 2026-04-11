import { createBrowserSdk } from 'auth-mini/sdk/browser';

type DemoEd25519Api = {
  register(input: {
    accessToken: string;
    name: string;
    public_key: string;
  }): Promise<unknown>;
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
      me: null,
    }),
  );
}

export function createDemoSdk(authOrigin: string): DemoSdk {
  const sdk = createBrowserSdk(authOrigin);

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
      throw payload;
    }

    return payload as T;
  }

  return {
    ...sdk,
    ed25519: {
      register(input: {
        accessToken: string;
        name: string;
        public_key: string;
      }) {
        return postJson('/ed25519/credentials', input, input.accessToken);
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
