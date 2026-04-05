import { bootstrapDatabase } from '../../../infra/db/bootstrap.js';
import { createDatabaseClient } from '../../../infra/db/client.js';
import { deleteAllowedOriginById } from '../../../infra/origins/repo.js';

export async function runOriginDeleteCommand(input: {
  dbPath: string;
  id: number;
}): Promise<void> {
  await bootstrapDatabase(input.dbPath);
  const db = createDatabaseClient(input.dbPath);

  try {
    const deleted = deleteAllowedOriginById(db, input.id);

    if (!deleted) {
      throw new Error(`allowed origin ${input.id} not found`);
    }
  } finally {
    db.close();
  }
}
