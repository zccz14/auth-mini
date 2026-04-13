import { describe, expect, it, vi } from 'vitest';
import { createDeviceSdk } from '../../src/sdk/device.js';
import {
  countLogoutCalls,
  createDevicePrivateKeySeed,
  jsonResponse,
  readJsonBody,
} from '../helpers/sdk.js';

describe('device module sdk', () => {
  it('preserves base-path prefixes in device sdk bootstrap and session requests', async () => {
    const seenHrefs: string[] = [];
    const fetch = vi.fn(async (input: URL | RequestInfo) => {
      const url = input instanceof URL ? input : new URL(String(input));
      seenHrefs.push(url.href);

      if (url.pathname === '/auth/base/ed25519/start') {
        return jsonResponse({
          request_id: 'request-1',
          challenge: 'challenge-1',
        });
      }

      if (url.pathname === '/auth/base/ed25519/verify') {
        return jsonResponse({
          session_id: 'session-1',
          access_token: 'access-1',
          refresh_token: 'refresh-1',
          expires_in: 900,
        });
      }

      if (url.pathname === '/auth/base/me') {
        return jsonResponse({
          user_id: 'user-1',
          email: 'device@example.com',
          webauthn_credentials: [],
          ed25519_credentials: [],
          active_sessions: [],
        });
      }

      if (url.pathname === '/auth/base/session/refresh') {
        return jsonResponse({
          session_id: 'session-2',
          access_token: 'access-2',
          refresh_token: 'refresh-2',
          expires_in: 900,
        });
      }

      if (url.pathname === '/auth/base/session/logout') {
        return jsonResponse({ ok: true });
      }

      throw new Error(`Unhandled path: ${url.pathname}`);
    });

    const sdk = createDeviceSdk({
      serverBaseUrl: 'https://sdk.example.test:9443/auth/base',
      credentialId: '550e8400-e29b-41d4-a716-446655440000',
      privateKeySeed: createDevicePrivateKeySeed(),
      fetch,
      now: () => Date.parse('2026-04-12T00:00:00.000Z'),
    });

    expect(typeof sdk.me.fetch).toBe('function');
    expect(sdk.me).not.toHaveProperty('get');
    expect(sdk.me).not.toHaveProperty('reload');
    await expect(sdk.ready).resolves.toBeUndefined();
    await expect(sdk.session.refresh()).resolves.toMatchObject({
      sessionId: 'session-2',
      accessToken: 'access-2',
    });
    await expect(sdk.me.fetch()).resolves.toMatchObject({
      email: 'device@example.com',
    });
    await expect(sdk.session.logout()).resolves.toBeUndefined();

    expect(seenHrefs).toEqual([
      'https://sdk.example.test:9443/auth/base/ed25519/start',
      'https://sdk.example.test:9443/auth/base/ed25519/verify',
      'https://sdk.example.test:9443/auth/base/session/refresh',
      'https://sdk.example.test:9443/auth/base/me',
      'https://sdk.example.test:9443/auth/base/session/logout',
    ]);
  });

  it('auto-authenticates on construction before any explicit /me fetch', async () => {
    const fetch = vi.fn(async (input: URL | RequestInfo) => {
      const url = input instanceof URL ? input : new URL(String(input));

      if (url.pathname === '/ed25519/start') {
        return jsonResponse({
          request_id: 'request-1',
          challenge: 'challenge-1',
        });
      }

      if (url.pathname === '/ed25519/verify') {
        return jsonResponse({
          session_id: 'session-1',
          access_token: 'access-1',
          refresh_token: 'refresh-1',
          expires_in: 900,
        });
      }

      throw new Error(`Unhandled path: ${url.pathname}`);
    });

    const sdk = createDeviceSdk({
      serverBaseUrl: 'https://auth.example.com',
      credentialId: '550e8400-e29b-41d4-a716-446655440000',
      privateKeySeed: createDevicePrivateKeySeed(),
      fetch,
      now: () => Date.parse('2026-04-12T00:00:00.000Z'),
    });

    await expect(sdk.ready).resolves.toBeUndefined();
    expect(sdk.session.getState()).toMatchObject({ status: 'authenticated' });
    expect(sdk.session.getState()).not.toHaveProperty('me');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(readJsonBody(fetch, '/ed25519/start')).toEqual({
      credential_id: '550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('throws during construction for invalid base64url seed text', () => {
    expect(() =>
      createDeviceSdk({
        serverBaseUrl: 'https://auth.example.com',
        credentialId: '550e8400-e29b-41d4-a716-446655440000',
        privateKeySeed: 'not/base64url+',
        fetch: vi.fn(),
      }),
    ).toThrowError(
      /sdk_init_failed: privateKeySeed must be a base64url-encoded 32-byte string/,
    );
  });

  it('throws during construction for non-canonical base64url seed text', () => {
    expect(() =>
      createDeviceSdk({
        serverBaseUrl: 'https://auth.example.com',
        credentialId: '550e8400-e29b-41d4-a716-446655440000',
        privateKeySeed: 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQB',
        fetch: vi.fn(),
      }),
    ).toThrowError(
      /sdk_init_failed: privateKeySeed must be a base64url-encoded 32-byte string/,
    );
  });

  it('throws during construction for decoded seeds that are not 32 bytes', () => {
    expect(() =>
      createDeviceSdk({
        serverBaseUrl: 'https://auth.example.com',
        credentialId: '550e8400-e29b-41d4-a716-446655440000',
        privateKeySeed: Buffer.alloc(31, 1).toString('base64url'),
        fetch: vi.fn(),
      }),
    ).toThrowError(
      /sdk_init_failed: privateKeySeed must be a base64url-encoded 32-byte string/,
    );
  });

  it('never touches localStorage while booting a device sdk', async () => {
    const localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal('localStorage', localStorage);

    const sdk = createDeviceSdk({
      serverBaseUrl: 'https://auth.example.com',
      credentialId: '550e8400-e29b-41d4-a716-446655440000',
      privateKeySeed: createDevicePrivateKeySeed(),
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ request_id: 'request-1', challenge: 'challenge-1' }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            session_id: 'session-1',
            access_token: 'access-1',
            refresh_token: 'refresh-1',
            expires_in: 900,
          }),
        ),
    });

    try {
      await sdk.ready;

      expect(localStorage.getItem).not.toHaveBeenCalled();
      expect(localStorage.setItem).not.toHaveBeenCalled();
      expect(localStorage.removeItem).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('dispose is idempotent, clears local state, and blocks session-dependent APIs', async () => {
    const sdk = createDeviceSdk({
      serverBaseUrl: 'https://auth.example.com',
      credentialId: '550e8400-e29b-41d4-a716-446655440000',
      privateKeySeed: createDevicePrivateKeySeed(),
      fetch: vi.fn(async (input: URL | RequestInfo) => {
        const url = input instanceof URL ? input : new URL(String(input));

        if (url.pathname === '/ed25519/start') {
          return jsonResponse({
            request_id: 'request-1',
            challenge: 'challenge-1',
          });
        }

        if (url.pathname === '/ed25519/verify') {
          return jsonResponse({
            session_id: 'session-1',
            access_token: 'access-1',
            refresh_token: 'refresh-1',
            expires_in: 900,
          });
        }

        if (url.pathname === '/me') {
          return jsonResponse({
            user_id: 'user-1',
            email: 'device@example.com',
            webauthn_credentials: [],
            ed25519_credentials: [],
            active_sessions: [],
          });
        }

        if (url.pathname === '/session/logout') {
          return jsonResponse({ ok: true });
        }

        throw new Error(`Unhandled path: ${url.pathname}`);
      }),
    });

    await sdk.ready;

    expect('dispose' in sdk).toBe(true);
    expect(Symbol.asyncDispose in sdk).toBe(true);

    await sdk.dispose();
    await sdk.dispose();

    await expect(sdk.me.fetch()).rejects.toMatchObject({
      code: 'disposed_session',
    });
    await expect(sdk.session.refresh()).rejects.toMatchObject({
      code: 'disposed_session',
    });
    await expect(sdk.session.logout()).rejects.toMatchObject({
      code: 'disposed_session',
    });
    expect(sdk.session.getState()).toMatchObject({
      status: 'anonymous',
      authenticated: false,
      sessionId: null,
      accessToken: null,
      refreshToken: null,
    });
  });

  it('async dispose keeps pending auth completion from reviving the instance', async () => {
    let resolveVerify!: (value: Response) => void;
    const verifyGate = new Promise<Response>((resolve) => {
      resolveVerify = resolve;
    });

    const fetch = vi.fn(async (input: URL | RequestInfo) => {
      const url = input instanceof URL ? input : new URL(String(input));

      if (url.pathname === '/ed25519/start') {
        return jsonResponse({
          request_id: 'request-1',
          challenge: 'challenge-1',
        });
      }

      if (url.pathname === '/ed25519/verify') {
        return verifyGate;
      }

      if (url.pathname === '/session/logout') {
        return jsonResponse({ ok: true });
      }

      throw new Error(`Unhandled path: ${url.pathname}`);
    });

    const sdk = createDeviceSdk({
      serverBaseUrl: 'https://auth.example.com',
      credentialId: '550e8400-e29b-41d4-a716-446655440000',
      privateKeySeed: createDevicePrivateKeySeed(),
      fetch,
      now: () => Date.parse('2026-04-12T00:30:00.000Z'),
    });

    await sdk[Symbol.asyncDispose]();

    resolveVerify(
      jsonResponse({
        session_id: 'session-1',
        access_token: 'access-1',
        refresh_token: 'refresh-1',
        expires_in: 900,
      }),
    );

    await expect(sdk.ready).resolves.toBeUndefined();
    expect(sdk.session.getState()).toMatchObject({
      status: 'anonymous',
      authenticated: false,
      sessionId: null,
      accessToken: null,
      refreshToken: null,
    });
  });

  it('dispose logs out sessions created after disposal starts during verify', async () => {
    let resolveVerify!: (value: Response) => void;
    const verifyGate = new Promise<Response>((resolve) => {
      resolveVerify = resolve;
    });

    const fetch = vi.fn(
      async (input: URL | RequestInfo, init?: RequestInit) => {
        const url = input instanceof URL ? input : new URL(String(input));

        if (url.pathname === '/ed25519/start') {
          return jsonResponse({
            request_id: 'request-1',
            challenge: 'challenge-1',
          });
        }

        if (url.pathname === '/ed25519/verify') {
          return verifyGate;
        }

        if (url.pathname === '/session/logout') {
          return jsonResponse({ ok: true });
        }

        if (url.pathname === '/me') {
          throw new Error(
            `Unexpected path after dispose: ${url.pathname} ${JSON.stringify(init ?? {})}`,
          );
        }

        throw new Error(`Unhandled path: ${url.pathname}`);
      },
    );

    const sdk = createDeviceSdk({
      serverBaseUrl: 'https://auth.example.com',
      credentialId: '550e8400-e29b-41d4-a716-446655440000',
      privateKeySeed: createDevicePrivateKeySeed(),
      fetch,
    });

    await sdk.dispose();

    resolveVerify(
      jsonResponse({
        session_id: 'session-1',
        access_token: 'access-1',
        refresh_token: 'refresh-1',
        expires_in: 900,
      }),
    );

    await expect(sdk.ready).resolves.toBeUndefined();

    expect(countLogoutCalls(fetch)).toBe(1);
    const logoutCall = fetch.mock.calls.find(([input]) => {
      const url = input instanceof URL ? input : new URL(String(input));
      return url.pathname === '/session/logout';
    });

    expect(logoutCall?.[1]).toMatchObject({
      headers: expect.objectContaining({
        authorization: 'Bearer access-1',
      }),
    });
    expect(sdk.session.getState()).toMatchObject({
      status: 'anonymous',
      authenticated: false,
      sessionId: null,
      accessToken: null,
      refreshToken: null,
    });
  });
});
