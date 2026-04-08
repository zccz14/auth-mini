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
  revokeSessionById,
  rotateSessionById,
  type Session,
} from './repo.js';

export type TokenPair = {
  session_id: string;
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
};

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super('invalid_refresh_token');
  }
}

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
  input: { userId: string; issuer: string; logger?: AppLogger },
): Promise<TokenPair & { session: Session }> {
  const refreshToken = generateOpaqueToken();
  const issuedAt = getUnixTimeSeconds();
  const expiresAt = new Date(
    getExpiresAtUnixSeconds(issuedAt, TTLS.refreshTokenSeconds) * 1000,
  ).toISOString();
  const session = createSession(db, {
    userId: input.userId,
    refreshTokenHash: hashValue(refreshToken),
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
  const refreshToken = generateOpaqueToken();
  const issuedAt = getUnixTimeSeconds();
  const expiresAt = new Date(
    getExpiresAtUnixSeconds(issuedAt, TTLS.refreshTokenSeconds) * 1000,
  ).toISOString();
  const rotation = rotateSessionById(db, {
    sessionId: input.sessionId,
    refreshTokenHash: hashValue(input.refreshToken),
    nextRefreshTokenHash: hashValue(refreshToken),
    nextExpiresAt: expiresAt,
    now,
  });

  if (!rotation.ok) {
    input.logger?.warn(
      {
        event: 'session.refresh.failed',
        reason: rotation.reason,
        session_id: input.sessionId,
      },
      'Session refresh failed',
    );

    if (rotation.reason === 'session_superseded') {
      throw new SessionSupersededError();
    }

    throw new SessionInvalidatedError();
  }

  const accessToken = await signJwt(db, {
    sub: rotation.session.userId,
    sid: rotation.session.id,
    iss: input.issuer,
    typ: 'access',
  });

  input.logger?.info(
    {
      event: 'session.refresh.succeeded',
      session_id: rotation.session.id,
      user_id: rotation.session.userId,
    },
    'Session refresh succeeded',
  );

  return {
    session: rotation.session,
    session_id: rotation.session.id,
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
  const revoked = revokeSessionById(
    db,
    input.sessionId,
    new Date().toISOString(),
  );

  if (!revoked) {
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
