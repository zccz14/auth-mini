import { describe, expect, it, vi } from 'vitest';
import { createAuthMiniForTest, jsonResponse } from '../helpers/sdk.js';

describe('sdk login contract', () => {
  it('email.verify resolves only after /me is loaded', async () => {
    const sdk = createAuthMiniForTest({
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            session_id: 's1',
            access_token: 'a',
            refresh_token: 'r',
            expires_in: 900,
            token_type: 'Bearer',
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            user_id: 'u1',
            email: 'u@example.com',
            webauthn_credentials: [],
            active_sessions: [],
          }),
        ),
    });

    const result = await sdk.email.verify({
      email: 'u@example.com',
      code: '123456',
    });

    expect(result.me.email).toBe('u@example.com');
    expect(sdk.me.get()?.email).toBe('u@example.com');
    expect(sdk.session.getState().expiresAt).toBe('2026-04-03T00:15:00.000Z');
    expect(sdk.session.getState().sessionId).toBe('s1');
  });

  it('email.verify rolls back auth state when /me fails', async () => {
    const sdk = createAuthMiniForTest({
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            session_id: 's1',
            access_token: 'a',
            refresh_token: 'r',
            expires_in: 900,
            token_type: 'Bearer',
          }),
        )
        .mockResolvedValueOnce(jsonResponse({ error: 'internal_error' }, 500)),
    });

    await expect(
      sdk.email.verify({ email: 'u@example.com', code: '123456' }),
    ).rejects.toMatchObject({ error: 'internal_error' });
    expect(sdk.session.getState().status).toBe('anonymous');
  });

  it('preserves server error payloads from failed json responses', async () => {
    const sdk = createAuthMiniForTest({
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ error: 'invalid_email_otp' }, 401),
        ),
    });

    await expect(
      sdk.email.verify({ email: 'u@example.com', code: '000000' }),
    ).rejects.toMatchObject({ error: 'invalid_email_otp' });
  });
});
