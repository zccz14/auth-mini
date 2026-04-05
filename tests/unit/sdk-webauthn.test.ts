import { describe, expect, it, vi } from 'vitest';
import {
  cancelledNavigatorCredentials,
  countRefreshCalls,
  createMiniAuthForTest,
  createWebauthnRequestRecorder,
  fakeAuthenticatedStorageWithMe,
  fakeNavigatorCredentials,
  jsonResponse,
  readJsonBody,
} from '../helpers/sdk.js';

describe('sdk webauthn flows', () => {
  it('passes optional rpId through the passkey authenticate options call', async () => {
    const fetch = createWebauthnRequestRecorder();
    const sdk = createMiniAuthForTest({
      fetch,
      navigatorCredentials: fakeNavigatorCredentials(),
    });

    await sdk.passkey.authenticate({ rpId: 'example.com' });

    expect(readJsonBody(fetch, '/webauthn/authenticate/options')).toEqual({
      rp_id: 'example.com',
    });
  });

  it('passes optional rpId through the passkey register options call', async () => {
    const fetch = createWebauthnRequestRecorder();
    const sdk = createMiniAuthForTest({
      fetch,
      storage: fakeAuthenticatedStorageWithMe(),
      navigatorCredentials: fakeNavigatorCredentials(),
    });

    await sdk.passkey.register({ rpId: 'example.com' });

    expect(readJsonBody(fetch, '/webauthn/register/options')).toEqual({
      rp_id: 'example.com',
    });
  });

  it('throws webauthn_unsupported when browser webauthn apis are unavailable', async () => {
    const sdk = createMiniAuthForTest({
      publicKeyCredential: undefined,
    });

    await expect(sdk.webauthn.authenticate()).rejects.toMatchObject({
      code: 'webauthn_unsupported',
    });
  });

  it('throws webauthn_cancelled when the user cancels passkey auth', async () => {
    const sdk = createMiniAuthForTest({
      fetch: createWebauthnRequestRecorder(),
      navigatorCredentials: cancelledNavigatorCredentials(),
    });

    await expect(sdk.webauthn.authenticate()).rejects.toMatchObject({
      code: 'webauthn_cancelled',
    });
  });

  it('authenticates, stores session, and makes me available synchronously', async () => {
    const fetch = createWebauthnRequestRecorder();
    const sdk = createMiniAuthForTest({
      fetch,
      navigatorCredentials: fakeNavigatorCredentials(),
    });

    const result = await sdk.webauthn.authenticate();

    expect(result.accessToken).toBe('access-authenticated');
    expect(sdk.me.get()?.email).toBe('u@example.com');
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

  it('rolls back local auth state when post-auth me loading fails', async () => {
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
          access_token: 'access-authenticated',
          refresh_token: 'refresh-authenticated',
          expires_in: 900,
          token_type: 'Bearer',
        }),
      )
      .mockImplementationOnce(async () =>
        jsonResponse({ error: 'internal_error' }, 500),
      );
    const sdk = createMiniAuthForTest({
      fetch,
      navigatorCredentials: fakeNavigatorCredentials(),
    });

    await expect(sdk.webauthn.authenticate()).rejects.toMatchObject({
      error: 'internal_error',
    });
    expect(sdk.session.getState().status).toBe('anonymous');
    expect(sdk.me.get()).toBeNull();
  });

  it('requires an authenticated session before passkey registration', async () => {
    const sdk = createMiniAuthForTest();

    await expect(sdk.webauthn.register()).rejects.toMatchObject({
      code: 'missing_session',
    });
  });

  it('register throws webauthn_unsupported when browser apis are unavailable', async () => {
    const sdk = createMiniAuthForTest({
      storage: fakeAuthenticatedStorageWithMe(),
      publicKeyCredential: undefined,
    });

    await expect(sdk.webauthn.register()).rejects.toMatchObject({
      code: 'webauthn_unsupported',
    });
  });

  it('registers a passkey and serializes the browser credential', async () => {
    const fetch = createWebauthnRequestRecorder();
    const sdk = createMiniAuthForTest({
      fetch,
      storage: fakeAuthenticatedStorageWithMe(),
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
    const sdk = createMiniAuthForTest({
      fetch,
      now: () => currentTime,
      navigatorCredentials: {
        async create(options?: CredentialCreationOptions) {
          currentTime = Date.parse('2026-04-03T00:11:00.000Z');
          return fakeNavigatorCredentials().create(options);
        },
      },
      storage: fakeAuthenticatedStorageWithMe(undefined, {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        receivedAt: '2026-04-03T00:00:00.000Z',
        expiresAt: '2026-04-03T00:15:00.000Z',
      }),
    });

    await sdk.webauthn.register();

    expect(countRefreshCalls(fetch)).toBe(1);
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
