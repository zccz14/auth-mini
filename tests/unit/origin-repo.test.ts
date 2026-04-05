import { afterEach, describe, expect, it } from 'vitest';
import { bootstrapDatabase } from '../../src/infra/db/bootstrap.js';
import { createDatabaseClient } from '../../src/infra/db/client.js';
import {
  deleteAllowedOriginById,
  insertAllowedOrigin,
  listAllowedOrigins,
  normalizeAllowedOrigin,
  updateAllowedOriginById,
} from '../../src/infra/origins/repo.js';
import { createTempDbPath } from '../helpers/db.js';

const databases: Array<ReturnType<typeof createDatabaseClient>> = [];

afterEach(() => {
  for (const db of databases.splice(0)) {
    db.close();
  }
});

describe('normalizeAllowedOrigin', () => {
  it('canonicalizes scheme host and default port', () => {
    expect(normalizeAllowedOrigin('HTTPS://Example.COM:443')).toBe(
      'https://example.com',
    );
    expect(normalizeAllowedOrigin('HTTP://LOCALHOST:80')).toBe(
      'http://localhost',
    );
  });

  it('preserves non-default ports and supported host kinds', () => {
    expect(normalizeAllowedOrigin('https://localhost:3000')).toBe(
      'https://localhost:3000',
    );
    expect(normalizeAllowedOrigin('https://127.0.0.1:8443')).toBe(
      'https://127.0.0.1:8443',
    );
    expect(normalizeAllowedOrigin('https://[::1]:9443')).toBe(
      'https://[::1]:9443',
    );
  });

  it('uses whatwg ascii hostname output and strips a trailing dot', () => {
    expect(normalizeAllowedOrigin('https://BÜCHER.example.')).toBe(
      'https://xn--bcher-kva.example',
    );
  });

  it('rejects null origins and non-origin url parts', () => {
    expect(() => normalizeAllowedOrigin('null')).toThrow(/invalid_origin/);
    expect(() => normalizeAllowedOrigin('https://localhost:3000/path')).toThrow(
      /invalid_origin/,
    );
    expect(() => normalizeAllowedOrigin('https://example.com?x=1')).toThrow(
      /invalid_origin/,
    );
    expect(() => normalizeAllowedOrigin('https://example.com#hash')).toThrow(
      /invalid_origin/,
    );
    expect(() => normalizeAllowedOrigin('ftp://example.com')).toThrow(
      /invalid_origin/,
    );
  });
});

describe('allowed origin repo', () => {
  it('canonicalizes inserted and updated origins and supports list/delete', async () => {
    const db = await createTestDatabase();
    const inserted = insertAllowedOrigin(db, 'HTTPS://Example.COM:443');

    expect(inserted.origin).toBe('https://example.com');
    expect(listAllowedOrigins(db)).toEqual([
      expect.objectContaining({
        id: inserted.id,
        origin: 'https://example.com',
      }),
    ]);

    const updated = updateAllowedOriginById(
      db,
      inserted.id,
      'https://LOCALHOST.:3000',
    );

    expect(updated).toEqual(
      expect.objectContaining({
        id: inserted.id,
        origin: 'https://localhost:3000',
      }),
    );
    expect(deleteAllowedOriginById(db, inserted.id)).toBe(true);
    expect(listAllowedOrigins(db)).toEqual([]);
  });
});

async function createTestDatabase() {
  const dbPath = await createTempDbPath();
  await bootstrapDatabase(dbPath);
  const db = createDatabaseClient(dbPath);
  databases.push(db);
  return db;
}
