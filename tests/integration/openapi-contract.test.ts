import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';

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
    const document = await readOpenApiContract();

    expect(document.openapi).toBe('3.1.0');
    expect(document.servers).toEqual([{ url: 'http://localhost:7777' }]);
    expect(document.security).toEqual([{ bearerAuth: [] }]);
    expect(document.paths).toBeTruthy();

    for (const operation of contractOperations) {
      const pathItem = document.paths[operation.path];

      expect(pathItem).toBeTruthy();

      for (const method of operation.methods) {
        expect(pathItem).toHaveProperty(method);
      }
    }

    for (const path of publicRoutePaths) {
      expect(document.paths[path]).toBeTruthy();
      expect(firstOperation(document.paths[path])).toMatchObject({
        security: [],
      });
    }

    for (const path of authenticatedRoutePaths) {
      expect(document.paths[path]).toBeTruthy();
      expect(firstOperation(document.paths[path])).toMatchObject({
        security: [{ bearerAuth: [] }],
      });
    }

    expect(
      document.paths['/ed25519/start']?.post?.responses?.['400']?.content?.[
        'application/json'
      ]?.examples,
    ).toMatchObject({
      invalid_ed25519_authentication: {
        value: { error: 'invalid_ed25519_authentication' },
      },
    });

    expect(
      document.components?.schemas?.RegistrationCredentialJson?.properties
        ?.authenticatorAttachment,
    ).toMatchObject({
      type: 'string',
    });
    expect(
      document.components?.schemas?.AuthenticationCredentialJson?.properties
        ?.authenticatorAttachment,
    ).toMatchObject({
      type: 'string',
    });
  });

  it('matches live auth-boundary baseline behavior for key routes', async () => {
    const testApp = await createTestApp();
    openApps.push(testApp);

    const startResponse = await testApp.app.request('/email/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const refreshResponse = await testApp.app.request('/session/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const meResponse = await testApp.app.request('/me');
    const jwksResponse = await testApp.app.request('/jwks');

    expect(startResponse.status).toBe(400);
    expect(await startResponse.json()).toEqual({ error: 'invalid_request' });

    expect(refreshResponse.status).toBe(400);
    expect(await refreshResponse.json()).toEqual({ error: 'invalid_request' });

    expect(meResponse.status).toBe(401);
    expect(await meResponse.json()).toEqual({ error: 'invalid_access_token' });

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
  const text = await readFile(
    new URL('../../openapi.yaml', import.meta.url),
    'utf8',
  );

  return parse(text) as OpenApiDocument;
}

type OpenApiDocument = {
  openapi?: string;
  components?: {
    schemas?: Record<string, { properties?: Record<string, unknown> }>;
  };
  servers?: Array<{ url?: string }>;
  security?: Array<Record<string, unknown>>;
  paths: Record<string, Record<string, unknown>>;
};

const publicRoutePaths = [
  '/email/start',
  '/email/verify',
  '/session/refresh',
  '/ed25519/start',
  '/ed25519/verify',
  '/webauthn/authenticate/options',
  '/webauthn/authenticate/verify',
  '/jwks',
] as const;

const authenticatedRoutePaths = [
  '/me',
  '/session/logout',
  '/session/{session_id}/logout',
  '/ed25519/credentials',
  '/ed25519/credentials/{id}',
  '/webauthn/register/options',
  '/webauthn/register/verify',
  '/webauthn/credentials/{id}',
] as const;

function firstOperation(pathItem: Record<string, unknown>) {
  return Object.values(pathItem)[0] as { security?: unknown };
}
