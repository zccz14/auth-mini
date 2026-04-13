import { readFile } from 'node:fs/promises';
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
        throw new Error('OTP seam not installed for openapi contract tests');
      }

      return seam.sendOtpMail(
        config as { fromEmail: string; fromName?: string },
        email,
        code,
      );
    },
  };
});

import { createTestApp } from '../helpers/app.js';
import {
  createOtpMailSeam,
  extractOtpCode,
  findLatestOtpMail,
} from '../helpers/mock-smtp.js';

const json = (value: unknown) => JSON.stringify(value);
const openApps: Array<{ close(): void }> = [];

const contractOperations = [
  { path: '/email/start', methods: ['post'] },
  { path: '/email/verify', methods: ['post'] },
  { path: '/me', methods: ['get'] },
  { path: '/session/refresh', methods: ['post'] },
  { path: '/session/logout', methods: ['post'] },
  { path: '/session/{session_id}/logout', methods: ['post'] },
  { path: '/ed25519/start', methods: ['post'] },
  { path: '/ed25519/verify', methods: ['post'] },
  { path: '/ed25519/credentials', methods: ['get', 'post'] },
  { path: '/ed25519/credentials/{id}', methods: ['patch', 'delete'] },
  { path: '/webauthn/register/options', methods: ['post'] },
  { path: '/webauthn/register/verify', methods: ['post'] },
  { path: '/webauthn/authenticate/options', methods: ['post'] },
  { path: '/webauthn/authenticate/verify', methods: ['post'] },
  { path: '/webauthn/credentials/{id}', methods: ['delete'] },
  { path: '/jwks', methods: ['get'] },
] as const;

afterEach(() => {
  otpSeam.current = null;

  while (openApps.length > 0) {
    openApps.pop()?.close();
  }
});

describe('openapi contract', () => {
  it('documents the current public http route set', async () => {
    const contract = await readOpenApiContract();

    expect(contract).toContain('openapi: 3.1.0');

    for (const operation of contractOperations) {
      expect(contract).toContain(`  ${operation.path}:`);
      const pathBlock = contract.match(
        new RegExp(
          `^  ${escapeRegExp(operation.path)}:\n([\\s\\S]*?)(?=^  /|^components:)`,
          'm',
        ),
      )?.[0];

      expect(pathBlock).toBeTruthy();

      for (const method of operation.methods) {
        expect(pathBlock).toContain(`    ${method}:`);
      }
    }
  });

  it('matches live behavior for email start, refresh, me, and jwks', async () => {
    otpSeam.current = createOtpMailSeam();
    const testApp = await createTestApp();
    openApps.push(testApp);

    const startResponse = await testApp.app.request('/email/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json({ email: 'contract@example.com' }),
    });
    const otpCode = extractOtpCode(
      findLatestOtpMail(otpSeam.current.mailbox, 'contract@example.com')
        ?.text ?? '',
    );
    const verifyResponse = await testApp.app.request('/email/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json({ email: 'contract@example.com', code: otpCode }),
    });
    const tokens = (await verifyResponse.json()) as {
      session_id: string;
      access_token: string;
      refresh_token: string;
    };

    const refreshResponse = await testApp.app.request('/session/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json({
        session_id: tokens.session_id,
        refresh_token: tokens.refresh_token,
      }),
    });
    const meResponse = await testApp.app.request('/me', {
      headers: {
        authorization: `Bearer ${tokens.access_token}`,
      },
    });
    const jwksResponse = await testApp.app.request('/jwks');

    expect(startResponse.status).toBe(200);
    expect(await startResponse.json()).toEqual({ ok: true });

    expect(refreshResponse.status).toBe(200);
    expect(await refreshResponse.json()).toEqual({
      session_id: tokens.session_id,
      access_token: expect.any(String),
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: expect.any(String),
    });

    expect(meResponse.status).toBe(200);
    expect(await meResponse.json()).toEqual({
      user_id: expect.any(String),
      email: 'contract@example.com',
      webauthn_credentials: [],
      ed25519_credentials: [],
      active_sessions: [
        {
          id: tokens.session_id,
          created_at: expect.any(String),
          expires_at: expect.any(String),
        },
      ],
    });

    expect(jwksResponse.status).toBe(200);
    expect(await jwksResponse.json()).toEqual({
      keys: [
        {
          kid: expect.any(String),
          alg: 'EdDSA',
          kty: 'OKP',
          crv: 'Ed25519',
          use: 'sig',
          x: expect.any(String),
        },
        {
          kid: expect.any(String),
          alg: 'EdDSA',
          kty: 'OKP',
          crv: 'Ed25519',
          use: 'sig',
          x: expect.any(String),
        },
      ],
    });
  });
});

async function readOpenApiContract() {
  return readFile(new URL('../../openapi.yaml', import.meta.url), 'utf8');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
