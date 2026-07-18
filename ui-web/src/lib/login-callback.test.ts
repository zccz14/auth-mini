import { describe, expect, it, vi } from 'vitest';
import {
  authenticationTarget,
  buildLoginCallbackUrl,
  issuerAudience,
  parseLoginRequest,
  toDemoSessionTokens,
} from '@/lib/login-callback';

describe('login callback helpers', () => {
  it('treats redirect_uri as optional', () => {
    expect(parseLoginRequest('')).toEqual({
      status: 'ready',
      state: null,
      target: { kind: 'self' },
    });
  });

  it('normalizes issuer hostnames for the self audience', () => {
    expect(issuerAudience('https://AUTH.Example.com.:8443')).toBe(
      'auth.example.com',
    );
    expect(issuerAudience('https://[::1]:8443')).toBe('::1');
  });

  it('derives the audience from a normalized HTTPS redirect hostname', () => {
    const request = parseLoginRequest(
      '?redirect_uri=https%3A%2F%2FAPP.Example.COM%3A443%2Fcallback',
    );

    expect(request).toEqual({
      status: 'ready',
      state: null,
      target: {
        kind: 'redirect',
        audience: 'app.example.com',
        redirectUri: 'https://app.example.com/callback',
      },
    });
    if (request.status === 'ready') {
      expect(authenticationTarget(request)).toEqual({
        redirect_uri: 'https://app.example.com/callback',
      });
    }
  });

  it('normalizes repeated trailing hostname dots like the server', () => {
    expect(
      parseLoginRequest(
        '?redirect_uri=https%3A%2F%2FAPP.Example.com..%2Fcallback',
      ),
    ).toMatchObject({
      status: 'ready',
      target: {
        kind: 'redirect',
        audience: 'app.example.com',
      },
    });
    expect(
      parseLoginRequest(
        '?redirect_uri=http%3A%2F%2FLOCALHOST..%3A5173%2Fcallback&aud=app.example.com',
      ),
    ).toMatchObject({
      status: 'ready',
      target: {
        kind: 'loopback',
        audience: 'app.example.com',
      },
    });
  });

  it('rejects explicit aud without a loopback redirect', () => {
    expect(parseLoginRequest('?aud=app.example.com')).toEqual({
      status: 'invalid',
      error: 'aud requires a loopback redirect_uri.',
    });
    expect(parseLoginRequest('?aud=')).toEqual({
      status: 'invalid',
      error: 'aud requires a loopback redirect_uri.',
    });
    expect(
      parseLoginRequest(
        '?redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback&aud=',
      ),
    ).toEqual({
      status: 'invalid',
      error: 'aud is only allowed with a loopback redirect_uri.',
    });
  });

  it('allows HTTP only for exact loopback hostnames', () => {
    expect(
      parseLoginRequest('?redirect_uri=http%3A%2F%2F0.0.0.0%3A5173%2Fcallback'),
    ).toEqual({
      status: 'invalid',
      error: 'redirect_uri must use https unless it is a loopback address.',
    });
    expect(
      parseLoginRequest(
        '?redirect_uri=http%3A%2F%2Flocalhost.evil.com%3A5173%2Fcallback',
      ),
    ).toEqual({
      status: 'invalid',
      error: 'redirect_uri must use https unless it is a loopback address.',
    });
  });

  it('requires a hostname audience for loopback redirects', () => {
    expect(
      parseLoginRequest(
        '?redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fcallback',
      ),
    ).toEqual({
      status: 'invalid',
      error: 'aud is required for a loopback redirect_uri.',
    });
    expect(
      parseLoginRequest(
        '?redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fcallback&aud=',
      ),
    ).toEqual({
      status: 'invalid',
      error: 'aud must be a valid hostname without a scheme, port, or path.',
    });
    expect(
      parseLoginRequest(
        '?redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fcallback&aud=https%3A%2F%2Fapp.example.com',
      ),
    ).toEqual({
      status: 'invalid',
      error: 'aud must be a valid hostname without a scheme, port, or path.',
    });
    expect(
      parseLoginRequest(
        '?redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fcallback&aud=%20app.example.com',
      ),
    ).toEqual({
      status: 'invalid',
      error: 'aud must be a valid hostname without a scheme, port, or path.',
    });
  });

  it('accepts a bare IPv6 hostname as a loopback audience', () => {
    expect(
      parseLoginRequest(
        '?redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fcallback&aud=%3A%3A1',
      ),
    ).toMatchObject({
      status: 'ready',
      target: {
        kind: 'loopback',
        audience: '::1',
      },
    });
  });

  it.each([
    ['localhost', 'localhost:5173'],
    ['127.0.0.1', '127.0.0.1:5173'],
    ['[::1]', '[::1]:5173'],
  ])('parses the loopback redirect %s', (hostname, displayHost) => {
    const request = parseLoginRequest(
      `?redirect_uri=${encodeURIComponent(`http://${hostname}:5173/callback`)}&aud=APP.NTNL.IO`,
    );

    expect(request).toEqual({
      status: 'ready',
      state: null,
      target: {
        kind: 'loopback',
        audience: 'app.ntnl.io',
        displayHost,
        redirectUri: `http://${displayHost}/callback`,
      },
    });
    if (request.status === 'ready') {
      expect(authenticationTarget(request)).toEqual({
        redirect_uri: `http://${displayHost}/callback`,
        aud: 'app.ntnl.io',
      });
    }
  });

  it('requires redirect_uri to be http or https when provided', () => {
    expect(
      parseLoginRequest('?redirect_uri=auth-mini%3A%2F%2Fcallback'),
    ).toEqual({
      status: 'invalid',
      error: 'redirect_uri must be a valid http or https URL.',
    });
  });

  it('uses document query parameters when hash route search has no redirect_uri', () => {
    expect(
      parseLoginRequest(
        '',
        '?redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback&state=state-1',
      ),
    ).toEqual({
      status: 'ready',
      state: 'state-1',
      target: {
        kind: 'redirect',
        audience: 'app.example.com',
        redirectUri: 'https://app.example.com/callback',
      },
    });
  });

  it('converts browser session results for local demo login', () => {
    expect(
      toDemoSessionTokens({
        sessionId: 'session-1',
        accessToken: 'jwt-1',
        refreshToken: 'refresh-1',
        receivedAt: '2026-06-30T00:00:00.000Z',
        expiresAt: '2026-06-30T01:00:00.000Z',
      }),
    ).toEqual({
      session_id: 'session-1',
      access_token: 'jwt-1',
      refresh_token: 'refresh-1',
      expires_in: 3600,
      token_type: 'Bearer',
    });
  });

  it('builds a callback URL with access token data in the fragment', () => {
    const callbackUrl = buildLoginCallbackUrl({
      redirectUri: 'https://app.example.com/callback?from=login',
      state: 'state-1',
      tokens: {
        sessionId: 'session-1',
        accessToken: 'jwt-1',
        refreshToken: 'refresh-1',
        receivedAt: '2026-06-30T00:00:00.000Z',
        expiresAt: '2026-06-30T01:00:00.000Z',
      },
    });

    expect(callbackUrl).toBe(
      'https://app.example.com/callback?from=login#access_token=jwt-1&token_type=Bearer&session_id=session-1&refresh_token=refresh-1&expires_in=3600&expires_at=2026-06-30T01%3A00%3A00.000Z&state=state-1',
    );
  });

  it('preserves downstream hash-router paths while appending token data', () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      new Date('2026-06-30T00:00:00.000Z').getTime(),
    );

    const callbackUrl = buildLoginCallbackUrl({
      redirectUri: 'https://app.example.com/#/auth/callback?next=%2Fdashboard',
      state: null,
      tokens: {
        session_id: 'session-2',
        access_token: 'jwt-2',
        refresh_token: 'refresh-token',
        expires_in: 900,
        token_type: 'Bearer',
      },
    });

    expect(callbackUrl).toBe(
      'https://app.example.com/#/auth/callback?next=%2Fdashboard&access_token=jwt-2&token_type=Bearer&session_id=session-2&refresh_token=refresh-token&expires_in=900&expires_at=2026-06-30T00%3A15%3A00.000Z',
    );

    vi.mocked(Date.now).mockRestore();
  });
});
