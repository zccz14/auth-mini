import { describe, expect, it } from 'vitest';
import { createDatabaseClient } from '../../src/infra/db/client.js';
import { createTempDbPath } from '../helpers/db.js';
import { runBuiltCli } from '../helpers/cli.js';

describe('smtp cli', () => {
  it('adds and lists smtp configs through the smtp topic', async () => {
    const dbPath = await createTempDbPath();

    const addResult = await runBuiltCli([
      'smtp',
      'add',
      dbPath,
      '--host',
      'smtp.example.com',
      '--port',
      '587',
      '--username',
      'mailer',
      '--password',
      'secret',
      '--from-email',
      'noreply@example.com',
      '--from-name',
      'Auth Mini',
      '--secure',
      '--weight',
      '5',
    ]);

    expect(addResult.exitCode).toBe(0);
    expect(addResult.stdout).toContain('smtp.example.com');
    expect(addResult.stdout).toContain('noreply@example.com');

    const listResult = await runBuiltCli(['smtp', 'list', dbPath]);

    expect(listResult.exitCode).toBe(0);
    expect(listResult.stdout).toContain('smtp.example.com');
    expect(listResult.stdout).toContain('Auth Mini');
    expect(listResult.stdout).toContain('noreply@example.com');
    expect(listResult.stdout).toContain('\t1\t5');
  }, 15000);

  it('updates and deletes smtp configs in the database', async () => {
    const dbPath = await createTempDbPath();

    const addResult = await runBuiltCli([
      'smtp',
      'add',
      dbPath,
      '--host',
      'smtp.example.com',
      '--port',
      '587',
      '--username',
      'mailer',
      '--password',
      'secret',
      '--from-email',
      'noreply@example.com',
    ]);

    expect(addResult.exitCode).toBe(0);

    const db = createDatabaseClient(dbPath);

    try {
      const row = db
        .prepare(
          [
            'SELECT id, host, port, username, password, from_email, from_name, secure, is_active, weight',
            'FROM smtp_configs ORDER BY id ASC LIMIT 1',
          ].join(' '),
        )
        .get() as {
        id: number;
        host: string;
        port: number;
        username: string;
        password: string;
        from_email: string;
        from_name: string;
        secure: number;
        is_active: number;
        weight: number;
      };

      expect(row).toMatchObject({
        host: 'smtp.example.com',
        port: 587,
        username: 'mailer',
        password: 'secret',
        from_email: 'noreply@example.com',
        from_name: '',
        secure: 0,
        is_active: 1,
        weight: 1,
      });

      const updateResult = await runBuiltCli([
        'smtp',
        'update',
        dbPath,
        '--id',
        String(row.id),
        '--host',
        'smtp-2.example.com',
        '--port',
        '465',
        '--username',
        'mailer-2',
        '--password',
        'secret-2',
        '--from-email',
        'ops@example.com',
        '--from-name',
        'Ops',
        '--secure',
        '--weight',
        '9',
      ]);

      expect(updateResult.exitCode).toBe(0);

      const updatedRow = db
        .prepare(
          [
            'SELECT host, port, username, password, from_email, from_name, secure, is_active, weight',
            'FROM smtp_configs WHERE id = ?',
          ].join(' '),
        )
        .get(row.id) as {
        host: string;
        port: number;
        username: string;
        password: string;
        from_email: string;
        from_name: string;
        secure: number;
        is_active: number;
        weight: number;
      };

      expect(updatedRow).toEqual({
        host: 'smtp-2.example.com',
        port: 465,
        username: 'mailer-2',
        password: 'secret-2',
        from_email: 'ops@example.com',
        from_name: 'Ops',
        secure: 1,
        is_active: 1,
        weight: 9,
      });

      const deleteResult = await runBuiltCli([
        'smtp',
        'delete',
        dbPath,
        '--id',
        String(row.id),
      ]);

      expect(deleteResult.exitCode).toBe(0);

      const countRow = db
        .prepare('SELECT COUNT(*) AS count FROM smtp_configs')
        .get() as { count: number };

      expect(countRow.count).toBe(0);
    } finally {
      db.close();
    }
  }, 15000);
});
