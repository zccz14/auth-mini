import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashValue } from '../../src/shared/crypto.js';

const getSessionById = vi.fn();
const rotateRefreshToken = vi.fn();
const signJwt = vi.fn();
const expireOtherActiveSessionById = vi.fn();

vi.mock('../../src/modules/session/repo.js', () => ({
  createSession: vi.fn(),
  expireSessionById: vi.fn(),
  expireOtherActiveSessionById,
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
    expireOtherActiveSessionById.mockReset();
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

  it('expires a same-user peer session and logs success', async () => {
    const { logoutPeerSession } =
      await import('../../src/modules/session/service.js');
    const logger = { info: vi.fn() };

    expireOtherActiveSessionById.mockReturnValueOnce(true);

    expect(
      logoutPeerSession({} as never, {
        currentSessionId: 'session-current',
        targetSessionId: 'session-peer',
        userId: 'user-1',
        logger: logger as never,
      }),
    ).toEqual({ ok: true });

    expect(expireOtherActiveSessionById).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        currentSessionId: 'session-current',
        targetSessionId: 'session-peer',
        userId: 'user-1',
        now: expect.any(String),
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'session.peer_logout.succeeded',
        session_id: 'session-peer',
        actor_session_id: 'session-current',
        user_id: 'user-1',
      }),
      'Session peer logout succeeded',
    );
  });

  it('returns ok without logging when the target session is missing, expired, or foreign', async () => {
    const { logoutPeerSession } =
      await import('../../src/modules/session/service.js');
    const logger = { info: vi.fn() };

    expireOtherActiveSessionById.mockReturnValueOnce(false);

    expect(
      logoutPeerSession({} as never, {
        currentSessionId: 'session-current',
        targetSessionId: 'session-peer',
        userId: 'user-1',
        logger: logger as never,
      }),
    ).toEqual({ ok: true });

    expect(logger.info).not.toHaveBeenCalled();
  });

  it('rejects self-target peer logout so /session/logout keeps responsibility', async () => {
    const { logoutPeerSession, SessionPeerLogoutSelfTargetError } =
      await import('../../src/modules/session/service.js');

    expect(() =>
      logoutPeerSession({} as never, {
        currentSessionId: 'session-current',
        targetSessionId: 'session-current',
        userId: 'user-1',
      }),
    ).toThrow(SessionPeerLogoutSelfTargetError);

    expect(expireOtherActiveSessionById).not.toHaveBeenCalled();
  });
});
