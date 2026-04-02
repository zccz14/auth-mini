import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';

export async function createTempDbPath(): Promise<string> {
  const directoryPath = await mkdtemp(join(tmpdir(), 'mini-auth-db-'));
  return join(directoryPath, 'mini-auth.sqlite');
}

export async function listTables(dbPath: string): Promise<string[]> {
  const db = new Database(dbPath);

  try {
    const rows = db
      .prepare(
        [
          'SELECT name',
          'FROM sqlite_master',
          "WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
          'ORDER BY name ASC',
        ].join(' '),
      )
      .all() as Array<{ name: string }>;

    return rows.map((row) => row.name);
  } finally {
    db.close();
  }
}

export async function countRows(
  dbPath: string,
  table: string,
): Promise<number> {
  const db = new Database(dbPath, { readonly: true });

  try {
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as {
      count: number;
    };

    return row.count;
  } finally {
    db.close();
  }
}
