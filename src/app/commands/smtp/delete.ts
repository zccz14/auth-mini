import { bootstrapDatabase } from '../../../infra/db/bootstrap.js';
import { createDatabaseClient } from '../../../infra/db/client.js';
import { deleteSmtpConfig } from '../../../infra/smtp/repo.js';

export async function runSmtpDeleteCommand(input: {
  dbPath: string;
  id: number;
}): Promise<void> {
  await bootstrapDatabase(input.dbPath);
  const db = createDatabaseClient(input.dbPath);

  try {
    const deleted = deleteSmtpConfig(db, input.id);

    if (!deleted) {
      throw new Error(`smtp config ${input.id} not found`);
    }
  } finally {
    db.close();
  }
}
