import { bootstrapDatabase } from '../../../infra/db/bootstrap.js';
import { createDatabaseClient } from '../../../infra/db/client.js';
import {
  insertAllowedOrigin,
  type AllowedOrigin,
} from '../../../infra/origins/repo.js';

export async function runOriginAddCommand(input: {
  dbPath: string;
  value: string;
}): Promise<AllowedOrigin> {
  await bootstrapDatabase(input.dbPath);
  const db = createDatabaseClient(input.dbPath);

  try {
    return insertAllowedOrigin(db, input.value);
  } finally {
    db.close();
  }
}
