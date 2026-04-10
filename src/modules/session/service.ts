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
  const rotatedSession = rotateRefreshToken(db, {
    sessionId: input.sessionId,
    currentRefreshTokenHash: submittedRefreshTokenHash,
    nextRefreshTokenHash: rotatedRefreshTokenHash,
    now,
  });

  if (!rotatedSession) {
    const latestSession = getSessionById(db, input.sessionId);

    if (latestSession && latestSession.expiresAt > now) {
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

  let accessToken: string;

  try {
    accessToken = await signJwt(db, {
      sub: rotatedSession.userId,
      sid: rotatedSession.id,
      iss: input.issuer,
      typ: 'access',
    });
  } catch (error) {
    rotateRefreshToken(db, {
      sessionId: input.sessionId,
      currentRefreshTokenHash: rotatedRefreshTokenHash,
      nextRefreshTokenHash: submittedRefreshTokenHash,
      now,
    });

    throw error;
  }

  input.logger?.info(
    {
      event: 'session.refresh.succeeded',
      session_id: rotatedSession.id,
      user_id: rotatedSession.userId,
    },
    'Session refresh succeeded',
  );

  return {
    session: rotatedSession,
    session_id: rotatedSession.id,
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: TTLS.accessTokenSeconds,
    refresh_token: refreshToken,
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
