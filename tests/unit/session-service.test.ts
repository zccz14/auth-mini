import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

describe('session repo expireOtherActiveSessionById', () => {
  it('expires only a same-user active non-current target session', async () => {
    const { createSession, expireOtherActiveSessionById, getSessionById } =
      await vi.importActual<typeof import('../../src/modules/session/repo.js')>(
        '../../src/modules/session/repo.js',
      );
    const db = new Database(':memory:');

    db.exec(
      readFileSync(
        fileURLToPath(new URL('../../sql/schema.sql', import.meta.url)),
        'utf8',
      ),
    );
    db.prepare('INSERT INTO users (id, email) VALUES (?, ?), (?, ?)').run(
      'user-1',
      'user-1@example.com',
      'user-2',
      'user-2@example.com',
    );

    const currentSession = createSession(db, {
      userId: 'user-1',
      refreshTokenHash: hashValue('refresh-current'),
      authMethod: 'email_otp',
      expiresAt: '2099-01-01T00:00:00.000Z',
    });
    const peerSession = createSession(db, {
      userId: 'user-1',
      refreshTokenHash: hashValue('refresh-peer'),
      authMethod: 'email_otp',
      expiresAt: '2099-01-01T00:00:00.000Z',
    });
    const foreignSession = createSession(db, {
      userId: 'user-2',
      refreshTokenHash: hashValue('refresh-foreign'),
      authMethod: 'email_otp',
      expiresAt: '2099-01-01T00:00:00.000Z',
    });
    const expiredSession = createSession(db, {
      userId: 'user-1',
      refreshTokenHash: hashValue('refresh-expired'),
      authMethod: 'email_otp',
      expiresAt: '2000-01-01T00:00:00.000Z',
    });
    const now = '2026-04-12T00:00:00.000Z';

    expect(
      expireOtherActiveSessionById(db, {
        currentSessionId: currentSession.id,
        targetSessionId: peerSession.id,
        userId: 'user-1',
        now,
      }),
    ).toBe(true);
    expect(getSessionById(db, peerSession.id)?.expiresAt).toBe(now);

    expect(
      expireOtherActiveSessionById(db, {
        currentSessionId: currentSession.id,
        targetSessionId: currentSession.id,
        userId: 'user-1',
        now,
      }),
    ).toBe(false);
    expect(getSessionById(db, currentSession.id)?.expiresAt).toBe(
      '2099-01-01T00:00:00.000Z',
    );

    expect(
      expireOtherActiveSessionById(db, {
        currentSessionId: currentSession.id,
        targetSessionId: foreignSession.id,
        userId: 'user-1',
        now,
      }),
    ).toBe(false);
    expect(getSessionById(db, foreignSession.id)?.expiresAt).toBe(
      '2099-01-01T00:00:00.000Z',
    );

    expect(
      expireOtherActiveSessionById(db, {
        currentSessionId: currentSession.id,
        targetSessionId: expiredSession.id,
        userId: 'user-1',
        now,
      }),
    ).toBe(false);
    expect(getSessionById(db, expiredSession.id)?.expiresAt).toBe(
      '2000-01-01T00:00:00.000Z',
    );

    db.close();
  });
});
