import { describe, expect, it, vi } from 'vitest';
import { createAuthMiniForTest, jsonResponse } from '../helpers/sdk.js';

describe('sdk login contract', () => {
  it('email.verify resolves before any explicit /me fetch', async () => {
    const sdk = createAuthMiniForTest({
      fetch: vi.fn().mockResolvedValueOnce(
        jsonResponse({
          session_id: 's1',
          access_token: 'a',
          refresh_token: 'r',
          expires_in: 900,
          token_type: 'Bearer',
        }),
      ),
    });

    const result = await sdk.email.verify({
      email: 'u@example.com',
      code: '123456',
    });

    expect(result).toMatchObject({ sessionId: 's1', accessToken: 'a' });
    expect(result).not.toHaveProperty('me');
    expect(sdk.session.getState()).not.toHaveProperty('me');
    expect(sdk.session.getState().expiresAt).toBe('2026-04-03T00:15:00.000Z');
    expect(sdk.session.getState().sessionId).toBe('s1');
  });

  it('email.verify does not issue an implicit /me request', async () => {
    const fetch = vi
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
      .mockResolvedValueOnce(jsonResponse({ error: 'internal_error' }, 500));
    const sdk = createAuthMiniForTest({
      fetch,
    });

    const result = await sdk.email.verify({
      email: 'u@example.com',
      code: '123456',
    });

    expect(result).toMatchObject({ sessionId: 's1', accessToken: 'a' });
    expect(result).not.toHaveProperty('me');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sdk.session.getState()).toMatchObject({ status: 'authenticated' });
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
