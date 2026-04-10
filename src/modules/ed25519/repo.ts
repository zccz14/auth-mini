import { randomUUID } from 'node:crypto';
import type { DatabaseClient } from '../../infra/db/client.js';

type CredentialRow = {
  id: string;
  user_id: string;
  name: string;
  public_key: string;
  last_used_at: string | null;
  created_at: string;
};

type ChallengeRow = {
  request_id: string;
  credential_id: string;
  challenge: string;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

export type StoredEd25519Credential = {
  id: string;
  userId: string;
  name: string;
  publicKey: string;
  lastUsedAt: string | null;
  createdAt: string;
};

export type Ed25519Challenge = {
  requestId: string;
  credentialId: string;
  challenge: string;
  expiresAt: string;
  consumedAt: string | null;
  createdAt: string;
};

export function createCredential(
  db: DatabaseClient,
  input: { userId: string; name: string; publicKey: string },
): StoredEd25519Credential {
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(
    [
      'INSERT INTO ed25519_credentials',
      '(id, user_id, name, public_key, created_at)',
      'VALUES (?, ?, ?, ?, ?)',
    ].join(' '),
  ).run(id, input.userId, input.name, input.publicKey, createdAt);

  return getCredentialById(db, id) as StoredEd25519Credential;
}

export function getCredentialById(
  db: DatabaseClient,
  id: string,
): StoredEd25519Credential | null {
  const row = db
    .prepare(
      'SELECT id, user_id, name, public_key, last_used_at, created_at FROM ed25519_credentials WHERE id = ? LIMIT 1',
    )
    .get(id) as CredentialRow | undefined;

  return row ? mapCredential(row) : null;
}

export function listCredentialsByUserId(
  db: DatabaseClient,
  userId: string,
): StoredEd25519Credential[] {
  const rows = db
    .prepare(
      [
        'SELECT id, user_id, name, public_key, last_used_at, created_at',
        'FROM ed25519_credentials',
        'WHERE user_id = ?',
        'ORDER BY created_at ASC, id ASC',
      ].join(' '),
    )
    .all(userId) as CredentialRow[];

  return rows.map(mapCredential);
}

export function updateCredentialName(
  db: DatabaseClient,
  input: { id: string; userId: string; name: string },
): StoredEd25519Credential | null {
  const result = db
    .prepare(
      'UPDATE ed25519_credentials SET name = ? WHERE id = ? AND user_id = ?',
    )
    .run(input.name, input.id, input.userId);

  return result.changes > 0 ? getCredentialById(db, input.id) : null;
}

export function updateCredentialLastUsedAt(
  db: DatabaseClient,
  input: { id: string; lastUsedAt: string },
): void {
  db.prepare(
    'UPDATE ed25519_credentials SET last_used_at = ? WHERE id = ?',
  ).run(input.lastUsedAt, input.id);
}

export function deleteCredentialById(
  db: DatabaseClient,
  input: { id: string; userId: string },
): boolean {
  const result = db
    .prepare('DELETE FROM ed25519_credentials WHERE id = ? AND user_id = ?')
    .run(input.id, input.userId);

  return result.changes > 0;
}

export function createChallenge(
  db: DatabaseClient,
  input: { credentialId: string; challenge: string; expiresAt: string },
): Ed25519Challenge {
  const requestId = randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(
    [
      'INSERT INTO ed25519_challenges',
      '(request_id, credential_id, challenge, expires_at, created_at)',
      'VALUES (?, ?, ?, ?, ?)',
    ].join(' '),
  ).run(
    requestId,
    input.credentialId,
    input.challenge,
    input.expiresAt,
    createdAt,
  );

  return getChallengeByRequestId(db, requestId) as Ed25519Challenge;
}

export function getChallengeByRequestId(
  db: DatabaseClient,
  requestId: string,
): Ed25519Challenge | null {
  const row = db
    .prepare(
      [
        'SELECT request_id, credential_id, challenge, expires_at, consumed_at, created_at',
        'FROM ed25519_challenges',
        'WHERE request_id = ?',
        'LIMIT 1',
      ].join(' '),
    )
    .get(requestId) as ChallengeRow | undefined;

  return row ? mapChallenge(row) : null;
}

export function consumeChallenge(
  db: DatabaseClient,
  requestId: string,
  now: string,
): boolean {
  const result = db
    .prepare(
      'UPDATE ed25519_challenges SET consumed_at = ? WHERE request_id = ? AND consumed_at IS NULL',
    )
    .run(now, requestId);

  return result.changes > 0;
}

function mapCredential(row: CredentialRow): StoredEd25519Credential {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    publicKey: row.public_key,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
  };
}

function mapChallenge(row: ChallengeRow): Ed25519Challenge {
  return {
    requestId: row.request_id,
    credentialId: row.credential_id,
    challenge: row.challenge,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
    createdAt: row.created_at,
  };
}
