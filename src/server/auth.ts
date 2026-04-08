import type { MiddlewareHandler } from 'hono';
import type { DatabaseClient } from '../infra/db/client.js';
import { verifyJwt } from '../modules/jwks/service.js';
import { getSessionById } from '../modules/session/repo.js';
import { invalidAccessTokenError } from './errors.js';

export type AccessTokenClaims = {
  sub: string;
  sid: string;
};

export type AuthVariables = {
  auth: AccessTokenClaims;
};

type AuthContextVariables = AuthVariables & {
  db: DatabaseClient;
};

export const requireAccessToken: MiddlewareHandler<{
  Variables: AuthContextVariables;
}> = async (c, next) => {
  const authorization = c.req.header('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    throw invalidAccessTokenError();
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (!token) {
    throw invalidAccessTokenError();
  }

  try {
    const payload = await verifyJwt(c.var.db, token);

    if (
      payload.typ !== 'access' ||
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string'
    ) {
      throw new Error('Invalid access token payload');
    }

    const session = getSessionById(c.var.db, payload.sid);

    if (
      !session ||
      session.expiresAt <= new Date().toISOString() ||
      session.userId !== payload.sub
    ) {
      throw new Error('Invalid access token session');
    }

    c.set('auth', {
      sub: payload.sub,
      sid: payload.sid,
    });
  } catch {
    throw invalidAccessTokenError();
  }

  await next();
};
