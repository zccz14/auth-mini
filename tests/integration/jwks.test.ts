import { createPrivateKey, sign } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runRotateJwksCommand } from '../../src/app/commands/rotate-jwks.js';
import { bootstrapDatabase } from '../../src/infra/db/bootstrap.js';
import { createDatabaseClient } from '../../src/infra/db/client.js';
import {
  bootstrapKeys,
  listPublicKeys,
  rotateKeys,
  signJwt,
  verifyJwt,
} from '../../src/modules/jwks/service.js';
import {
  encodeBase64Url,
  generateEd25519KeyRecord,
  type PrivateJwk,
} from '../../src/shared/crypto.js';
import { createTestApp } from '../helpers/app.js';
import { countRows, createTempDbPath } from '../helpers/db.js';
import { createMemoryLogCollector } from '../helpers/logging.js';

describe('jwks service', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('publishes the current and standby jwks slots and signs with CURRENT', async () => {
    const testApp = await createTestApp();

    try {
      const response = await testApp.app.request('/jwks');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.keys).toHaveLength(2);
      expect(body.keys[0]).toMatchObject({
        kid: expect.any(String),
        alg: 'EdDSA',
        kty: 'OKP',
        crv: 'Ed25519',
        use: 'sig',
      });
      expect(body.keys[0]).not.toHaveProperty('d');
      expect(body.keys[1]).toMatchObject({
        kid: expect.any(String),
        alg: 'EdDSA',
        kty: 'OKP',
        crv: 'Ed25519',
        use: 'sig',
      });
      expect(body.keys[1]).not.toHaveProperty('d');
      expect(body.keys[0].kid).not.toBe(body.keys[1].kid);
      expect(testApp.logs).toContainEqual(
        expect.objectContaining({
          event: 'jwks.read',
        }),
      );
    } finally {
      testApp.close();
    }
  });

  it('rotates jwks slots by promoting STANDBY to CURRENT and minting a fresh STANDBY', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);
    const logCollector = createMemoryLogCollector();

    try {
      await bootstrapKeys(db);
      const beforeRotation = getSlotRows(db);
      const token = await signJwt(db, {
        sub: 'user-1',
        typ: 'access',
        sid: 'session-1',
      });
      const tokenHeader = decodeJwtHeader(token);

      const rotatedKey = await rotateKeys(db, { logger: logCollector.logger });
      const publicKeys = await listPublicKeys(db, {
        logger: logCollector.logger,
      });
      const afterRotation = getSlotRows(db);

      expect(tokenHeader.kid).toBe(beforeRotation[0]?.kid);
      expect(beforeRotation.map((row) => row.id)).toEqual([
        'CURRENT',
        'STANDBY',
      ]);
      expect(afterRotation.map((row) => row.id)).toEqual([
        'CURRENT',
        'STANDBY',
      ]);
      expect(rotatedKey.kid).toBe(beforeRotation[1]?.kid);
      expect(afterRotation[0]?.kid).toBe(beforeRotation[1]?.kid);
      expect(afterRotation[1]?.kid).not.toBe(beforeRotation[0]?.kid);
      expect(afterRotation[1]?.kid).not.toBe(beforeRotation[1]?.kid);
      expect(publicKeys.map((key) => key.kid)).toEqual([
        afterRotation[0]?.kid,
        afterRotation[1]?.kid,
      ]);
      await expect(verifyJwt(db, token)).rejects.toThrowError(
        'Unknown JWT kid',
      );
      expect(logCollector.entries).toContainEqual(
        expect.objectContaining({
          event: 'jwks.rotated',
          kid: rotatedKey.kid,
        }),
      );
    } finally {
      db.close();
    }
  });

  it('promotes the standby key visible at transaction time and signs new tokens with the promoted CURRENT', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);
    const logCollector = createMemoryLogCollector();
    const originalTransaction = db.transaction.bind(db);

    try {
      await bootstrapKeys(db);
      const initialStandbyKid = getStandbyKid(db);
      const transactionalStandby = generateEd25519KeyRecord();

      db.transaction = ((fn) =>
        originalTransaction(() => {
          db.prepare(
            "UPDATE jwks_keys SET kid = ?, alg = ?, public_jwk = ?, private_jwk = ? WHERE id = 'STANDBY'",
          ).run(
            transactionalStandby.kid,
            transactionalStandby.alg,
            JSON.stringify(transactionalStandby.publicJwk),
            JSON.stringify(transactionalStandby.privateJwk),
          );

          return fn();
        })) as typeof db.transaction;

      const rotatedKey = await rotateKeys(db, { logger: logCollector.logger });
      const nextToken = await signJwt(db, {
        sub: 'user-2',
        typ: 'access',
        sid: 'session-2',
      });
      const nextTokenHeader = decodeJwtHeader(nextToken);
      const rows = getSlotRows(db);

      expect(initialStandbyKid).not.toBe(transactionalStandby.kid);
      expect(rotatedKey.kid).toBe(transactionalStandby.kid);
      expect(rows[0]?.kid).toBe(transactionalStandby.kid);
      expect(rows[1]?.kid).not.toBe(transactionalStandby.kid);
      expect(nextTokenHeader.kid).toBe(transactionalStandby.kid);
    } finally {
      db.transaction = originalTransaction;
      db.close();
    }
  });

  it('fails rotation when CURRENT disappears inside the transactional path', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);
    const logCollector = createMemoryLogCollector();
    const originalTransaction = db.transaction.bind(db);

    try {
      await bootstrapKeys(db);
      const beforeRotation = getSlotRows(db);

      db.transaction = ((fn) =>
        originalTransaction(() => {
          db.prepare("DELETE FROM jwks_keys WHERE id = 'CURRENT'").run();

          return fn();
        })) as typeof db.transaction;

      await expect(
        rotateKeys(db, { logger: logCollector.logger }),
      ).rejects.toThrowError('jwks_keys slot contract');

      expect(getSlotRows(db)).toEqual(beforeRotation);
    } finally {
      db.transaction = originalTransaction;
      db.close();
    }
  });

  it('converges cleanly when a missing slot is repaired concurrently', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);
    const originalPrepare = db.prepare.bind(db);
    const competingStandby = generateEd25519KeyRecord();

    try {
      await bootstrapKeys(db);
      db.prepare("DELETE FROM jwks_keys WHERE id = 'STANDBY'").run();

      db.prepare = ((sql: string) => {
        const statement = originalPrepare(sql);

        if (sql.includes('INSERT') && sql.includes('jwks_keys')) {
          return {
            ...statement,
            run: (...args: unknown[]) => {
              if (args[0] === 'STANDBY') {
                originalPrepare(
                  'INSERT INTO jwks_keys (id, kid, alg, public_jwk, private_jwk) VALUES (?, ?, ?, ?, ?)',
                ).run(
                  'STANDBY',
                  competingStandby.kid,
                  competingStandby.alg,
                  JSON.stringify(competingStandby.publicJwk),
                  JSON.stringify(competingStandby.privateJwk),
                );
              }

              return statement.run(...args);
            },
          };
        }

        return statement;
      }) as typeof db.prepare;

      await expect(bootstrapKeys(db)).resolves.toMatchObject({ id: 'CURRENT' });
      expect(getStandbyKid(db)).toBe(competingStandby.kid);
      expect(getSlotRows(db).map((row) => row.id)).toEqual([
        'CURRENT',
        'STANDBY',
      ]);
    } finally {
      db.prepare = originalPrepare;
      db.close();
    }
  });

  it('emits a structured bootstrap event only when creating missing slots', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);
    const logCollector = createMemoryLogCollector();

    try {
      const firstKey = await bootstrapKeys(db, { logger: logCollector.logger });
      const entryCountAfterCreate = logCollector.entries.length;

      await bootstrapKeys(db, { logger: logCollector.logger });

      expect(logCollector.entries).toEqual([
        expect.objectContaining({
          event: 'jwks.bootstrap.created',
          kid: firstKey.kid,
          slot: 'CURRENT',
        }),
        expect.objectContaining({
          event: 'jwks.bootstrap.created',
          slot: 'STANDBY',
        }),
      ]);
      expect(logCollector.entries).toHaveLength(entryCountAfterCreate);
    } finally {
      db.close();
    }
  });

  it('cli rotation emits the required jwks rotated event', async () => {
    const dbPath = await createTempDbPath();
    const logCollector = createMemoryLogCollector();

    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);

    try {
      await bootstrapKeys(db);
    } finally {
      db.close();
    }

    await runRotateJwksCommand({
      dbPath,
      loggerSink: logCollector.sink,
    });

    expect(await countRows(dbPath, 'jwks_keys')).toBe(2);
    expect(logCollector.entries).toContainEqual(
      expect.objectContaining({
        event: 'jwks.rotated',
        kid: expect.any(String),
      }),
    );
  });

  it('fails fast when runtime operations do not have both jwks slots', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);
    const logCollector = createMemoryLogCollector();

    try {
      await bootstrapKeys(db);
      const token = await signJwt(db, {
        sub: 'user-1',
        typ: 'access',
        sid: 'session-1',
      });

      db.prepare("DELETE FROM jwks_keys WHERE id = 'STANDBY'").run();

      await expect(
        listPublicKeys(db, { logger: logCollector.logger }),
      ).rejects.toThrowError('jwks_keys slot contract');
      await expect(
        signJwt(db, {
          sub: 'user-2',
          typ: 'access',
          sid: 'session-2',
        }),
      ).rejects.toThrowError('jwks_keys slot contract');
      await expect(verifyJwt(db, token)).rejects.toThrowError(
        'jwks_keys slot contract',
      );
    } finally {
      db.close();
    }
  });

  it('rejects tokens with missing or non-numeric exp claims', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);

    try {
      await bootstrapKeys(db);

      const missingExpToken = createSignedToken(
        db,
        {
          alg: 'EdDSA',
          kid: getCurrentKid(db),
          typ: 'JWT',
        },
        {
          sub: 'user-1',
          typ: 'access',
        },
      );

      await expect(verifyJwt(db, missingExpToken)).rejects.toThrowError(
        'JWT exp must be a number',
      );

      const stringExpToken = createSignedToken(
        db,
        {
          alg: 'EdDSA',
          kid: getCurrentKid(db),
          typ: 'JWT',
        },
        {
          sub: 'user-1',
          typ: 'access',
          exp: '900',
        },
      );

      await expect(verifyJwt(db, stringExpToken)).rejects.toThrowError(
        'JWT exp must be a number',
      );
    } finally {
      db.close();
    }
  });

  it('rejects tokens with invalid protected header fields', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);

    try {
      await bootstrapKeys(db);
      const kid = getCurrentKid(db);
      const validPayload = {
        sub: 'user-1',
        typ: 'access',
        exp: 4_102_444_800,
      };

      const wrongAlgToken = createSignedToken(
        db,
        { alg: 'HS256', kid, typ: 'JWT' },
        validPayload,
      );

      await expect(verifyJwt(db, wrongAlgToken)).rejects.toThrowError(
        'JWT header alg must be EdDSA',
      );

      const wrongTypToken = createSignedToken(
        db,
        { alg: 'EdDSA', kid, typ: 'JOSE' },
        validPayload,
      );

      await expect(verifyJwt(db, wrongTypToken)).rejects.toThrowError(
        'JWT header typ must be JWT',
      );

      const missingAlgToken = createSignedToken(
        db,
        { kid, typ: 'JWT' },
        validPayload,
      );

      await expect(verifyJwt(db, missingAlgToken)).rejects.toThrowError(
        'JWT header alg must be EdDSA',
      );
    } finally {
      db.close();
    }
  });

  it('rejects tokens when exp equals the current time', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);

    try {
      await bootstrapKeys(db);
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));

      const expNowToken = createSignedToken(
        db,
        {
          alg: 'EdDSA',
          kid: getCurrentKid(db),
          typ: 'JWT',
        },
        {
          sub: 'user-1',
          typ: 'access',
          exp: 1_893_456_000,
        },
      );

      await expect(verifyJwt(db, expNowToken)).rejects.toThrowError(
        'JWT expired',
      );
    } finally {
      db.close();
    }
  });
});

function getCurrentKid(db: ReturnType<typeof createDatabaseClient>): string {
  const row = db
    .prepare("SELECT kid FROM jwks_keys WHERE id = 'CURRENT' LIMIT 1")
    .get() as { kid: string };

  return row.kid;
}

function getCurrentPrivateJwk(
  db: ReturnType<typeof createDatabaseClient>,
): PrivateJwk {
  const row = db
    .prepare("SELECT private_jwk FROM jwks_keys WHERE id = 'CURRENT' LIMIT 1")
    .get() as { private_jwk: string };

  return JSON.parse(row.private_jwk) as PrivateJwk;
}

function getStandbyKid(db: ReturnType<typeof createDatabaseClient>): string {
  const row = db
    .prepare("SELECT kid FROM jwks_keys WHERE id = 'STANDBY' LIMIT 1")
    .get() as { kid: string };

  return row.kid;
}

function getSlotRows(
  db: ReturnType<typeof createDatabaseClient>,
): Array<{ id: 'CURRENT' | 'STANDBY'; kid: string }> {
  return db
    .prepare('SELECT id, kid FROM jwks_keys ORDER BY id ASC')
    .all() as Array<{ id: 'CURRENT' | 'STANDBY'; kid: string }>;
}

function decodeJwtHeader(token: string): { kid?: string } {
  const [headerSegment] = token.split('.');

  if (!headerSegment) {
    return {};
  }

  return JSON.parse(
    Buffer.from(headerSegment, 'base64url').toString('utf8'),
  ) as {
    kid?: string;
  };
}

function createSignedToken(
  db: ReturnType<typeof createDatabaseClient>,
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
): string {
  const privateJwk = getCurrentPrivateJwk(db);
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = sign(
    null,
    Buffer.from(signingInput, 'utf8'),
    createPrivateKey({ format: 'jwk', key: privateJwk }),
  );

  return `${signingInput}.${encodeBase64Url(signature)}`;
}
