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

export type AdminSetupState = {
  issuer: string;
  admin_user_id: string | null;
  admin_ed25519: unknown | null;
  origins: Array<{ id: number; origin: string; created_at: string }>;
  smtp: null | {
    id: number;
    host: string;
    port: number;
    username: string;
    from_email: string;
    from_name: string;
    secure: boolean;
    is_active: boolean;
    weight: number;
  };
};

export type AdminConfigInput = {
  issuer: string;
  origin: string;
  smtp: null | {
    host: string;
    port: number;
    username: string;
    password: string;
    from_email: string;
    from_name: string;
    secure: boolean;
    weight: number;
  };
};

type AdminApi = {
  setup: {
    fetch(): Promise<AdminSetupState>;
    initialize(input: {
      admin_ed25519: { name: string; public_key: string };
    }): Promise<AdminSetupState>;
  };
  config: {
    fetch(): Promise<AdminSetupState>;
    save(input: AdminConfigInput): Promise<AdminSetupState>;
  };
  users(): Promise<{ users: Array<Record<string, unknown>> }>;
  databaseUrl(): string;
};

export type DemoSdk = ReturnType<typeof createBrowserSdk> & {
  admin: AdminApi;
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
  serverBaseUrl: string,
  tokens: DemoSessionTokens,
) {
  const receivedAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + tokens.expires_in * 1000,
  ).toISOString();

  storage.setItem(
    browserSdkStorageKey(serverBaseUrl),
    JSON.stringify({
      sessionId: tokens.session_id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      receivedAt,
      expiresAt,
    }),
  );
}

export function createDemoSdk(serverBaseUrl: string): DemoSdk {
  const sdk = createBrowserSdk(serverBaseUrl);

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
    const response = await fetch(new URL(path, serverBaseUrl), {
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

  async function getJson<T>(path: string, accessToken?: string | null) {
    const response = await fetch(new URL(path, serverBaseUrl), {
      headers: {
        accept: 'application/json',
        ...(accessToken ? { authorization: 'Bearer ' + accessToken } : {}),
      },
    });
    const payload = (await response.json()) as T | { error?: string };
    if (!response.ok) {
      throw { status: response.status, ...payload };
    }

    return payload as T;
  }

  async function putJson<T>(
    path: string,
    body: unknown,
    accessToken?: string | null,
  ) {
    const response = await fetch(new URL(path, serverBaseUrl), {
      method: 'PUT',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...(accessToken ? { authorization: 'Bearer ' + accessToken } : {}),
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as T | { error?: string };
    if (!response.ok) {
      throw { status: response.status, ...payload };
    }

    return payload as T;
  }

  return {
    ...sdk,
    admin: {
      setup: {
        fetch() {
          return getJson<AdminSetupState>('/admin/setup');
        },
        initialize(input) {
          return putJson<AdminSetupState>('/admin/setup', input);
        },
      },
      config: {
        async fetch() {
          return getJson<AdminSetupState>(
            '/admin/config',
            await requireAccessToken(),
          );
        },
        async save(input) {
          return putJson<AdminSetupState>(
            '/admin/config',
            input,
            await requireAccessToken(),
          );
        },
      },
      async users() {
        return getJson<{ users: Array<Record<string, unknown>> }>(
          '/admin/users',
          await requireAccessToken(),
        );
      },
      databaseUrl() {
        return new URL('/admin/database', serverBaseUrl).toString();
      },
    },
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
