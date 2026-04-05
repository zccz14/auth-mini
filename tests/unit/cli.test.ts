import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeOriginOption } from '../../src/app/commands/options.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('cli origin normalization', () => {
  it('wraps a single origin string in an array', () => {
    expect(normalizeOriginOption('http://localhost:5173')).toEqual([
      'http://localhost:5173',
    ]);
  });

  it('keeps repeated origin values in order', () => {
    expect(
      normalizeOriginOption(['https://one.example', 'https://two.example']),
    ).toEqual(['https://one.example', 'https://two.example']);
  });

  it('preserves an omitted origin value', () => {
    expect(normalizeOriginOption(undefined)).toBeUndefined();
  });
});

describe('start cli boundary', () => {
  it('passes repeated --origin values to runStartCommand in order', async () => {
    const runStartCommand = vi.fn().mockResolvedValue({
      close: vi.fn().mockResolvedValue(undefined),
    });
    const runStartCli = await loadRunStartCli(runStartCommand);

    await runStartCli([
      'db.sqlite',
      '--origin',
      'https://one.example',
      '--origin',
      'https://two.example',
    ]);

    expect(runStartCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        dbPath: 'db.sqlite',
        origin: ['https://one.example', 'https://two.example'],
      }),
    );
  });

  it('passes a single --origin as a one-item array', async () => {
    const runStartCommand = vi.fn().mockResolvedValue({
      close: vi.fn().mockResolvedValue(undefined),
    });
    const runStartCli = await loadRunStartCli(runStartCommand);

    await runStartCli(['db.sqlite', '--origin', 'https://one.example']);

    expect(runStartCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        dbPath: 'db.sqlite',
        origin: ['https://one.example'],
      }),
    );
  });

  it('keeps omitted --origin undefined at the app-command boundary', async () => {
    const runStartCommand = vi.fn().mockResolvedValue({
      close: vi.fn().mockResolvedValue(undefined),
    });
    const runStartCli = await loadRunStartCli(runStartCommand);

    await runStartCli(['db.sqlite']);

    expect(runStartCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        dbPath: 'db.sqlite',
        origin: undefined,
      }),
    );
  });
});

async function loadRunStartCli(runStartCommand: ReturnType<typeof vi.fn>) {
  vi.resetModules();

  vi.doMock('../../src/app/commands/start.js', () => ({ runStartCommand }));
  const module = await import('../../src/commands/start.ts');

  return async (argv: string[]) => {
    const handlers = new Map<NodeJS.Signals, () => void>();
    const processOn = vi.spyOn(process, 'on').mockImplementation(((
      signal: NodeJS.Signals,
      handler: () => void,
    ) => {
      handlers.set(signal, handler);
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

      await vi.waitFor(() => {
        expect(runStartCommand).toHaveBeenCalledTimes(1);
      });

      handlers.get('SIGTERM')?.();

      await commandPromise;
    } finally {
      processOn.mockRestore();
      processOff.mockRestore();
    }
  };
}
