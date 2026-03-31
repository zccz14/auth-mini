import Database from 'better-sqlite3'

export type DatabaseClient = Database.Database

export function createDatabaseClient(dbPath: string): DatabaseClient {
  const db = new Database(dbPath)

  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')

  return db
}
