import { bootstrapDatabase } from '../../../infra/db/bootstrap.js';
import { createDatabaseClient } from '../../../infra/db/client.js';
import {
  listSmtpConfigRecords,
  type SmtpConfigRecord,
} from '../../../infra/smtp/repo.js';

export async function runSmtpListCommand(input: {
  dbPath: string;
}): Promise<SmtpConfigRecord[]> {
  await bootstrapDatabase(input.dbPath);
  const db = createDatabaseClient(input.dbPath);

  try {
    return listSmtpConfigRecords(db);
  } finally {
    db.close();
  }
}
