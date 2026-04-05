import { bootstrapDatabase } from '../../infra/db/bootstrap.js';
import { createDatabaseClient } from '../../infra/db/client.js';
import { bootstrapKeys } from '../../modules/jwks/service.js';
import { parseCreateCommandInput } from '../../shared/config.js';
import { createRootLogger } from '../../shared/logger.js';

type CreateCommandInput = {
  loggerSink?: { write(line: string): void };
};

export async function runCreateCommand(input: unknown): Promise<void> {
  const command = parseCreateCommandInput(toCommandInput(input));
  const logger = createRootLogger({ sink: toLoggerSink(input) }).child({
    command: 'init',
    db_path: command.dbPath,
  });

  logger.info({ event: 'cli.init.started' }, 'Init command started');

  await bootstrapDatabase(command.dbPath, { logger });

  const db = createDatabaseClient(command.dbPath);

  try {
    await bootstrapKeys(db, { logger });

    logger.info({ event: 'cli.init.completed' }, 'Init command completed');
  } finally {
    db.close();
  }
}

function toCommandInput(input: unknown): { dbPath?: unknown } {
  if (!input || typeof input !== 'object') {
    return {};
  }

  return {
    dbPath: (input as { dbPath?: unknown }).dbPath,
  };
}

function toLoggerSink(
  input: unknown,
): { write(line: string): void } | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  return (input as CreateCommandInput).loggerSink;
}
