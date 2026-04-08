import { beforeEach, describe, expect, it, vi } from 'vitest';

const createServer = vi.fn();
const parseRuntimeConfig = vi.fn();
const createDatabaseClient = vi.fn();
const assertRequiredTablesAndColumns = vi.fn();
const bootstrapDatabase = vi.fn();
const bootstrapKeys = vi.fn();
const createApp = vi.fn();
const createRootLogger = vi.fn();
const loggerChild = vi.fn();
const loggerInfo = vi.fn();
const loggerError = vi.fn();

vi.mock('node:http', () => ({
  createServer,
}));

vi.mock('../../src/shared/config.js', () => ({
  parseRuntimeConfig,
}));

vi.mock('../../src/infra/db/client.js', () => ({
  assertRequiredTablesAndColumns,
  createDatabaseClient,
}));

vi.mock('../../src/infra/db/bootstrap.js', () => ({
  bootstrapDatabase,
}));

vi.mock('../../src/modules/jwks/service.js', () => ({
  bootstrapKeys,
}));

vi.mock('../../src/server/app.js', () => ({
  createApp,
}));

vi.mock('../../src/shared/logger.js', () => ({
  createRootLogger,
  withErrorFields(error: unknown) {
    if (!(error instanceof Error)) {
      return {};
    }

    return {
      error_name: error.name,
      error_message: error.message,
    };
  },
}));

async function loadRunStartCommand() {
  vi.resetModules();
  const module = await import('../../src/app/commands/start.js');

  return module.runStartCommand;
}

async function loadStartCommandModule() {
  vi.resetModules();
  return import('../../src/commands/start.js');
}

describe('runStartCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    bootstrapDatabase.mockResolvedValue(undefined);
    loggerChild.mockReturnValue({
      child: loggerChild,
      info: loggerInfo,
      error: loggerError,
    });
    createRootLogger.mockReturnValue({ child: loggerChild });
    parseRuntimeConfig.mockReturnValue({
      dbPath: '/tmp/auth-mini.db',
      host: '127.0.0.1',
      port: 4100,
      issuer: 'https://issuer.example',
    });
  });

  it('closes the database when startup fails before listen completes', async () => {
    const db = { close: vi.fn() };

    createDatabaseClient.mockReturnValue(db);
    bootstrapKeys.mockRejectedValue(new Error('bootstrap failed'));

    const runStartCommand = await loadRunStartCommand();

    expect(runStartCommand).toBeTypeOf('function');

    await expect(
      runStartCommand({ dbPath: '/tmp/auth-mini.db' }),
    ).rejects.toThrow('bootstrap failed');
    expect(bootstrapDatabase).toHaveBeenCalledWith('/tmp/auth-mini.db', {
      logger: expect.any(Object),
    });
    expect(db.close).toHaveBeenCalledTimes(1);
    expect(bootstrapKeys).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        logger: expect.any(Object),
      }),
    );
  });

  it('loads allowed origins from the database without passing a startup rp id', async () => {
    const closeServer = vi.fn((callback?: (error?: Error) => void) =>
      callback?.(),
    );
    const listen = vi.fn(
      (_port: number, _host: string, callback?: () => void) => callback?.(),
    );
    const server = {
      close: closeServer,
      listen,
      off: vi.fn(),
      once: vi.fn(),
    };
    const db = {
      close: vi.fn(),
      prepare: vi.fn().mockReturnValue({
        all: vi
          .fn()
          .mockReturnValue([
            { origin: 'https://app.example.com' },
            { origin: 'https://admin.example.com' },
          ]),
      }),
    };

    createDatabaseClient.mockReturnValue(db);
    bootstrapKeys.mockResolvedValue({ id: 'key-1', kid: 'kid-1' });
    createServer.mockReturnValue(server);
    createApp.mockReturnValue({ fetch: vi.fn() });

    const runStartCommand = await loadRunStartCommand();
    const runningServer = await runStartCommand({
      dbPath: '/tmp/auth-mini.db',
    });

    expect(assertRequiredTablesAndColumns).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        allowed_origins: ['origin'],
      }),
    );
    expect(bootstrapDatabase).toHaveBeenCalledWith('/tmp/auth-mini.db', {
      logger: expect.any(Object),
    });
    expect(db.prepare).toHaveBeenCalledWith(
      'SELECT id, origin, created_at FROM allowed_origins ORDER BY id ASC',
    );
    expect(createApp).toHaveBeenCalledWith(
      expect.objectContaining({
        db,
        issuer: 'https://issuer.example',
        origins: ['https://app.example.com', 'https://admin.example.com'],
      }),
    );
    expect(createApp).not.toHaveBeenCalledWith(
      expect.objectContaining({ rpId: expect.anything() }),
    );
    expect(bootstrapKeys).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        logger: expect.any(Object),
      }),
    );
    expect(listen).toHaveBeenCalledWith(
      4100,
      '127.0.0.1',
      expect.any(Function),
    );

    await runningServer.close();

    expect(closeServer).toHaveBeenCalledTimes(1);
    expect(db.close).toHaveBeenCalledTimes(1);
  });

  it('starts successfully when no allowed origins are configured', async () => {
    const closeServer = vi.fn((callback?: (error?: Error) => void) =>
      callback?.(),
    );
    const listen = vi.fn(
      (_port: number, _host: string, callback?: () => void) => callback?.(),
    );
    const server = {
      close: closeServer,
      listen,
      off: vi.fn(),
      once: vi.fn(),
    };
    const db = {
      close: vi.fn(),
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue([]),
      }),
    };

    createDatabaseClient.mockReturnValue(db);
    bootstrapKeys.mockResolvedValue({ id: 'key-1', kid: 'kid-1' });
    createServer.mockReturnValue(server);
    createApp.mockReturnValue({ fetch: vi.fn() });

    const runStartCommand = await loadRunStartCommand();
    const runningServer = await runStartCommand({
      dbPath: '/tmp/auth-mini.db',
    });

    expect(createApp).toHaveBeenCalledWith(
      expect.objectContaining({
        origins: [],
      }),
    );
    expect(bootstrapDatabase).toHaveBeenCalledWith('/tmp/auth-mini.db', {
      logger: expect.any(Object),
    });
    expect(createApp).not.toHaveBeenCalledWith(
      expect.objectContaining({ rpId: expect.anything() }),
    );
    expect(listen).toHaveBeenCalledWith(
      4100,
      '127.0.0.1',
      expect.any(Function),
    );

    await runningServer.close();

    expect(closeServer).toHaveBeenCalledTimes(1);
    expect(db.close).toHaveBeenCalledTimes(1);
  });

  it('fails startup before opening the runtime database when schema bootstrap rejects', async () => {
    const bootstrapError = new Error('schema incompatible');

    bootstrapDatabase.mockRejectedValue(bootstrapError);

    const runStartCommand = await loadRunStartCommand();

    await expect(
      runStartCommand({ dbPath: '/tmp/auth-mini.db' }),
    ).rejects.toThrow('schema incompatible');
    expect(createDatabaseClient).not.toHaveBeenCalled();
    expect(bootstrapKeys).not.toHaveBeenCalled();
  });
});

describe('createStartLifecycle', () => {
  it('registers SIGINT and SIGTERM handlers', async () => {
    const on = vi.fn();
    const off = vi.fn();
    const { createStartLifecycle } = await loadStartCommandModule();

    createStartLifecycle({ close: vi.fn(), on, off });

    expect(on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
  });

  it('closes the server only once when shutdown signals repeat', async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    const on = vi.fn();
    const off = vi.fn();
    const { createStartLifecycle } = await loadStartCommandModule();

    const lifecycle = createStartLifecycle({ close, on, off });
    const shutdown = on.mock.calls[0]?.[1] as (() => void) | undefined;

    shutdown?.();
    shutdown?.();
    await lifecycle.waitForShutdown();

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('removes listeners after shutdown, forwards close errors, and does not return a rejecting promise from signal handlers', async () => {
    const error = new Error('close failed');
    const close = vi.fn().mockRejectedValue(error);
    const on = vi.fn();
    const off = vi.fn();
    const onCloseError = vi.fn();
    const { createStartLifecycle } = await loadStartCommandModule();

    const lifecycle = createStartLifecycle({ close, on, off, onCloseError });
    const shutdown = on.mock.calls[0]?.[1] as (() => void) | undefined;

    expect(shutdown?.()).toBeUndefined();
    await expect(lifecycle.waitForShutdown()).rejects.toThrow('close failed');

    expect(off).toHaveBeenCalledWith('SIGINT', shutdown);
    expect(off).toHaveBeenCalledWith('SIGTERM', shutdown);
    expect(onCloseError).toHaveBeenCalledWith(error);
  });
});
