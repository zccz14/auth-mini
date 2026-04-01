import type { DatabaseClient } from '../../infra/db/client.js'
import type { AppLogger } from '../../shared/logger.js'
import { signJwt } from '../jwks/service.js'
import {
  TTLS,
  getExpiresAtUnixSeconds,
  getUnixTimeSeconds
} from '../../shared/time.js'
import { generateOpaqueToken, hashValue } from '../../shared/crypto.js'
import {
  createSession,
  revokeSessionById,
  revokeSessionByRefreshTokenHash,
  type Session
} from './repo.js'

export type TokenPair = {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token: string
}

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super('invalid_refresh_token')
  }
}

export async function mintSessionTokens(
  db: DatabaseClient,
  input: { userId: string; issuer: string; logger?: AppLogger }
): Promise<TokenPair & { session: Session }> {
  const refreshToken = generateOpaqueToken()
  const issuedAt = getUnixTimeSeconds()
  const expiresAt = new Date(
    getExpiresAtUnixSeconds(issuedAt, TTLS.refreshTokenSeconds) * 1000
  ).toISOString()
  const session = createSession(db, {
    userId: input.userId,
    refreshTokenHash: hashValue(refreshToken),
    expiresAt
  })
  const accessToken = await signJwt(db, {
    sub: input.userId,
    sid: session.id,
    iss: input.issuer,
    typ: 'access'
  })

  return {
    session,
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: TTLS.accessTokenSeconds,
    refresh_token: refreshToken
  }
}

export async function refreshSessionTokens(
  db: DatabaseClient,
  input: { refreshToken: string; issuer: string; logger?: AppLogger }
): Promise<TokenPair & { session: Session }> {
  const now = new Date().toISOString()
  const session = revokeSessionByRefreshTokenHash(
    db,
    hashValue(input.refreshToken),
    now
  )

  if (!session) {
    input.logger?.warn(
      { event: 'session.refresh.failed', reason: 'invalid_refresh_token' },
      'Session refresh failed'
    )
    throw new InvalidRefreshTokenError()
  }

  const tokens = await mintSessionTokens(db, {
    userId: session.userId,
    issuer: input.issuer,
    logger: input.logger
  })

  input.logger?.info(
    {
      event: 'session.refresh.succeeded',
      session_id: tokens.session.id,
      user_id: session.userId
    },
    'Session refresh succeeded'
  )

  return tokens
}

export function logoutSession(
  db: DatabaseClient,
  input: { sessionId: string; userId?: string; logger?: AppLogger }
): void {
  const revoked = revokeSessionById(
    db,
    input.sessionId,
    new Date().toISOString()
  )

  if (!revoked) {
    return
  }

  input.logger?.info(
    {
      event: 'session.logout.succeeded',
      session_id: input.sessionId,
      ...(input.userId ? { user_id: input.userId } : {})
    },
    'Session logout succeeded'
  )
}
