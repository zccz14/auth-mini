import { randomUUID } from 'node:crypto';
import type { DatabaseClient } from '../../infra/db/client.js';

type ChallengeRow = {
  request_id: string;
  type: 'register' | 'authenticate';
  state_json: string;
  user_id: string | null;
  expires_at: string;
  rp_id: string;
  origin: string;
  consumed_at: string | null;
  created_at: string;
};

type CredentialRow = {
  user_id: string;
  credential_id: string;
  passkey_json: string;
  rp_id: string;
  last_used_at: string | null;
  created_at: string;
};

export type WebauthnChallenge = {
  requestId: string;
  type: 'register' | 'authenticate';
  challenge: string;
  userId: string | null;
  expiresAt: string;
  rpId: string;
  origin: string;
  consumedAt: string | null;
  createdAt: string;
};

export type StoredWebauthnCredential = {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string[];
  rpId: string;
  lastUsedAt: string | null;
  createdAt: string;
};

type ChallengeStateJson = {
  challenge: string;
};

type CredentialStateJson = {
  publicKey: string;
  counter: number;
  transports: string[];
};

export function createChallenge(
  db: DatabaseClient,
  input: {
    type: 'register' | 'authenticate';
    challenge: string;
    userId: string | null;
    expiresAt: string;
    rpId: string;
    origin: string;
  },
): WebauthnChallenge {
  const requestId = randomUUID();

  db.prepare(
    [
      'INSERT INTO webauthn_challenges',
      '(request_id, type, state_json, user_id, expires_at, rp_id, origin)',
      'VALUES (?, ?, ?, ?, ?, ?, ?)',
    ].join(' '),
  ).run(
    requestId,
    input.type,
    JSON.stringify({ challenge: input.challenge } satisfies ChallengeStateJson),
    input.userId,
    input.expiresAt,
    input.rpId,
    input.origin,
  );

  return getChallengeByRequestId(db, requestId) as WebauthnChallenge;
}

export function consumeUnusedRegistrationChallengesForUser(
  db: DatabaseClient,
  userId: string,
  now: string,
): number {
  const result = db
    .prepare(
      [
        'UPDATE webauthn_challenges',
        'SET consumed_at = ?',
        "WHERE type = 'register' AND user_id = ? AND consumed_at IS NULL",
      ].join(' '),
    )
    .run(now, userId);

  return result.changes;
}

export function getChallengeByRequestId(
  db: DatabaseClient,
  requestId: string,
): WebauthnChallenge | null {
  const row = db
    .prepare(
      [
        'SELECT request_id, type, state_json, user_id, expires_at, rp_id, origin, consumed_at, created_at',
        'FROM webauthn_challenges',
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
      'UPDATE webauthn_challenges SET consumed_at = ? WHERE request_id = ? AND consumed_at IS NULL',
    )
    .run(now, requestId);

  return result.changes > 0;
}

export function createCredential(
  db: DatabaseClient,
  input: {
    userId: string;
    credentialId: string;
    publicKey: string;
    counter: number;
    transports: string[];
    rpId: string;
  },
): StoredWebauthnCredential {
  db.prepare(
    [
      'INSERT INTO webauthn_credentials',
      '(credential_id, user_id, passkey_json, rp_id)',
      'VALUES (?, ?, ?, ?)',
    ].join(' '),
  ).run(
    input.credentialId,
    input.userId,
    JSON.stringify({
      publicKey: input.publicKey,
      counter: input.counter,
      transports: input.transports,
    } satisfies CredentialStateJson),
    input.rpId,
  );

  return getCredentialById(db, input.credentialId) as StoredWebauthnCredential;
}

export function getCredentialByCredentialId(
  db: DatabaseClient,
  credentialId: string,
): StoredWebauthnCredential | null {
  const row = db
    .prepare(
      [
        'SELECT user_id, credential_id, passkey_json, rp_id, last_used_at, created_at',
        'FROM webauthn_credentials',
        'WHERE credential_id = ?',
        'LIMIT 1',
      ].join(' '),
    )
    .get(credentialId) as CredentialRow | undefined;

  return row ? mapCredential(row) : null;
}

export function getCredentialByCredentialIdAndRpId(
  db: DatabaseClient,
  credentialId: string,
  rpId: string,
): StoredWebauthnCredential | null {
  const row = db
    .prepare(
      [
        'SELECT user_id, credential_id, passkey_json, rp_id, last_used_at, created_at',
        'FROM webauthn_credentials',
        'WHERE credential_id = ? AND rp_id = ?',
        'LIMIT 1',
      ].join(' '),
    )
    .get(credentialId, rpId) as CredentialRow | undefined;

  return row ? mapCredential(row) : null;
}

export function getCredentialById(
  db: DatabaseClient,
  id: string,
): StoredWebauthnCredential | null {
  const row = db
    .prepare(
      [
        'SELECT user_id, credential_id, passkey_json, rp_id, last_used_at, created_at',
        'FROM webauthn_credentials',
        'WHERE credential_id = ?',
        'LIMIT 1',
      ].join(' '),
    )
    .get(id) as CredentialRow | undefined;

  return row ? mapCredential(row) : null;
}

export function updateCredentialCounter(
  db: DatabaseClient,
  id: string,
  counter: number,
): void {
  db.prepare(
    "UPDATE webauthn_credentials SET passkey_json = json_set(passkey_json, '$.counter', ?) WHERE credential_id = ?",
  ).run(counter, id);
}

export function consumeChallengeAndUpdateCredentialCounter(
  db: DatabaseClient,
  input: {
    requestId: string;
    credentialId: string;
    expectedCounter: number;
    nextCounter: number;
    now: string;
  },
): boolean {
  const consume = db.prepare(
    'UPDATE webauthn_challenges SET consumed_at = ? WHERE request_id = ? AND consumed_at IS NULL',
  );
  const update = db.prepare(
    "UPDATE webauthn_credentials SET passkey_json = json_set(passkey_json, '$.counter', ?), last_used_at = ? WHERE credential_id = ? AND json_extract(passkey_json, '$.counter') = ?",
  );
  const transaction = db.transaction(
    (
      requestId: string,
      credentialId: string,
      expectedCounter: number,
      nextCounter: number,
      now: string,
    ): boolean => {
      const consumeResult = consume.run(now, requestId);

      if (consumeResult.changes === 0) {
        return false;
      }

      const updateResult = update.run(
        nextCounter,
        now,
        credentialId,
        expectedCounter,
      );

      return updateResult.changes > 0;
    },
  );

  return transaction(
    input.requestId,
    input.credentialId,
    input.expectedCounter,
    input.nextCounter,
    input.now,
  );
}

export function deleteCredentialById(
  db: DatabaseClient,
  id: string,
  userId: string,
): boolean {
  const result = db
    .prepare(
      'DELETE FROM webauthn_credentials WHERE credential_id = ? AND user_id = ?',
    )
    .run(id, userId);

  return result.changes > 0;
}

function mapChallenge(row: ChallengeRow): WebauthnChallenge {
  const state = JSON.parse(row.state_json) as ChallengeStateJson;

  return {
    requestId: row.request_id,
    type: row.type,
    challenge: state.challenge,
    userId: row.user_id,
    expiresAt: row.expires_at,
    rpId: row.rp_id,
    origin: row.origin,
    consumedAt: row.consumed_at,
    createdAt: row.created_at,
  };
}

function mapCredential(row: CredentialRow): StoredWebauthnCredential {
  const passkey = JSON.parse(row.passkey_json) as CredentialStateJson;

  return {
    id: row.credential_id,
    userId: row.user_id,
    credentialId: row.credential_id,
    publicKey: passkey.publicKey,
    counter: passkey.counter,
    transports: passkey.transports,
    rpId: row.rp_id,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
  };
}
