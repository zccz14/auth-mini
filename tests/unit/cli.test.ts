import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('start cli boundary', () => {
  it('passes only supported start flags to runStartCommand', async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    let resolveRunStartCommandCalled!: () => void;
    const runStartCommandCalled = new Promise<void>((resolve) => {
      resolveRunStartCommandCalled = resolve;
    });
    const runStartCommand = vi.fn().mockImplementation(async () => {
      resolveRunStartCommandCalled();
      return { close };
    });
    const runStartCli = await loadRunStartCli(
      runStartCommand,
      runStartCommandCalled,
    );

    await runStartCli([
      'db.sqlite',
      '--host',
      '127.0.0.1',
      '--port',
      '7777',
      '--issuer',
      'https://issuer.example',
    ]);

    expect(runStartCommand).toHaveBeenCalledWith({
      dbPath: 'db.sqlite',
      host: '127.0.0.1',
      port: '7777',
      issuer: 'https://issuer.example',
    });
  });

  it('omits removed start flags at the app-command boundary', async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    let resolveRunStartCommandCalled!: () => void;
    const runStartCommandCalled = new Promise<void>((resolve) => {
      resolveRunStartCommandCalled = resolve;
    });
    const runStartCommand = vi.fn().mockImplementation(async () => {
      resolveRunStartCommandCalled();
      return { close };
    });
    const runStartCli = await loadRunStartCli(
      runStartCommand,
      runStartCommandCalled,
    );

    await runStartCli(['db.sqlite']);

    expect(runStartCommand).toHaveBeenCalledWith({
      dbPath: 'db.sqlite',
      host: undefined,
      port: undefined,
      issuer: undefined,
    });
  });
});

async function loadRunStartCli(
  runStartCommand: ReturnType<typeof vi.fn>,
  runStartCommandCalled: Promise<void>,
) {
  vi.resetModules();

  vi.doMock('../../src/app/commands/start.js', () => ({ runStartCommand }));
  const module = await import('../../src/commands/start.js');

  return async (argv: string[]) => {
    const handlers = new Map<NodeJS.Signals, () => void>();
    let resolveSigtermRegistered!: () => void;
    const sigtermRegistered = new Promise<void>((resolve) => {
      resolveSigtermRegistered = resolve;
    });
    const processOn = vi.spyOn(process, 'on').mockImplementation(((
      signal: NodeJS.Signals,
      handler: () => void,
    ) => {
      handlers.set(signal, handler);
      if (signal === 'SIGTERM') {
        resolveSigtermRegistered();
      }
      return process;
    }) as typeof process.on);
    const processOff = vi.spyOn(process, 'off').mockImplementation(((
      signal: NodeJS.Signals,
    ) => {
      handlers.delete(signal);
      return process;
    }) as typeof process.off);

    try {
      const commandPromise = module.default.run(argv, process.cwd());

      await runStartCommandCalled;
      await sigtermRegistered;

      handlers.get('SIGTERM')?.();

      await commandPromise;
    } finally {
      processOn.mockRestore();
      processOff.mockRestore();
    }
  };
}
