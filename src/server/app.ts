import { Hono, type Context } from 'hono';
import type { ZodType } from 'zod';
import type { DatabaseClient } from '../infra/db/client.js';
import { listPublicKeys } from '../modules/jwks/service.js';
import {
  InvalidEmailOtpError,
  SmtpDeliveryError,
  SmtpNotConfiguredError,
  startEmailAuth,
  verifyEmailAuth,
} from '../modules/email-auth/service.js';
import {
  logoutSession,
  refreshSessionTokens,
  SessionInvalidatedError,
  SessionSupersededError,
} from '../modules/session/service.js';
import {
  deleteCredential,
  DuplicateCredentialError,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  InvalidWebauthnAuthenticationError,
  InvalidWebauthnRegistrationError,
  verifyAuthentication,
  verifyRegistration,
  WebauthnCredentialNotFoundError,
} from '../modules/webauthn/service.js';
import {
  getUserById,
  listActiveUserSessions,
  listUserWebauthnCredentials,
} from '../modules/users/repo.js';
import {
  emailStartSchema,
  emailVerifySchema,
  refreshSchema,
  webauthnOptionsSchema,
  webauthnAuthenticateVerifySchema,
  webauthnRegisterVerifySchema,
} from '../shared/http-schemas.js';
import {
  createRequestId,
  type AppLogger,
  withErrorFields,
} from '../shared/logger.js';
import { requireAccessToken, type AuthVariables } from './auth.js';
import { renderSingletonIifeSource } from '../sdk/singleton-entry.js';
import {
  credentialNotFoundError,
  duplicateCredentialError,
  HttpError,
  invalidEmailOtpError,
  invalidRequestError,
  invalidWebauthnAuthenticationError,
  invalidWebauthnRegistrationError,
  sessionInvalidatedError,
  sessionSupersededError,
  smtpNotConfiguredError,
  smtpTemporarilyUnavailableError,
} from './errors.js';

type AppVariables = AuthVariables & {
  clientIp: string | null;
  db: DatabaseClient;
  issuer: string;
  logger: AppLogger;
  origins: string[];
  requestId: string;
};

export function createApp(input: {
  db: DatabaseClient;
  getClientIp?: (request: Request) => string | null;
  issuer: string;
  logger: AppLogger;
  origins: string[];
}) {
  const app = new Hono<{ Variables: AppVariables }>();

  const corsAllowMethods = 'GET, POST, DELETE, OPTIONS';
  const corsAllowHeaders = 'Authorization, Content-Type';

  app.use(async (c, next) => {
    const requestId = createRequestId();

    c.set('db', input.db);
    c.set('issuer', input.issuer);
    c.set('logger', input.logger.child({ request_id: requestId }));
    c.set('origins', input.origins);
    c.set('requestId', requestId);
    c.set('clientIp', input.getClientIp?.(c.req.raw) ?? null);

    await next();
  });

  app.use(async (c, next) => {
    const origin = c.req.header('Origin');
    const allowedOrigin =
      origin && c.var.origins.includes(origin) ? origin : undefined;
    const requestedMethod = c.req.header('Access-Control-Request-Method');

    if (origin && requestedMethod && c.req.method === 'OPTIONS') {
      c.res = new Response(null, { status: 204 });
      applyOriginVaryHeader(c.res.headers);

      if (allowedOrigin) {
        applyCorsHeaders(
          c.res.headers,
          allowedOrigin,
          true,
          corsAllowMethods,
          corsAllowHeaders,
        );
      }

      return;
    }

    await next();

    if (origin) {
      applyOriginVaryHeader(c.res.headers);
    }

    if (allowedOrigin) {
      applyCorsHeaders(
        c.res.headers,
        allowedOrigin,
        false,
        corsAllowMethods,
        corsAllowHeaders,
      );
    }
  });

  app.use(async (c, next) => {
    const startedAt = Date.now();

    c.var.logger.info(
      requestLogFields(c, {
        event: 'http.request.started',
      }),
      'Request started',
    );

    try {
      await next();
    } catch (error) {
      c.res = buildErrorResponse(c, error, {
        allowedOrigins: c.var.origins,
        allowMethods: corsAllowMethods,
        allowHeaders: corsAllowHeaders,
        logger: c.var.logger,
        logUnhandled: true,
      });
    }

    c.var.logger.info(
      requestLogFields(c, {
        duration_ms: Date.now() - startedAt,
        event: 'http.request.completed',
        status_code: c.res.status,
      }),
      'Request completed',
    );
  });

  app.onError((error, c) => {
    return buildErrorResponse(c, error, {
      allowedOrigins: input.origins,
      allowMethods: corsAllowMethods,
      allowHeaders: corsAllowHeaders,
      logger: 'logger' in c.var ? c.var.logger : undefined,
      logUnhandled: true,
    });
  });

  app.get('/sdk/singleton-iife.js', (c) => {
    return c.body(renderSingletonIifeSource(), 200, {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-cache',
    });
  });

  app.post('/email/start', async (c) => {
    const body = await parseJson(c.req.raw, emailStartSchema);
    const result = await startEmailAuth(c.var.db, {
      email: body.email,
      logger: c.var.logger,
      ip: c.var.clientIp,
    });

    return c.json(result);
  });

  app.post('/email/verify', async (c) => {
    const body = await parseJson(c.req.raw, emailVerifySchema);
    const result = await verifyEmailAuth(c.var.db, {
      email: body.email,
      code: body.code,
      issuer: c.var.issuer,
      logger: c.var.logger,
    });

    return c.json(result);
  });

  app.get('/me', requireAccessToken, async (c) => {
    const auth = c.var.auth;
    const user = getUserById(c.var.db, auth.sub);

    if (!user) {
      throw new HttpError(401, 'invalid_access_token');
    }

    return c.json({
      user_id: user.id,
      email: user.email,
      webauthn_credentials: listUserWebauthnCredentials(c.var.db, user.id),
      active_sessions: listActiveUserSessions(
        c.var.db,
        user.id,
        new Date().toISOString(),
      ),
    });
  });

  app.post('/session/refresh', async (c) => {
    const body = await parseJson(c.req.raw, refreshSchema);
    const result = await refreshSessionTokens(c.var.db, {
      sessionId: body.session_id,
      refreshToken: body.refresh_token,
      issuer: c.var.issuer,
      logger: c.var.logger,
    });

    return c.json({
      session_id: result.session_id,
      access_token: result.access_token,
      token_type: result.token_type,
      expires_in: result.expires_in,
      refresh_token: result.refresh_token,
    });
  });

  app.post('/session/logout', requireAccessToken, async (c) => {
    logoutSession(c.var.db, {
      sessionId: c.var.auth.sid,
      userId: c.var.auth.sub,
      logger: c.var.logger,
    });
    return c.json({ ok: true });
  });

  app.post('/webauthn/register/options', requireAccessToken, async (c) => {
    const body = await parseJson(c.req.raw, webauthnOptionsSchema);
    const user = getUserById(c.var.db, c.var.auth.sub);

    if (!user) {
      throw new HttpError(401, 'invalid_access_token');
    }

    return c.json(
      await generateRegistrationOptions(c.var.db, {
        userId: user.id,
        email: user.email,
        rpId: body.rp_id,
        origin: resolveOptionsRequestOrigin(c.req.raw),
        logger: c.var.logger,
      }),
    );
  });

  app.post('/webauthn/register/verify', requireAccessToken, async (c) => {
    const body = await parseJson(c.req.raw, webauthnRegisterVerifySchema);
    const origin = c.req.header('Origin');

    if (!origin) {
      throw new InvalidWebauthnRegistrationError();
    }

    return c.json(
      await verifyRegistration(c.var.db, {
        userId: c.var.auth.sub,
        requestId: body.request_id,
        credential: body.credential,
        origin,
        logger: c.var.logger,
      }),
    );
  });

  app.post('/webauthn/authenticate/options', async (c) => {
    const body = await parseJson(c.req.raw, webauthnOptionsSchema);
    return c.json(
      await generateAuthenticationOptions(c.var.db, {
        rpId: body.rp_id,
        origin: resolveOptionsRequestOrigin(c.req.raw),
        logger: c.var.logger,
      }),
    );
  });

  app.post('/webauthn/authenticate/verify', async (c) => {
    const body = await parseJson(c.req.raw, webauthnAuthenticateVerifySchema);
    const origin = c.req.header('Origin');

    if (!origin) {
      throw new InvalidWebauthnAuthenticationError();
    }

    const result = await verifyAuthentication(c.var.db, {
      requestId: body.request_id,
      credential: body.credential,
      origin,
      issuer: c.var.issuer,
      logger: c.var.logger,
    });

    return c.json({
      session_id: result.session_id,
      access_token: result.access_token,
      token_type: result.token_type,
      expires_in: result.expires_in,
      refresh_token: result.refresh_token,
    });
  });

  app.delete('/webauthn/credentials/:id', requireAccessToken, async (c) => {
    return c.json(
      deleteCredential(c.var.db, {
        credentialId: c.req.param('id'),
        userId: c.var.auth.sub,
      }),
    );
  });

  app.get('/jwks', async (c) => {
    const keys = await listPublicKeys(c.var.db, { logger: c.var.logger });
    return c.json({ keys });
  });

  return app;
}

function resolveOptionsRequestOrigin(request: Request): string {
  return request.headers.get('Origin') ?? new URL(request.url).origin;
}

async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  const text = await request.text();

  try {
    body = text.trim() === '' ? {} : JSON.parse(text);
  } catch {
    throw invalidRequestError();
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw invalidRequestError();
  }

  return parsed.data;
}

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof SmtpNotConfiguredError) {
    return smtpNotConfiguredError();
  }

  if (error instanceof SmtpDeliveryError) {
    return smtpTemporarilyUnavailableError();
  }

  if (error instanceof InvalidEmailOtpError) {
    return invalidEmailOtpError();
  }

  if (error instanceof SessionInvalidatedError) {
    return sessionInvalidatedError();
  }

  if (error instanceof SessionSupersededError) {
    return sessionSupersededError();
  }

  if (error instanceof InvalidWebauthnRegistrationError) {
    return invalidWebauthnRegistrationError();
  }

  if (error instanceof InvalidWebauthnAuthenticationError) {
    return invalidWebauthnAuthenticationError();
  }

  if (error instanceof DuplicateCredentialError) {
    return duplicateCredentialError();
  }

  if (error instanceof WebauthnCredentialNotFoundError) {
    return credentialNotFoundError();
  }

  return new HttpError(500, 'internal_error');
}

function requestLogFields(
  c: {
    req: { method: string; path: string; routePath: string };
    var: AppVariables;
  },
  fields: {
    event: 'http.request.started' | 'http.request.completed';
    status_code?: number;
    duration_ms?: number;
  },
): Record<string, unknown> {
  const route = toRouteField(c.req.routePath);

  return {
    event: fields.event,
    method: c.req.method,
    path: c.req.path,
    ...(route ? { route } : {}),
    ...(fields.status_code !== undefined
      ? { status_code: fields.status_code }
      : {}),
    ...(fields.duration_ms !== undefined
      ? { duration_ms: fields.duration_ms }
      : {}),
    ...(c.var.clientIp ? { ip: c.var.clientIp } : {}),
  };
}

function toRouteField(routePath: string): string | undefined {
  if (!routePath || routePath === '*' || routePath === '/*') {
    return undefined;
  }

  return routePath;
}

function applyCorsHeaders(
  headers: Headers,
  origin: string,
  includePreflightHeaders: boolean,
  allowMethods: string,
  allowHeaders: string,
) {
  headers.set('access-control-allow-origin', origin);
  applyOriginVaryHeader(headers);

  if (!includePreflightHeaders) {
    return;
  }

  headers.set('access-control-allow-methods', allowMethods);
  headers.set('access-control-allow-headers', allowHeaders);
}

function buildErrorResponse(
  c: {
    req: { header(name: string): string | undefined };
    json: Context['json'];
  },
  error: unknown,
  input: {
    allowedOrigins: string[];
    allowMethods: string;
    allowHeaders: string;
    logger?: AppLogger;
    logUnhandled: boolean;
  },
): Response {
  const httpError = toHttpError(error);

  if (input.logUnhandled && input.logger && httpError.status === 500) {
    input.logger.error(
      {
        event: 'http.request.error',
        ...withErrorFields(error),
      },
      'Unhandled request error',
    );
  }

  const response = c.json(
    { error: httpError.code },
    httpError.status as 400 | 401 | 404 | 409 | 500 | 503,
  );
  const origin = c.req.header('Origin');

  if (origin) {
    applyOriginVaryHeader(response.headers);
  }

  if (origin && input.allowedOrigins.includes(origin)) {
    applyCorsHeaders(
      response.headers,
      origin,
      false,
      input.allowMethods,
      input.allowHeaders,
    );
  }

  return response;
}

function applyOriginVaryHeader(headers: Headers) {
  headers.set('vary', appendVaryHeader(headers.get('vary'), 'Origin'));
}

function appendVaryHeader(existing: string | null, value: string): string {
  if (!existing) {
    return value;
  }

  const values = existing
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (values.includes(value)) {
    return existing;
  }

  return `${existing}, ${value}`;
}
