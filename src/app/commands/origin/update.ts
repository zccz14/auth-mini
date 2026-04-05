import { bootstrapDatabase } from '../../../infra/db/bootstrap.js';
import { createDatabaseClient } from '../../../infra/db/client.js';
import {
  updateAllowedOriginById,
  type AllowedOrigin,
} from '../../../infra/origins/repo.js';

export async function runOriginUpdateCommand(input: {
  dbPath: string;
  id: number;
  value: string;
}): Promise<AllowedOrigin> {
  await bootstrapDatabase(input.dbPath);
  const db = createDatabaseClient(input.dbPath);

  try {
    const origin = updateAllowedOriginById(db, input.id, input.value);

    if (!origin) {
      throw new Error(`allowed origin ${input.id} not found`);
    }

    return origin;
  } finally {
    db.close();
  }
}
