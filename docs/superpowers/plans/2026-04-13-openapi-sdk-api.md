# OpenAPI SDK API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `openapi.yaml` as the single HTTP API contract source, generate and publish a low-level `auth-mini/sdk/api` package from it, and verify that generated artifacts, docs, and runtime base URL behavior stay aligned.

**Architecture:** Model the existing server routes in a root-level OpenAPI document, generate TypeScript client artifacts into `src/generated/api/` with `@hey-api/openapi-ts`, and keep all handwritten logic inside a thin `src/sdk/api.ts` wrapper that owns runtime `baseUrl` configuration and stable exports. Drive the work from focused tests first: one slice for contract coverage and generation drift, one slice for the wrapper/export surface, and one slice for docs/build integration so the generated package ships without rewriting the existing browser or device SDKs.

**Tech Stack:** TypeScript, OpenAPI 3.x YAML, `@hey-api/openapi-ts`, Vitest, Node.js, Hono

---

## File Map

- Create: `openapi.yaml`
  - Canonical HTTP API contract covering the currently public routes from `src/server/app.ts`.
- Create: `openapi-ts.config.ts`
  - Generator configuration that reads `openapi.yaml` and writes repeatable output into `src/generated/api/`.
- Create: `src/generated/api/`
  - Committed generated output from `@hey-api/openapi-ts` such as `client.gen.ts`, `sdk.gen.ts`, `types.gen.ts`, and `index.ts`.
- Create: `src/sdk/api.ts`
  - Thin handwritten wrapper that requires `baseUrl`, creates/configures the generated client, and re-exports the low-level generated operations and types from a stable package entry.
- Create: `tests/unit/sdk-api-module.test.ts`
  - Module-surface tests for the new `auth-mini/sdk/api` wrapper and export stability.
- Create: `tests/unit/sdk-api-base-url.test.ts`
  - Runtime configuration tests proving the wrapper requires and applies `baseUrl` at initialization time.
- Create: `tests/integration/openapi-contract.test.ts`
  - Integration coverage for key generated paths versus the running Hono app, plus a guard that the checked-in spec is parseable.
- Create: `scripts/check-generated-api-sdk.mjs`
  - Drift checker that regenerates into a repo-local temporary directory and fails when `src/generated/api/` is stale.
- Create: `docs/integration/api-sdk.md`
  - Consumer-facing guide for `auth-mini/sdk/api`, including `baseUrl` usage and positioning versus the browser/device SDKs.
- Modify: `package.json`
  - Add `@hey-api/openapi-ts`, generation/drift scripts, and `./sdk/api` package exports.
- Modify: `scripts/build-sdk.mjs`
  - Ensure the generated output and new handwritten wrapper are built as part of the existing package build flow without introducing a bespoke generator CLI.
- Modify: `docs/reference/http-api.md`
  - Reposition the page so `openapi.yaml` is the contract source of truth and the prose points readers to the generated SDK doc instead of treating the markdown file as the contract itself.
- Modify: `docs/integration/browser-sdk.md`
  - Clarify that browser SDK docs are not the HTTP API contract and point low-level consumers to `auth-mini/sdk/api`.
- Modify: `docs/integration/device-sdk.md`
  - Clarify that device SDK docs are not the HTTP API contract and point low-level consumers to `auth-mini/sdk/api`.
- Modify: `tests/fixtures/sdk-dts-consumer/tsconfig.json`
  - Include the new API SDK consumer file in the existing declaration-compilation fixture.
- Create: `tests/fixtures/sdk-dts-consumer/module-api-usage.ts`
  - Type-only import and wrapper-usage fixture for `auth-mini/sdk/api`.

### Task 1: Add the contract file and prove it matches the current HTTP surface

**Files:**

- Create: `tests/integration/openapi-contract.test.ts`
- Create: `openapi.yaml`
- Modify: `docs/reference/http-api.md`
- Reference only: `src/server/app.ts`, `src/shared/http-schemas.ts`

- [ ] **Step 1: Write the failing integration contract test first**

Create `tests/integration/openapi-contract.test.ts` with two focused assertions:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/app.js';

const readOpenApiDocument = () =>
  parse(readFileSync(resolve(process.cwd(), 'openapi.yaml'), 'utf8')) as {
    paths: Record<string, unknown>;
  };

describe('openapi contract', () => {
  it('declares the current public route set', () => {
    const document = readOpenApiDocument();

    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining([
        '/email/start',
        '/email/verify',
        '/me',
        '/session/refresh',
        '/session/logout',
        '/session/{session_id}/logout',
        '/ed25519/start',
        '/ed25519/verify',
        '/ed25519/credentials',
        '/ed25519/credentials/{id}',
        '/webauthn/register/options',
        '/webauthn/register/verify',
        '/webauthn/authenticate/options',
        '/webauthn/authenticate/verify',
        '/webauthn/credentials/{id}',
        '/jwks',
      ]),
    );
  });

  it('keeps key unauthenticated and authenticated paths aligned with the app', async () => {
    const testApp = await createTestApp();

    try {
      expect(
        (await testApp.app.request('/email/start', { method: 'POST' })).status,
      ).toBe(400);
      expect(
        (await testApp.app.request('/session/refresh', { method: 'POST' }))
          .status,
      ).toBe(400);
      expect((await testApp.app.request('/me')).status).toBe(401);
      expect((await testApp.app.request('/jwks')).status).toBe(200);
    } finally {
      testApp.close();
    }
  });
});
```

This should fail immediately because `openapi.yaml` does not exist yet and `yaml` is not currently in the repo.

- [ ] **Step 2: Run the focused test to confirm the red state**

Run: `npm run build && npx vitest run tests/integration/openapi-contract.test.ts`

Expected: FAIL with an ENOENT-style error for `openapi.yaml` or a missing import error until the contract file and parser dependency are added.

- [ ] **Step 3: Author `openapi.yaml` from the existing app behavior, not from desired future behavior**

Create `openapi.yaml` at the repo root with these top-level sections and conventions:

```yaml
openapi: 3.1.0
info:
  title: auth-mini HTTP API
  version: 0.1.9
servers:
  - url: http://localhost:7777
security:
  - bearerAuth: []
paths:
  /email/start:
    post:
      operationId: startEmail
      security: []
  /email/verify:
    post:
      operationId: verifyEmail
      security: []
  /me:
    get:
      operationId: getMe
  /session/refresh:
    post:
      operationId: refreshSession
      security: []
  /session/logout:
    post:
      operationId: logoutSession
  /session/{session_id}/logout:
    post:
      operationId: logoutPeerSession
  /ed25519/start:
    post:
      operationId: startEd25519Authentication
      security: []
  /ed25519/verify:
    post:
      operationId: verifyEd25519Authentication
      security: []
  /ed25519/credentials:
    get:
      operationId: listEd25519Credentials
    post:
      operationId: createEd25519Credential
  /ed25519/credentials/{id}:
    patch:
      operationId: updateEd25519Credential
    delete:
      operationId: deleteEd25519Credential
  /webauthn/register/options:
    post:
      operationId: createWebauthnRegistrationOptions
  /webauthn/register/verify:
    post:
      operationId: verifyWebauthnRegistration
  /webauthn/authenticate/options:
    post:
      operationId: createWebauthnAuthenticationOptions
      security: []
  /webauthn/authenticate/verify:
    post:
      operationId: verifyWebauthnAuthentication
      security: []
  /webauthn/credentials/{id}:
    delete:
      operationId: deleteWebauthnCredential
  /jwks:
    get:
      operationId: getJwks
      security: []
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
```

Fill in the request bodies, response bodies, path parameters, and named schemas directly from `src/server/app.ts`, `src/shared/http-schemas.ts`, and the currently documented response examples in `docs/reference/http-api.md`. Keep the error surface concrete: model the current `{ "error": "..." }` payloads instead of broad `object` placeholders.

- [ ] **Step 4: Update the HTTP reference page to point at the contract source of truth**

At the top of `docs/reference/http-api.md`, replace the current implicit-contract framing with a short note like this:

```md
> `openapi.yaml` is the source of truth for the auth-mini HTTP API.
> This page is a human-oriented overview that highlights the most important routes.
> For a typed low-level client, use `auth-mini/sdk/api` and see `docs/integration/api-sdk.md`.
```

Keep the route summary sections that still help readers, but remove any wording that implies the markdown page is the normative contract.

- [ ] **Step 5: Re-run the focused contract test**

Run: `npm run build && npx vitest run tests/integration/openapi-contract.test.ts`

Expected: PASS, proving the spec parses and the named key routes still match the Hono app's basic behavior.

- [ ] **Step 6: Commit the contract-only slice**

Run:

```bash
git add openapi.yaml docs/reference/http-api.md tests/integration/openapi-contract.test.ts
git commit -m "feat: add openapi api contract"
```

### Task 2: Add generation config, generator scripts, and artifact drift enforcement

**Files:**

- Create: `openapi-ts.config.ts`
- Create: `scripts/check-generated-api-sdk.mjs`
- Modify: `package.json`
- Create: `src/generated/api/` (generated)

- [ ] **Step 1: Add a failing unit test for the repo-level generation contract**

Create `tests/unit/sdk-api-module.test.ts` with a repo-shape assertion before changing `package.json`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
);

describe('sdk api package wiring', () => {
  it('declares generator scripts without publishing the wrapper export yet', () => {
    expect(packageJson.devDependencies['@hey-api/openapi-ts']).toBeTruthy();
    expect(packageJson.devDependencies.jiti).toBeTruthy();
    expect(packageJson.scripts['generate:api']).toBe('openapi-ts');
    expect(packageJson.scripts['check:generated:api']).toBe(
      'node scripts/check-generated-api-sdk.mjs',
    );
    expect(packageJson.exports['./sdk/api']).toBeUndefined();
  });
});
```

This should fail before the package metadata is updated.

- [ ] **Step 2: Run the focused unit test to verify the failure**

Run: `npm run build && npx vitest run tests/unit/sdk-api-module.test.ts`

Expected: FAIL because the new direct dependency and scripts do not exist yet.

- [ ] **Step 3: Add the generator dependency and script wiring**

Update `package.json` with the exact additions below:

```json
{
  "exports": {
    "./sdk/browser": {
      "types": "./dist/sdk/browser.d.ts",
      "import": "./dist/sdk/browser.js"
    },
    "./sdk/device": {
      "types": "./dist/sdk/device.d.ts",
      "import": "./dist/sdk/device.js"
    }
  },
  "scripts": {
    "generate:api": "openapi-ts",
    "check:generated:api": "node scripts/check-generated-api-sdk.mjs"
  },
  "devDependencies": {
    "@hey-api/openapi-ts": "0.96.0",
    "jiti": "^2.6.1",
    "yaml": "2.8.3"
  }
}
```

Use exact pinned versions, following the repo's existing npm style and Hey API's recommendation to avoid floating major/minor upgrades.

- [ ] **Step 4: Add the generator config with committed output in `src/generated/api/`**

Create `openapi-ts.config.ts` with the supported config-file shape from the upstream docs:

```ts
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './openapi.yaml',
  output: './src/generated/api',
  plugins: [
    '@hey-api/client-fetch',
    {
      name: '@hey-api/sdk',
      auth: true,
      operations: {
        strategy: 'flat',
      },
    },
  ],
});
```

Do not hand-edit generated files after this point. Any shape stabilization belongs in `src/sdk/api.ts`, not in `src/generated/api/*`.

- [ ] **Step 5: Generate the initial checked-in artifacts**

Run: `npm run generate:api`

Expected: `src/generated/api/` now contains generator-owned files such as:

```text
src/generated/api/client.gen.ts
src/generated/api/sdk.gen.ts
src/generated/api/types.gen.ts
src/generated/api/index.ts
```

If the generator produces additional support files under `client/` or `core/`, commit them too. Treat the whole directory as generated output.

- [ ] **Step 6: Add a repeatable drift-check script instead of relying on human eyeballing**

Create `scripts/check-generated-api-sdk.mjs` that loads `openapi-ts.config.ts`, regenerates into a repo-local temp directory by overriding only `output`, then compares against `src/generated/api/`:

```js
import { mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createClient } from '@hey-api/openapi-ts';
import { createJiti } from 'jiti';

const root = process.cwd();
const loadConfig = createJiti(import.meta.url);
const { default: loadedOpenapiTsConfig } = await loadConfig.import(
  '../openapi-ts.config.ts',
);
const openapiTsConfig = await loadedOpenapiTsConfig;
const output = resolve(root, openapiTsConfig.output);
const tempRoot = mkdtempSync(resolve(root, '.tmp-openapi-check-'));

try {
  await createClient({
    ...openapiTsConfig,
    output: tempRoot,
  });

  const diff = spawnSync(
    'git',
    ['diff', '--no-index', '--exit-code', output, tempRoot],
    {
      cwd: root,
      stdio: 'inherit',
    },
  );

  if (diff.status !== 0) {
    process.exit(diff.status ?? 1);
  }
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}
```

Keep the temporary directory inside the repo so the workflow respects the repo boundary rules.

- [ ] **Step 7: Re-run the focused package-wiring test and the drift checker**

Run: `npm run build && npx vitest run tests/unit/sdk-api-module.test.ts && npm run check:generated:api`

Expected: PASS, proving the package metadata exists for generation/drift tooling and the checked-in generated artifacts match the spec/config.

- [ ] **Step 8: Commit the tooling and generated-output slice**

Run:

```bash
git add package.json package-lock.json openapi-ts.config.ts scripts/check-generated-api-sdk.mjs src/generated/api tests/unit/sdk-api-module.test.ts
git commit -m "feat: generate openapi api sdk"
```

### Task 3: Add the thin `auth-mini/sdk/api` wrapper with runtime `baseUrl` configuration

**Files:**

- Modify: `package.json`
- Create: `src/sdk/api.ts`
- Create: `tests/unit/sdk-api-base-url.test.ts`
- Create: `tests/fixtures/sdk-dts-consumer/module-api-usage.ts`
- Modify: `tests/fixtures/sdk-dts-consumer/tsconfig.json`

- [ ] **Step 1: Write the failing runtime-config test before adding the wrapper**

Create `tests/unit/sdk-api-base-url.test.ts` to lock down the wrapper contract:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createApiSdk } from '../../src/sdk/api.js';

describe('sdk api baseUrl configuration', () => {
  it('requires a runtime baseUrl', () => {
    expect(() => createApiSdk({ baseUrl: '' })).toThrow('sdk_init_failed');
  });

  it('binds generated calls to the configured baseUrl', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        }),
    );

    const sdk = createApiSdk({
      baseUrl: 'https://auth.example.com/base',
      fetch,
    });

    await sdk.email.start({ email: 'user@example.com' });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toContain(
      'https://auth.example.com/base/email/start',
    );
  });
});
```

This should fail because `src/sdk/api.ts` does not exist yet.

- [ ] **Step 2: Run the focused baseUrl test to confirm the red state**

Run: `npm run build && npx vitest run tests/unit/sdk-api-base-url.test.ts`

Expected: FAIL with module-not-found or missing-export errors.

- [ ] **Step 3: Add the wrapper entry and keep it thin**

Create `src/sdk/api.ts` with a minimal stable surface that owns runtime configuration and reuses the generated code instead of copying it:

```ts
import { createClient } from '../generated/api/client.gen.js';
import {
  createEd25519Credential,
  createWebauthnAuthenticationOptions,
  createWebauthnRegistrationOptions,
  deleteEd25519Credential,
  deleteWebauthnCredential,
  getJwks,
  getMe,
  listEd25519Credentials,
  logoutPeerSession,
  logoutSession,
  refreshSession,
  startEd25519Authentication,
  startEmail,
  updateEd25519Credential,
  verifyEd25519Authentication,
  verifyEmail,
  verifyWebauthnAuthentication,
  verifyWebauthnRegistration,
} from '../generated/api/sdk.gen.js';
import { createSdkError } from './errors.js';

export * from '../generated/api/types.gen.js';

export type ApiSdkOptions = {
  auth?: string | (() => string | Promise<string>);
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
};

export function createApiSdk(options: ApiSdkOptions) {
  if (!options.baseUrl) {
    throw createSdkError('sdk_init_failed', 'Missing API base URL');
  }

  const client = createClient({
    auth: options.auth,
    baseUrl: options.baseUrl,
    fetch: options.fetch,
  });

  return {
    client,
    email: {
      start: (body: { email: string }) => startEmail({ body, client }),
      verify: (body: { code: string; email: string }) =>
        verifyEmail({ body, client }),
    },
    me: {
      get: () => getMe({ client }),
    },
    session: {
      logout: () => logoutSession({ client }),
      logoutOther: (sessionId: string) =>
        logoutPeerSession({ client, path: { session_id: sessionId } }),
      refresh: (body: { refresh_token: string; session_id: string }) =>
        refreshSession({ body, client }),
    },
    ed25519: {
      createCredential: (body: { name: string; public_key: string }) =>
        createEd25519Credential({ body, client }),
      deleteCredential: (id: string) =>
        deleteEd25519Credential({ client, path: { id } }),
      listCredentials: () => listEd25519Credentials({ client }),
      start: (body: { credential_id: string }) =>
        startEd25519Authentication({ body, client }),
      updateCredential: (id: string, body: { name: string }) =>
        updateEd25519Credential({ body, client, path: { id } }),
      verify: (body: { request_id: string; signature: string }) =>
        verifyEd25519Authentication({ body, client }),
    },
    webauthn: {
      authenticateOptions: (body: { rp_id: string }) =>
        createWebauthnAuthenticationOptions({ body, client }),
      authenticateVerify: (body: Record<string, unknown>) =>
        verifyWebauthnAuthentication({ body, client }),
      deleteCredential: (id: string) =>
        deleteWebauthnCredential({ client, path: { id } }),
      registerOptions: (body: { rp_id: string }) =>
        createWebauthnRegistrationOptions({ body, client }),
      registerVerify: (body: Record<string, unknown>) =>
        verifyWebauthnRegistration({ body, client }),
    },
    jwks: {
      get: () => getJwks({ client }),
    },
  };
}
```

Keep the wrapper limited to configuration, naming, and stable re-exports. Do not move browser/device session behavior into it.

- [ ] **Step 3.5: Publish the wrapper subpath once the wrapper exists**

Update `package.json` to add the new public export only after `src/sdk/api.ts` exists:

```json
{
  "exports": {
    "./sdk/api": {
      "types": "./dist/sdk/api.d.ts",
      "import": "./dist/sdk/api.js"
    }
  }
}
```

- [ ] **Step 4: Add a package-consumer declaration check for the new subpath**

Create `tests/fixtures/sdk-dts-consumer/module-api-usage.ts`:

```ts
import { createApiSdk } from 'auth-mini/sdk/api';
import type { ApiSdkOptions } from 'auth-mini/sdk/api';

const options: ApiSdkOptions = {
  baseUrl: 'https://auth.example.com',
};

const sdk = createApiSdk(options);

void sdk.email.start({ email: 'user@example.com' });
void sdk.session.refresh({
  refresh_token: 'refresh-token',
  session_id: 'session-id',
});
```

Then add that file to `tests/fixtures/sdk-dts-consumer/tsconfig.json` so the existing `scripts/run-tests.js` declaration pass catches future export regressions.

- [ ] **Step 5: Re-run the new focused unit test and the declaration-consumer check**

Run: `npm run build && npx vitest run tests/unit/sdk-api-base-url.test.ts && npx tsc -p tests/fixtures/sdk-dts-consumer/tsconfig.json`

Expected: PASS, proving the wrapper enforces runtime `baseUrl` and the published declarations compile from the consumer perspective.

- [ ] **Step 6: Commit the wrapper slice**

Run:

```bash
git add package.json src/sdk/api.ts tests/unit/sdk-api-base-url.test.ts tests/fixtures/sdk-dts-consumer
git commit -m "feat: add api sdk wrapper"
```

### Task 4: Integrate the new SDK into build, tests, and package verification

**Files:**

- Modify: `scripts/build-sdk.mjs`
- Modify: `tests/unit/sdk-dts-build.test.ts`
- Modify: `scripts/run-tests.js`
- Reuse: `tests/unit/sdk-api-module.test.ts`, `tests/unit/sdk-api-base-url.test.ts`, `tests/integration/openapi-contract.test.ts`

- [ ] **Step 1: Extend the build so generated code is refreshed before TypeScript emit**

Update `scripts/build-sdk.mjs` so the non-watch build runs generation before `tsc`:

```js
const preBuildCommands = ['npm run generate:api'];
const buildCommand = 'tsc -p tsconfig.build.json --declaration';

async function runBuild() {
  for (const command of preBuildCommands) {
    await runCommand(command);
  }
  await runCommand(buildCommand);
  await runPostBuild();
}
```

In watch mode, keep generation explicit and one-shot only. Do not build a custom OpenAPI watch daemon in this task.

- [ ] **Step 2: Extend the artifact-verification test to cover `dist/sdk/api.*`**

Add assertions to `tests/unit/sdk-dts-build.test.ts` for the new build artifacts:

```ts
const readApiModuleDeclaration = () =>
  readFileSync(resolve(process.cwd(), 'dist/sdk/api.d.ts'), 'utf8');

it('emits api sdk module declarations', () => {
  const output = readApiModuleDeclaration();

  expect(output).toContain('export declare function createApiSdk');
  expect(output).toContain('export type ApiSdkOptions');
  expect(output).toContain('../generated/api/types.gen');
});
```

Also assert that `scripts/run-tests.js` still runs the declaration-consumer compile after the vitest pass so `auth-mini/sdk/api` participates in the standard repo test path.

- [ ] **Step 3: Add the generated-artifact drift check to the normal verification path**

Insert `run('npm', ['run', 'check:generated:api']);` into `scripts/run-tests.js` after `npm run build` and before the full `vitest` run:

```js
export const main = (args) => {
  run('npm', ['run', 'build']);
  run('npm', ['run', 'check:generated:api']);

  if (isTargetedVitestRun(args)) {
    run('npx', ['vitest', 'run', ...args]);
    return;
  }

  run('npx', ['vitest', 'run', 'tests', ...args]);
  run('npx', ['tsc', '-p', 'tests/fixtures/sdk-dts-consumer/tsconfig.json']);
};
```

That keeps drift detection automatic whenever the repo's standard test runner is used.

- [ ] **Step 4: Run the focused verification batch for build + wrapper + drift**

Run: `npm run build && npx vitest run tests/unit/sdk-api-module.test.ts tests/unit/sdk-api-base-url.test.ts tests/unit/sdk-dts-build.test.ts tests/integration/openapi-contract.test.ts && npm run check:generated:api`

Expected: PASS, confirming the generated package is buildable, typed, and drift-checked.

- [ ] **Step 5: Commit the build/test integration slice**

Run:

```bash
git add scripts/build-sdk.mjs scripts/run-tests.js tests/unit/sdk-dts-build.test.ts
git commit -m "test: enforce generated api sdk artifacts"
```

### Task 5: Document the new low-level SDK and finish with a full verification pass

**Files:**

- Create: `docs/integration/api-sdk.md`
- Modify: `docs/integration/browser-sdk.md`
- Modify: `docs/integration/device-sdk.md`
- Modify: `docs/reference/http-api.md`

- [ ] **Step 1: Add the new integration guide for `auth-mini/sdk/api`**

Create `docs/integration/api-sdk.md` with the minimum sections below:

````md
# API SDK integration

Use `auth-mini/sdk/api` when you want a typed low-level client for the auth-mini HTTP API.

```ts
import { createApiSdk } from 'auth-mini/sdk/api';

const sdk = createApiSdk({
  baseUrl: 'https://auth.example.com',
});

await sdk.email.start({ email: 'user@example.com' });
```

## Positioning

- `auth-mini/sdk/api`: low-level HTTP contract wrapper around generated OpenAPI operations
- `auth-mini/sdk/browser`: browser storage, recovery, and session lifecycle
- `auth-mini/sdk/device`: Ed25519 device-login lifecycle for Node.js-style runtimes

## Runtime configuration

`baseUrl` is required at runtime. The generated client is not allowed to bake in a deployment-specific server origin.
````

Also include a short example showing `auth` configuration for bearer-token endpoints.

- [ ] **Step 2: Update browser and device docs so they stop acting like the HTTP contract source**

Add one short note near the top of both `docs/integration/browser-sdk.md` and `docs/integration/device-sdk.md`:

```md
For the low-level HTTP API contract, see `openapi.yaml` and `auth-mini/sdk/api`.
This guide covers higher-level runtime behavior for the browser/device SDK only.
```

- [ ] **Step 3: Re-run a docs-aware regression pass plus the standard repo test command**

Run: `npm test`

Expected: PASS, including build, drift check, unit/integration tests, and the package-consumer declaration compile.

- [ ] **Step 4: Stage the docs and any last test/build wiring touched in this task**

Run:

```bash
git add docs/integration/api-sdk.md docs/integration/browser-sdk.md docs/integration/device-sdk.md docs/reference/http-api.md
```

- [ ] **Step 5: Commit the documentation slice**

Run:

```bash
git commit -m "docs: add api sdk integration guide"
```

### Task 6: Final verification and branch hygiene

**Files:**

- Verify only: `openapi.yaml`, `openapi-ts.config.ts`, `src/generated/api/`, `src/sdk/api.ts`, `package.json`, `scripts/build-sdk.mjs`, `scripts/run-tests.js`, `tests/unit/sdk-api-module.test.ts`, `tests/unit/sdk-api-base-url.test.ts`, `tests/integration/openapi-contract.test.ts`, `docs/integration/api-sdk.md`, `docs/reference/http-api.md`

- [ ] **Step 1: Run the final scoped verification commands exactly**

Run:

```bash
npm run build
npm run check:generated:api
npx vitest run tests/unit/sdk-api-module.test.ts tests/unit/sdk-api-base-url.test.ts tests/unit/sdk-dts-build.test.ts tests/integration/openapi-contract.test.ts
npx tsc -p tests/fixtures/sdk-dts-consumer/tsconfig.json
```

Expected: every command passes with no generated-artifact diff and with `dist/sdk/api.js` plus `dist/sdk/api.d.ts` emitted.

- [ ] **Step 2: Review the final diff for scope drift**

Run: `git diff --stat`

Expected: diffs are limited to the OpenAPI contract, generator config/scripts, generated output, the new `src/sdk/api.ts` wrapper, related tests, and the four documentation files listed above. There should be no browser/device SDK behavioral rewrites.

- [ ] **Step 3: Check branch status before handing off**

Run: `git status --short`

Expected: no output.

- [ ] **Step 4: Rebase immediately before any future push command**

Run immediately before any future push command: `git fetch origin && git rebase origin/main`

This plan does not include pushing or PR creation; keep that as a separate post-implementation workflow.
