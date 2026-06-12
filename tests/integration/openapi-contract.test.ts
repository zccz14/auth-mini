import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

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
