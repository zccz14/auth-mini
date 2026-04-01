import { bootstrapDatabase } from '../infra/db/bootstrap.js'
import { createDatabaseClient } from '../infra/db/client.js'
import { rotateKeys } from '../modules/jwks/service.js'
import { parseRotateJwksCommandInput } from '../shared/config.js'
import { createRootLogger } from '../shared/logger.js'

type RotateJwksCommandInput = {
  loggerSink?: { write(line: string): void }
}

export async function runRotateJwksCommand(input: unknown): Promise<void> {
  const command = parseRotateJwksCommandInput(input)
  const logger = createRootLogger({ sink: toLoggerSink(input) })

  await bootstrapDatabase(command.dbPath)

  const db = createDatabaseClient(command.dbPath)

  try {
    await rotateKeys(db, { logger })
  } finally {
    db.close()
  }
}

function toLoggerSink(
  input: unknown
): { write(line: string): void } | undefined {
  if (!input || typeof input !== 'object') {
    return undefined
  }

  return (input as RotateJwksCommandInput).loggerSink
}
