import type { DatabaseClient } from '../../infra/db/client.js';
import type { KeyRecord, PrivateJwk, PublicJwk } from '../../shared/crypto.js';

export type JwksSlotId = 'CURRENT' | 'STANDBY';

type JwksKeyRow = {
  id: string;
  kid: string;
  alg: 'EdDSA';
  public_jwk: string;
  private_jwk: string;
};

export type StoredJwksKey = {
  id: JwksSlotId;
  kid: string;
  alg: 'EdDSA';
  publicJwk: PublicJwk;
  privateJwk: PrivateJwk;
};

const slotOrder: readonly JwksSlotId[] = ['CURRENT', 'STANDBY'];

export function getJwksSlot(
  db: DatabaseClient,
  id: JwksSlotId,
): StoredJwksKey | null {
  const row = db
    .prepare(
      [
        'SELECT id, kid, alg, public_jwk, private_jwk',
        'FROM jwks_keys',
        'WHERE id = ?',
        'LIMIT 1',
      ].join(' '),
    )
    .get(id) as JwksKeyRow | undefined;

  return row ? mapRow(row) : null;
}

export function getKeyByKid(
  db: DatabaseClient,
  kid: string,
): StoredJwksKey | null {
  const row = db
    .prepare(
      [
        'SELECT id, kid, alg, public_jwk, private_jwk',
        'FROM jwks_keys',
        'WHERE kid = ?',
        'LIMIT 1',
      ].join(' '),
    )
    .get(kid) as JwksKeyRow | undefined;

  return row ? mapRow(row) : null;
}

export function listJwksSlots(db: DatabaseClient): StoredJwksKey[] {
  const rows = db
    .prepare(
      [
        'SELECT id, kid, alg, public_jwk, private_jwk',
        'FROM jwks_keys',
        "ORDER BY CASE id WHEN 'CURRENT' THEN 0 WHEN 'STANDBY' THEN 1 ELSE 2 END, kid ASC",
      ].join(' '),
    )
    .all() as JwksKeyRow[];

  return rows.map(mapRow);
}

export function assertValidJwksSlotState(db: DatabaseClient): void {
  const rows = db
    .prepare('SELECT id FROM jwks_keys ORDER BY rowid ASC')
    .all() as Array<{ id: string }>;

  if (rows.length === 0) {
    return;
  }

  if (rows.length > 2) {
    throw createJwksSlotContractError();
  }

  const seen = new Set<JwksSlotId>();

  for (const row of rows) {
    if (!slotOrder.includes(row.id as JwksSlotId)) {
      throw createJwksSlotContractError();
    }

    const slotId = row.id as JwksSlotId;

    if (seen.has(slotId)) {
      throw createJwksSlotContractError();
    }

    seen.add(slotId);
  }
}

export function assertCompleteJwksSlotState(db: DatabaseClient): void {
  const rows = db
    .prepare('SELECT id FROM jwks_keys ORDER BY rowid ASC')
    .all() as Array<{ id: string }>;

  if (rows.length !== slotOrder.length) {
    throw createJwksSlotContractError();
  }

  assertValidJwksSlotState(db);
}

export function insertJwksSlot(
  db: DatabaseClient,
  slotId: JwksSlotId,
  key: KeyRecord,
): void {
  db.prepare(
    [
      'INSERT INTO jwks_keys (id, kid, alg, public_jwk, private_jwk)',
      'VALUES (?, ?, ?, ?, ?)',
    ].join(' '),
  ).run(
    slotId,
    key.kid,
    key.alg,
    JSON.stringify(key.publicJwk),
    JSON.stringify(key.privateJwk),
  );
}

export function rotateJwksSlots(
  db: DatabaseClient,
  nextStandby: KeyRecord,
): StoredJwksKey {
  const selectSlot = db.prepare(
    [
      'SELECT id, kid, alg, public_jwk, private_jwk',
      'FROM jwks_keys',
      'WHERE id = ?',
      'LIMIT 1',
    ].join(' '),
  );
  const update = db.prepare(
    [
      'UPDATE jwks_keys',
      'SET kid = ?, alg = ?, public_jwk = ?, private_jwk = ?',
      'WHERE id = ?',
    ].join(' '),
  );

  return db.transaction(() => {
    const currentRow = selectSlot.get('CURRENT') as JwksKeyRow | undefined;
    const standbyRow = selectSlot.get('STANDBY') as JwksKeyRow | undefined;

    if (!currentRow || !standbyRow) {
      throw createJwksSlotContractError();
    }

    const standby = mapRow(standbyRow);

    const standbyUpdate = update.run(
      nextStandby.kid,
      nextStandby.alg,
      JSON.stringify(nextStandby.publicJwk),
      JSON.stringify(nextStandby.privateJwk),
      'STANDBY',
    );

    if (standbyUpdate.changes !== 1) {
      throw createJwksSlotContractError();
    }

    const currentUpdate = update.run(
      standby.kid,
      standby.alg,
      JSON.stringify(standby.publicJwk),
      JSON.stringify(standby.privateJwk),
      'CURRENT',
    );

    if (currentUpdate.changes !== 1) {
      throw createJwksSlotContractError();
    }

    return standby;
  })();
}

export function createJwksSlotContractError(): Error {
  return new Error(
    [
      'Database schema is incompatible with this auth-mini version; rebuild or migrate the instance.',
      'Missing required schema entries: jwks_keys slot contract',
    ].join(' '),
  );
}

function mapRow(row: JwksKeyRow): StoredJwksKey {
  if (!slotOrder.includes(row.id as JwksSlotId)) {
    throw createJwksSlotContractError();
  }

  return {
    id: row.id as JwksSlotId,
    kid: row.kid,
    alg: row.alg,
    publicJwk: JSON.parse(row.public_jwk) as PublicJwk,
    privateJwk: JSON.parse(row.private_jwk) as PrivateJwk,
  };
}
