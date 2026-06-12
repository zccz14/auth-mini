import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { createTestEd25519Keypair } from '../tests/helpers/ed25519.js';
import { hashValue } from '../src/shared/crypto.js';

const repoRoot = resolve(import.meta.dirname, '..');
const binaryPath = resolve(
  repoRoot,
  'rust-backend/target/debug/auth-mini-rust-backend',
);
const tempRoot = resolve(repoRoot, '.tmp/rust-e2e');

let server: ChildProcessWithoutNullStreams | null = null;

afterEach(async () => {
  await stopServer();
  await rm(tempRoot, { recursive: true, force: true });
});

describe('rust external server e2e smoke', () => {
  it('serves core auth smoke flows from the Rust binary', async () => {
    expect(existsSync(binaryPath)).toBe(true);

    await mkdir(tempRoot, { recursive: true });
    const dbPath = resolve(tempRoot, 'auth-mini-rust-e2e.sqlite');
    await runCli(['init', dbPath]);
    seedOtp(dbPath, 'rust-user@example.com', '123456');

    const port = await getFreePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    server = startServer(dbPath, port, baseUrl);
    await waitForHealthz(baseUrl);

    const health = await fetch(`${baseUrl}/healthz`);
    expect(health.status).toBe(200);
    expect(await health.text()).toBe('ok');

    const unauthorizedMe = await fetch(`${baseUrl}/me`);
    expect(unauthorizedMe.status).toBe(401);
    expect(await unauthorizedMe.json()).toEqual({
      error: 'invalid_access_token',
    });

    const preflight = await fetch(`${baseUrl}/email/start`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://app.example.com',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'Authorization, Content-Type',
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe('*');
    expect(preflight.headers.get('access-control-allow-methods')).toBe(
      'GET, POST, PATCH, DELETE, OPTIONS',
    );

    const emailSession = await postJson(`${baseUrl}/email/verify`, {
      email: 'rust-user@example.com',
      code: '123456',
    });
    expect(emailSession.status).toBe(200);
    const emailTokens = (await emailSession.json()) as TokenResponse;
    expect(emailTokens).toMatchObject({
      access_token: expect.any(String),
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: expect.any(String),
    });

    const authenticatedMe = await fetch(`${baseUrl}/me`, {
      headers: bearerHeaders(emailTokens.access_token),
    });
    expect(authenticatedMe.status).toBe(200);
    expect(await authenticatedMe.json()).toMatchObject({
      email: 'rust-user@example.com',
      active_sessions: [expect.objectContaining({ auth_method: 'email_otp' })],
    });

    const deviceKey = createTestEd25519Keypair('default');
    const credentialResponse = await postJson(
      `${baseUrl}/ed25519/credentials`,
      { name: 'Rust E2E device', public_key: deviceKey.publicKey },
      emailTokens.access_token,
    );
    expect(credentialResponse.status).toBe(200);
    const credential = (await credentialResponse.json()) as { id: string };

    const startResponse = await postJson(`${baseUrl}/ed25519/start`, {
      credential_id: credential.id,
    });
    expect(startResponse.status).toBe(200);
    const challenge = (await startResponse.json()) as {
      request_id: string;
      challenge: string;
    };

    const verifyResponse = await postJson(`${baseUrl}/ed25519/verify`, {
      request_id: challenge.request_id,
      signature: deviceKey.signChallenge(challenge.challenge),
    });
    expect(verifyResponse.status).toBe(200);
    const ed25519Tokens = (await verifyResponse.json()) as TokenResponse;
    expect(ed25519Tokens).toMatchObject({
      access_token: expect.any(String),
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: expect.any(String),
    });

    const ed25519Me = await fetch(`${baseUrl}/me`, {
      headers: bearerHeaders(ed25519Tokens.access_token),
    });
    expect(ed25519Me.status).toBe(200);
    expect(await ed25519Me.json()).toMatchObject({
      email: 'rust-user@example.com',
      active_sessions: expect.arrayContaining([
        expect.objectContaining({ auth_method: 'ed25519' }),
      ]),
    });
  });
});

type TokenResponse = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
};

async function runCli(args: string[]) {
  const { status, stderr } = await new Promise<{
    status: number | null;
    stderr: string;
  }>((resolveProcess) => {
    const child = spawn(binaryPath, args, { cwd: repoRoot });
    let stderr = '';

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('close', (status) => resolveProcess({ status, stderr }));
  });

  expect(status, stderr).toBe(0);
}

function seedOtp(dbPath: string, email: string, code: string) {
  const db = new Database(dbPath);

  try {
    db.prepare(
      'INSERT INTO email_otps (email, code_hash, expires_at) VALUES (?, ?, ?)',
    ).run(email, hashValue(code), '9999-01-01T00:00:00.000Z');
  } finally {
    db.close();
  }
}

async function getFreePort() {
  const listener = createServer();

  await new Promise<void>((resolveListen) =>
    listener.listen(0, '127.0.0.1', resolveListen),
  );
  const address = listener.address();
  await new Promise<void>((resolveClose) =>
    listener.close(() => resolveClose()),
  );

  if (!address || typeof address === 'string') {
    throw new Error('free port listener did not expose a TCP port');
  }

  return address.port;
}

function startServer(dbPath: string, port: number, issuer: string) {
  return spawn(
    binaryPath,
    [
      'start',
      dbPath,
      '--issuer',
      issuer,
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--openapi',
      'openapi.yaml',
      '--schema',
      'sql/schema.sql',
    ],
    { cwd: repoRoot },
  );
}

async function waitForHealthz(baseUrl: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server?.exitCode !== null) {
      throw new Error('Rust server exited before health check succeeded');
    }

    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.status === 200) {
        return;
      }
    } catch {
      // RECOVERY: server bind may not be complete immediately after spawn.
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }

  throw new Error('Rust server did not become healthy within 5 seconds');
}

async function postJson(url: string, body: unknown, accessToken?: string) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(accessToken ? bearerHeaders(accessToken) : {}),
    },
    body: JSON.stringify(body),
  });
}

function bearerHeaders(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

async function stopServer() {
  const current = server;
  server = null;

  if (!current || current.exitCode !== null) {
    return;
  }

  current.kill('SIGTERM');
  await new Promise<void>((resolveExit) =>
    current.once('exit', () => resolveExit()),
  );
}
