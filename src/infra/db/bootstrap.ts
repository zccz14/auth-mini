import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRootLogger, type AppLogger } from '../../shared/logger.js';
import {
  assertRequiredTablesAndColumns,
  createDatabaseClient,
} from './client.js';
import { runSqlFile } from './migrations.js';

const requiredRuntimeSchema = {
  sessions: ['auth_method'],
  allowed_origins: ['origin'],
  jwks_keys: ['id', 'kid', 'alg', 'public_jwk', 'private_jwk'],
  webauthn_challenges: ['rp_id', 'origin'],
  webauthn_credentials: ['rp_id'],
} as const;

const expectedJwksColumns = ['id', 'kid', 'alg', 'public_jwk', 'private_jwk'];

const knownAppTables = [
  'users',
  'email_otps',
  'sessions',
  'jwks_keys',
  'smtp_configs',
  'allowed_origins',
  'webauthn_credentials',
  'webauthn_challenges',
] as const;

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = dirname(currentFilePath);

async function resolveSchemaFilePath(): Promise<string> {
  const candidatePaths = [
    resolve(currentDirectoryPath, '../../../sql/schema.sql'),
    resolve(currentDirectoryPath, '../../../../sql/schema.sql'),
    resolve(process.cwd(), 'sql/schema.sql'),
  ];

  for (const candidatePath of candidatePaths) {
    try {
      await access(candidatePath);
      return candidatePath;
    } catch {
      continue;
    }
  }

  throw new Error(
    `Unable to locate sql/schema.sql from ${currentDirectoryPath}`,
  );
}

export async function bootstrapDatabase(
  dbPath: string,
  input?: { logger?: AppLogger },
): Promise<void> {
  const logger = input?.logger ?? createRootLogger().child({ db_path: dbPath });
  const db = createDatabaseClient(dbPath);

  try {
    logger.info(
      { event: 'db.migration.started' },
      'Database migration started',
    );

    if (hasExistingAppSchema(db)) {
      addMissingSessionAuthMethodColumn(db);
      widenLegacySessionAuthMethodConstraint(db);
      assertRequiredTablesAndColumns(db, requiredRuntimeSchema);
      assertJwksSlotSchema(db);
    }

    const schemaFilePath = await resolveSchemaFilePath();
    await runSqlFile(db, schemaFilePath);
    logger.info(
      { event: 'db.migration.completed' },
      'Database migration completed',
    );
    assertRequiredTablesAndColumns(db, requiredRuntimeSchema);
    assertJwksSlotSchema(db);
  } finally {
    db.close();
  }
}

function assertJwksSlotSchema(
  db: ReturnType<typeof createDatabaseClient>,
): void {
  const tableDefinition = db
    .prepare(
      [
        'SELECT sql',
        'FROM sqlite_master',
        "WHERE type = 'table' AND name = 'jwks_keys'",
      ].join(' '),
    )
    .get() as { sql: string | null } | undefined;

  if (!tableDefinition) {
    return;
  }

  const columns = db.prepare("PRAGMA table_info('jwks_keys')").all() as Array<{
    name: string;
    notnull: 0 | 1;
    pk: number;
  }>;
  const indexes = db.prepare("PRAGMA index_list('jwks_keys')").all() as Array<{
    name: string;
    unique: 0 | 1;
  }>;
  const normalizedSql = normalizeSql(tableDefinition.sql ?? '');
  const primaryKeyColumns = columns.filter((column) => column.pk > 0);
  const requiredNotNullColumns = new Set([
    'kid',
    'alg',
    'public_jwk',
    'private_jwk',
  ]);
  const hasUniqueKidIndex = indexes.some((index) => {
    if (index.unique !== 1) {
      return false;
    }

    const indexColumns = db
      .prepare(`PRAGMA index_info(${index.name})`)
      .all() as Array<{
      name: string;
    }>;

    return indexColumns.length === 1 && indexColumns[0]?.name === 'kid';
  });

  if (
    columns.length !== expectedJwksColumns.length ||
    columns.some(
      (column, index) => column.name !== expectedJwksColumns[index],
    ) ||
    columns.some(
      (column) =>
        requiredNotNullColumns.has(column.name) && column.notnull !== 1,
    ) ||
    primaryKeyColumns.length !== 1 ||
    primaryKeyColumns[0]?.name !== 'id' ||
    !hasUniqueKidIndex ||
    !normalizedSql.includes(
      "id text primary key check (id in ('current', 'standby'))",
    )
  ) {
    throw new Error(
      [
        'Database schema is incompatible with this auth-mini version; rebuild or migrate the instance.',
        'Missing required schema entries: jwks_keys slot contract',
      ].join(' '),
    );
  }
}

function normalizeSql(sql: string): string {
  return sql.trim().replace(/\s+/g, ' ').toLowerCase();
}

function addMissingSessionAuthMethodColumn(
  db: ReturnType<typeof createDatabaseClient>,
): void {
  if (
    tableExists(db, 'sessions') &&
    !tableHasColumn(db, 'sessions', 'auth_method')
  ) {
    db.exec(
      [
        'ALTER TABLE sessions',
        "ADD COLUMN auth_method TEXT NOT NULL DEFAULT 'email_otp'",
        "CHECK (auth_method IN ('email_otp', 'webauthn', 'ed25519'))",
      ].join(' '),
    );
  }
}

function widenLegacySessionAuthMethodConstraint(
  db: ReturnType<typeof createDatabaseClient>,
): void {
  if (
    !tableExists(db, 'users') ||
    !tableExists(db, 'sessions') ||
    !tableHasColumn(db, 'sessions', 'auth_method')
  ) {
    return;
  }

  const tableDefinition = db
    .prepare(
      [
        'SELECT sql',
        'FROM sqlite_master',
        "WHERE type = 'table' AND name = 'sessions'",
      ].join(' '),
    )
    .get() as { sql: string | null } | undefined;
  const normalizedSql = normalizeSql(tableDefinition?.sql ?? '');

  if (
    !normalizedSql.includes(
      "check (auth_method in ('email_otp', 'webauthn'))",
    ) ||
    normalizedSql.includes('ed25519')
  ) {
    return;
  }

  db.transaction(() => {
    db.exec('ALTER TABLE sessions RENAME TO sessions_legacy_auth_method');
    db.exec(`
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        refresh_token_hash TEXT NOT NULL,
        auth_method TEXT NOT NULL CHECK (auth_method IN ('email_otp', 'webauthn', 'ed25519')),
        expires_at TEXT NOT NULL,
        revoked_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    db.exec(`
      INSERT INTO sessions (
        id,
        user_id,
        refresh_token_hash,
        auth_method,
        expires_at,
        revoked_at,
        created_at
      )
      SELECT
        id,
        user_id,
        refresh_token_hash,
        auth_method,
        expires_at,
        revoked_at,
        created_at
      FROM sessions_legacy_auth_method
    `);
    db.exec('DROP TABLE sessions_legacy_auth_method');
  })();
}

function tableExists(
  db: ReturnType<typeof createDatabaseClient>,
  tableName: string,
): boolean {
  return Boolean(
    db
      .prepare(
        [
          'SELECT 1 AS present',
          'FROM sqlite_master',
          "WHERE type = 'table' AND name = ?",
        ].join(' '),
      )
      .get(tableName),
  );
}

function tableHasColumn(
  db: ReturnType<typeof createDatabaseClient>,
  tableName: string,
  columnName: string,
): boolean {
  const columns = db
    .prepare(`PRAGMA table_info('${tableName}')`)
    .all() as Array<{
    name: string;
  }>;

  return columns.some((column) => column.name === columnName);
}

function hasExistingAppSchema(
  db: ReturnType<typeof createDatabaseClient>,
): boolean {
  const rows = db
    .prepare(
      [
        'SELECT name',
        'FROM sqlite_master',
        "WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
      ].join(' '),
    )
    .all() as Array<{ name: string }>;

  const tableNames = new Set(rows.map((row) => row.name));

  return knownAppTables.some((tableName) => tableNames.has(tableName));
}
