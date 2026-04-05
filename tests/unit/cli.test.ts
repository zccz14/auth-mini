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
    const runStartCommand = vi.fn().mockResolvedValue(undefined);
    const startAction = await loadStartAction(runStartCommand);

    await startAction('db.sqlite', {
      origin: ['https://one.example', 'https://two.example'],
    });

    expect(runStartCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        dbPath: 'db.sqlite',
        origin: ['https://one.example', 'https://two.example'],
      }),
    );
  });

  it('passes a single --origin as a one-item array', async () => {
    const runStartCommand = vi.fn().mockResolvedValue(undefined);
    const startAction = await loadStartAction(runStartCommand);

    await startAction('db.sqlite', {
      origin: 'https://one.example',
    });

    expect(runStartCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        dbPath: 'db.sqlite',
        origin: ['https://one.example'],
      }),
    );
  });
});

async function loadStartAction(runStartCommand: ReturnType<typeof vi.fn>) {
  vi.resetModules();
  let startAction:
    | ((
        dbPath: string,
        options: { origin?: string | string[] },
      ) => Promise<void>)
    | undefined;

  vi.doMock('../../src/app/commands/create.js', () => ({
    runCreateCommand: vi.fn().mockResolvedValue(undefined),
  }));
  vi.doMock('../../src/app/commands/start.js', () => ({ runStartCommand }));
  vi.doMock('../../src/app/commands/rotate-jwks.js', () => ({
    runRotateJwksCommand: vi.fn().mockResolvedValue(undefined),
  }));
  vi.doMock('../../src/cli/create.js', () => {
    throw new Error('legacy create command import should not be used');
  });
  vi.doMock('../../src/cli/start.js', () => {
    throw new Error('legacy start command import should not be used');
  });
  vi.doMock('../../src/cli/rotate-jwks.js', () => {
    throw new Error('legacy rotate jwks command import should not be used');
  });
  vi.doMock('../../src/cli/options.js', () => {
    throw new Error('legacy cli options import should not be used');
  });
  vi.doMock('cac', () => ({
    cac: () => {
      const buildCommand = (name: string) => ({
        option: vi.fn().mockImplementation(() => buildCommand(name)),
        action: vi.fn().mockImplementation((callback) => {
          if (name === 'start <dbPath>') {
            startAction = callback;
          }

          return buildCommand(name);
        }),
      });

      return {
        command: vi
          .fn()
          .mockImplementation((name: string) => buildCommand(name)),
        version: vi.fn(),
        help: vi.fn(),
        parse: vi.fn(),
      };
    },
  }));

  await import('../../src/index.ts');

  if (!startAction) {
    throw new Error('start command action was not registered');
  }

  return startAction;
}
