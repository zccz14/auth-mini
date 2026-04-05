import { bootstrapDatabase } from '../../../infra/db/bootstrap.js';
import { createDatabaseClient } from '../../../infra/db/client.js';
import {
  listAllowedOrigins,
  type AllowedOrigin,
} from '../../../infra/origins/repo.js';

export async function runOriginListCommand(input: {
  dbPath: string;
}): Promise<AllowedOrigin[]> {
  await bootstrapDatabase(input.dbPath);
  const db = createDatabaseClient(input.dbPath);

  try {
    return listAllowedOrigins(db);
  } finally {
    db.close();
  }
}
