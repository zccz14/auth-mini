import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAuthMiniInternal } from '../../src/sdk/singleton-entry.js';
import type { NavigatorCredentialsLike } from '../../src/sdk/types.js';
import {
  cancelledNavigatorCredentials,
  countRefreshCalls,
  createWebauthnRequestRecorder,
  fakeAuthenticatedStorage,
  fakeNavigatorCredentials,
  fakeStorage,
  jsonResponse,
  readJsonBody,
} from '../helpers/sdk.js';

const originalLocation = globalThis.location;

function createWebauthnSdkForTest(
  options: {
    fetch?: typeof globalThis.fetch;
    now?: () => number;
    navigatorCredentials?: NavigatorCredentialsLike;
    publicKeyCredential?: unknown;
    storage?: Storage;
  } = {},
) {
  return createAuthMiniInternal({
    baseUrl: 'https://auth.example.com',
    fetch: options.fetch ?? (async () => jsonResponse({ ok: true })),
    now: options.now ?? (() => Date.parse('2026-04-03T00:00:00.000Z')),
    navigatorCredentials:
      options.navigatorCredentials ?? fakeNavigatorCredentials(),
    publicKeyCredential:
      'publicKeyCredential' in options
        ? options.publicKeyCredential
        : function PublicKeyCredential() {},
    storage: options.storage ?? fakeStorage(),
  });
}

describe('sdk webauthn flows', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults passkey authenticate rp_id to the current page hostname', async () => {
    vi.stubGlobal('location', new URL('https://app.example.com/account'));
    const fetch = createWebauthnRequestRecorder();
    const sdk = createWebauthnSdkForTest({
      fetch,
      navigatorCredentials: fakeNavigatorCredentials(),
    });

    await sdk.passkey.authenticate();

    expect(readJsonBody(fetch, '/webauthn/authenticate/options')).toEqual({
      rp_id: 'app.example.com',
    });
  });

  it('restores the original global location after each test', () => {
    expect(globalThis.location).toBe(originalLocation);
  });

  it('passes explicit rpId override through the passkey authenticate options call', async () => {
    const fetch = createWebauthnRequestRecorder();
    const sdk = createWebauthnSdkForTest({
      fetch,
      navigatorCredentials: fakeNavigatorCredentials(),
    });

    await sdk.passkey.authenticate({ rpId: 'example.com' });

    expect(readJsonBody(fetch, '/webauthn/authenticate/options')).toEqual({
      rp_id: 'example.com',
    });
  });

  it('defaults passkey register rp_id to the current page hostname', async () => {
    vi.stubGlobal('location', new URL('https://app.example.com/settings'));
    const fetch = createWebauthnRequestRecorder();
    const sdk = createWebauthnSdkForTest({
      fetch,
      storage: fakeAuthenticatedStorage(),
      navigatorCredentials: fakeNavigatorCredentials(),
    });

    await sdk.passkey.register();

    expect(readJsonBody(fetch, '/webauthn/register/options')).toEqual({
      rp_id: 'app.example.com',
    });
  });

  it('passes explicit rpId override through the passkey register options call', async () => {
    const fetch = createWebauthnRequestRecorder();
    const sdk = createWebauthnSdkForTest({
      fetch,
      storage: fakeAuthenticatedStorage(),
      navigatorCredentials: fakeNavigatorCredentials(),
    });

    await sdk.passkey.register({ rpId: 'example.com' });

    expect(readJsonBody(fetch, '/webauthn/register/options')).toEqual({
      rp_id: 'example.com',
    });
  });

  it('throws webauthn_unsupported when browser webauthn apis are unavailable', async () => {
    const sdk = createWebauthnSdkForTest({
      storage: fakeAuthenticatedStorage(),
      publicKeyCredential: undefined,
    });

    await expect(sdk.webauthn.authenticate()).rejects.toMatchObject({
      code: 'webauthn_unsupported',
    });
  });

  it('throws webauthn_cancelled when the user cancels passkey auth', async () => {
    const sdk = createWebauthnSdkForTest({
      fetch: createWebauthnRequestRecorder(),
      navigatorCredentials: cancelledNavigatorCredentials(),
    });

    await expect(sdk.webauthn.authenticate()).rejects.toMatchObject({
      code: 'webauthn_cancelled',
    });
  });

  it('authenticates and leaves /me to an explicit fetch', async () => {
    const fetch = createWebauthnRequestRecorder();
    const sdk = createWebauthnSdkForTest({
      fetch,
      navigatorCredentials: fakeNavigatorCredentials(),
    });

    const result = await sdk.webauthn.authenticate();

    expect(result.accessToken).toBe('access-authenticated');
    expect(result).not.toHaveProperty('me');
    expect(sdk.session.getState()).not.toHaveProperty('me');
    expect(sdk.session.getState().status).toBe('authenticated');
    expect(readJsonBody(fetch, '/webauthn/authenticate/verify')).toEqual({
      request_id: 'request-authenticate',
      credential: {
        id: 'authenticate-credential',
        rawId: 'FRYXGA',
        type: 'public-key',
        response: {
          clientDataJSON: 'GRobHA',
          authenticatorData: 'HR4fIA',
          signature: 'ISIjJA',
          userHandle: 'JSYnKA',
        },
      },
    });
  });

  it('does not roll back auth state for an unused trailing /me failure', async () => {
    const fetch = createWebauthnRequestRecorder()
      .mockImplementationOnce(async () =>
        jsonResponse({
          request_id: 'request-authenticate',
          publicKey: {
            challenge: 'AQIDBA',
            rpId: 'auth.example.com',
          },
        }),
      )
      .mockImplementationOnce(async () =>
        jsonResponse({
          session_id: 'session-authenticated',
          access_token: 'access-authenticated',
          refresh_token: 'refresh-authenticated',
          expires_in: 900,
          token_type: 'Bearer',
        }),
      )
      .mockImplementationOnce(async () =>
        jsonResponse({ error: 'internal_error' }, 500),
      );
    const sdk = createWebauthnSdkForTest({
      fetch,
      navigatorCredentials: fakeNavigatorCredentials(),
    });

    const result = await sdk.webauthn.authenticate();

    expect(result).toMatchObject({
      accessToken: 'access-authenticated',
    });
    expect(result).not.toHaveProperty('me');
    expect(sdk.session.getState()).toMatchObject({ status: 'authenticated' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('requires an authenticated session before passkey registration', async () => {
    const sdk = createWebauthnSdkForTest({
      storage: fakeAuthenticatedStorage({
        sessionId: null,
        accessToken: null,
        refreshToken: null,
        receivedAt: null,
        expiresAt: null,
      }),
    });

    await expect(sdk.webauthn.register()).rejects.toMatchObject({
      code: 'missing_session',
    });
  });

  it('register throws webauthn_unsupported when browser apis are unavailable', async () => {
    const sdk = createWebauthnSdkForTest({
      storage: fakeAuthenticatedStorage(),
      publicKeyCredential: undefined,
    });

    await expect(sdk.webauthn.register()).rejects.toMatchObject({
      code: 'webauthn_unsupported',
    });
  });

  it('registers a passkey and serializes the browser credential', async () => {
    const fetch = createWebauthnRequestRecorder();
    const sdk = createWebauthnSdkForTest({
      fetch,
      storage: fakeAuthenticatedStorage(),
      navigatorCredentials: fakeNavigatorCredentials(),
    });

    const result = await sdk.webauthn.register();

    expect(result).toEqual({ ok: true });
    expect(readJsonBody(fetch, '/webauthn/register/verify')).toEqual({
      request_id: 'request-register',
      credential: {
        id: 'register-credential',
        rawId: 'AQIDBA',
        type: 'public-key',
        clientExtensionResults: {
          credProps: {
            rk: true,
          },
        },
        response: {
          clientDataJSON: 'BQYHCA',
          attestationObject: 'CQoLDA',
          transports: ['internal'],
        },
      },
    });
  });

  it('refreshes again before register verify when the passkey prompt takes too long', async () => {
    let currentTime = Date.parse('2026-04-03T00:09:00.000Z');
    const fetch = vi.fn(async (input: unknown, init?: RequestInit) => {
      const path =
        input instanceof URL ? input.pathname : new URL(String(input)).pathname;

      if (path === '/webauthn/register/options') {
        return jsonResponse({
          request_id: 'request-register',
          publicKey: {
            challenge: 'CQoLDA',
            rp: { id: 'auth.example.com', name: 'auth-mini' },
            user: {
              id: 'DQ4PEA',
              name: 'u@example.com',
              displayName: 'u@example.com',
            },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
            timeout: 300000,
          },
        });
      }

      if (path === '/session/refresh') {
        return jsonResponse({
          session_id: 'session-refreshed',
          access_token: 'refreshed-access',
          refresh_token: 'refreshed-refresh',
          expires_in: 900,
          token_type: 'Bearer',
        });
      }

      if (path === '/me') {
        return jsonResponse({
          user_id: 'u1',
          email: 'u@example.com',
          ed25519_credentials: [],
          webauthn_credentials: [],
          active_sessions: [],
        });
      }

      if (path === '/webauthn/register/verify') {
        return jsonResponse({ ok: true });
      }

      throw new Error(
        `Unhandled fetch path: ${path} ${JSON.stringify(init ?? {})}`,
      );
    });
    const sdk = createWebauthnSdkForTest({
      fetch,
      now: () => currentTime,
      navigatorCredentials: {
        async create(options?: CredentialCreationOptions) {
          currentTime = Date.parse('2026-04-03T00:11:00.000Z');
          return fakeNavigatorCredentials().create(options);
        },
      },
      storage: fakeAuthenticatedStorage({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        receivedAt: '2026-04-03T00:00:00.000Z',
        expiresAt: '2026-04-03T00:15:00.000Z',
      }),
    });

    await sdk.webauthn.register();

    expect(countRefreshCalls(fetch)).toBe(1);
    expect(
      fetch.mock.calls.some(([input]) => {
        const path =
          input instanceof URL
            ? input.pathname
            : new URL(String(input)).pathname;
        return path === '/me';
      }),
    ).toBe(false);
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        authorization: 'Bearer access-token',
      }),
    });
    expect(fetch.mock.calls.at(-1)?.[1]).toMatchObject({
      headers: expect.objectContaining({
        authorization: 'Bearer refreshed-access',
      }),
    });
  });
});
