import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';

export async function createTempDbPath(): Promise<string> {
  const directoryPath = await mkdtemp(join(tmpdir(), 'auth-mini-db-'));
  return join(directoryPath, 'auth-mini.sqlite');
}

export async function createLegacySchemaDbPath(): Promise<string> {
  const dbPath = await createTempDbPath();
  const db = new Database(dbPath);

  try {
    db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        email_verified_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE email_otps (
        email TEXT PRIMARY KEY,
        code_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        consumed_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        refresh_token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE jwks_keys (
        id TEXT PRIMARY KEY,
        kid TEXT NOT NULL UNIQUE,
        alg TEXT NOT NULL,
        public_jwk TEXT NOT NULL,
        private_jwk TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX jwks_keys_one_active_idx
        ON jwks_keys (is_active)
        WHERE is_active = 1;

      CREATE TABLE smtp_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        from_email TEXT NOT NULL,
        from_name TEXT NOT NULL DEFAULT '',
        secure INTEGER NOT NULL DEFAULT 0 CHECK (secure IN (0, 1)),
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        weight INTEGER NOT NULL DEFAULT 1 CHECK (weight > 0)
      );

      CREATE TABLE webauthn_credentials (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        credential_id TEXT NOT NULL UNIQUE,
        public_key TEXT NOT NULL,
        counter INTEGER NOT NULL DEFAULT 0,
        transports TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE webauthn_challenges (
        request_id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('register', 'authenticate')),
        challenge TEXT NOT NULL,
        user_id TEXT,
        expires_at TEXT NOT NULL,
        consumed_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK (
          (type = 'register' AND user_id IS NOT NULL) OR
          (type = 'authenticate' AND user_id IS NULL)
        ),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  } finally {
    db.close();
  }

  return dbPath;
}

type SlotFixtureRow = {
  id: string;
  kid: string;
  alg?: string;
  publicJwk?: string;
  privateJwk?: string;
};

export async function createMalformedJwksSlotDbPath(input: {
  rows: SlotFixtureRow[];
  includeIdPrimaryKey?: boolean;
  includeIdSlotCheck?: boolean;
  includeKidUnique?: boolean;
}): Promise<string> {
  const dbPath = await createTempDbPath();
  const db = new Database(dbPath);
  const idDefinition = [
    'id TEXT',
    input.includeIdPrimaryKey === false ? '' : 'PRIMARY KEY',
    input.includeIdSlotCheck === false
      ? ''
      : "CHECK (id IN ('CURRENT', 'STANDBY'))",
  ]
    .filter(Boolean)
    .join(' ');

  try {
    db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE allowed_origins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        origin TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE webauthn_credentials (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        credential_id TEXT NOT NULL UNIQUE,
        public_key TEXT NOT NULL,
        counter INTEGER NOT NULL DEFAULT 0,
        transports TEXT NOT NULL DEFAULT '',
        rp_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE webauthn_challenges (
        request_id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('register', 'authenticate')),
        challenge TEXT NOT NULL,
        user_id TEXT,
        expires_at TEXT NOT NULL,
        rp_id TEXT NOT NULL,
        origin TEXT NOT NULL,
        consumed_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE jwks_keys (
        ${idDefinition},
        kid TEXT NOT NULL${input.includeKidUnique === false ? '' : ' UNIQUE'},
        alg TEXT NOT NULL,
        public_jwk TEXT NOT NULL,
        private_jwk TEXT NOT NULL
      );
    `);

    const insert = db.prepare(
      [
        'INSERT INTO jwks_keys (id, kid, alg, public_jwk, private_jwk)',
        'VALUES (?, ?, ?, ?, ?)',
      ].join(' '),
    );

    for (const row of input.rows) {
      insert.run(
        row.id,
        row.kid,
        row.alg ?? 'EdDSA',
        row.publicJwk ?? '{}',
        row.privateJwk ?? '{}',
      );
    }
  } finally {
    db.close();
  }

  return dbPath;
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
