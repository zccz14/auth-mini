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
  { path: '/openapi.yaml', methods: ['get'] },
  { path: '/openapi.json', methods: ['get'] },
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

    for (const operation of publicOperations) {
      const pathItem = document.paths[operation.path];

      expect(pathItem).toBeTruthy();
      expect(operationAt(pathItem, operation.method)).toMatchObject({
        security: [],
      });
    }

    for (const operation of authenticatedOperations) {
      const pathItem = document.paths[operation.path];

      expect(pathItem).toBeTruthy();
      expect(operationAt(pathItem, operation.method)).toMatchObject({
        security: [{ bearerAuth: [] }],
      });
    }

    expect(
      operationAt(document.paths['/session/{session_id}/logout'], 'post')
        .parameters,
    ).toEqual([
      {
        name: 'session_id',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
        },
      },
    ]);
    expect(document.components?.parameters?.CredentialId).toEqual({
      name: 'id',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
      },
    });
    expect(
      operationAt(document.paths['/ed25519/credentials/{id}'], 'patch')
        .parameters,
    ).toEqual([{ $ref: '#/components/parameters/CredentialId' }]);
    expect(
      operationAt(document.paths['/ed25519/credentials/{id}'], 'delete')
        .parameters,
    ).toEqual([{ $ref: '#/components/parameters/CredentialId' }]);
    expect(
      operationAt(document.paths['/webauthn/credentials/{id}'], 'delete')
        .parameters,
    ).toEqual([{ $ref: '#/components/parameters/CredentialId' }]);

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

  it('serves the cached openapi yaml and derived json from the same source file', async () => {
    const testApp = await createTestApp();
    openApps.push(testApp);

    const expectedYaml = await readFile(
      new URL('../../openapi.yaml', import.meta.url),
      'utf8',
    );
    const expectedJson = parse(expectedYaml);

    const yamlResponse = await testApp.app.request('/openapi.yaml');
    const yamlText = await yamlResponse.text();
    const jsonResponse = await testApp.app.request('/openapi.json');

    expect(yamlResponse.status).toBe(200);
    expect(yamlResponse.headers.get('content-type')).toContain(
      'application/yaml',
    );
    expect(yamlText).toBe(expectedYaml);

    expect(jsonResponse.status).toBe(200);
    expect(await jsonResponse.json()).toEqual(expectedJson);
  });

  it('documents the expanded SessionSummary schema', async () => {
    const document = await readOpenApiContract();

    expect(document.components?.schemas?.SessionSummary).toMatchObject({
      required: [
        'id',
        'auth_method',
        'created_at',
        'expires_at',
        'ip',
        'user_agent',
      ],
      properties: {
        auth_method: { type: 'string' },
        ip: { type: ['string', 'null'] },
        user_agent: { type: ['string', 'null'] },
      },
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
    parameters?: Record<string, unknown>;
    schemas?: Record<
      string,
      {
        properties?: Record<string, unknown>;
        required?: string[];
      }
    >;
  };
  servers?: Array<{ url?: string }>;
  security?: Array<Record<string, unknown>>;
  paths: Record<string, Record<string, OpenApiOperation>>;
};

type OpenApiOperation = {
  parameters?: unknown;
  responses?: Record<
    string,
    { content?: Record<string, { examples?: unknown }> }
  >;
  security?: unknown;
};

const publicOperations = [
  { path: '/openapi.yaml', method: 'get' },
  { path: '/openapi.json', method: 'get' },
  { path: '/email/start', method: 'post' },
  { path: '/email/verify', method: 'post' },
  { path: '/session/refresh', method: 'post' },
  { path: '/ed25519/start', method: 'post' },
  { path: '/ed25519/verify', method: 'post' },
  { path: '/webauthn/authenticate/options', method: 'post' },
  { path: '/webauthn/authenticate/verify', method: 'post' },
  { path: '/jwks', method: 'get' },
] as const;

const authenticatedOperations = [
  { path: '/me', method: 'get' },
  { path: '/session/logout', method: 'post' },
  { path: '/session/{session_id}/logout', method: 'post' },
  { path: '/ed25519/credentials', method: 'get' },
  { path: '/ed25519/credentials', method: 'post' },
  { path: '/ed25519/credentials/{id}', method: 'patch' },
  { path: '/ed25519/credentials/{id}', method: 'delete' },
  { path: '/webauthn/register/options', method: 'post' },
  { path: '/webauthn/register/verify', method: 'post' },
  { path: '/webauthn/credentials/{id}', method: 'delete' },
] as const;

function operationAt(
  pathItem: Record<string, OpenApiOperation>,
  method: string,
) {
  return pathItem[method] as OpenApiOperation;
}
