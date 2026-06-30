import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { createTestEd25519Keypair } from '../tests/helpers/ed25519.js';
import { createTestPasskey } from '../tests/helpers/webauthn.js';
import { hashValue } from '../src/shared/crypto.js';

const repoRoot = resolve(import.meta.dirname, '..');
const binaryPath = resolve(repoRoot, 'rust-backend/target/debug/auth-mini');
const tempRoot = resolve(repoRoot, '.tmp/rust-e2e');
const webauthnOrigin = 'https://app.example.com';
const webauthnRpId = 'app.example.com';

let server: ChildProcessWithoutNullStreams | null = null;
let serverStderr = '';

afterEach(async () => {
  await stopServer();
  await rm(tempRoot, { recursive: true, force: true });
});

describe('rust external server e2e smoke', () => {
  it('initializes the default DB path under the process home', async () => {
    expect(existsSync(binaryPath)).toBe(true);

    const homePath = resolve(tempRoot, 'home');
    const defaultDbPath = resolve(homePath, '.auth-mini/default.sqlite3');

    const port = await getFreePort();
    const launched = spawn(
      binaryPath,
      ['--host', '127.0.0.1', '--port', String(port)],
      {
        cwd: repoRoot,
        env: { ...process.env, HOME: homePath, USERPROFILE: homePath },
      },
    );
    captureServerStderr(launched);
    server = launched;
    await waitForHealthz(`http://127.0.0.1:${port}`);

    expect(existsSync(defaultDbPath)).toBe(true);
  });

  it('serves core auth smoke flows from the Rust binary after setup', async () => {
    expect(existsSync(binaryPath)).toBe(true);

    await mkdir(tempRoot, { recursive: true });
    const dbPath = resolve(tempRoot, 'auth-mini-rust-e2e.sqlite');
    const port = await getFreePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    server = startServer(dbPath, port);
    await waitForHealthz(baseUrl);
    const adminKey = createTestEd25519Keypair('admin');

    const setup = await putJson(`${baseUrl}/admin/setup`, {
      issuer: baseUrl,
      origin: webauthnOrigin,
      admin_ed25519: {
        name: 'Rust E2E admin',
        public_key: adminKey.publicKey,
      },
    });
    expect(setup.status).toBe(200);
    const setupState = await setup.json();
    expect(setupState).toMatchObject({
      issuer: baseUrl,
      admin_user_id: expect.any(String),
      admin_ed25519: expect.objectContaining({
        name: 'Rust E2E admin',
        public_key: adminKey.publicKey,
      }),
      origins: [expect.objectContaining({ origin: webauthnOrigin })],
      smtp: null,
    });
    seedOtp(dbPath, 'rust-user@example.com', '123456');

    const health = await fetch(`${baseUrl}/healthz`);
    expect(health.status).toBe(200);
    expect(await health.text()).toBe('ok');

    const unauthorizedMe = await fetch(`${baseUrl}/me`);
    expect(unauthorizedMe.status).toBe(401);
    expect(await unauthorizedMe.json()).toEqual({
      error: 'invalid_access_token',
    });

    const adminStartResponse = await postJson(`${baseUrl}/ed25519/start`, {
      credential_id: setupState.admin_ed25519.id,
    });
    expect(adminStartResponse.status).toBe(200);
    const adminChallenge = (await adminStartResponse.json()) as {
      request_id: string;
      challenge: string;
    };
    const adminVerifyResponse = await postJson(`${baseUrl}/ed25519/verify`, {
      request_id: adminChallenge.request_id,
      signature: adminKey.signChallenge(adminChallenge.challenge),
    });
    expect(adminVerifyResponse.status).toBe(200);
    const adminTokens = (await adminVerifyResponse.json()) as TokenResponse;
    const adminMe = await fetch(`${baseUrl}/me`, {
      headers: bearerHeaders(adminTokens.access_token),
    });
    expect(adminMe.status).toBe(200);
    expect(await adminMe.json()).toMatchObject({
      user_id: setupState.admin_user_id,
      email: null,
      active_sessions: expect.arrayContaining([
        expect.objectContaining({ auth_method: 'ed25519' }),
      ]),
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
    expect(preflight.headers.get('access-control-allow-methods')).toContain(
      'PUT',
    );
    expect(preflight.headers.get('access-control-allow-methods')).toContain(
      'HEAD',
    );
    expect(preflight.headers.get('access-control-allow-headers')).toBe('*');

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

    const passkey = createTestPasskey('rust-e2e-webauthn');
    const registerOptionsResponse = await postJson(
      `${baseUrl}/webauthn/register/options`,
      { rp_id: webauthnRpId },
      emailTokens.access_token,
      webauthnOrigin,
    );
    expect(registerOptionsResponse.status).toBe(200);
    const registerOptions =
      (await registerOptionsResponse.json()) as WebauthnOptionsResponse;
    expect(registerOptions.publicKey).toMatchObject({
      challenge: expect.any(String),
      rp: { id: webauthnRpId, name: 'auth-mini' },
    });

    const registerVerifyResponse = await postJson(
      `${baseUrl}/webauthn/register/verify`,
      {
        request_id: registerOptions.request_id,
        credential: passkey.createRegistrationCredential(
          registerOptions.publicKey,
          webauthnOrigin,
        ),
      },
      emailTokens.access_token,
      webauthnOrigin,
    );
    expect(registerVerifyResponse.status).toBe(200);
    expect(await registerVerifyResponse.json()).toEqual({ ok: true });

    const registeredCredential = getWebauthnCredential(
      dbPath,
      passkey.credentialId,
    );
    expect(registeredCredential).toEqual({
      credential_id: passkey.credentialId,
      rp_id: webauthnRpId,
      last_used_at: null,
    });

    const authOptionsResponse = await postJson(
      `${baseUrl}/webauthn/authenticate/options`,
      { rp_id: webauthnRpId },
      undefined,
      webauthnOrigin,
    );
    expect(authOptionsResponse.status).toBe(200);
    const authOptions =
      (await authOptionsResponse.json()) as WebauthnOptionsResponse;
    expect(authOptions.publicKey).toMatchObject({
      challenge: expect.any(String),
      rpId: webauthnRpId,
    });

    const authVerifyResponse = await postJson(
      `${baseUrl}/webauthn/authenticate/verify`,
      {
        request_id: authOptions.request_id,
        credential: passkey.createAuthenticationCredential(
          authOptions.publicKey,
          webauthnOrigin,
        ),
      },
      undefined,
      webauthnOrigin,
    );
    expect(authVerifyResponse.status).toBe(200);
    const webauthnTokens = (await authVerifyResponse.json()) as TokenResponse;
    expect(webauthnTokens).toMatchObject({
      access_token: expect.any(String),
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: expect.any(String),
    });

    expect(getWebauthnCredential(dbPath, passkey.credentialId)).toEqual({
      credential_id: passkey.credentialId,
      rp_id: webauthnRpId,
      last_used_at: expect.any(String),
    });

    const webauthnMe = await fetch(`${baseUrl}/me`, {
      headers: bearerHeaders(webauthnTokens.access_token),
    });
    expect(webauthnMe.status).toBe(200);
    expect(await webauthnMe.json()).toMatchObject({
      email: 'rust-user@example.com',
      active_sessions: expect.arrayContaining([
        expect.objectContaining({ auth_method: 'webauthn' }),
      ]),
      webauthn_credentials: [
        expect.objectContaining({
          id: passkey.credentialId,
          credential_id: passkey.credentialId,
          transports: [],
          rp_id: webauthnRpId,
          last_used_at: expect.any(String),
        }),
      ],
    });
  });
});

type TokenResponse = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
};

type WebauthnOptionsResponse = {
  request_id: string;
  publicKey: {
    challenge: string;
    rp?: { id: string; name: string };
    rpId?: string;
  };
};

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

function getWebauthnCredential(dbPath: string, credentialId: string) {
  const db = new Database(dbPath);

  try {
    return db
      .prepare(
        'SELECT credential_id, rp_id, last_used_at FROM webauthn_credentials WHERE credential_id = ?',
      )
      .get(credentialId) as
      | {
          credential_id: string;
          rp_id: string;
          last_used_at: string | null;
        }
      | undefined;
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

function startServer(dbPath: string, port: number) {
  const launched = spawn(
    binaryPath,
    ['--db', dbPath, '--host', '127.0.0.1', '--port', String(port)],
    { cwd: repoRoot },
  );
  captureServerStderr(launched);
  return launched;
}

function captureServerStderr(launched: ChildProcessWithoutNullStreams) {
  serverStderr = '';
  launched.stderr.on('data', (chunk) => {
    serverStderr += String(chunk);
  });
}

async function waitForHealthz(baseUrl: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server?.exitCode !== null) {
      throw new Error(
        `Rust server exited before health check succeeded: ${serverStderr}`,
      );
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

async function postJson(
  url: string,
  body: unknown,
  accessToken?: string,
  origin?: string,
) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(accessToken ? bearerHeaders(accessToken) : {}),
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function putJson(url: string, body: unknown) {
  return fetch(url, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
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
