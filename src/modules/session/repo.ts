import { randomUUID } from 'node:crypto';
import type { DatabaseClient } from '../../infra/db/client.js';

type SessionRow = {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  auth_method: Session['authMethod'];
  ip: string | null;
  user_agent: string | null;
  expires_at: string;
  created_at: string;
};

export type Session = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  authMethod: 'email_otp' | 'webauthn' | 'ed25519';
  ip: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
};

export function createSession(
  db: DatabaseClient,
  input: {
    userId: string;
    refreshTokenHash: string;
    authMethod: Session['authMethod'];
    ip?: string | null;
    userAgent?: string | null;
    expiresAt: string;
  },
): Session {
  const id = randomUUID();

  db.prepare(
    'INSERT INTO sessions (id, user_id, refresh_token_hash, auth_method, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(
    id,
    input.userId,
    input.refreshTokenHash,
    input.authMethod,
    input.ip ?? null,
    input.userAgent ?? null,
    input.expiresAt,
  );

  return getSessionById(db, id) as Session;
}

export function getSessionById(db: DatabaseClient, id: string): Session | null {
  const row = db
    .prepare(
      'SELECT id, user_id, refresh_token_hash, auth_method, ip, user_agent, expires_at, created_at FROM sessions WHERE id = ? LIMIT 1',
    )
    .get(id) as SessionRow | undefined;

  return row ? mapSession(row) : null;
}

export function expireSessionById(
  db: DatabaseClient,
  id: string,
  now: string,
): boolean {
  const result = db
    .prepare(
      [
        'UPDATE sessions',
        'SET expires_at = ?',
        'WHERE id = ? AND expires_at > ?',
      ].join(' '),
    )
    .run(now, id, now);

  return result.changes > 0;
}

export function expireOtherActiveSessionById(
  db: DatabaseClient,
  input: {
    currentSessionId: string;
    targetSessionId: string;
    userId: string;
    now: string;
  },
): boolean {
  const result = db
    .prepare(
      [
        'UPDATE sessions',
        'SET expires_at = ?',
        'WHERE id = ? AND user_id = ? AND expires_at > ? AND id <> ?',
      ].join(' '),
    )
    .run(
      input.now,
      input.targetSessionId,
      input.userId,
      input.now,
      input.currentSessionId,
    );

  return result.changes > 0;
}

export function rotateRefreshToken(
  db: DatabaseClient,
  input: {
    sessionId: string;
    currentRefreshTokenHash: string;
    nextRefreshTokenHash: string;
    expiresAt?: string;
    now?: string;
  },
): Session | null {
  const now = input.now ?? new Date().toISOString();
  const update = db.prepare(
    [
      'UPDATE sessions',
      'SET refresh_token_hash = ?, expires_at = COALESCE(?, expires_at)',
      'WHERE id = ? AND refresh_token_hash = ? AND expires_at > ?',
    ].join(' '),
  );
  const select = db.prepare(
      [
        'SELECT id, user_id, refresh_token_hash, auth_method, ip, user_agent, expires_at, created_at',
        'FROM sessions',
        'WHERE id = ?',
        'LIMIT 1',
    ].join(' '),
  );
  const transaction = db.transaction(
    (params: typeof input, timestamp: string): Session | null => {
      const result = update.run(
        params.nextRefreshTokenHash,
        params.expiresAt ?? null,
        params.sessionId,
        params.currentRefreshTokenHash,
        timestamp,
      );

      if (result.changes === 0) {
        return null;
      }

      const row = select.get(params.sessionId) as SessionRow | undefined;

      return row ? mapSession(row) : null;
    },
  );

  return transaction(input, now);
}

function mapSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    refreshTokenHash: row.refresh_token_hash,
    authMethod: row.auth_method,
    ip: row.ip,
    userAgent: row.user_agent,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}
