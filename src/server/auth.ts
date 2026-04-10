import type { MiddlewareHandler } from 'hono';
import type { DatabaseClient } from '../infra/db/client.js';
import { verifyJwt } from '../modules/jwks/service.js';
import { getSessionById } from '../modules/session/repo.js';
import {
  insufficientAuthenticationMethodError,
  invalidAccessTokenError,
} from './errors.js';

export type AccessTokenClaims = {
  sub: string;
  sid: string;
  amr: string[];
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
      typeof payload.sid !== 'string' ||
      !isValidAmr(payload.amr)
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
      amr: payload.amr,
    });
  } catch {
    throw invalidAccessTokenError();
  }

  await next();
};

export const requirePasskeyManagementAuth: MiddlewareHandler<{
  Variables: AuthContextVariables;
}> = async (c, next) => {
  if (!c.var.auth.amr.some((method) => isAllowedPasskeyManagementAmr(method))) {
    throw insufficientAuthenticationMethodError();
  }

  await next();
};

function isValidAmr(amr: unknown): amr is string[] {
  return (
    Array.isArray(amr) &&
    amr.length > 0 &&
    amr.every((value) => typeof value === 'string')
  );
}

function isAllowedPasskeyManagementAmr(method: string) {
  return method === 'email_otp' || method === 'webauthn';
}
