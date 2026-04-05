import type { DatabaseClient } from '../db/client.js';

type AllowedOriginRow = {
  id: number;
  origin: string;
  created_at: string;
};

export type AllowedOrigin = {
  id: number;
  origin: string;
  createdAt: string;
};

export function normalizeAllowedOrigin(input: string): string {
  if (input === 'null') {
    throw new Error('invalid_origin');
  }

  const url = new URL(input);
  const protocol = url.protocol.toLowerCase();

  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error('invalid_origin');
  }

  if (url.username || url.password) {
    throw new Error('invalid_origin');
  }

  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('invalid_origin');
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  const port = url.port && isDefaultPort(protocol, url.port) ? '' : url.port;
  const host = port ? `${hostname}:${port}` : hostname;

  return `${protocol}//${host}`;
}

export function listAllowedOrigins(db: DatabaseClient): AllowedOrigin[] {
  const rows = db
    .prepare(
      'SELECT id, origin, created_at FROM allowed_origins ORDER BY id ASC',
    )
    .all() as AllowedOriginRow[];

  return rows.map(mapAllowedOrigin);
}

export function insertAllowedOrigin(
  db: DatabaseClient,
  input: string,
): AllowedOrigin {
  const origin = normalizeAllowedOrigin(input);
  const result = db
    .prepare('INSERT INTO allowed_origins (origin) VALUES (?)')
    .run(origin);

  return getAllowedOriginById(
    db,
    Number(result.lastInsertRowid),
  ) as AllowedOrigin;
}

export function updateAllowedOriginById(
  db: DatabaseClient,
  id: number,
  input: string,
): AllowedOrigin | null {
  const origin = normalizeAllowedOrigin(input);
  const result = db
    .prepare('UPDATE allowed_origins SET origin = ? WHERE id = ?')
    .run(origin, id);

  return result.changes > 0 ? getAllowedOriginById(db, id) : null;
}

export function deleteAllowedOriginById(
  db: DatabaseClient,
  id: number,
): boolean {
  const result = db.prepare('DELETE FROM allowed_origins WHERE id = ?').run(id);

  return result.changes > 0;
}

function getAllowedOriginById(
  db: DatabaseClient,
  id: number,
): AllowedOrigin | null {
  const row = db
    .prepare(
      'SELECT id, origin, created_at FROM allowed_origins WHERE id = ? LIMIT 1',
    )
    .get(id) as AllowedOriginRow | undefined;

  return row ? mapAllowedOrigin(row) : null;
}

function mapAllowedOrigin(row: AllowedOriginRow): AllowedOrigin {
  return {
    id: row.id,
    origin: row.origin,
    createdAt: row.created_at,
  };
}

function isDefaultPort(protocol: string, port: string): boolean {
  return (
    (protocol === 'http:' && port === '80') ||
    (protocol === 'https:' && port === '443')
  );
}
