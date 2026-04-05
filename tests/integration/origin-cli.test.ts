import { describe, expect, it } from 'vitest';
import { createDatabaseClient } from '../../src/infra/db/client.js';
import { createTempDbPath } from '../helpers/db.js';
import { runBuiltCli } from '../helpers/cli.js';

describe('origin cli', () => {
  it('adds and lists allowed origins with canonical values', async () => {
    const dbPath = await createTempDbPath();

    const addResult = await runBuiltCli([
      'origin',
      'add',
      dbPath,
      '--value',
      'HTTPS://Example.COM:443',
    ]);

    expect(addResult.exitCode).toBe(0);

    const listResult = await runBuiltCli(['origin', 'list', dbPath]);

    expect(listResult.exitCode).toBe(0);
    expect(listResult.stdout).toContain('https://example.com');
  }, 15000);

  it('updates and deletes allowed origins in the database', async () => {
    const dbPath = await createTempDbPath();

    const addResult = await runBuiltCli([
      'origin',
      'add',
      dbPath,
      '--value',
      'https://first.example.com',
    ]);

    expect(addResult.exitCode).toBe(0);

    const db = createDatabaseClient(dbPath);

    try {
      const row = db
        .prepare(
          'SELECT id, origin FROM allowed_origins ORDER BY id ASC LIMIT 1',
        )
        .get() as { id: number; origin: string };

      expect(row.origin).toBe('https://first.example.com');

      const updateResult = await runBuiltCli([
        'origin',
        'update',
        dbPath,
        '--id',
        String(row.id),
        '--value',
        'HTTPS://Second.EXAMPLE.com:443',
      ]);

      expect(updateResult.exitCode).toBe(0);

      const updatedRow = db
        .prepare('SELECT origin FROM allowed_origins WHERE id = ?')
        .get(row.id) as { origin: string };

      expect(updatedRow.origin).toBe('https://second.example.com');

      const deleteResult = await runBuiltCli([
        'origin',
        'delete',
        dbPath,
        '--id',
        String(row.id),
      ]);

      expect(deleteResult.exitCode).toBe(0);

      const countRow = db
        .prepare('SELECT COUNT(*) AS count FROM allowed_origins')
        .get() as { count: number };

      expect(countRow.count).toBe(0);
    } finally {
      db.close();
    }
  }, 15000);
});
