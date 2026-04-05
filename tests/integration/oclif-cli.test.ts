import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDatabaseClient } from '../../src/infra/db/client.js';
import { ensureCliIsBuilt, runBuiltCli, runPackedCli } from '../helpers/cli.js';
import {
  countRows,
  createLegacySchemaDbPath,
  createTempDbPath,
} from '../helpers/db.js';

describe('oclif cli contract', () => {
  it('supports init as the primary bootstrap command', async () => {
    const dbPath = await createTempDbPath();

    const createResult = await runBuiltCli(['init', dbPath]);

    expect(createResult.exitCode).toBe(0);
    expect(createResult.stdout).toContain('cli.init.started');
    expect(createResult.stdout).toContain('cli.init.completed');
    expect(createResult.stdout).not.toContain('cli.create.');
    expect(await countRows(dbPath, 'jwks_keys')).toBe(1);
    expect(await countActiveKeys(dbPath)).toBe(1);

    const result = await runBuiltCli(['rotate', 'jwks', dbPath]);

    expect(result.exitCode).toBe(0);
    expect(await countRows(dbPath, 'jwks_keys')).toBe(2);
    expect(await countActiveKeys(dbPath)).toBe(1);
  }, 15000);

  it('keeps rotate-jwks as a compatibility alias', async () => {
    const dbPath = await createTempDbPath();

    const createResult = await runBuiltCli(['create', dbPath]);

    expect(createResult.exitCode).toBe(0);
    expect(await countRows(dbPath, 'jwks_keys')).toBe(1);
    expect(await countActiveKeys(dbPath)).toBe(1);

    const result = await runBuiltCli(['rotate-jwks', dbPath]);

    expect(result.exitCode).toBe(0);
    expect(await countRows(dbPath, 'jwks_keys')).toBe(2);
    expect(await countActiveKeys(dbPath)).toBe(1);
  });

  it('keeps create as a compatibility alias', async () => {
    const dbPath = await createTempDbPath();

    const result = await runBuiltCli(['create', dbPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('cli.init.started');
    expect(result.stdout).toContain('cli.init.completed');
    expect(result.stdout).not.toContain('cli.create.');
    expect(await countRows(dbPath, 'jwks_keys')).toBe(1);
  });

  it('prints unknown command errors to stderr', async () => {
    const result = await runBuiltCli(['wat']);

    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('command');
    expect(result.exitCode).toBeGreaterThan(0);
  });

  it('fails with usage when required args are missing', async () => {
    const result = await runBuiltCli(['init']);

    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('USAGE');
    expect(result.stderr).toContain('arg');
    expect(result.exitCode).toBeGreaterThan(0);
  });

  it('runs help from a packed install artifact', async () => {
    const result = await runPackedCli(['--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('auth-mini');
    expect(result.stdout).toContain('init');
    expect(result.stdout).not.toContain('create');
  }, 30000);

  it('runs start help from a packed install artifact', async () => {
    const result = await runPackedCli(['start', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('USAGE');
    expect(result.stdout).toContain('auth-mini start INSTANCE');
    expect(result.stdout).toContain(
      'Auth-mini instance (currently a SQLite database path)',
    );
  }, 30000);

  it('runs init help from a packed install artifact', async () => {
    const result = await runPackedCli(['init', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('USAGE');
    expect(result.stdout).toContain('auth-mini init INSTANCE');
    expect(result.stdout).toContain(
      'Auth-mini instance (currently a SQLite database path)',
    );
  }, 30000);

  it('discovers nested rotate jwks command from the packed artifact', async () => {
    const result = await runPackedCli(['rotate', 'jwks', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('USAGE');
  }, 30000);

  it('routes rotate-jwks alias from the packed artifact', async () => {
    const result = await runPackedCli(['rotate-jwks', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('USAGE');
  }, 30000);

  it('prints version from the packed artifact metadata', async () => {
    const { default: pkg } = await import('../../package.json');
    const result = await runPackedCli(['--version']);

    expect(result.stdout.trim()).toBe(pkg.version);
    expect(result.stderr).toBe('');
    expect(result.exitCode).toBe(0);
  }, 30000);

  it('documents the supported Node.js runtime floor for the CLI', async () => {
    const { default: pkg } = await import('../../package.json');
    const readme = await readFile(resolve(process.cwd(), 'README.md'), 'utf8');

    expect(pkg.engines?.node).toBe('>=20.10.0');
    expect(readme).toContain('Node.js 20.10+');
  });

  it('prints help to stdout only', async () => {
    const result = await runBuiltCli(['start', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('USAGE');
  });

  it('documents rotate jwks migration semantics in README', async () => {
    const readme = await readFile(resolve(process.cwd(), 'README.md'), 'utf8');

    expect(readme).toContain('auth-mini rotate jwks ./auth-mini.sqlite');
    expect(readme).toContain('npx auth-mini init ./auth-mini.sqlite');
    expect(readme).toContain(
      '`create` remains available as a compatibility alias',
    );
    expect(readme).toContain(
      'Auth-mini instance (currently a SQLite database path)',
    );
    expect(readme).toContain(
      'By default, CLI errors stay concise; use `--verbose` for detailed diagnostics.',
    );
    expect(readme).toContain(
      '`rotate-jwks` remains available only as a transition/compatibility alias during the migration release.',
    );
    expect(readme).not.toContain(
      'once allowed-origin runtime configuration is wired back into the CLI/runtime contract',
    );
    expect(readme).not.toContain(
      'When allowed-origin runtime configuration returns',
    );
    expect(readme).not.toContain(
      'current `start` CLI contract does not expose that setup yet',
    );
  });

  it('prints concise command errors by default', async () => {
    const result = await runBuiltCli([
      'init',
      '/tmp/db.sqlite',
      '--smtp-config',
      './missing.json',
    ]);

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('Nonexistent flag: --smtp-config');
    expect(result.stderr).toContain('See more help with --help');
    expect(result.stderr).not.toContain('Stack:');
  });

  it('prints detailed diagnostics with --verbose', async () => {
    const result = await runBuiltCli([
      'init',
      '/tmp/db.sqlite',
      '--smtp-config',
      './missing.json',
      '--verbose',
    ]);

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('Nonexistent flag: --smtp-config');
    expect(result.stderr).toContain('See more help with --help');
    expect(result.stderr).not.toContain('Stack:');
  });

  it('fails start fast until db-backed runtime resources are wired', async () => {
    await ensureCliIsBuilt();
    const dbPath = await createTempDbPath();
    const createResult = await runBuiltCli(['create', dbPath]);

    expect(createResult.exitCode).toBe(0);

    const result = await runBuiltCli([
      'start',
      dbPath,
      '--issuer',
      'https://issuer.example',
    ]);

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stdout).toContain('cli.start.started');
    expect(result.stdout).not.toContain('server.listening');
    expect(result.stderr).toContain(
      'start is not wired to db-backed allowed origins and rp_id yet',
    );
  }, 15000);

  it('fails fast with a schema upgrade error when starting against a legacy database', async () => {
    await ensureCliIsBuilt();
    const dbPath = await createLegacySchemaDbPath();

    const result = await runBuiltCli([
      'start',
      dbPath,
      '--issuer',
      'https://issuer.example',
    ]);

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stdout).toContain('cli.start.started');
    expect(result.stdout).not.toContain('server.listening');
    expect(result.stderr).toContain('schema');
    expect(result.stderr).toContain('rebuild or migrate');
    expect(result.stderr).toContain('allowed_origins');
  }, 15000);

  it('rejects removed start origin and rp-id flags during cli parsing', async () => {
    const result = await runBuiltCli([
      'start',
      '/tmp/auth-mini.sqlite',
      '--issuer',
      'https://issuer.example',
      '--origin',
      'https://app.example',
      '--rp-id',
      'example.com',
    ]);

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.stderr).toContain('Nonexistent flags: --origin, --rp-id');
    expect(result.stderr).toContain('See more help with --help');
    expect(result.stderr).toContain('USAGE');
  });
});

async function countActiveKeys(dbPath: string): Promise<number> {
  const db = createDatabaseClient(dbPath);

  try {
    const row = db
      .prepare('SELECT COUNT(*) AS count FROM jwks_keys WHERE is_active = 1')
      .get() as { count: number };

    return row.count;
  } finally {
    db.close();
  }
}
