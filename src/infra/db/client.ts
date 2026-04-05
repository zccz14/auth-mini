import Database from 'better-sqlite3';

export type DatabaseClient = Database.Database;

type RequiredSchema = Record<string, readonly string[]>;

export function createDatabaseClient(dbPath: string): DatabaseClient {
  const db = new Database(dbPath);

  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  return db;
}

export function assertRequiredTablesAndColumns(
  db: DatabaseClient,
  requiredSchema: RequiredSchema,
): void {
  const missingEntries: string[] = [];

  for (const [tableName, requiredColumns] of Object.entries(requiredSchema)) {
    const tableExists = db
      .prepare(
        [
          'SELECT 1 AS present',
          'FROM sqlite_master',
          "WHERE type = 'table' AND name = ?",
        ].join(' '),
      )
      .get(tableName) as { present: 1 } | undefined;

    if (!tableExists) {
      missingEntries.push(tableName);
      continue;
    }

    const columns = new Set(
      (
        db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
          name: string;
        }>
      ).map((column) => column.name),
    );

    for (const columnName of requiredColumns) {
      if (!columns.has(columnName)) {
        missingEntries.push(`${tableName}.${columnName}`);
      }
    }
  }

  if (missingEntries.length > 0) {
    throw new Error(
      [
        'Database schema is incompatible with this auth-mini version; rebuild or migrate the instance.',
        `Missing required schema entries: ${missingEntries.join(', ')}`,
      ].join(' '),
    );
  }
}
