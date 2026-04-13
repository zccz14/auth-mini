import { describe, expect, it, vi } from 'vitest';
import { createApiSdk } from '../../src/sdk/api.js';
import { jsonResponse } from '../helpers/sdk.js';

describe('api sdk wrapper', () => {
  it('requires a runtime baseUrl', () => {
    expect(() => createApiSdk({} as never)).toThrow(
      'sdk_init_failed: Missing API base URL',
    );
  });

  it('binds generated calls to the configured baseUrl', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (...args) => {
      void args;
      return jsonResponse({ keys: [] });
    });
    const sdk = createApiSdk({
      baseUrl: 'https://sdk.example.test:9443/auth/base',
      fetch,
    });

    const response = await sdk.jwks.list();

    expect(response).toMatchObject({ data: { keys: [] } });
    expect(fetch).toHaveBeenCalledTimes(1);

    const firstCall = fetch.mock.calls[0];

    expect(firstCall).toBeDefined();
    if (!firstCall) {
      throw new Error('expected fetch to be called');
    }

    const [requestUrl, requestInit] = firstCall;
    const normalizedRequestUrl =
      requestUrl instanceof Request
        ? new URL(requestUrl.url)
        : requestUrl instanceof URL
          ? requestUrl
          : new URL(String(requestUrl));

    expect(normalizedRequestUrl.href).toBe(
      'https://sdk.example.test:9443/auth/base/jwks',
    );
    expect(
      requestUrl instanceof Request ? requestUrl.method : requestInit?.method,
    ).toBe('GET');
  });

  it('propagates auth through generated secured requests', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (...args) => {
      void args;
      return jsonResponse({
        active_sessions: [],
        ed25519_credentials: [],
        email: 'user@example.com',
        user_id: 'user-1',
        webauthn_credentials: [],
      });
    });
    const sdk = createApiSdk({
      auth: () => 'access-token',
      baseUrl: 'https://sdk.example.test:9443/auth/base',
      fetch,
    });

    await sdk.me.get();

    const firstCall = fetch.mock.calls[0];

    expect(firstCall).toBeDefined();
    if (!firstCall) {
      throw new Error('expected fetch to be called');
    }

    const [requestUrl, requestInit] = firstCall;
    const authorizationHeader =
      requestUrl instanceof Request
        ? requestUrl.headers.get('authorization')
        : new Headers(requestInit?.headers).get('authorization');

    expect(authorizationHeader).toBe('Bearer access-token');
  });
});
