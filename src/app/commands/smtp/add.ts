import { bootstrapDatabase } from '../../../infra/db/bootstrap.js';
import { createDatabaseClient } from '../../../infra/db/client.js';
import {
  insertSmtpConfig,
  type InsertSmtpConfigInput,
  type SmtpConfigRecord,
} from '../../../infra/smtp/repo.js';

export async function runSmtpAddCommand(
  input: {
    dbPath: string;
  } & InsertSmtpConfigInput,
): Promise<SmtpConfigRecord> {
  await bootstrapDatabase(input.dbPath);
  const db = createDatabaseClient(input.dbPath);

  try {
    return insertSmtpConfig(db, input);
  } finally {
    db.close();
  }
}
