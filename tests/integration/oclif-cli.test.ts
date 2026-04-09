import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseClient } from '../../src/infra/db/client.js';
import { runBuiltCli, runPackedCli } from '../helpers/cli.js';
import {
  countRows,
  createLegacySchemaDbPath,
  createTempDbPath,
} from '../helpers/db.js';

describe('oclif cli contract', () => {
  beforeAll(async () => {
    await runPackedCli(['--version']);
  }, 60000);

  it('supports init as the primary bootstrap command', async () => {
    const dbPath = await createTempDbPath();

    const createResult = await runBuiltCli(['init', dbPath]);

    expect(createResult.exitCode).toBe(0);
    expect(createResult.stdout).toContain('cli.init.started');
    expect(createResult.stdout).toContain('cli.init.completed');
    expect(createResult.stdout).not.toContain('cli.create.');
    expect(await countRows(dbPath, 'jwks_keys')).toBe(2);

    const beforeRotate = await listJwksKids(dbPath);

    expect(beforeRotate).toHaveLength(2);
    expect(beforeRotate.map((row) => row.id)).toEqual(['CURRENT', 'STANDBY']);

    const result = await runBuiltCli(['rotate', 'jwks', dbPath]);

    expect(result.exitCode).toBe(0);
    expect(await countRows(dbPath, 'jwks_keys')).toBe(2);

    const afterRotate = await listJwksKids(dbPath);

    expect(afterRotate).toHaveLength(2);
    expect(afterRotate.map((row) => row.id)).toEqual(['CURRENT', 'STANDBY']);
    expect(afterRotate[0]?.kid).toBe(beforeRotate[1]?.kid);
    expect(afterRotate[1]?.kid).toBeTruthy();
    expect(afterRotate[1]?.kid).not.toBe(beforeRotate[0]?.kid);
    expect(afterRotate[1]?.kid).not.toBe(beforeRotate[1]?.kid);
  }, 15000);

  it('keeps rotate-jwks as a compatibility alias', async () => {
    const dbPath = await createTempDbPath();

    const createResult = await runBuiltCli(['create', dbPath]);

    expect(createResult.exitCode).toBe(0);
    expect(await countRows(dbPath, 'jwks_keys')).toBe(2);

    const beforeRotate = await listJwksKids(dbPath);

    expect(beforeRotate).toHaveLength(2);
    expect(beforeRotate.map((row) => row.id)).toEqual(['CURRENT', 'STANDBY']);

    const result = await runBuiltCli(['rotate-jwks', dbPath]);

    expect(result.exitCode).toBe(0);
    expect(await countRows(dbPath, 'jwks_keys')).toBe(2);

    const afterRotate = await listJwksKids(dbPath);

    expect(afterRotate).toHaveLength(2);
    expect(afterRotate.map((row) => row.id)).toEqual(['CURRENT', 'STANDBY']);
    expect(afterRotate[0]?.kid).toBe(beforeRotate[1]?.kid);
    expect(afterRotate[1]?.kid).toBeTruthy();
    expect(afterRotate[1]?.kid).not.toBe(beforeRotate[0]?.kid);
    expect(afterRotate[1]?.kid).not.toBe(beforeRotate[1]?.kid);
  });

  it('keeps create as a compatibility alias', async () => {
    const dbPath = await createTempDbPath();

    const result = await runBuiltCli(['create', dbPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('cli.init.started');
    expect(result.stdout).toContain('cli.init.completed');
    expect(result.stdout).not.toContain('cli.create.');
    expect(await countRows(dbPath, 'jwks_keys')).toBe(2);
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
    expect(result.stdout).toContain('auth-mini rotate jwks INSTANCE');
    expect(result.stdout).toContain(
      'Auth-mini instance (currently a SQLite database path)',
    );
    expect(result.stdout).toContain(
      'Promote the standby JWKS signing key and generate a new standby key',
    );
    expect(result.stdout).not.toContain('active JWKS signing key');
  }, 30000);

  it('discovers nested origin add command from the packed artifact', async () => {
    const result = await runPackedCli(['origin', 'add', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('USAGE');
    expect(result.stdout).toContain('auth-mini origin add INSTANCE');
    expect(result.stdout).toContain(
      'Auth-mini instance (currently a SQLite database path)',
    );
  }, 30000);

  it('routes rotate-jwks alias from the packed artifact', async () => {
    const result = await runPackedCli(['rotate-jwks', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('USAGE');
    expect(result.stdout).toContain('auth-mini rotate-jwks INSTANCE');
    expect(result.stdout).toContain(
      'Auth-mini instance (currently a SQLite database path)',
    );
    expect(result.stdout).toContain(
      'Promote the standby JWKS signing key and generate a new standby key',
    );
    expect(result.stdout).not.toContain('active JWKS signing key');
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
    const cliDoc = await readFile(
      resolve(process.cwd(), 'docs/reference/cli-and-operations.md'),
      'utf8',
    );

    expect(pkg.engines?.node).toBe('>=20.10.0');
    expect(cliDoc).toContain('Node.js 20.10+');
  });

  it('prints help to stdout only', async () => {
    const result = await runBuiltCli(['start', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('USAGE');
  });

  it('documents rotate jwks migration semantics in the CLI operations doc', async () => {
    const cliDoc = await readFile(
      resolve(process.cwd(), 'docs/reference/cli-and-operations.md'),
      'utf8',
    );

    expect(cliDoc).toContain('npx auth-mini rotate jwks ./auth-mini.sqlite');
    expect(cliDoc).toContain('npx auth-mini init ./auth-mini.sqlite');
    expect(cliDoc).toContain(
      '`create` remains available as a compatibility alias',
    );
    expect(cliDoc).toContain(
      '`<instance>` currently means the path to your auth-mini SQLite database file.',
    );
    expect(cliDoc).toContain(
      'By default, CLI errors stay concise; use `--verbose` for detailed diagnostics.',
    );
    expect(cliDoc).toContain(
      '`rotate-jwks` remains available only as a transition/compatibility alias during the migration release.',
    );
    expect(cliDoc).toContain(
      '`/jwks` always publishes the `CURRENT` and `STANDBY` keys.',
    );
    expect(cliDoc).toContain(
      '`rotate jwks` promotes `STANDBY` to `CURRENT`, then generates a fresh `STANDBY`.',
    );
    expect(cliDoc).toContain(
      'After rotation, the previous `CURRENT` key is no longer retained.',
    );
    expect(cliDoc).not.toContain(
      'once allowed-origin runtime configuration is wired back into the CLI/runtime contract',
    );
    expect(cliDoc).not.toContain(
      'When allowed-origin runtime configuration returns',
    );
    expect(cliDoc).not.toContain(
      'current `start` CLI contract does not expose that setup yet',
    );
  });

  it('documents the current CLI workflow in the CLI operations doc', async () => {
    const cliDoc = await readFile(
      resolve(process.cwd(), 'docs/reference/cli-and-operations.md'),
      'utf8',
    );
    const deployDoc = await readFile(
      resolve(process.cwd(), 'docs/deploy/docker-cloudflared.md'),
      'utf8',
    );

    expect(cliDoc).toContain('npx auth-mini init ./auth-mini.sqlite');
    expect(cliDoc).toContain('npx auth-mini start ./auth-mini.sqlite \\');
    expect(cliDoc).toContain('--host 127.0.0.1');
    expect(cliDoc).toContain('--port 7777');
    expect(cliDoc).toContain('--issuer https://auth.zccz14.com');
    expect(cliDoc).toContain(
      'npx auth-mini origin add ./auth-mini.sqlite --value https://app.example.com',
    );
    expect(cliDoc).toContain('npx auth-mini origin list ./auth-mini.sqlite');
    expect(cliDoc).toContain(
      'npx auth-mini origin update ./auth-mini.sqlite --id 1 --value https://admin.example.com',
    );
    expect(cliDoc).toContain(
      'npx auth-mini origin delete ./auth-mini.sqlite --id 1',
    );
    expect(cliDoc).toContain(
      'npx auth-mini smtp add ./auth-mini.sqlite --host smtp.example.com --port 587',
    );
    expect(cliDoc).toContain('npx auth-mini smtp list ./auth-mini.sqlite');
    expect(cliDoc).toContain(
      'npx auth-mini smtp update ./auth-mini.sqlite --id 1 --secure true',
    );
    expect(cliDoc).toContain(
      'npx auth-mini smtp delete ./auth-mini.sqlite --id 1',
    );
    expect(cliDoc).not.toContain('https://auth.example.com');
    expect(cliDoc).not.toContain('--smtp-config');
    expect(cliDoc).not.toContain(
      'auth-mini start ./auth-mini.sqlite --issuer https://auth.zccz14.com --origin',
    );
    expect(cliDoc).not.toContain('--rp-id');
    expect(cliDoc).not.toContain(
      'Multiple tabs sharing one session can currently race during refresh-token rotation and invalidate one another. This is a known SDK bug, not a product contract.',
    );

    expect(deployDoc).toContain(
      'npx auth-mini origin add /data/auth.sqlite --value https://app.example.com',
    );
    expect(deployDoc).toContain('AUTH_ISSUER=https://auth.zccz14.com');
    expect(deployDoc).not.toContain('https://auth.example.com');
  });

  it('prints origin and smtp topic help with the instance contract', async () => {
    const originHelp = await runPackedCli(['origin', '--help']);
    const smtpHelp = await runPackedCli(['smtp', '--help']);

    expect(originHelp.exitCode).toBe(0);
    expect(originHelp.stderr).toBe('');
    expect(originHelp.stdout).toContain('add');
    expect(originHelp.stdout).toContain('list');
    expect(originHelp.stdout).toContain('update');
    expect(originHelp.stdout).toContain('delete');

    expect(smtpHelp.exitCode).toBe(0);
    expect(smtpHelp.stderr).toBe('');
    expect(smtpHelp.stdout).toContain('add');
    expect(smtpHelp.stdout).toContain('list');
    expect(smtpHelp.stdout).toContain('update');
    expect(smtpHelp.stdout).toContain('delete');
  }, 30000);

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

  it('starts by loading allowed origins from the instance database', async () => {
    const dbPath = await createTempDbPath();
    const createResult = await runBuiltCli(['create', dbPath]);

    expect(createResult.exitCode).toBe(0);

    const db = createDatabaseClient(dbPath);

    try {
      db.prepare('INSERT INTO allowed_origins (origin) VALUES (?)').run(
        'https://app.example.com',
      );
    } finally {
      db.close();
    }

    const result = await startBuiltCliAndWaitForListening([
      'start',
      dbPath,
      '--issuer',
      'https://issuer.example',
      '--port',
      String(await getAvailablePort()),
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('cli.start.started');
    expect(result.stdout).toContain('server.listening');
    expect(result.stdout).toContain('server.shutdown.completed');
    expect(result.stderr).toBe('');
  }, 15000);

  it('fails fast with a schema upgrade error when starting against a legacy database', async () => {
    const dbPath = await createLegacySchemaDbPath();

    const result = await runBuiltCli([
      'start',
      dbPath,
      '--issuer',
      'https://issuer.example',
    ]);

    expect(result.exitCode).toBeGreaterThan(0);
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

async function listJwksKids(
  dbPath: string,
): Promise<Array<{ id: string; kid: string }>> {
  const db = createDatabaseClient(dbPath);

  try {
    return db
      .prepare('SELECT id, kid FROM jwks_keys ORDER BY id ASC')
      .all() as Array<{ id: string; kid: string }>;
  } finally {
    db.close();
  }
}

async function getAvailablePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address === 'string') {
        reject(
          new Error('failed to allocate a TCP port for CLI integration test'),
        );
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolvePort(address.port);
      });
    });
  });
}

async function startBuiltCliAndWaitForListening(
  args: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const cliEntrypoint = resolve(process.cwd(), 'dist/index.js');

  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [cliEntrypoint, ...args], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let shuttingDown = false;

    const finish = (exitCode: number | null) => {
      resolveRun({
        exitCode: exitCode ?? 1,
        stdout,
        stderr,
      });
    };

    child.once('error', reject);
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();

      if (!shuttingDown && stdout.includes('server.listening')) {
        shuttingDown = true;
        child.kill('SIGTERM');
      }
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.once('close', finish);
  });
}
