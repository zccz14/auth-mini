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
    pk: number;
  }>;
  const normalizedSql = normalizeSql(tableDefinition.sql ?? '');
  const primaryKeyColumns = columns.filter((column) => column.pk > 0);

  if (
    columns.length !== expectedJwksColumns.length ||
    columns.some(
      (column, index) => column.name !== expectedJwksColumns[index],
    ) ||
    primaryKeyColumns.length !== 1 ||
    primaryKeyColumns[0]?.name !== 'id' ||
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
