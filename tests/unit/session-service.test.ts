import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashValue } from '../../src/shared/crypto.js';

const getSessionById = vi.fn();
const rotateRefreshToken = vi.fn();
const signJwt = vi.fn();

vi.mock('../../src/modules/session/repo.js', () => ({
  createSession: vi.fn(),
  expireSessionById: vi.fn(),
  getSessionById,
  rotateRefreshToken,
}));

vi.mock('../../src/modules/jwks/service.js', () => ({
  signJwt,
}));

describe('session service', () => {
  beforeEach(() => {
    vi.resetModules();
    getSessionById.mockReset();
    rotateRefreshToken.mockReset();
    signJwt.mockReset();
  });

  it('retries when a failed concurrent rotation rolls the submitted token back', async () => {
    const { refreshSessionTokens } =
      await import('../../src/modules/session/service.js');
    const currentSession = {
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: hashValue('refresh-token'),
      authMethod: 'email_otp' as const,
      expiresAt: '2099-01-01T00:00:00.000Z',
      createdAt: '2026-04-10T00:00:00.000Z',
    };
    const rotatedSession = {
      ...currentSession,
      refreshTokenHash: hashValue('replacement-refresh-token'),
    };

    getSessionById
      .mockReturnValueOnce(currentSession)
      .mockReturnValueOnce(currentSession);
    rotateRefreshToken
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(rotatedSession);
    signJwt.mockResolvedValue('access-token');

    const result = await refreshSessionTokens({} as never, {
      sessionId: currentSession.id,
      refreshToken: 'refresh-token',
      issuer: 'https://issuer.example',
    });

    expect(result).toMatchObject({
      session_id: currentSession.id,
      access_token: 'access-token',
      refresh_token: expect.any(String),
    });
    expect(result.refresh_token).not.toBe('refresh-token');
    expect(getSessionById).toHaveBeenCalledTimes(2);
    expect(rotateRefreshToken).toHaveBeenCalledTimes(2);
    expect(signJwt).toHaveBeenCalledTimes(1);
  });
});
