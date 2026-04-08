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
  assertValidJwksSlotState,
  createJwksSlotContractError,
  getJwksSlot,
  getKeyByKid,
  insertJwksSlot,
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

  let currentKey = getJwksSlot(db, 'CURRENT');
  let standbyKey = getJwksSlot(db, 'STANDBY');

  if (!currentKey) {
    const currentRecord = generateEd25519KeyRecord();
    insertJwksSlot(db, 'CURRENT', currentRecord);
    currentKey = getJwksSlot(db, 'CURRENT');

    input?.logger?.info(
      {
        event: 'jwks.bootstrap.created',
        kid: currentRecord.kid,
        slot: 'CURRENT',
      },
      'Initial JWKS signing key created',
    );
  }

  if (!standbyKey) {
    const standbyRecord = generateEd25519KeyRecord();
    insertJwksSlot(db, 'STANDBY', standbyRecord);
    standbyKey = getJwksSlot(db, 'STANDBY');

    input?.logger?.info(
      {
        event: 'jwks.bootstrap.created',
        kid: standbyRecord.kid,
        slot: 'STANDBY',
      },
      'Initial JWKS signing key created',
    );
  }

  if (!currentKey || !standbyKey) {
    throw createJwksSlotContractError();
  }

  return { id: currentKey.id, kid: currentKey.kid };
}

export async function rotateKeys(
  db: DatabaseClient,
  input: { logger: AppLogger },
): Promise<{
  id: string;
  kid: string;
}> {
  assertValidJwksSlotState(db);
  const currentKey = getJwksSlot(db, 'CURRENT');
  const standbyKey = getJwksSlot(db, 'STANDBY');

  if (!currentKey || !standbyKey) {
    throw createJwksSlotContractError();
  }

  const keyRecord = generateEd25519KeyRecord();
  rotateJwksSlots(db, keyRecord);

  const nextCurrentKey = getJwksSlot(db, 'CURRENT');

  if (!nextCurrentKey) {
    throw createJwksSlotContractError();
  }

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
  assertValidJwksSlotState(db);
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
