import { mkdtemp, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { OtpMailSeam } from '../helpers/mock-smtp.js';
import { bootstrapDatabase } from '../../src/infra/db/bootstrap.js';
import { createDatabaseClient } from '../../src/infra/db/client.js';
import { importSmtpConfigs } from '../../src/infra/smtp/config-import.js';
import { runStartCommand } from '../../src/app/commands/start.js';
import { bootstrapKeys } from '../../src/modules/jwks/service.js';
import * as jwksService from '../../src/modules/jwks/service.js';
import { hashValue } from '../../src/shared/crypto.js';
import {
  createSession,
  getSessionById,
  rotateRefreshToken,
} from '../../src/modules/session/repo.js';
import { refreshSessionTokens } from '../../src/modules/session/service.js';
import { createTempDbPath } from '../helpers/db.js';
import { createMemoryLogCollector } from '../helpers/logging.js';
import {
  createOtpMailSeam,
  extractOtpCode,
  findLatestOtpMail,
  startConfigurableMockSmtpServer,
  startMockSmtpServer,
} from '../helpers/mock-smtp.js';

const json = (value: unknown) => JSON.stringify(value);
const otpSeam = { current: null as OtpMailSeam | null };

const openApps: Array<{ close(): void }> = [];

afterEach(() => {
  vi.doUnmock('../../src/infra/smtp/mailer.js');
  vi.resetModules();
  vi.unstubAllGlobals();
  otpSeam.current = null;

  while (openApps.length > 0) {
    openApps.pop()?.close();
  }
});

describe('session routes', () => {
  it('persists and reads the session auth method', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);

    try {
      db.prepare(
        'INSERT INTO users (id, email, email_verified_at) VALUES (?, ?, ?)',
      ).run('user-1', 'user-1@example.com', '2030-01-01T00:00:00.000Z');

      const session = createSession(db, {
        userId: 'user-1',
        refreshTokenHash: 'refresh-hash',
        authMethod: 'email_otp',
        expiresAt: '2099-01-01T00:00:00.000Z',
      });

      expect(session).toMatchObject({
        userId: 'user-1',
        refreshTokenHash: 'refresh-hash',
        authMethod: 'email_otp',
      });
      expect(getSessionById(db, session.id)).toMatchObject({
        id: session.id,
        authMethod: 'email_otp',
      });
    } finally {
      db.close();
    }
  });

  it('persists and reads the ed25519 session auth method', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);

    try {
      db.prepare(
        'INSERT INTO users (id, email, email_verified_at) VALUES (?, ?, ?)',
      ).run('user-1', 'user-1@example.com', '2030-01-01T00:00:00.000Z');

      const session = createSession(db, {
        userId: 'user-1',
        refreshTokenHash: 'refresh-hash',
        authMethod: 'ed25519',
        expiresAt: '2099-01-01T00:00:00.000Z',
      });

      expect(session).toMatchObject({ authMethod: 'ed25519' });
      expect(getSessionById(db, session.id)).toMatchObject({
        id: session.id,
        authMethod: 'ed25519',
      });
    } finally {
      db.close();
    }
  });

  it('refresh rotates the refresh token', async () => {
    const testApp = await createSignedInApp('rotate@example.com');
    openApps.push(testApp);

    const response = await testApp.app.request('/session/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json({
        session_id: testApp.sessionId,
        refresh_token: testApp.tokens.refresh_token,
      }),
    });

    const body = await response.json();
    const payload = await jwksService.verifyJwt(
      testApp.db,
      body.access_token as string,
    );
    const session = testApp.db
      .prepare('SELECT id, refresh_token_hash FROM sessions WHERE id = ?')
      .get(testApp.sessionId) as
      | { id: string; refresh_token_hash: string }
      | undefined;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      session_id: testApp.sessionId,
      refresh_token: expect.any(String),
      access_token: expect.any(String),
    });
    expect(payload.amr).toEqual(['email_otp']);
    expect(body.refresh_token).not.toBe(testApp.tokens.refresh_token);
    expect(session).toEqual({
      id: testApp.sessionId,
      refresh_token_hash: hashValue(body.refresh_token),
    });
    expectLogEntry(testApp.logs, {
      event: 'session.refresh.succeeded',
      session_id: testApp.sessionId,
      user_id: testApp.userId,
    });
    expect(JSON.stringify(testApp.logs)).not.toContain(
      testApp.tokens.refresh_token,
    );
  });

  it('refresh rejects revoked session reuse', async () => {
    const testApp = await createSignedInApp('refresh-reuse@example.com');
    openApps.push(testApp);

    const firstResponse = await testApp.app.request('/session/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json({
        session_id: testApp.sessionId,
        refresh_token: testApp.tokens.refresh_token,
      }),
    });
    const secondResponse = await testApp.app.request('/session/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json({
        session_id: testApp.sessionId,
        refresh_token: testApp.tokens.refresh_token,
      }),
    });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(401);
    expect(await secondResponse.json()).toEqual({
      error: 'session_superseded',
    });
    expectLogEntry(testApp.logs, {
      event: 'session.refresh.failed',
      reason: 'session_superseded',
      session_id: testApp.sessionId,
    });
  });

  it('refresh rejects expired session', async () => {
    const testApp = await createSignedInApp('refresh-expired@example.com');
    openApps.push(testApp);

    testApp.db
      .prepare('UPDATE sessions SET expires_at = ? WHERE id = ?')
      .run('2020-01-01T00:00:00.000Z', testApp.sessionId);

    const response = await testApp.app.request('/session/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json({
        session_id: testApp.sessionId,
        refresh_token: testApp.tokens.refresh_token,
      }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'session_invalidated' });
    expectLogEntry(testApp.logs, {
      event: 'session.refresh.failed',
      reason: 'session_invalidated',
      session_id: testApp.sessionId,
    });
  });

  it('refresh does not misclassify mid-flight expiry as superseded', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);
    const logs = createMemoryLogCollector();

    try {
      await bootstrapKeys(db);
      db.prepare(
        'INSERT INTO users (id, email, email_verified_at) VALUES (?, ?, ?)',
      ).run('user-1', 'user-1@example.com', '2030-01-01T00:00:00.000Z');

      const session = createSession(db, {
        userId: 'user-1',
        refreshTokenHash: hashValue('refresh-token'),
        authMethod: 'email_otp',
        expiresAt: '2030-01-01T00:00:01.000Z',
      });

      const RealDate = Date;
      const timestamps = [
        '2030-01-01T00:00:00.000Z',
        '2030-01-01T00:00:02.000Z',
      ];
      let index = 0;

      class SequencedDate extends RealDate {
        constructor(value?: string | number | Date) {
          super(value ?? timestamps[Math.min(index++, timestamps.length - 1)]);
        }

        static now() {
          return new RealDate(
            timestamps[Math.min(index, timestamps.length - 1)],
          ).getTime();
        }

        static parse = RealDate.parse;
        static UTC = RealDate.UTC;
      }

      vi.stubGlobal('Date', SequencedDate);

      const result = await refreshSessionTokens(db, {
        sessionId: session.id,
        refreshToken: 'refresh-token',
        issuer: 'https://issuer.example',
        logger: logs.logger,
      });

      expect(result.session_id).toBe(session.id);
      expectLogEntry(logs.entries, {
        event: 'session.refresh.succeeded',
        session_id: session.id,
        user_id: 'user-1',
      });
    } finally {
      db.close();
    }
  });

  it('refresh keeps the old token usable when signing fails after rotation', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);

    try {
      await bootstrapKeys(db);
      db.prepare(
        'INSERT INTO users (id, email, email_verified_at) VALUES (?, ?, ?)',
      ).run('user-1', 'user-1@example.com', '2030-01-01T00:00:00.000Z');

      const session = createSession(db, {
        userId: 'user-1',
        refreshTokenHash: hashValue('refresh-token'),
        authMethod: 'email_otp',
        expiresAt: '2099-01-01T00:00:00.000Z',
      });
      const signJwtSpy = vi
        .spyOn(jwksService, 'signJwt')
        .mockRejectedValueOnce(new Error('signing unavailable'));

      await expect(
        refreshSessionTokens(db, {
          sessionId: session.id,
          refreshToken: 'refresh-token',
          issuer: 'https://issuer.example',
        }),
      ).rejects.toThrow('signing unavailable');

      expect(getSessionById(db, session.id)?.refreshTokenHash).toBe(
        hashValue('refresh-token'),
      );

      const retryResult = await refreshSessionTokens(db, {
        sessionId: session.id,
        refreshToken: 'refresh-token',
        issuer: 'https://issuer.example',
      });

      expect(retryResult.session_id).toBe(session.id);
      expect(retryResult.refresh_token).not.toBe('refresh-token');
      signJwtSpy.mockRestore();
    } finally {
      db.close();
    }
  });

  it('refresh signs access tokens with ed25519 amr', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);

    try {
      await bootstrapKeys(db);
      db.prepare(
        'INSERT INTO users (id, email, email_verified_at) VALUES (?, ?, ?)',
      ).run('user-1', 'user-1@example.com', '2030-01-01T00:00:00.000Z');

      const session = createSession(db, {
        userId: 'user-1',
        refreshTokenHash: hashValue('refresh-token'),
        authMethod: 'ed25519',
        expiresAt: '2099-01-01T00:00:00.000Z',
      });

      const result = await refreshSessionTokens(db, {
        sessionId: session.id,
        refreshToken: 'refresh-token',
        issuer: 'https://issuer.example',
      });
      const payload = await jwksService.verifyJwt(db, result.access_token);

      expect(result.session).toMatchObject({ authMethod: 'ed25519' });
      expect(payload.amr).toEqual(['ed25519']);
    } finally {
      db.close();
    }
  });

  it('refresh token claim only succeeds once across database clients', async () => {
    const dbPath = await createTempDbPath();
    await bootstrapDatabase(dbPath);
    const writerDb = createDatabaseClient(dbPath);
    const readerDb = createDatabaseClient(dbPath);

    try {
      writerDb
        .prepare(
          'INSERT INTO users (id, email, email_verified_at) VALUES (?, ?, ?)',
        )
        .run('user-1', 'user-1@example.com', '2030-01-01T00:00:00.000Z');

      createSession(writerDb, {
        userId: 'user-1',
        refreshTokenHash: 'refresh-hash',
        authMethod: 'email_otp',
        expiresAt: '2099-01-01T00:00:00.000Z',
      });

      const session = writerDb
        .prepare('SELECT id FROM sessions WHERE user_id = ? LIMIT 1')
        .get('user-1') as { id: string };

      const firstClaim = rotateRefreshToken(writerDb, {
        sessionId: session.id,
        currentRefreshTokenHash: 'refresh-hash',
        nextRefreshTokenHash: 'next-refresh-hash',
      });
      const secondClaim = rotateRefreshToken(readerDb, {
        sessionId: session.id,
        currentRefreshTokenHash: 'refresh-hash',
        nextRefreshTokenHash: 'reader-refresh-hash',
      });

      expect(firstClaim).toMatchObject({
        id: session.id,
        userId: 'user-1',
        refreshTokenHash: 'next-refresh-hash',
        authMethod: 'email_otp',
      });
      expect(secondClaim).toBeNull();
    } finally {
      writerDb.close();
      readerDb.close();
    }
  });

  it('logout expires the session referenced by sid', async () => {
    const testApp = await createSignedInApp('logout@example.com');
    openApps.push(testApp);
    const beforeLogout = new Date().toISOString();

    const response = await testApp.app.request('/session/logout', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${testApp.tokens.access_token}`,
      },
    });

    const session = testApp.db
      .prepare('SELECT expires_at FROM sessions WHERE id = ?')
      .get(testApp.sessionId) as { expires_at: string };
    const afterLogout = new Date().toISOString();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(session.expires_at >= beforeLogout).toBe(true);
    expect(session.expires_at <= afterLogout).toBe(true);
    expectLogEntry(testApp.logs, {
      event: 'session.logout.succeeded',
      session_id: testApp.sessionId,
      user_id: testApp.userId,
    });
  });

  it('logout does not log success when the token session is already expired', async () => {
    const testApp = await createSignedInApp('logout-repeat@example.com');
    openApps.push(testApp);

    const firstResponse = await testApp.app.request('/session/logout', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${testApp.tokens.access_token}`,
      },
    });
    const secondResponse = await testApp.app.request('/session/logout', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${testApp.tokens.access_token}`,
      },
    });

    const logoutSuccessLogs = testApp.logs.filter(
      (entry) =>
        entry.event === 'session.logout.succeeded' &&
        entry.session_id === testApp.sessionId,
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(401);
    expect(await secondResponse.json()).toEqual({
      error: 'invalid_access_token',
    });
    expect(logoutSuccessLogs).toHaveLength(1);
  });

  it('me rejects an access token after logout expires its session', async () => {
    const testApp = await createSignedInApp('logout-me@example.com');
    openApps.push(testApp);

    const logoutResponse = await testApp.app.request('/session/logout', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${testApp.tokens.access_token}`,
      },
    });
    const meResponse = await testApp.app.request('/me', {
      headers: {
        authorization: `Bearer ${testApp.tokens.access_token}`,
      },
    });

    expect(logoutResponse.status).toBe(200);
    expect(meResponse.status).toBe(401);
    expect(await meResponse.json()).toEqual({ error: 'invalid_access_token' });
  });

  it('me rejects an access token after direct session expiry', async () => {
    const testApp = await createSignedInApp('expired-me@example.com');
    openApps.push(testApp);

    testApp.db
      .prepare('UPDATE sessions SET expires_at = ? WHERE id = ?')
      .run('2020-01-01T00:00:00.000Z', testApp.sessionId);

    const response = await testApp.app.request('/me', {
      headers: {
        authorization: `Bearer ${testApp.tokens.access_token}`,
      },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'invalid_access_token' });
  });

  it('logout makes the current refresh token unusable', async () => {
    const testApp = await createSignedInApp('logout-refresh@example.com');
    openApps.push(testApp);

    const logoutResponse = await testApp.app.request('/session/logout', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${testApp.tokens.access_token}`,
      },
    });
    const refreshResponse = await testApp.app.request('/session/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json({
        session_id: testApp.sessionId,
        refresh_token: testApp.tokens.refresh_token,
      }),
    });

    expect(logoutResponse.status).toBe(200);
    expect(refreshResponse.status).toBe(401);
    expect(await refreshResponse.json()).toEqual({
      error: 'session_invalidated',
    });
    expectLogEntry(testApp.logs, {
      event: 'session.refresh.failed',
      reason: 'session_invalidated',
      session_id: testApp.sessionId,
    });
  });

  it('me returns user id, email, credentials, and active sessions', async () => {
    const testApp = await createSignedInApp('me@example.com');
    openApps.push(testApp);

    const response = await testApp.app.request('/me', {
      headers: {
        authorization: `Bearer ${testApp.tokens.access_token}`,
      },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user_id: testApp.userId,
      email: 'me@example.com',
      webauthn_credentials: [],
      ed25519_credentials: [],
      active_sessions: [
        {
          id: testApp.sessionId,
          created_at: expect.any(String),
          expires_at: expect.any(String),
        },
      ],
    });
  });

  it('me accepts a legacy access token without amr', async () => {
    const testApp = await createSignedInApp('legacy-me@example.com');
    openApps.push(testApp);
    const accessToken = await forgeLegacyAccessToken(testApp);

    const response = await testApp.app.request('/me', {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user_id: testApp.userId,
      email: 'legacy-me@example.com',
      webauthn_credentials: [],
      ed25519_credentials: [],
      active_sessions: [
        {
          id: testApp.sessionId,
          created_at: expect.any(String),
          expires_at: expect.any(String),
        },
      ],
    });
  });

  it('me accepts a legacy access token without amr for an ed25519 session', async () => {
    const testApp = await createSignedInApp('legacy-ed25519-me@example.com');
    openApps.push(testApp);

    testApp.db
      .prepare('UPDATE sessions SET auth_method = ? WHERE id = ?')
      .run('ed25519', testApp.sessionId);

    const accessToken = await forgeLegacyAccessToken(testApp);
    const response = await testApp.app.request('/me', {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user_id: testApp.userId,
      email: 'legacy-ed25519-me@example.com',
      webauthn_credentials: [],
      ed25519_credentials: [],
      active_sessions: [
        {
          id: testApp.sessionId,
          created_at: expect.any(String),
          expires_at: expect.any(String),
        },
      ],
    });
  });

  it('me relies on expires_at for active_sessions', async () => {
    const testApp = await createSignedInApp('active@example.com');
    openApps.push(testApp);

    testApp.db
      .prepare(
        [
          'INSERT INTO sessions (id, user_id, refresh_token_hash, auth_method, expires_at, revoked_at)',
          'VALUES (?, ?, ?, ?, ?, ?)',
        ].join(' '),
      )
      .run(
        'session-revoked',
        testApp.userId,
        hashValue('revoked-token'),
        'email_otp',
        '2099-01-01T00:00:00.000Z',
        '2026-04-01T00:00:00.000Z',
      );
    testApp.db
      .prepare(
        'INSERT INTO sessions (id, user_id, refresh_token_hash, auth_method, expires_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(
        'session-expired',
        testApp.userId,
        hashValue('expired-token'),
        'email_otp',
        '2020-01-01T00:00:00.000Z',
      );

    const response = await testApp.app.request('/me', {
      headers: {
        authorization: `Bearer ${testApp.tokens.access_token}`,
      },
    });

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(
      body.active_sessions.map((session: { id: string }) => session.id),
    ).toEqual([testApp.sessionId, 'session-revoked']);
  });

  it('me rejects missing or invalid bearer token', async () => {
    const testApp = await createSignedInApp('reject@example.com');
    openApps.push(testApp);

    const missingResponse = await testApp.app.request('/me');
    const invalidResponse = await testApp.app.request('/me', {
      headers: {
        authorization: 'Bearer not-a-token',
      },
    });

    expect(missingResponse.status).toBe(401);
    expect(await missingResponse.json()).toEqual({
      error: 'invalid_access_token',
    });
    expect(invalidResponse.status).toBe(401);
    expect(await invalidResponse.json()).toEqual({
      error: 'invalid_access_token',
    });
  });

  it('jwks returns public keys only', async () => {
    const testApp = await createSignedInApp('jwks@example.com');
    openApps.push(testApp);

    const response = await testApp.app.request('/jwks');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.keys).toHaveLength(2);
    expect(body.keys).toEqual([
      expect.objectContaining({
        alg: 'EdDSA',
        crv: 'Ed25519',
        kty: 'OKP',
        use: 'sig',
      }),
      expect.objectContaining({
        alg: 'EdDSA',
        crv: 'Ed25519',
        kty: 'OKP',
        use: 'sig',
      }),
    ]);
    expect(body.keys[0]).not.toHaveProperty('d');
    expect(body.keys[1]).not.toHaveProperty('d');
  });

  it('start succeeds without allowed origins, but webauthn option requests fail', async () => {
    const dbPath = await createTempDbPath();
    const port = await getAvailablePort();

    await bootstrapDatabase(dbPath);

    const server = await runStartCommand({
      dbPath,
      host: '127.0.0.1',
      port,
      issuer: 'https://issuer.example',
    });

    const response = await fetch(
      `http://127.0.0.1:${port}/webauthn/authenticate/options`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: json({ rp_id: 'app.example.com' }),
      },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_webauthn_authentication',
    });

    await server.close();
  });

  it('start succeeds with valid required config and can be cleanly started and stopped', async () => {
    const smtpServer = await startMockSmtpServer();
    const dbPath = await createTempDbPath();
    const port = await getAvailablePort();

    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);

    await importSmtpConfigs(
      db,
      await writeRuntimeSmtpConfigJson({
        host: '127.0.0.1',
        port: smtpServer.port,
        username: 'mailer',
        password: 'secret',
        from_email: 'noreply@example.com',
        from_name: 'auth-mini',
      }),
    );
    db.prepare('INSERT INTO allowed_origins (origin) VALUES (?)').run(
      'https://app.example.com',
    );
    db.close();

    const server = await runStartCommand({
      dbPath,
      host: '127.0.0.1',
      port,
      issuer: 'https://issuer.example',
    });

    const response = await fetch(`http://127.0.0.1:${port}/email/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json({ email: 'runtime@example.com' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(smtpServer.mailbox).toHaveLength(1);
    expect(smtpServer.mailbox[0]?.to).toBe('runtime@example.com');

    await server.close();
    await smtpServer.close();
  });

  it('runtime smtp negative response returns 503 and invalidates the otp', async () => {
    const smtpServer = await startConfigurableMockSmtpServer({
      onRcptTo: ['550 mailbox unavailable'],
    });
    const dbPath = await createTempDbPath();
    const port = await getAvailablePort();

    await bootstrapDatabase(dbPath);
    const db = createDatabaseClient(dbPath);

    await importSmtpConfigs(
      db,
      await writeRuntimeSmtpConfigJson({
        host: '127.0.0.1',
        port: smtpServer.port,
        username: 'mailer',
        password: 'secret',
        from_email: 'noreply@example.com',
        from_name: 'auth-mini',
      }),
    );
    db.prepare('INSERT INTO allowed_origins (origin) VALUES (?)').run(
      'https://app.example.com',
    );
    db.close();

    const server = await runStartCommand({
      dbPath,
      host: '127.0.0.1',
      port,
      issuer: 'https://issuer.example',
    });

    const response = await fetch(`http://127.0.0.1:${port}/email/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json({ email: 'runtime-failure@example.com' }),
    });

    const verifyDb = createDatabaseClient(dbPath);
    const otpRow = verifyDb
      .prepare('SELECT consumed_at FROM email_otps WHERE email = ?')
      .get('runtime-failure@example.com') as
      | { consumed_at: string | null }
      | undefined;
    verifyDb.close();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'smtp_temporarily_unavailable',
    });
    expect(otpRow?.consumed_at).toBeTruthy();
    expect(smtpServer.mailbox).toHaveLength(0);

    await server.close();
    await smtpServer.close();
  });
});

async function createSignedInApp(email: string) {
  otpSeam.current = createOtpMailSeam();
  const { createTestApp } = await loadMockedAppHelpers();
  const testApp = await createTestApp();
  const seam = getCurrentOtpSeam();

  await testApp.app.request('/email/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: json({ email }),
  });

  const code = extractOtpCode(
    findLatestOtpMail(seam.mailbox, email)?.text ?? '',
  );
  const verifyResponse = await testApp.app.request('/email/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: json({ email, code }),
  });

  const tokens = (await verifyResponse.json()) as {
    access_token: string;
    refresh_token: string;
  };
  const user = testApp.db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(email) as { id: string };
  const session = testApp.db
    .prepare(
      'SELECT id FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 1',
    )
    .get(user.id, new Date().toISOString()) as { id: string };

  return {
    ...testApp,
    tokens,
    userId: user.id,
    sessionId: session.id,
  };
}

async function forgeLegacyAccessToken(
  testApp: Awaited<ReturnType<typeof createSignedInApp>>,
) {
  const payload = await jwksService.verifyJwt(
    testApp.db,
    testApp.tokens.access_token,
  );
  const legacyPayload = { ...payload };

  delete legacyPayload.amr;

  return jwksService.signJwt(testApp.db, {
    ...legacyPayload,
    sid: testApp.sessionId,
    sub: testApp.userId,
  });
}

function getCurrentOtpSeam(): OtpMailSeam {
  if (!otpSeam.current) {
    throw new Error('OTP seam not installed for session tests');
  }

  return otpSeam.current;
}

async function loadMockedAppHelpers() {
  vi.resetModules();
  vi.doMock('../../src/infra/smtp/mailer.js', async () => {
    const actual = await vi.importActual<
      typeof import('../../src/infra/smtp/mailer.js')
    >('../../src/infra/smtp/mailer.js');

    return {
      ...actual,
      async sendOtpMail(config: unknown, email: string, code: string) {
        const seam = otpSeam.current;

        if (!seam) {
          throw new Error('OTP seam not installed for session tests');
        }

        return seam.sendOtpMail(
          config as { fromEmail: string; fromName?: string },
          email,
          code,
        );
      },
    };
  });

  return import('../helpers/app.js');
}

async function writeRuntimeSmtpConfigJson(row: {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
}) {
  const directoryPath = await mkdtemp(
    join(tmpdir(), 'auth-mini-runtime-smtp-'),
  );
  const filePath = join(directoryPath, 'smtp.json');

  await writeFile(filePath, JSON.stringify([row]), 'utf8');

  return filePath;
}

async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address === 'string') {
        reject(new Error('Failed to allocate a test port'));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
  });
}

function expectLogEntry(
  logs: Array<Record<string, unknown>>,
  expected: Record<string, unknown>,
) {
  expect(logs).toContainEqual(expect.objectContaining(expected));
}
