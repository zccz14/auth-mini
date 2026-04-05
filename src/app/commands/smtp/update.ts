import { bootstrapDatabase } from '../../../infra/db/bootstrap.js';
import { createDatabaseClient } from '../../../infra/db/client.js';
import {
  updateSmtpConfig,
  type SmtpConfigRecord,
  type UpdateSmtpConfigInput,
} from '../../../infra/smtp/repo.js';

export async function runSmtpUpdateCommand(
  input: {
    dbPath: string;
  } & UpdateSmtpConfigInput,
): Promise<SmtpConfigRecord> {
  await bootstrapDatabase(input.dbPath);
  const db = createDatabaseClient(input.dbPath);

  try {
    const smtpConfig = updateSmtpConfig(db, input);

    if (!smtpConfig) {
      throw new Error(`smtp config ${input.id} not found`);
    }

    return smtpConfig;
  } finally {
    db.close();
  }
}
