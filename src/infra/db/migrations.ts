import { readFile } from 'node:fs/promises'
import type Database from 'better-sqlite3'

export async function runSqlFile(
  db: Database.Database,
  sqlFilePath: string
): Promise<void> {
  const sql = await readFile(sqlFilePath, 'utf8')

  db.exec(sql)
}
