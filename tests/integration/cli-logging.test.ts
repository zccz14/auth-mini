import { describe, expect, it } from 'vitest';
import { createTempDbPath } from '../helpers/db.js';
import {
  runLoggedCreateCommand,
  runLoggedRotateJwksCommand,
} from '../helpers/cli.js';

describe('cli lifecycle logging', () => {
  it('emits init command and migration lifecycle logs', async () => {
    const dbPath = await createTempDbPath();

    const result = await runLoggedCreateCommand({ dbPath });

    expect(result.logs).toContainEqual(
      expect.objectContaining({
        event: 'cli.init.started',
        command: 'init',
        db_path: dbPath,
      }),
    );
    expect(result.logs).toContainEqual(
      expect.objectContaining({
        event: 'db.migration.started',
        db_path: dbPath,
      }),
    );
    expect(result.logs).toContainEqual(
      expect.objectContaining({
        event: 'db.migration.completed',
        db_path: dbPath,
      }),
    );
    expect(result.logs).toContainEqual(
      expect.objectContaining({
        event: 'jwks.bootstrap.created',
        command: 'init',
        db_path: dbPath,
        kid: expect.any(String),
      }),
    );
    expect(result.logs).toContainEqual(
      expect.objectContaining({
        event: 'cli.init.completed',
        command: 'init',
        db_path: dbPath,
      }),
    );
  });

  it('emits rotate-jwks command and migration lifecycle logs', async () => {
    const dbPath = await createTempDbPath();

    await runLoggedCreateCommand({ dbPath });

    const result = await runLoggedRotateJwksCommand({ dbPath });

    expect(result.logs).toContainEqual(
      expect.objectContaining({
        event: 'cli.rotate_jwks.started',
        command: 'rotate-jwks',
        db_path: dbPath,
      }),
    );
    expect(result.logs).toContainEqual(
      expect.objectContaining({
        event: 'db.migration.started',
        db_path: dbPath,
      }),
    );
    expect(result.logs).toContainEqual(
      expect.objectContaining({
        event: 'db.migration.completed',
        db_path: dbPath,
      }),
    );
    expect(result.logs).toContainEqual(
      expect.objectContaining({
        event: 'cli.rotate_jwks.completed',
        command: 'rotate-jwks',
        db_path: dbPath,
      }),
    );
  });
});
