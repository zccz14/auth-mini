import { describe, expect, it, vi } from 'vitest';
import { createDeviceSdk } from '../../src/sdk/device.js';
import {
  createDevicePrivateKey,
  jsonResponse,
  readJsonBody,
} from '../helpers/sdk.js';

describe('device module sdk', () => {
  it('auto-authenticates on construction and resolves ready after /me', async () => {
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

      if (url.pathname === '/me') {
        return jsonResponse({
          user_id: 'user-1',
          email: 'device@example.com',
          webauthn_credentials: [],
          ed25519_credentials: [],
          active_sessions: [],
        });
      }

      throw new Error(`Unhandled path: ${url.pathname}`);
    });

    const sdk = createDeviceSdk({
      serverBaseUrl: 'https://auth.example.com',
      credentialId: '550e8400-e29b-41d4-a716-446655440000',
      privateKey: createDevicePrivateKey(),
      fetch,
      now: () => Date.parse('2026-04-12T00:00:00.000Z'),
    });

    await expect(sdk.ready).resolves.toBeUndefined();
    expect(sdk.session.getState()).toMatchObject({ status: 'authenticated' });
    expect(sdk.me.get()).toMatchObject({ email: 'device@example.com' });
    expect(readJsonBody(fetch, '/ed25519/start')).toEqual({
      credential_id: '550e8400-e29b-41d4-a716-446655440000',
    });
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
      privateKey: createDevicePrivateKey(),
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
        )
        .mockResolvedValueOnce(
          jsonResponse({
            user_id: 'user-1',
            email: 'device@example.com',
            webauthn_credentials: [],
            ed25519_credentials: [],
            active_sessions: [],
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

  it('does not expose disposal APIs in the task 2 device sdk surface', async () => {
    const sdk = createDeviceSdk({
      serverBaseUrl: 'https://auth.example.com',
      credentialId: '550e8400-e29b-41d4-a716-446655440000',
      privateKey: createDevicePrivateKey(),
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
        )
        .mockResolvedValueOnce(
          jsonResponse({
            user_id: 'user-1',
            email: 'device@example.com',
            webauthn_credentials: [],
            ed25519_credentials: [],
            active_sessions: [],
          }),
        ),
    });

    await sdk.ready;

    expect('dispose' in sdk).toBe(false);
    expect(Symbol.asyncDispose in sdk).toBe(false);
  });
});
