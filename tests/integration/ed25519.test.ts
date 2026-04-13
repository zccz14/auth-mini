import { afterEach, describe, expect, it, vi } from 'vitest';

import type { OtpMailSeam } from '../helpers/mock-smtp.js';

const otpSeam = vi.hoisted(() => ({ current: null as OtpMailSeam | null }));

vi.mock('../../src/infra/smtp/mailer.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../src/infra/smtp/mailer.js')
  >('../../src/infra/smtp/mailer.js');

  return {
    ...actual,
    async sendOtpMail(config: unknown, email: string, code: string) {
      const seam = otpSeam.current;

      if (!seam) {
        throw new Error('OTP seam not installed for ed25519 tests');
      }

      return seam.sendOtpMail(
        config as { fromEmail: string; fromName?: string },
        email,
        code,
      );
    },
  };
});

import { createTestEd25519Keypair } from '../helpers/ed25519.js';
import { signJwt, verifyJwt } from '../../src/modules/jwks/service.js';
import {
  createOtpMailSeam,
  extractOtpCode,
  findLatestOtpMail,
} from '../helpers/mock-smtp.js';

const json = (value: unknown) => JSON.stringify(value);
const openApps: Array<{ close(): void }> = [];

afterEach(() => {
  otpSeam.current = null;

  while (openApps.length > 0) {
    openApps.pop()?.close();
  }
});

describe('ed25519 routes', () => {
  it('creates an ed25519 credential from an email otp session', async () => {
    const testApp = await createSignedInApp('create-ed25519@example.com');
    openApps.push(testApp);
    const deviceKey = createTestEd25519Keypair('default');

    const response = await testApp.app.request('/ed25519/credentials', {
      method: 'POST',
      headers: authHeaders(testApp.tokens.access_token),
      body: json({
        name: 'CI device',
        public_key: deviceKey.publicKey,
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: expect.any(String),
      name: 'CI device',
      public_key: deviceKey.publicKey,
      last_used_at: null,
      created_at: expect.any(String),
    });
  });

  it('lists only the current user ed25519 credentials in creation order', async () => {
    const ownerApp = await createSignedInApp('ed25519-owner@example.com');
    const otherApp = await createSignedInApp('ed25519-other@example.com');
    openApps.push(ownerApp, otherApp);
    const ownerKey = createTestEd25519Keypair('default');
    const secondOwnerKey = createTestEd25519Keypair('alternate');

    await ownerApp.app.request('/ed25519/credentials', {
      method: 'POST',
      headers: authHeaders(ownerApp.tokens.access_token),
      body: json({ name: 'Owner device A', public_key: ownerKey.publicKey }),
    });
    await otherApp.app.request('/ed25519/credentials', {
      method: 'POST',
      headers: authHeaders(otherApp.tokens.access_token),
      body: json({ name: 'Other device', public_key: ownerKey.publicKey }),
    });
    await ownerApp.app.request('/ed25519/credentials', {
      method: 'POST',
      headers: authHeaders(ownerApp.tokens.access_token),
      body: json({
        name: 'Owner device B',
        public_key: secondOwnerKey.publicKey,
      }),
    });

    const response = await ownerApp.app.request('/ed25519/credentials', {
      headers: authHeaders(ownerApp.tokens.access_token),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: expect.any(String),
        name: 'Owner device A',
        public_key: ownerKey.publicKey,
        last_used_at: null,
        created_at: expect.any(String),
      },
      {
        id: expect.any(String),
        name: 'Owner device B',
        public_key: secondOwnerKey.publicKey,
        last_used_at: null,
        created_at: expect.any(String),
      },
    ]);
  });

  it('includes ed25519 credentials in /me', async () => {
    const testApp = await createSignedInApp('ed25519-me@example.com');
    openApps.push(testApp);
    const deviceKey = createTestEd25519Keypair('default');

    await testApp.app.request('/ed25519/credentials', {
      method: 'POST',
      headers: authHeaders(testApp.tokens.access_token),
      body: json({
        name: 'Build runner',
        public_key: deviceKey.publicKey,
      }),
    });

    const response = await testApp.app.request('/me', {
      headers: authHeaders(testApp.tokens.access_token),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user_id: testApp.userId,
      email: 'ed25519-me@example.com',
      webauthn_credentials: [],
      ed25519_credentials: [
        {
          id: expect.any(String),
          name: 'Build runner',
          public_key: deviceKey.publicKey,
          last_used_at: null,
          created_at: expect.any(String),
        },
      ],
      active_sessions: [
        {
          id: testApp.sessionId,
          created_at: expect.any(String),
          expires_at: expect.any(String),
        },
      ],
    });
  });

  it('allows duplicate public keys across distinct credential rows', async () => {
    const ownerApp = await createSignedInApp('ed25519-dup-a@example.com');
    const otherApp = await createSignedInApp('ed25519-dup-b@example.com');
    openApps.push(ownerApp, otherApp);
    const sharedKey = createTestEd25519Keypair('default');

    const firstResponse = await ownerApp.app.request('/ed25519/credentials', {
      method: 'POST',
      headers: authHeaders(ownerApp.tokens.access_token),
      body: json({ name: 'Shared key A', public_key: sharedKey.publicKey }),
    });
    const secondResponse = await otherApp.app.request('/ed25519/credentials', {
      method: 'POST',
      headers: authHeaders(otherApp.tokens.access_token),
      body: json({ name: 'Shared key B', public_key: sharedKey.publicKey }),
    });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(await firstResponse.json()).toMatchObject({
      id: expect.any(String),
      public_key: sharedKey.publicKey,
    });
    expect(await secondResponse.json()).toMatchObject({
      id: expect.any(String),
      public_key: sharedKey.publicKey,
    });
  });

  it('renames and deletes only the current user credential', async () => {
    const ownerApp = await createSignedInApp(
      'ed25519-update-owner@example.com',
    );
    const otherApp = await createSignedInApp(
      'ed25519-update-other@example.com',
    );
    openApps.push(ownerApp, otherApp);
    const ownerKey = createTestEd25519Keypair('default');
    const otherKey = createTestEd25519Keypair('alternate');

    const ownerCreateResponse = await ownerApp.app.request(
      '/ed25519/credentials',
      {
        method: 'POST',
        headers: authHeaders(ownerApp.tokens.access_token),
        body: json({ name: 'Owner device', public_key: ownerKey.publicKey }),
      },
    );
    const otherCreateResponse = await otherApp.app.request(
      '/ed25519/credentials',
      {
        method: 'POST',
        headers: authHeaders(otherApp.tokens.access_token),
        body: json({ name: 'Other device', public_key: otherKey.publicKey }),
      },
    );
    const ownerCredential = (await ownerCreateResponse.json()) as {
      id: string;
    };
    const otherCredential = (await otherCreateResponse.json()) as {
      id: string;
    };

    const renameResponse = await ownerApp.app.request(
      `/ed25519/credentials/${ownerCredential.id}`,
      {
        method: 'PATCH',
        headers: authHeaders(ownerApp.tokens.access_token),
        body: json({ name: 'Renamed owner device' }),
      },
    );
    const forbiddenDeleteResponse = await ownerApp.app.request(
      `/ed25519/credentials/${otherCredential.id}`,
      {
        method: 'DELETE',
        headers: authHeaders(ownerApp.tokens.access_token),
      },
    );
    const deleteResponse = await ownerApp.app.request(
      `/ed25519/credentials/${ownerCredential.id}`,
      {
        method: 'DELETE',
        headers: authHeaders(ownerApp.tokens.access_token),
      },
    );

    expect(renameResponse.status).toBe(200);
    expect(await renameResponse.json()).toEqual({
      id: ownerCredential.id,
      name: 'Renamed owner device',
      public_key: ownerKey.publicKey,
      last_used_at: null,
      created_at: expect.any(String),
    });
    expect(forbiddenDeleteResponse.status).toBe(404);
    expect(await forbiddenDeleteResponse.json()).toEqual({
      error: 'credential_not_found',
    });
    expect(deleteResponse.status).toBe(200);
    expect(await deleteResponse.json()).toEqual({ ok: true });
  });

  it('rejects malformed ed25519 public keys', async () => {
    const testApp = await createSignedInApp('invalid-ed25519-key@example.com');
    openApps.push(testApp);

    const response = await testApp.app.request('/ed25519/credentials', {
      method: 'POST',
      headers: authHeaders(testApp.tokens.access_token),
      body: json({
        name: 'Broken device',
        public_key: 'not-a-valid-ed25519-public-key',
      }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_ed25519_credential',
    });
  });

  it('rejects ed25519 session amr on ed25519 credential management routes', async () => {
    const testApp = await createSignedInApp(
      'ed25519-management-denied@example.com',
    );
    openApps.push(testApp);
    const accessToken = await forgeAccessToken(testApp, {
      amr: ['ed25519'],
    });
    const deviceKey = createTestEd25519Keypair('default');

    const response = await testApp.app.request('/ed25519/credentials', {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: json({
        name: 'Denied device',
        public_key: deviceKey.publicKey,
      }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'insufficient_authentication_method',
    });
  });

  it('starts an ed25519 authentication challenge', async () => {
    const testApp = await createSignedInApp('ed25519-start@example.com');
    openApps.push(testApp);
    const deviceKey = createTestEd25519Keypair('default');
    const credential = await createCredentialForDevice(testApp, {
      name: 'Signer',
      publicKey: deviceKey.publicKey,
    });

    const response = await testApp.app.request('/ed25519/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json({ credential_id: credential.id }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      request_id: expect.any(String),
      challenge: expect.any(String),
    });
  });

  it('verifies an ed25519 challenge and mints a session token pair', async () => {
    const testApp = await createSignedInApp('ed25519-verify@example.com');
    openApps.push(testApp);
    const deviceKey = createTestEd25519Keypair('default');
    const credential = await createCredentialForDevice(testApp, {
      name: 'Builder',
      publicKey: deviceKey.publicKey,
    });
    const startResponse = await testApp.app.request('/ed25519/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json({ credential_id: credential.id }),
    });
    const startBody = (await startResponse.json()) as {
      request_id: string;
      challenge: string;
    };

    const verifyResponse = await testApp.app.request('/ed25519/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json({
        request_id: startBody.request_id,
        signature: deviceKey.signChallenge(startBody.challenge),
      }),
    });
    const verifyBody = (await verifyResponse.json()) as {
      session_id: string;
      access_token: string;
      token_type: 'Bearer';
      expires_in: number;
      refresh_token: string;
    };
    const payload = await verifyJwt(testApp.db, verifyBody.access_token);
    const storedCredential = testApp.db
      .prepare('SELECT last_used_at FROM ed25519_credentials WHERE id = ?')
      .get(credential.id) as { last_used_at: string | null };

    expect(verifyResponse.status).toBe(200);
    expect(verifyBody).toEqual({
      session_id: expect.any(String),
      access_token: expect.any(String),
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: expect.any(String),
    });
    expect(payload.amr).toEqual(['ed25519']);
    expect(storedCredential.last_used_at).toEqual(expect.any(String));
  });

  it('verify stores request snapshot fields on the created session', async () => {
    const testApp = await createSignedInApp('ed25519-snapshot@example.com', {
      clientIp: '203.0.113.12',
    });
    openApps.push(testApp);

    const deviceKey = createTestEd25519Keypair('snapshot');
    const credential = await createCredentialForDevice(testApp, {
      name: 'Snapshot device',
      publicKey: deviceKey.publicKey,
    });
    const startBody = await startAuthentication(testApp, credential.id);

    const response = await testApp.app.request('/ed25519/verify', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'User-Agent': 'Ed25519Agent/3.0 (snapshot)',
      },
      body: json({
        request_id: startBody.request_id,
        signature: deviceKey.signChallenge(startBody.challenge),
      }),
    });
    const body = (await response.json()) as { session_id: string };

    expect(response.status).toBe(200);
    expect(
      testApp.db
        .prepare(
          'SELECT auth_method, ip, user_agent FROM sessions WHERE id = ?',
        )
        .get(body.session_id),
    ).toEqual({
      auth_method: 'ed25519',
      ip: '203.0.113.12',
      user_agent: 'Ed25519Agent/3.0 (snapshot)',
    });
  });

  it('rejects expired challenges', async () => {
    const testApp = await createSignedInApp('ed25519-expired@example.com');
    openApps.push(testApp);
    const deviceKey = createTestEd25519Keypair('default');
    const credential = await createCredentialForDevice(testApp, {
      name: 'Expired signer',
      publicKey: deviceKey.publicKey,
    });
    const startBody = await startAuthentication(testApp, credential.id);

    testApp.db
      .prepare(
        'UPDATE ed25519_challenges SET expires_at = ? WHERE request_id = ?',
      )
      .run('2000-01-01T00:00:00.000Z', startBody.request_id);

    const response = await testApp.app.request('/ed25519/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json({
        request_id: startBody.request_id,
        signature: deviceKey.signChallenge(startBody.challenge),
      }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_ed25519_authentication',
    });
  });

  it('rejects reused challenges', async () => {
    const testApp = await createSignedInApp('ed25519-reuse@example.com');
    openApps.push(testApp);
    const deviceKey = createTestEd25519Keypair('default');
    const credential = await createCredentialForDevice(testApp, {
      name: 'Reuse signer',
      publicKey: deviceKey.publicKey,
    });
    const startBody = await startAuthentication(testApp, credential.id);
    const payload = json({
      request_id: startBody.request_id,
      signature: deviceKey.signChallenge(startBody.challenge),
    });

    const firstResponse = await testApp.app.request('/ed25519/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
    });
    const secondResponse = await testApp.app.request('/ed25519/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
    });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(400);
    expect(await secondResponse.json()).toEqual({
      error: 'invalid_ed25519_authentication',
    });
  });

  it('rejects invalid signatures and unknown request ids', async () => {
    const testApp = await createSignedInApp(
      'ed25519-invalid-signature@example.com',
    );
    openApps.push(testApp);
    const deviceKey = createTestEd25519Keypair('default');
    const otherKey = createTestEd25519Keypair('alternate');
    const credential = await createCredentialForDevice(testApp, {
      name: 'Invalid signer',
      publicKey: deviceKey.publicKey,
    });
    const startBody = await startAuthentication(testApp, credential.id);

    const badSignatureResponse = await testApp.app.request('/ed25519/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json({
        request_id: startBody.request_id,
        signature: otherKey.signChallenge(startBody.challenge),
      }),
    });
    const unknownRequestResponse = await testApp.app.request(
      '/ed25519/verify',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: json({
          request_id: '5dbcb0f7-d30f-4f68-a721-bd08ae5f2475',
          signature: deviceKey.signChallenge(startBody.challenge),
        }),
      },
    );

    expect(badSignatureResponse.status).toBe(400);
    expect(await badSignatureResponse.json()).toEqual({
      error: 'invalid_ed25519_authentication',
    });
    expect(unknownRequestResponse.status).toBe(400);
    expect(await unknownRequestResponse.json()).toEqual({
      error: 'invalid_ed25519_authentication',
    });
  });

  it('returns 500 without consuming the challenge when session minting fails', async () => {
    const testApp = await createSignedInApp('ed25519-jwks-failure@example.com');
    openApps.push(testApp);
    const deviceKey = createTestEd25519Keypair('default');
    const credential = await createCredentialForDevice(testApp, {
      name: 'Mint failure signer',
      publicKey: deviceKey.publicKey,
    });
    const startBody = await startAuthentication(testApp, credential.id);

    testApp.db.prepare('DELETE FROM jwks_keys WHERE id = ?').run('CURRENT');

    const response = await testApp.app.request('/ed25519/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json({
        request_id: startBody.request_id,
        signature: deviceKey.signChallenge(startBody.challenge),
      }),
    });
    const storedChallenge = testApp.db
      .prepare(
        'SELECT consumed_at FROM ed25519_challenges WHERE request_id = ? LIMIT 1',
      )
      .get(startBody.request_id) as { consumed_at: string | null };
    const storedCredential = testApp.db
      .prepare(
        'SELECT last_used_at FROM ed25519_credentials WHERE id = ? LIMIT 1',
      )
      .get(credential.id) as { last_used_at: string | null };

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'internal_error' });
    expect(storedChallenge.consumed_at).toBeNull();
    expect(storedCredential.last_used_at).toBeNull();
  });
});

async function createSignedInApp(
  email: string,
  options?: { clientIp?: string | null },
) {
  otpSeam.current = createOtpMailSeam();
  const { createTestApp } = await loadMockedAppHelpers();
  const testApp = await createTestApp(options);
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
    .get(email) as {
    id: string;
  };
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

function authHeaders(accessToken: string) {
  return {
    authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json',
  };
}

function getCurrentOtpSeam(): OtpMailSeam {
  if (!otpSeam.current) {
    throw new Error('OTP seam not installed for ed25519 tests');
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
          throw new Error('OTP seam not installed for ed25519 tests');
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

async function forgeAccessToken(
  testApp: Awaited<ReturnType<typeof createSignedInApp>>,
  overrides: { amr: unknown },
) {
  const payload = await verifyJwt(testApp.db, testApp.tokens.access_token);
  const nextPayload: Record<string, unknown> = {
    ...payload,
    sid: testApp.sessionId,
    sub: testApp.userId,
    amr: overrides.amr,
  };

  return signJwt(testApp.db, nextPayload);
}

async function createCredentialForDevice(
  testApp: Awaited<ReturnType<typeof createSignedInApp>>,
  input: { name: string; publicKey: string },
) {
  const response = await testApp.app.request('/ed25519/credentials', {
    method: 'POST',
    headers: authHeaders(testApp.tokens.access_token),
    body: json({ name: input.name, public_key: input.publicKey }),
  });

  expect(response.status).toBe(200);

  return (await response.json()) as { id: string };
}

async function startAuthentication(
  testApp: Awaited<ReturnType<typeof createSignedInApp>>,
  credentialId: string,
) {
  const response = await testApp.app.request('/ed25519/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: json({ credential_id: credentialId }),
  });

  expect(response.status).toBe(200);

  return (await response.json()) as { request_id: string; challenge: string };
}
