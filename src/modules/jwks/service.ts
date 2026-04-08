import type { DatabaseClient } from '../../infra/db/client.js';
import type { AppLogger } from '../../shared/logger.js';
import {
  generateEd25519KeyRecord,
  signJwt as signCompactJwt,
  toPublicJwk,
  verifyJwt as verifyCompactJwt,
  type JwtPayload,
  type PublicJwk,
} from '../../shared/crypto.js';
import {
  TTLS,
  getExpiresAtUnixSeconds,
  getUnixTimeSeconds,
} from '../../shared/time.js';
import {
  assertCompleteJwksSlotState,
  assertValidJwksSlotState,
  createJwksSlotContractError,
  getJwksSlot,
  getKeyByKid,
  listJwksSlots,
  rotateJwksSlots,
} from './repo.js';

export async function bootstrapKeys(
  db: DatabaseClient,
  input?: { logger?: AppLogger },
): Promise<{
  id: string;
  kid: string;
}> {
  assertValidJwksSlotState(db);

  const repairedState = db.transaction(() => {
    const insertIfMissing = db.prepare(
      [
        'INSERT OR IGNORE INTO jwks_keys (id, kid, alg, public_jwk, private_jwk)',
        'VALUES (?, ?, ?, ?, ?)',
      ].join(' '),
    );
    const created: Array<{ slot: 'CURRENT' | 'STANDBY'; kid: string }> = [];

    let currentKey = getJwksSlot(db, 'CURRENT');
    let standbyKey = getJwksSlot(db, 'STANDBY');

    if (!currentKey) {
      const currentRecord = generateEd25519KeyRecord();
      const result = insertIfMissing.run(
        'CURRENT',
        currentRecord.kid,
        currentRecord.alg,
        JSON.stringify(currentRecord.publicJwk),
        JSON.stringify(currentRecord.privateJwk),
      );

      if (result.changes === 1) {
        created.push({ slot: 'CURRENT', kid: currentRecord.kid });
      }

      currentKey = getJwksSlot(db, 'CURRENT');
    }

    if (!standbyKey) {
      const standbyRecord = generateEd25519KeyRecord();
      const result = insertIfMissing.run(
        'STANDBY',
        standbyRecord.kid,
        standbyRecord.alg,
        JSON.stringify(standbyRecord.publicJwk),
        JSON.stringify(standbyRecord.privateJwk),
      );

      if (result.changes === 1) {
        created.push({ slot: 'STANDBY', kid: standbyRecord.kid });
      }

      standbyKey = getJwksSlot(db, 'STANDBY');
    }

    return { currentKey, standbyKey, created };
  })();

  for (const entry of repairedState.created) {
    input?.logger?.info(
      {
        event: 'jwks.bootstrap.created',
        kid: entry.kid,
        slot: entry.slot,
      },
      'Initial JWKS signing key created',
    );
  }

  if (!repairedState.currentKey || !repairedState.standbyKey) {
    throw createJwksSlotContractError();
  }

  return { id: repairedState.currentKey.id, kid: repairedState.currentKey.kid };
}

export async function rotateKeys(
  db: DatabaseClient,
  input: { logger: AppLogger },
): Promise<{
  id: string;
  kid: string;
}> {
  assertCompleteJwksSlotState(db);
  const keyRecord = generateEd25519KeyRecord();
  const nextCurrentKey = rotateJwksSlots(db, keyRecord);

  input.logger.info(
    { event: 'jwks.rotated', kid: nextCurrentKey.kid },
    'JWKS rotated',
  );

  return { id: nextCurrentKey.id, kid: nextCurrentKey.kid };
}

export async function listPublicKeys(
  db: DatabaseClient,
  input: { logger: AppLogger },
): Promise<PublicJwk[]> {
  assertCompleteJwksSlotState(db);
  const keys = listJwksSlots(db).map((key) => toPublicJwk(key.privateJwk));
  input.logger.info(
    { event: 'jwks.read', key_count: keys.length },
    'JWKS read',
  );

  return keys;
}

export async function signJwt(
  db: DatabaseClient,
  payload: JwtPayload,
): Promise<string> {
  assertCompleteJwksSlotState(db);
  const currentKey = getJwksSlot(db, 'CURRENT');

  if (!currentKey) {
    throw new Error('No current JWKS signing key');
  }

  const iat = getUnixTimeSeconds();
  const claims = {
    ...payload,
    iat,
    exp: getExpiresAtUnixSeconds(iat, TTLS.accessTokenSeconds),
  };

  return signCompactJwt(claims, currentKey.privateJwk, currentKey.kid);
}

export async function verifyJwt(
  db: DatabaseClient,
  token: string,
): Promise<JwtPayload> {
  assertCompleteJwksSlotState(db);
  const headerSegment = token.split('.')[0];

  if (!headerSegment) {
    throw new Error('Invalid JWT format');
  }

  const header = JSON.parse(
    Buffer.from(headerSegment, 'base64url').toString('utf8'),
  ) as { kid?: string };

  if (!header.kid) {
    throw new Error('JWT missing kid');
  }

  const storedKey = getKeyByKid(db, header.kid);

  if (!storedKey) {
    throw new Error('Unknown JWT kid');
  }

  const { payload } = verifyCompactJwt(token, storedKey.publicJwk);

  if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
    throw new Error('JWT exp must be a number');
  }

  if (payload.exp <= getUnixTimeSeconds()) {
    throw new Error('JWT expired');
  }

  return payload;
}
