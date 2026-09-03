import { createBrowserSdk } from 'auth-mini/sdk/browser';
import type { MeResponse } from 'auth-mini/sdk/api';

type DemoEd25519Api = {
  register(input: { name: string; public_key: string }): Promise<unknown>;
  start(input: { public_key: string }): Promise<{
    request_id: string;
    challenge: string;
  }>;
  verify(input: {
    request_id: string;
    signature: string;
    redirect_uri?: string;
    aud?: string;
  }): Promise<DemoSessionTokens>;
};

export type AdminSetupState = {
  issuer: string;
  rp_id: string;
  brand_name: string;
  brand_background_image: string;
  admin_user_id: string | null;
  admin_ed25519: unknown | null;
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
  rp_id: string;
  brand_name: string;
  brand_background_image: string;
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

export type AdminJwkSlot = {
  slot: 'CURRENT' | 'STANDBY';
  public_jwk: Record<string, unknown>;
};

export type AdminJwksResponse = {
  keys: AdminJwkSlot[];
};

export type AdminSystemResourcesSnapshot = {
  sampled_at: number;
  sample_interval_ms: number;
  cpu: { usage_percent: number; load_1m: number; logical_cpus: number };
  memory: {
    used_bytes: number;
    total_bytes: number;
    available_bytes: number;
    process_used_bytes: number;
    other_used_bytes: number;
    usage_percent: number;
    swap_used_bytes: number;
    swap_total_bytes: number;
  };
  network: {
    receive_bytes_per_second: number;
    transmit_bytes_per_second: number;
    interfaces: number;
  };
  disk: null | {
    mount_point: string;
    used_bytes: number;
    total_bytes: number;
    available_bytes: number;
    usage_percent: number;
  };
  sqlite: {
    main_bytes: number;
    wal_bytes: number;
    shm_bytes: number;
    total_bytes: number;
    freelist_bytes: number;
    freelist_percent: number;
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
  jwks: {
    list(): Promise<AdminJwksResponse>;
    rotate(): Promise<AdminJwksResponse>;
  };
  resources: {
    fetch(): Promise<AdminSystemResourcesSnapshot>;
  };
  users(): Promise<{ users: Array<Record<string, unknown>> }>;
  databaseUrl(): string;
};

export type DemoCurrentUser = MeResponse;

export type RemoteLoginStart = {
  request_id: string;
  exchange_code: string;
  confirmation_code: string;
  expires_at: string;
};

export type RemoteLoginRequest = {
  request_id: string;
  audiences: string[];
  expires_at: string;
};

type RemoteLoginApi = {
  start(input: {
    redirect_uri?: string;
    aud?: string;
    audiences?: string[];
  }): Promise<RemoteLoginStart>;
  exchange(input: {
    request_id: string;
    exchange_code: string;
  }): Promise<DemoSessionTokens>;
  pending(): Promise<{ requests: RemoteLoginRequest[] }>;
  claim(input: { confirmation_code: string }): Promise<RemoteLoginRequest>;
  approve(requestId: string): Promise<{ ok: true }>;
  deny(requestId: string): Promise<{ ok: true }>;
};

type CurrentUserApi = {
  fetch(): Promise<DemoCurrentUser>;
  email: {
    startChange(input: { email: string }): Promise<{ ok: true }>;
    verifyChange(input: { email: string; code: string }): Promise<{ ok: true }>;
  };
};

export type DemoSdk = ReturnType<typeof createBrowserSdk> & {
  admin: AdminApi;
  currentUser: CurrentUserApi;
  remoteLogin: RemoteLoginApi;
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
      jwks: {
        async list() {
          return getJson<AdminJwksResponse>(
            '/admin/jwks',
            await requireAccessToken(),
          );
        },
        async rotate() {
          return postJson<AdminJwksResponse>(
            '/admin/jwks/rotate',
            {},
            await requireAccessToken(),
          );
        },
      },
      resources: {
        async fetch() {
          return getJson<AdminSystemResourcesSnapshot>(
            '/admin/resources',
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
    currentUser: {
      async fetch() {
        const accessToken = await requireAccessToken();

        try {
          return await getJson<DemoCurrentUser>('/me', accessToken);
        } catch (error) {
          if (
            !isRetryableAuthError(error) ||
            !sdk.session.getState().refreshToken
          ) {
            throw error;
          }

          return await getJson<DemoCurrentUser>(
            '/me',
            await requireAccessToken(true),
          );
        }
      },
      email: {
        async startChange(input) {
          try {
            return await postJson<{ ok: true }>(
              '/me/email/start',
              input,
              await requireAccessToken(),
            );
          } catch (error) {
            if (
              !isRetryableAuthError(error) ||
              !sdk.session.getState().refreshToken
            ) {
              throw error;
            }

            return await postJson<{ ok: true }>(
              '/me/email/start',
              input,
              await requireAccessToken(true),
            );
          }
        },
        async verifyChange(input) {
          try {
            return await postJson<{ ok: true }>(
              '/me/email/verify',
              input,
              await requireAccessToken(),
            );
          } catch (error) {
            if (
              !isRetryableAuthError(error) ||
              !sdk.session.getState().refreshToken
            ) {
              throw error;
            }

            return await postJson<{ ok: true }>(
              '/me/email/verify',
              input,
              await requireAccessToken(true),
            );
          }
        },
      },
    },
    remoteLogin: {
      start(input) {
        return postJson<RemoteLoginStart>('/remote-login/start', input);
      },
      exchange(input) {
        return postJson<DemoSessionTokens>(
          `/remote-login/${input.request_id}/exchange`,
          input,
        );
      },
      async pending() {
        return getJson<{ requests: RemoteLoginRequest[] }>(
          '/remote-login/pending',
          await requireAccessToken(),
        );
      },
      async claim(input) {
        return postJson<RemoteLoginRequest>(
          '/remote-login/claim',
          input,
          await requireAccessToken(),
        );
      },
      async approve(requestId) {
        return postJson<{ ok: true }>(
          `/remote-login/${requestId}/approve`,
          {},
          await requireAccessToken(),
        );
      },
      async deny(requestId) {
        return postJson<{ ok: true }>(
          `/remote-login/${requestId}/deny`,
          {},
          await requireAccessToken(),
        );
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
      start(input: { public_key: string }) {
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
