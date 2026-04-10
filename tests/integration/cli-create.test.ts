import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDatabaseClient } from '../../src/infra/db/client.js';
import { runBuiltCli } from '../helpers/cli.js';
import {
  countRows,
  createMalformedJwksSlotDbPath,
  createLegacySchemaDbPath,
  createSessionAuthMethodCompatDbPath,
  createTempDbPath,
  listTables,
} from '../helpers/db.js';
import { exists } from '../helpers/fs.js';

describe('workspace bootstrap', () => {
  it('exposes the auth-mini bin entry', async () => {
    const { default: pkg } = await import('../../package.json');

    expect(pkg.bin['auth-mini']).toBe('dist/index.js');
  });

  it('defines build, test, lint, format, and typecheck scripts', async () => {
    const { default: pkg } = await import('../../package.json');

    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts.test).toBeDefined();
    expect(pkg.scripts['test:integration']).toBeDefined();
    expect(pkg.scripts.lint).toBeDefined();
    expect(pkg.scripts.format).toBeDefined();
    expect(pkg.scripts.typecheck).toBeDefined();
  });

  it('defines lint, format, and integration scripts', async () => {
    const { default: pkg } = await import('../../package.json');

    expect(pkg.scripts.lint).toBeDefined();
    expect(pkg.scripts.format).toBeDefined();
    expect(pkg.scripts['test:integration']).toBeDefined();
  });

  it('defines expected lint-staged rules and pre-commit hook command', async () => {
    const lintStaged = await import('../../.lintstagedrc.json');
    const { readFile } = await import('node:fs/promises');

    const hook = await readFile('.husky/pre-commit', 'utf8');

    expect(await exists('.prettierrc.json')).toBe(true);
    expect(await exists('eslint.config.js')).toBe(true);
    expect(await exists('.lintstagedrc.json')).toBe(true);
    expect(await exists('.husky/pre-commit')).toBe(true);
    expect(lintStaged.default).toEqual({
      '*.{js,json,md}': 'prettier --write',
      '*.ts': ['prettier --write', 'eslint --fix'],
    });
    expect(hook).toContain('npx lint-staged');
  });

  it('runs the built cli help smoke path', async () => {
    expect(await exists('dist/index.js')).toBe(true);

    const result = await runBuiltCli(['--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('auth-mini');
    expect(result.stdout).toContain('USAGE');
    expect(result.stdout).not.toContain('\n  base\n');
  }, 30000);

  it('create initializes schema and seeds current and standby jwks slots', async () => {
    const dbPath = await createTempDbPath();

    const result = await runBuiltCli(['create', dbPath]);

    expect(result.exitCode).toBe(0);
    expect(await countRows(dbPath, 'jwks_keys')).toBe(2);

    const db = createDatabaseClient(dbPath);

    try {
      const rows = db
        .prepare('SELECT id, kid, alg FROM jwks_keys ORDER BY id ASC')
        .all() as Array<{ id: string; kid: string; alg: string }>;

      expect(rows).toHaveLength(2);
      expect(rows.map((row) => row.id)).toEqual(['CURRENT', 'STANDBY']);
      expect(rows[0]).toMatchObject({ id: 'CURRENT', alg: 'EdDSA' });
      expect(rows[1]).toMatchObject({ id: 'STANDBY', alg: 'EdDSA' });
      expect(rows[0]?.kid).toBeTruthy();
      expect(rows[1]?.kid).toBeTruthy();
      expect(rows[0]?.kid).not.toBe(rows[1]?.kid);
    } finally {
      db.close();
    }
  }, 30000);

  it('bootstrap fills a missing jwks slot in an otherwise valid slot schema', async () => {
    const { bootstrapKeys } = await import('../../src/modules/jwks/service.js');
    const dbPath = await createMalformedJwksSlotDbPath({
      rows: [{ id: 'CURRENT', kid: 'kid-current' }],
    });
    const db = createDatabaseClient(dbPath);

    try {
      await bootstrapKeys(db);

      const rows = db
        .prepare('SELECT id, kid FROM jwks_keys ORDER BY id ASC')
        .all() as Array<{ id: string; kid: string }>;

      expect(rows).toHaveLength(2);
      expect(rows.map((row) => row.id)).toEqual(['CURRENT', 'STANDBY']);
      expect(rows[0]).toEqual({ id: 'CURRENT', kid: 'kid-current' });
      expect(rows[1]?.kid).toBeTruthy();
      expect(rows[1]?.kid).not.toBe('kid-current');
    } finally {
      db.close();
    }
  });

  it('rejects create smtp-config flag in the new contract', async () => {
    const dbPath = await createTempDbPath();
    const tempDir = await mkdtemp(join(tmpdir(), 'auth-mini-smtp-'));
    const smtpJsonPath = join(tempDir, 'smtp.json');

    await writeFile(
      smtpJsonPath,
      JSON.stringify([
        {
          host: 'smtp.example.com',
          port: 587,
          username: 'mailer',
          password: 'secret',
          from_email: 'noreply@example.com',
        },
      ]),
      'utf8',
    );

    const result = await runBuiltCli([
      'create',
      dbPath,
      '--smtp-config',
      smtpJsonPath,
    ]);

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('Nonexistent flag: --smtp-config');
    expect(await exists(dbPath)).toBe(false);
  }, 30000);

  it('rejects init smtp-config flag in the new contract', async () => {
    const dbPath = await createTempDbPath();
    const tempDir = await mkdtemp(join(tmpdir(), 'auth-mini-smtp-'));
    const smtpJsonPath = join(tempDir, 'smtp.json');

    await writeFile(
      smtpJsonPath,
      JSON.stringify([
        {
          host: 'smtp.example.com',
          port: 587,
          username: 'mailer',
          password: 'secret',
          from_email: 'noreply@example.com',
        },
      ]),
      'utf8',
    );

    const result = await runBuiltCli([
      'init',
      dbPath,
      '--smtp-config',
      smtpJsonPath,
    ]);

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('Nonexistent flag: --smtp-config');
    expect(await exists(dbPath)).toBe(false);
  }, 30000);

  it('rotate-jwks promotes standby and keeps exactly two jwks slots', async () => {
    const dbPath = await createTempDbPath();

    const createResult = await runBuiltCli(['create', dbPath]);

    expect(createResult.exitCode).toBe(0);

    const beforeDb = createDatabaseClient(dbPath);
    const beforeRows = beforeDb
      .prepare('SELECT id, kid FROM jwks_keys ORDER BY id ASC')
      .all() as Array<{ id: string; kid: string }>;

    beforeDb.close();

    const rotateResult = await runBuiltCli(['rotate-jwks', dbPath]);

    expect(rotateResult.exitCode).toBe(0);
    expect(await countRows(dbPath, 'jwks_keys')).toBe(2);

    const db = createDatabaseClient(dbPath);

    try {
      const rows = db
        .prepare('SELECT id, kid FROM jwks_keys ORDER BY id ASC')
        .all() as Array<{ id: string; kid: string }>;

      expect(beforeRows.map((row) => row.id)).toEqual(['CURRENT', 'STANDBY']);
      expect(rows.map((row) => row.id)).toEqual(['CURRENT', 'STANDBY']);
      expect(rows[0]?.kid).toBe(beforeRows[1]?.kid);
      expect(rows[1]?.kid).toBeTruthy();
      expect(rows[1]?.kid).not.toBe(beforeRows[0]?.kid);
      expect(rows[1]?.kid).not.toBe(beforeRows[1]?.kid);
    } finally {
      db.close();
    }
  }, 30000);

  it('creates the breaking schema tables and columns', async () => {
    const { bootstrapDatabase } =
      await import('../../src/infra/db/bootstrap.js');
    const { countRows, createTempDbPath, listTables } =
      await import('../helpers/db.js');
    const tempDbPath = await createTempDbPath();

    await bootstrapDatabase(tempDbPath);

    expect(await listTables(tempDbPath)).toEqual([
      'allowed_origins',
      'email_otps',
      'jwks_keys',
      'sessions',
      'smtp_configs',
      'users',
      'webauthn_challenges',
      'webauthn_credentials',
    ]);
    expect(await countRows(tempDbPath, 'users')).toBe(0);

    const db = createDatabaseClient(tempDbPath);

    try {
      const credentialColumns = db
        .prepare("PRAGMA table_info('webauthn_credentials')")
        .all() as Array<{ name: string; notnull: number }>;
      const challengeColumns = db
        .prepare("PRAGMA table_info('webauthn_challenges')")
        .all() as Array<{ name: string; notnull: number }>;

      expect(credentialColumns).toContainEqual(
        expect.objectContaining({ name: 'rp_id', notnull: 1 }),
      );
      expect(challengeColumns).toContainEqual(
        expect.objectContaining({ name: 'rp_id', notnull: 1 }),
      );
      expect(challengeColumns).toContainEqual(
        expect.objectContaining({ name: 'origin', notnull: 1 }),
      );
    } finally {
      db.close();
    }
  });

  it('fails bootstrap on a legacy database with an incompatible schema error', async () => {
    const { bootstrapDatabase } =
      await import('../../src/infra/db/bootstrap.js');
    const dbPath = await createLegacySchemaDbPath();
    const bootstrap = bootstrapDatabase(dbPath);

    await expect(bootstrap).rejects.toThrow(/schema/i);
    await expect(bootstrap).rejects.toThrow(/rebuild or migrate/i);
    await expect(listTables(dbPath)).resolves.toEqual([
      'email_otps',
      'jwks_keys',
      'sessions',
      'smtp_configs',
      'users',
      'webauthn_challenges',
      'webauthn_credentials',
    ]);
  });

  it('bootstraps a sessions table missing only auth_method and backfills legacy rows', async () => {
    const { bootstrapDatabase } =
      await import('../../src/infra/db/bootstrap.js');
    const { createDatabaseClient } =
      await import('../../src/infra/db/client.js');
    const dbPath = await createSessionAuthMethodCompatDbPath();

    await expect(bootstrapDatabase(dbPath)).resolves.toBeUndefined();

    const db = createDatabaseClient(dbPath);

    try {
      const sessionColumns = db
        .prepare("PRAGMA table_info('sessions')")
        .all() as Array<{
        name: string;
      }>;
      const sessionRow = db
        .prepare('SELECT auth_method FROM sessions WHERE id = ? LIMIT 1')
        .get('session-1') as { auth_method: string };

      expect(sessionColumns.map((column) => column.name)).toContain(
        'auth_method',
      );
      expect(sessionRow).toEqual({ auth_method: 'email_otp' });
    } finally {
      db.close();
    }
  });

  it('fails bootstrap when a new-schema jwks table contains an extra row', async () => {
    const { bootstrapKeys } = await import('../../src/modules/jwks/service.js');
    const dbPath = await createMalformedJwksSlotDbPath({
      rows: [
        { id: 'CURRENT', kid: 'kid-current' },
        { id: 'STANDBY', kid: 'kid-standby' },
        { id: 'NEXT', kid: 'kid-next' },
      ],
      includeIdSlotCheck: false,
    });
    const db = createDatabaseClient(dbPath);

    try {
      await expect(bootstrapKeys(db)).rejects.toThrow(/schema/i);
      await expect(bootstrapKeys(db)).rejects.toThrow(/rebuild or migrate/i);
    } finally {
      db.close();
    }
  });

  it('fails bootstrap when a new-schema jwks table contains an invalid slot id', async () => {
    const { bootstrapKeys } = await import('../../src/modules/jwks/service.js');
    const dbPath = await createMalformedJwksSlotDbPath({
      rows: [{ id: 'BROKEN', kid: 'kid-broken' }],
      includeIdSlotCheck: false,
    });
    const db = createDatabaseClient(dbPath);

    try {
      await expect(bootstrapKeys(db)).rejects.toThrow(/schema/i);
      await expect(bootstrapKeys(db)).rejects.toThrow(/rebuild or migrate/i);
    } finally {
      db.close();
    }
  });

  it('fails bootstrap when a new-schema jwks table lacks kid uniqueness', async () => {
    const { bootstrapDatabase } =
      await import('../../src/infra/db/bootstrap.js');
    const dbPath = await createMalformedJwksSlotDbPath({
      rows: [
        { id: 'CURRENT', kid: 'kid-current' },
        { id: 'STANDBY', kid: 'kid-standby' },
      ],
      includeKidUnique: false,
    });

    await expect(bootstrapDatabase(dbPath)).rejects.toThrow(/schema/i);
    await expect(bootstrapDatabase(dbPath)).rejects.toThrow(
      /jwks_keys slot contract/i,
    );
  });

  it('fails bootstrap when a new-schema jwks table allows nullable slot fields', async () => {
    const { bootstrapDatabase } =
      await import('../../src/infra/db/bootstrap.js');
    const dbPath = await createMalformedJwksSlotDbPath({
      rows: [
        { id: 'CURRENT', kid: 'kid-current' },
        { id: 'STANDBY', kid: 'kid-standby' },
      ],
      nullableColumns: ['kid', 'alg', 'public_jwk', 'private_jwk'],
    });

    await expect(bootstrapDatabase(dbPath)).rejects.toThrow(/schema/i);
    await expect(bootstrapDatabase(dbPath)).rejects.toThrow(
      /jwks_keys slot contract/i,
    );
  });

  it('fails bootstrap when a new-schema jwks table duplicates a slot id', async () => {
    const { bootstrapKeys } = await import('../../src/modules/jwks/service.js');
    const dbPath = await createMalformedJwksSlotDbPath({
      rows: [
        { id: 'CURRENT', kid: 'kid-current-1' },
        { id: 'CURRENT', kid: 'kid-current-2' },
      ],
      includeIdPrimaryKey: false,
      includeIdSlotCheck: false,
    });
    const db = createDatabaseClient(dbPath);

    try {
      await expect(bootstrapKeys(db)).rejects.toThrow(/schema/i);
      await expect(bootstrapKeys(db)).rejects.toThrow(/rebuild or migrate/i);
    } finally {
      db.close();
    }
  });

  it('fails bootstrap when jwks columns exist without slot schema constraints', async () => {
    const { bootstrapDatabase } =
      await import('../../src/infra/db/bootstrap.js');
    const dbPath = await createMalformedJwksSlotDbPath({
      rows: [
        { id: 'CURRENT', kid: 'kid-current' },
        { id: 'STANDBY', kid: 'kid-standby' },
      ],
      includeIdPrimaryKey: false,
      includeIdSlotCheck: false,
    });

    await expect(bootstrapDatabase(dbPath)).rejects.toThrow(/schema/i);
    await expect(bootstrapDatabase(dbPath)).rejects.toThrow(
      /rebuild or migrate/i,
    );
  });

  it('seeds allowed origins through the test app helper', async () => {
    const { createTestApp } = await import('../helpers/app.js');
    const testApp = await createTestApp({
      origins: ['https://app.example.com', 'https://admin.example.com'],
    });

    try {
      const allowedOrigins = testApp.db
        .prepare('SELECT origin FROM allowed_origins ORDER BY origin ASC')
        .all() as Array<{ origin: string }>;

      expect(allowedOrigins).toEqual([
        { origin: 'https://admin.example.com' },
        { origin: 'https://app.example.com' },
      ]);
    } finally {
      testApp.close();
    }
  });

  it('enforces a globally unique webauthn credential id', async () => {
    const { bootstrapDatabase } =
      await import('../../src/infra/db/bootstrap.js');
    const { createDatabaseClient } =
      await import('../../src/infra/db/client.js');
    const { createTempDbPath } = await import('../helpers/db.js');
    const tempDbPath = await createTempDbPath();

    await bootstrapDatabase(tempDbPath);

    const db = createDatabaseClient(tempDbPath);

    try {
      db.prepare(
        'INSERT INTO users (id, email, email_verified_at) VALUES (?, ?, ?)',
      ).run('user-1', 'first@example.com', '2026-03-31T00:00:00.000Z');
      db.prepare(
        'INSERT INTO users (id, email, email_verified_at) VALUES (?, ?, ?)',
      ).run('user-2', 'second@example.com', '2026-03-31T00:00:00.000Z');

      db.prepare(
        [
          'INSERT INTO webauthn_credentials',
          '(id, user_id, credential_id, public_key, counter, transports, rp_id)',
          'VALUES (?, ?, ?, ?, ?, ?, ?)',
        ].join(' '),
      ).run(
        'cred-1',
        'user-1',
        'shared-credential',
        'pk-1',
        0,
        'internal',
        'example.com',
      );

      expect(() => {
        db.prepare(
          [
            'INSERT INTO webauthn_credentials',
            '(id, user_id, credential_id, public_key, counter, transports, rp_id)',
            'VALUES (?, ?, ?, ?, ?, ?, ?)',
          ].join(' '),
        ).run(
          'cred-2',
          'user-2',
          'shared-credential',
          'pk-2',
          0,
          'usb',
          'example.com',
        );
      }).toThrowError(
        /UNIQUE constraint failed: webauthn_credentials.credential_id/,
      );
    } finally {
      db.close();
    }
  });

  it('requires a user for register challenges but not authenticate challenges', async () => {
    const { bootstrapDatabase } =
      await import('../../src/infra/db/bootstrap.js');
    const { createDatabaseClient } =
      await import('../../src/infra/db/client.js');
    const { createTempDbPath } = await import('../helpers/db.js');
    const tempDbPath = await createTempDbPath();

    await bootstrapDatabase(tempDbPath);

    const db = createDatabaseClient(tempDbPath);

    try {
      db.prepare(
        'INSERT INTO users (id, email, email_verified_at) VALUES (?, ?, ?)',
      ).run('user-1', 'user@example.com', '2026-03-31T00:00:00.000Z');

      expect(() => {
        db.prepare(
          [
            'INSERT INTO webauthn_challenges',
            '(request_id, type, challenge, user_id, expires_at, rp_id, origin)',
            'VALUES (?, ?, ?, ?, ?, ?, ?)',
          ].join(' '),
        ).run(
          'register-missing-user',
          'register',
          'challenge',
          null,
          '2030-01-01T00:00:00.000Z',
          'example.com',
          'https://app.example.com',
        );
      }).toThrowError(/CHECK constraint failed/);

      expect(() => {
        db.prepare(
          [
            'INSERT INTO webauthn_challenges',
            '(request_id, type, challenge, user_id, expires_at, rp_id, origin)',
            'VALUES (?, ?, ?, ?, ?, ?, ?)',
          ].join(' '),
        ).run(
          'authenticate-without-user',
          'authenticate',
          'challenge',
          null,
          '2030-01-01T00:00:00.000Z',
          'example.com',
          'https://app.example.com',
        );
      }).not.toThrow();

      expect(() => {
        db.prepare(
          [
            'INSERT INTO webauthn_challenges',
            '(request_id, type, challenge, user_id, expires_at, rp_id, origin)',
            'VALUES (?, ?, ?, ?, ?, ?, ?)',
          ].join(' '),
        ).run(
          'authenticate-with-user',
          'authenticate',
          'challenge',
          'user-1',
          '2030-01-01T00:00:00.000Z',
          'example.com',
          'https://app.example.com',
        );
      }).toThrowError(/CHECK constraint failed/);
    } finally {
      db.close();
    }
  });

  it('restricts jwks slot ids to CURRENT and STANDBY', async () => {
    const { bootstrapDatabase } =
      await import('../../src/infra/db/bootstrap.js');
    const { createDatabaseClient } =
      await import('../../src/infra/db/client.js');
    const { createTempDbPath } = await import('../helpers/db.js');
    const tempDbPath = await createTempDbPath();

    await bootstrapDatabase(tempDbPath);

    const db = createDatabaseClient(tempDbPath);

    try {
      db.prepare(
        [
          'INSERT INTO jwks_keys',
          '(id, kid, alg, public_jwk, private_jwk)',
          'VALUES (?, ?, ?, ?, ?)',
        ].join(' '),
      ).run('CURRENT', 'kid-current', 'EdDSA', '{}', '{}');

      expect(() => {
        db.prepare(
          [
            'INSERT INTO jwks_keys',
            '(id, kid, alg, public_jwk, private_jwk)',
            'VALUES (?, ?, ?, ?, ?)',
          ].join(' '),
        ).run('INVALID', 'kid-invalid', 'EdDSA', '{}', '{}');
      }).toThrowError(/CHECK constraint failed/);

      expect(() =>
        db
          .prepare(
            [
              'INSERT INTO jwks_keys',
              '(id, kid, alg, public_jwk, private_jwk)',
              'VALUES (?, ?, ?, ?, ?)',
            ].join(' '),
          )
          .run('STANDBY', 'kid-standby', 'EdDSA', '{}', '{}'),
      ).not.toThrow();
    } finally {
      db.close();
    }
  });
});
