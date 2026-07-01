import { describe, expect, it, vi } from 'vitest';
import { buildLoginCallbackUrl, parseLoginRequest } from '@/lib/login-callback';

describe('login callback helpers', () => {
  it('requires an http or https redirect_uri', () => {
    expect(parseLoginRequest('')).toEqual({
      status: 'invalid',
      error: 'redirect_uri is required.',
    });
    expect(
      parseLoginRequest('?redirect_uri=auth-mini%3A%2F%2Fcallback'),
    ).toEqual({
      status: 'invalid',
      error: 'redirect_uri must be a valid http or https URL.',
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
