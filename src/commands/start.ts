import { Args, Flags } from '@oclif/core';
import { runStartCommand } from '../app/commands/start.js';
import { BaseCommand } from '../oclif/base-command.js';

const START_SIGNALS = ['SIGINT', 'SIGTERM'] as const;

export function createStartLifecycle(input: {
  close(): Promise<void>;
  on(signal: NodeJS.Signals, handler: () => void): void;
  off(signal: NodeJS.Signals, handler: () => void): void;
  onCloseError?(error: unknown): Promise<void> | void;
}): { waitForShutdown(): Promise<void> } {
  let shutdownPromise: Promise<void> | undefined;
  let resolveShutdown!: () => void;
  let rejectShutdown!: (error: unknown) => void;

  const completed = new Promise<void>((resolve, reject) => {
    resolveShutdown = resolve;
    rejectShutdown = reject;
  });
  void completed.catch(() => undefined);

  const onSignal = () => {
    void shutdown();
  };

  const removeListeners = () => {
    for (const signal of START_SIGNALS) {
      input.off(signal, onSignal);
    }
  };

  const shutdown = (): Promise<void> => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      removeListeners();

      try {
        await input.close();
        resolveShutdown();
      } catch (error) {
        try {
          await input.onCloseError?.(error);
        } finally {
          rejectShutdown(error);
        }

        throw error;
      }
    })();
    void shutdownPromise.catch(() => undefined);

    return shutdownPromise;
  };

  for (const signal of START_SIGNALS) {
    input.on(signal, onSignal);
  }

  return {
    waitForShutdown() {
      return completed;
    },
  };
}

export default class StartCommand extends BaseCommand {
  static summary = 'Start the auth-mini server';

  static args = {
    instance: Args.string({
      required: true,
      description: 'Auth-mini instance (currently a SQLite database path)',
    }),
  };

  static flags = {
    host: Flags.string({ description: 'Listen host' }),
    port: Flags.string({ description: 'Listen port' }),
    issuer: Flags.string({ description: 'JWT issuer URL' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(StartCommand);
    const server = await runStartCommand({
      dbPath: args.instance,
      host: flags.host,
      port: flags.port,
      issuer: flags.issuer,
    });
    const lifecycle = createStartLifecycle({
      close: () => server.close(),
      on: (signal, handler) => process.on(signal, handler),
      off: (signal, handler) => process.off(signal, handler),
    });

    await lifecycle.waitForShutdown();
  }
}
