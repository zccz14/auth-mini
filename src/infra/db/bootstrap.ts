import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDatabaseClient } from './client.js'
import { runSqlFile } from './migrations.js'

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirectoryPath = dirname(currentFilePath)
const schemaFilePath = resolve(currentDirectoryPath, '../../../sql/schema.sql')

export async function bootstrapDatabase(dbPath: string): Promise<void> {
  const db = createDatabaseClient(dbPath)

  try {
    await runSqlFile(db, schemaFilePath)
  } finally {
    db.close()
  }
}
