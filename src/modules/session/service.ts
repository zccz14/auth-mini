import type { DatabaseClient } from '../../infra/db/client.js';
import type { AppLogger } from '../../shared/logger.js';
import { signJwt } from '../jwks/service.js';
import {
  TTLS,
  getExpiresAtUnixSeconds,
  getUnixTimeSeconds,
} from '../../shared/time.js';
import { generateOpaqueToken, hashValue } from '../../shared/crypto.js';
import {
  createSession,
  expireOtherActiveSessionById,
  expireSessionById,
  getSessionById,
  rotateRefreshToken,
  type Session,
} from './repo.js';

export type TokenPair = {
  session_id: string;
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
};

export class SessionInvalidatedError extends Error {
  constructor() {
    super('session_invalidated');
  }
}

export class SessionSupersededError extends Error {
  constructor() {
    super('session_superseded');
  }
}

export class SessionPeerLogoutSelfTargetError extends Error {
  constructor() {
    super('session_peer_logout_self_target');
  }
}

function toAmr(authMethod: Session['authMethod']): string[] {
  const amr = [authMethod];

  return amr;
}

function getRefreshTokenExpiresAt(now: string): string {
  return new Date(
    getExpiresAtUnixSeconds(
      getUnixTimeSeconds(Date.parse(now)),
      TTLS.refreshTokenSeconds,
    ) * 1000,
  ).toISOString();
}

export async function mintSessionTokens(
  db: DatabaseClient,
  input: {
    userId: string;
    authMethod: Session['authMethod'];
    issuer: string;
    logger?: AppLogger;
  },
): Promise<TokenPair & { session: Session }> {
  const refreshToken = generateOpaqueToken();
  const issuedAt = getUnixTimeSeconds();
  const expiresAt = new Date(
    getExpiresAtUnixSeconds(issuedAt, TTLS.refreshTokenSeconds) * 1000,
  ).toISOString();
  const session = createSession(db, {
    userId: input.userId,
    refreshTokenHash: hashValue(refreshToken),
    authMethod: input.authMethod,
    expiresAt,
  });
  const accessToken = await signJwt(db, {
    sub: input.userId,
    sid: session.id,
    iss: input.issuer,
    amr: toAmr(session.authMethod),
    typ: 'access',
  });

  return {
    session,
    session_id: session.id,
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: TTLS.accessTokenSeconds,
    refresh_token: refreshToken,
  };
}

export async function refreshSessionTokens(
  db: DatabaseClient,
  input: {
    sessionId: string;
    refreshToken: string;
    issuer: string;
    logger?: AppLogger;
  },
): Promise<TokenPair & { session: Session }> {
  const maxRefreshRecoveryAttempts = 3;
  const now = new Date().toISOString();
  const submittedRefreshTokenHash = hashValue(input.refreshToken);
  const currentSession = getSessionById(db, input.sessionId);

  if (!currentSession || currentSession.expiresAt <= now) {
    input.logger?.warn(
      {
        event: 'session.refresh.failed',
        reason: 'session_invalidated',
        session_id: input.sessionId,
      },
      'Session refresh failed',
    );

    throw new SessionInvalidatedError();
  }

  if (currentSession.refreshTokenHash !== submittedRefreshTokenHash) {
    input.logger?.warn(
      {
        event: 'session.refresh.failed',
        reason: 'session_superseded',
        session_id: input.sessionId,
      },
      'Session refresh failed',
    );

    throw new SessionSupersededError();
  }

  const refreshToken = generateOpaqueToken();
  const rotatedRefreshTokenHash = hashValue(refreshToken);
  const refreshedExpiresAt = getRefreshTokenExpiresAt(now);
  for (let attempt = 0; attempt < maxRefreshRecoveryAttempts; attempt += 1) {
    const rotatedSession = rotateRefreshToken(db, {
      sessionId: input.sessionId,
      currentRefreshTokenHash: submittedRefreshTokenHash,
      nextRefreshTokenHash: rotatedRefreshTokenHash,
      expiresAt: refreshedExpiresAt,
      now,
    });

    if (rotatedSession) {
      return finalizeRefresh(db, {
        input,
        now,
        refreshToken,
        rotatedRefreshTokenHash,
        rotatedSession,
        previousExpiresAt: currentSession.expiresAt,
        submittedRefreshTokenHash,
      });
    }

    const latestSession = getSessionById(db, input.sessionId);

    if (!latestSession || latestSession.expiresAt <= now) {
      input.logger?.warn(
        {
          event: 'session.refresh.failed',
          reason: 'session_invalidated',
          session_id: input.sessionId,
        },
        'Session refresh failed',
      );

      throw new SessionInvalidatedError();
    }

    if (latestSession.refreshTokenHash !== submittedRefreshTokenHash) {
      input.logger?.warn(
        {
          event: 'session.refresh.failed',
          reason: 'session_superseded',
          session_id: input.sessionId,
        },
        'Session refresh failed',
      );

      throw new SessionSupersededError();
    }
  }

  input.logger?.warn(
    {
      event: 'session.refresh.failed',
      reason: 'session_invalidated',
      session_id: input.sessionId,
    },
    'Session refresh failed',
  );

  throw new SessionInvalidatedError();
}

async function finalizeRefresh(
  db: DatabaseClient,
  params: {
    input: {
      sessionId: string;
      refreshToken: string;
      issuer: string;
      logger?: AppLogger;
    };
    now: string;
    refreshToken: string;
    rotatedRefreshTokenHash: string;
    rotatedSession: Session;
    previousExpiresAt: string;
    submittedRefreshTokenHash: string;
  },
): Promise<TokenPair & { session: Session }> {
  let accessToken: string;

  try {
    accessToken = await signJwt(db, {
      sub: params.rotatedSession.userId,
      sid: params.rotatedSession.id,
      iss: params.input.issuer,
      amr: toAmr(params.rotatedSession.authMethod),
      typ: 'access',
    });
  } catch (error) {
    rotateRefreshToken(db, {
      sessionId: params.input.sessionId,
      currentRefreshTokenHash: params.rotatedRefreshTokenHash,
      nextRefreshTokenHash: params.submittedRefreshTokenHash,
      expiresAt: params.previousExpiresAt,
      now: params.now,
    });

    throw error;
  }

  params.input.logger?.info(
    {
      event: 'session.refresh.succeeded',
      session_id: params.rotatedSession.id,
      user_id: params.rotatedSession.userId,
    },
    'Session refresh succeeded',
  );

  return {
    session: params.rotatedSession,
    session_id: params.rotatedSession.id,
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: TTLS.accessTokenSeconds,
    refresh_token: params.refreshToken,
  };
}

export function logoutSession(
  db: DatabaseClient,
  input: { sessionId: string; userId?: string; logger?: AppLogger },
): void {
  const expired = expireSessionById(
    db,
    input.sessionId,
    new Date().toISOString(),
  );

  if (!expired) {
    return;
  }

  input.logger?.info(
    {
      event: 'session.logout.succeeded',
      session_id: input.sessionId,
      ...(input.userId ? { user_id: input.userId } : {}),
    },
    'Session logout succeeded',
  );
}

export function logoutPeerSession(
  db: DatabaseClient,
  input: {
    currentSessionId: string;
    targetSessionId: string;
    userId: string;
    logger?: AppLogger;
  },
): { ok: true } {
  if (input.targetSessionId === input.currentSessionId) {
    throw new SessionPeerLogoutSelfTargetError();
  }

  const expired = expireOtherActiveSessionById(db, {
    currentSessionId: input.currentSessionId,
    targetSessionId: input.targetSessionId,
    userId: input.userId,
    now: new Date().toISOString(),
  });

  if (expired) {
    input.logger?.info(
      {
        event: 'session.peer_logout.succeeded',
        session_id: input.targetSessionId,
        actor_session_id: input.currentSessionId,
        user_id: input.userId,
      },
      'Session peer logout succeeded',
    );
  }

  return { ok: true };
}
