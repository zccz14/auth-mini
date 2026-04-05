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
import { encodeBase64Url, type PrivateJwk } from '../../src/shared/crypto.js';
import { createTestApp } from '../helpers/app.js';
import { countRows, createTempDbPath } from '../helpers/db.js';
import { createMemoryLogCollector } from '../helpers/logging.js';

describe('jwks service', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('generates an Ed25519 signing key and emits a public jwks entry', async () => {
    const testApp = await createTestApp();

    try {
      const response = await testApp.app.request('/jwks');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.keys).toHaveLength(1);
      expect(body.keys[0]).toMatchObject({
        kid: expect.any(String),
        alg: 'EdDSA',
        kty: 'OKP',
        crv: 'Ed25519',
        use: 'sig',
      });
      expect(body.keys[0]).not.toHaveProperty('d');
      expect(testApp.logs).toContainEqual(
        expect.objectContaining({
          event: 'jwks.read',
        }),
      );
    } finally {
      testApp.close();
    }
  });

  it('keeps rotated keys available for verification', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);
    const logCollector = createMemoryLogCollector();

    try {
      const firstKey = await bootstrapKeys(db);
      const token = await signJwt(db, {
        sub: 'user-1',
        typ: 'access',
        sid: 'session-1',
      });

      const rotatedKey = await rotateKeys(db, { logger: logCollector.logger });
      const payload = await verifyJwt(db, token);
      const publicKeys = await listPublicKeys(db, {
        logger: logCollector.logger,
      });

      expect(rotatedKey.kid).not.toBe(firstKey.kid);
      expect(payload).toMatchObject({
        sub: 'user-1',
        sid: 'session-1',
        typ: 'access',
      });
      expect(publicKeys.map((key) => key.kid)).toEqual([
        firstKey.kid,
        rotatedKey.kid,
      ]);
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

  it('emits a structured bootstrap event only when creating the first key', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);
    const logCollector = createMemoryLogCollector();

    try {
      const firstKey = await bootstrapKeys(db, { logger: logCollector.logger });
      const entryCountAfterCreate = logCollector.entries.length;

      await bootstrapKeys(db, { logger: logCollector.logger });

      expect(logCollector.entries).toContainEqual(
        expect.objectContaining({
          event: 'jwks.bootstrap.created',
          kid: firstKey.kid,
        }),
      );
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

  it('old jwks keys remain available long enough for unexpired access token verification', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);

    try {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
      const logCollector = createMemoryLogCollector();

      await bootstrapKeys(db);

      const oldToken = await signJwt(db, {
        sub: 'user-1',
        typ: 'access',
        sid: 'session-1',
      });

      await rotateKeys(db, { logger: logCollector.logger });

      vi.setSystemTime(new Date('2030-01-01T00:10:00.000Z'));

      await expect(verifyJwt(db, oldToken)).resolves.toMatchObject({
        sub: 'user-1',
        sid: 'session-1',
        typ: 'access',
      });
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
          kid: getActiveKid(db),
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
          kid: getActiveKid(db),
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
      const kid = getActiveKid(db);
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
          kid: getActiveKid(db),
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

function getActiveKid(db: ReturnType<typeof createDatabaseClient>): string {
  const row = db
    .prepare('SELECT kid FROM jwks_keys WHERE is_active = 1 LIMIT 1')
    .get() as { kid: string };

  return row.kid;
}

function getActivePrivateJwk(
  db: ReturnType<typeof createDatabaseClient>,
): PrivateJwk {
  const row = db
    .prepare('SELECT private_jwk FROM jwks_keys WHERE is_active = 1 LIMIT 1')
    .get() as { private_jwk: string };

  return JSON.parse(row.private_jwk) as PrivateJwk;
}

function createSignedToken(
  db: ReturnType<typeof createDatabaseClient>,
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
): string {
  const privateJwk = getActivePrivateJwk(db);
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
