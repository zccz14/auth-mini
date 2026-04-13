import { createServer } from 'node:http';
import type {
  IncomingHttpHeaders,
  IncomingMessage,
  ServerResponse,
} from 'node:http';
import {
  assertRequiredTablesAndColumns,
  createDatabaseClient,
} from '../../infra/db/client.js';
import { bootstrapDatabase } from '../../infra/db/bootstrap.js';
import { listAllowedOrigins } from '../../infra/origins/repo.js';
import { bootstrapKeys } from '../../modules/jwks/service.js';
import { createApp } from '../../server/app.js';
import { parseRuntimeConfig } from '../../shared/config.js';
import { createRootLogger, withErrorFields } from '../../shared/logger.js';

type StartCommandInput = {
  loggerSink?: { write(line: string): void };
};

const requiredRuntimeSchema = {
  allowed_origins: ['origin'],
  webauthn_challenges: ['rp_id', 'origin'],
  webauthn_credentials: ['rp_id', 'last_used_at'],
} as const;

export async function runStartCommand(
  input: unknown,
): Promise<{ close(): Promise<void> }> {
  const config = parseRuntimeConfig(toRuntimeConfigInput(input));
  const logger = createRootLogger({ sink: toLoggerSink(input) }).child({
    command: 'start',
    db_path: config.dbPath,
  });

  await bootstrapDatabase(config.dbPath, { logger });

  const db = createDatabaseClient(config.dbPath);
  try {
    logger.info({ event: 'cli.start.started' }, 'Starting auth-mini server');

    assertRequiredTablesAndColumns(db, requiredRuntimeSchema);

    await bootstrapKeys(db, { logger });

    const clientIps = new WeakMap<Request, string | null>();

    const app = createApp({
      db,
      getClientIp(request) {
        return clientIps.get(request) ?? null;
      },
      getOrigins() {
        return listAllowedOrigins(db).map((origin) => origin.origin);
      },
      issuer: config.issuer,
      logger,
    });

    const server = createServer((req, res) => {
      void handleRequest({ app, clientIps, config, logger, req, res });
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(config.port, config.host, () => {
        server.off('error', reject);
        logger.info(
          {
            event: 'server.listening',
            host: config.host,
            port: config.port,
          },
          'auth-mini server listening',
        );
        resolve();
      });
    });

    return {
      async close() {
        let shutdownError: unknown;

        try {
          await new Promise<void>((resolve, reject) => {
            server.close((error) => {
              if (error) {
                reject(error);
                return;
              }

              logger.info(
                { event: 'server.shutdown.completed' },
                'auth-mini server shutdown complete',
              );
              resolve();
            });
          });
        } catch (error) {
          shutdownError = error;
        }

        try {
          db.close();
        } catch (error) {
          if (!shutdownError) {
            throw error;
          }
        }

        if (shutdownError) {
          throw shutdownError;
        }
      },
    };
  } catch (error) {
    db.close();
    throw error;
  }
}

async function handleRequest(input: {
  app: Pick<ReturnType<typeof createApp>, 'fetch'>;
  clientIps: WeakMap<Request, string | null>;
  config: ReturnType<typeof parseRuntimeConfig>;
  logger: ReturnType<typeof createRootLogger>;
  req: IncomingMessage;
  res: ServerResponse<IncomingMessage>;
}): Promise<void> {
  const { app, clientIps, config, logger, req, res } = input;

  try {
    const origin = `http://${req.headers.host ?? `${config.host}:${config.port}`}`;
    const request = new Request(new URL(req.url ?? '/', origin), {
      method: req.method,
      headers: toHeaders(req.headers),
      body:
        req.method === 'GET' || req.method === 'HEAD'
          ? undefined
          : await readRequestBody(req),
    });
    clientIps.set(
      request,
      resolveClientIp(req.headers, req.socket.remoteAddress ?? null),
    );
    const response = await app.fetch(request);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const body = Buffer.from(await response.arrayBuffer());
    res.end(body);
  } catch (error) {
    logger.error(
      {
        event: 'server.request.failed',
        ...withErrorFields(error),
      },
      'HTTP request handling failed',
    );

    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
    }

    res.end(JSON.stringify({ error: 'internal_server_error' }));
  }
}

function resolveClientIp(
  headers: IncomingHttpHeaders,
  remoteAddress: string | null,
): string | null {
  const cfConnectingIp = normalizeClientIpValue(
    firstHeaderValue(headers['cf-connecting-ip']),
  );
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  const xForwardedFor = normalizeClientIpValue(
    firstCommaSeparatedValue(firstHeaderValue(headers['x-forwarded-for'])),
  );
  if (xForwardedFor) {
    return xForwardedFor;
  }

  const forwardedFor = firstForwardedForValue(
    firstHeaderValue(headers.forwarded),
  );
  if (forwardedFor) {
    return forwardedFor;
  }

  return remoteAddress;
}

function firstHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = item.trim();
      if (normalized) {
        return normalized;
      }
    }
  }

  return undefined;
}

function firstCommaSeparatedValue(
  value: string | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const [firstValue] = value.split(',');
  const normalized = firstValue?.trim();

  return normalized || undefined;
}

function firstForwardedForValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const match = /(?:^|[;,]\s*)for=(?:"([^"]+)"|([^;,]+))/i.exec(value);
  return normalizeClientIpValue(match?.[1] ?? match?.[2]);
}

function normalizeClientIpValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized || normalized.toLowerCase() === 'unknown') {
    return undefined;
  }

  const ipv6Match = /^\[([^\]]+)\](?::\d+)?$/.exec(normalized);
  if (ipv6Match) {
    return ipv6Match[1];
  }

  const hostWithPortMatch = /^([^:\s]+):(\d+)$/.exec(normalized);
  if (hostWithPortMatch) {
    return hostWithPortMatch[1];
  }

  return normalized;
}

async function readRequestBody(
  request: NodeJS.ReadableStream,
): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}

function toHeaders(headers: IncomingHttpHeaders): Headers {
  const result = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      result.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        result.append(key, item);
      }
    }
  }

  return result;
}

function toLoggerSink(
  input: unknown,
): { write(line: string): void } | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  return (input as StartCommandInput).loggerSink;
}

function toRuntimeConfigInput(input: unknown): {
  dbPath?: unknown;
  host?: unknown;
  port?: unknown;
  issuer?: unknown;
} {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const runtimeInput = input as {
    dbPath?: unknown;
    host?: unknown;
    port?: unknown;
    issuer?: unknown;
  };

  return {
    dbPath: runtimeInput.dbPath,
    host: runtimeInput.host,
    port: runtimeInput.port,
    issuer: runtimeInput.issuer,
  };
}
