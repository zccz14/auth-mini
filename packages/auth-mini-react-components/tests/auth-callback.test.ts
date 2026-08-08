import { describe, expect, it } from 'vitest';
import {
  getAuthMiniLoginStateKey,
  getAuthMiniLoginUrl,
  getAuthMiniSecurityUrl,
  readAuthMiniRedirectCallback,
} from '../src/auth-callback.js';

describe('Auth Mini redirect helpers', () => {
  it('builds a hash-router login URL without a production audience override', () => {
    expect(
      getAuthMiniLoginUrl({
        authMiniBaseUrl: 'https://auth.example.test',
        callbackUrl: 'https://app.example.test/auth/callback',
        state: 'state-123',
      }),
    ).toBe(
      'https://auth.example.test/web/#/login?redirect_uri=https%3A%2F%2Fapp.example.test%2Fauth%2Fcallback&state=state-123',
    );
  });

  it('adds an explicit audience to a loopback login URL', () => {
    expect(
      getAuthMiniLoginUrl({
        authMiniBaseUrl: 'https://auth.example.test',
        callbackUrl: 'http://localhost:5173/auth/callback',
        state: 'state-123',
        audience: 'app.example.test',
      }),
    ).toBe(
      'https://auth.example.test/web/#/login?redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback&state=state-123&aud=app.example.test',
    );
  });

  it('preserves a hash-router callback route while removing sensitive tokens', () => {
    const callback = readAuthMiniRedirectCallback(
      'https://app.example.test/#/auth/callback?next=%2Ffunds&access_token=access&token_type=Bearer&session_id=session&refresh_token=refresh&expires_in=900&state=state-123',
    );

    expect(callback).toEqual({
      state: 'state-123',
      tokens: {
        access_token: 'access',
        session_id: 'session',
        refresh_token: 'refresh',
        expires_in: 900,
      },
      cleanUrl: 'https://app.example.test/#/auth/callback?next=%2Ffunds',
    });
  });

  it('removes a plain callback fragment after validating its required fields', () => {
    expect(
      readAuthMiniRedirectCallback(
        'https://app.example.test/auth/callback#access_token=access&token_type=Bearer&session_id=session&refresh_token=refresh&expires_in=900&state=state-123',
      )?.cleanUrl,
    ).toBe('https://app.example.test/auth/callback');
  });

  it('rejects incomplete or malformed callback sessions', () => {
    expect(() =>
      readAuthMiniRedirectCallback(
        'https://app.example.test/callback#access_token=access&token_type=Bearer&session_id=session&refresh_token=refresh&expires_in=0&state=state-123',
      ),
    ).toThrow('Invalid Auth Mini login callback');
  });

  it('uses an origin-normalized state key and the real security route', () => {
    expect(getAuthMiniLoginStateKey('https://auth.example.test/base')).toBe(
      'auth-mini.react.login.state:https://auth.example.test/base/',
    );
    expect(getAuthMiniSecurityUrl('https://auth.example.test')).toBe(
      'https://auth.example.test/web/#/',
    );
  });
});
