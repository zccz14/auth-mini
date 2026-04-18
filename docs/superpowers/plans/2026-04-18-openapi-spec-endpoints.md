# OpenAPI Spec Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load the packaged `openapi.yaml` once at startup, cache both the raw YAML string and parsed JSON document in memory, expose them at `GET /openapi.yaml` and `GET /openapi.json`, and fail startup if the packaged spec is missing or invalid.

**Architecture:** Add one shared loader module that resolves `openapi.yaml` relative to built runtime code instead of `process.cwd()`, reads the file once, parses it with `yaml`, and returns a typed cache object. Thread that cache into `runStartCommand()` and `createApp()`, add two read-only Hono routes that only return startup-cached data, update `openapi.yaml` to document those routes, and extend tests so contract coverage, startup failure behavior, and build/package artifact inclusion all stay aligned.

**Tech Stack:** TypeScript, Node.js, Hono, Vitest, OpenAPI YAML, `yaml`, npm packaging

---

## File Map

- Create: `src/shared/openapi.ts`
  - Startup-only loader for `openapi.yaml`, including path resolution from built artifacts, YAML parsing, and the in-memory cache type shared by runtime code and tests.
- Modify: `src/app/commands/start.ts`
  - Load the packaged spec before constructing the app, fail fast on missing/invalid spec, and pass the cache into `createApp()`.
- Modify: `src/server/app.ts`
  - Accept the OpenAPI cache in app dependencies and expose `GET /openapi.yaml` and `GET /openapi.json` from startup-cached values only.
- Modify: `tests/helpers/app.ts`
  - Build the in-memory integration app with the same OpenAPI cache loader used by runtime startup so integration tests exercise the same cached document shape.
- Modify: `openapi.yaml`
  - Add `/openapi.yaml` and `/openapi.json` operations and keep the contract as the single source of truth.
- Modify: `tests/integration/openapi-contract.test.ts`
  - Extend contract assertions and live endpoint checks so the new documentation routes match both the checked-in contract and runtime behavior.
- Modify: `tests/unit/start-command.test.ts`
  - Add failing-first coverage for startup cache loading, cache wiring into `createApp()`, and startup failure when the spec is missing or invalid.
- Create: `tests/unit/openapi-loader.test.ts`
  - Focused parser tests for valid documents and invalid non-object YAML so startup failure on invalid packaged specs starts from a guaranteed red test.
- Create: `tests/unit/openapi-build-artifact.test.ts`
  - Verify the build pipeline copies `openapi.yaml` into `dist/` and that the packed npm tarball includes `package/dist/openapi.yaml`.
- Modify: `scripts/build-sdk.mjs`
  - Copy `openapi.yaml` into `dist/openapi.yaml` after code generation and TypeScript build so runtime startup can read the packaged artifact.

### Task 1: Update the contract and prove the new endpoints against the in-memory app

**Files:**

- Modify: `openapi.yaml`
- Modify: `tests/integration/openapi-contract.test.ts`
- Reference only: `src/server/app.ts`, `tests/helpers/app.ts`

- [ ] **Step 1: Write the failing integration assertions first**

Add two focused tests to `tests/integration/openapi-contract.test.ts`.

Append the new operations to `contractOperations`:

```ts
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
  { path: '/openapi.yaml', methods: ['get'] },
  { path: '/openapi.json', methods: ['get'] },
] as const;
```

Add a new live-behavior test:

```ts
it('serves the cached openapi yaml and derived json from the same source file', async () => {
  const testApp = await createTestApp();
  openApps.push(testApp);

  const yamlResponse = await testApp.app.request('/openapi.yaml');
  const jsonResponse = await testApp.app.request('/openapi.json');
  const expectedYaml = await readFile(
    new URL('../../openapi.yaml', import.meta.url),
    'utf8',
  );
  const expectedJson = parse(expectedYaml);

  expect(yamlResponse.status).toBe(200);
  expect(yamlResponse.headers.get('content-type')).toContain(
    'application/yaml',
  );
  expect(await yamlResponse.text()).toBe(expectedYaml);

  expect(jsonResponse.status).toBe(200);
  expect(jsonResponse.headers.get('content-type')).toContain(
    'application/json',
  );
  expect(await jsonResponse.json()).toEqual(expectedJson);
});
```

- [ ] **Step 2: Run the focused integration test to confirm the red state**

Run: `npm run build && npx vitest run tests/integration/openapi-contract.test.ts`

Expected: FAIL because `openapi.yaml` does not yet document `/openapi.yaml` and `/openapi.json`, and the app does not yet serve either route.

- [ ] **Step 3: Update `openapi.yaml` with the two public documentation routes**

Add these path items near `/jwks` so the contract documents the new routes from the same source file the server will later load:

```yaml
/openapi.yaml:
  get:
    security: []
    tags:
      - openapi
    operationId: getOpenApiYaml
    summary: Return the packaged OpenAPI YAML document
    responses:
      '200':
        description: The exact startup-cached OpenAPI YAML text
        content:
          application/yaml:
            schema:
              type: string
/openapi.json:
  get:
    security: []
    tags:
      - openapi
    operationId: getOpenApiJson
    summary: Return the packaged OpenAPI document as JSON
    responses:
      '200':
        description: The startup-cached OpenAPI document parsed from YAML
        content:
          application/json:
            schema:
              type: object
              additionalProperties: true
```

Do not add a second persisted JSON file. Keep `openapi.yaml` as the only contract file on disk.

- [ ] **Step 4: Re-run the focused integration test and confirm only the runtime route gap remains**

Run: `npm run build && npx vitest run tests/integration/openapi-contract.test.ts`

Expected: FAIL only on the new live endpoint test with `404` responses for `/openapi.yaml` and `/openapi.json`.

- [ ] **Step 5: Commit the contract-first slice**

Run:

```bash
git add openapi.yaml tests/integration/openapi-contract.test.ts
git commit -m "test: add openapi endpoint contract coverage"
```

### Task 2: Load and cache the packaged spec at startup, then expose both routes

**Files:**

- Create: `src/shared/openapi.ts`
- Modify: `src/app/commands/start.ts`
- Modify: `src/server/app.ts`
- Modify: `tests/helpers/app.ts`
- Modify: `tests/unit/start-command.test.ts`
- Modify: `tests/integration/openapi-contract.test.ts`

- [ ] **Step 1: Write the failing startup wiring tests first**

In `tests/unit/start-command.test.ts`, mock the new loader and assert `runStartCommand()` passes a cache object into `createApp()`:

```ts
const loadOpenApiDocument = vi.fn();

vi.mock('../../src/shared/openapi.js', () => ({
  loadOpenApiDocument,
}));

it('loads the packaged openapi document once before creating the app', async () => {
  const server = createMockServer();
  const db = {
    close: vi.fn(),
    prepare: vi.fn().mockReturnValue({ all: vi.fn().mockReturnValue([]) }),
  };
  const openApi = {
    yamlText: 'openapi: 3.1.0\n',
    jsonDocument: { openapi: '3.1.0', paths: {} },
  };

  createDatabaseClient.mockReturnValue(db);
  bootstrapKeys.mockResolvedValue({ id: 'key-1', kid: 'kid-1' });
  createServer.mockReturnValue(server);
  createApp.mockReturnValue({ fetch: vi.fn() });
  loadOpenApiDocument.mockResolvedValue(openApi);

  const runStartCommand = await loadRunStartCommand();
  const runningServer = await runStartCommand({ dbPath: '/tmp/auth-mini.db' });

  expect(loadOpenApiDocument).toHaveBeenCalledTimes(1);
  expect(createApp).toHaveBeenCalledWith(
    expect.objectContaining({
      db,
      openApi,
    }),
  );

  await runningServer.close();
});
```

In `tests/integration/openapi-contract.test.ts`, keep the live route assertions from Task 1 unchanged so they stay red until the app serves real cached values.

- [ ] **Step 2: Run the targeted tests to confirm the red state**

Run: `npx vitest run tests/unit/start-command.test.ts -t "loads the packaged openapi document once before creating the app"`

Expected: FAIL because `src/shared/openapi.ts` and the new `openApi` dependency do not exist yet.

Run: `npm run build && npx vitest run tests/integration/openapi-contract.test.ts -t "serves the cached openapi yaml and derived json from the same source file"`

Expected: FAIL with `404` responses for both routes.

- [ ] **Step 3: Implement the shared loader in one focused module**

Create `src/shared/openapi.ts` with a startup-only loader that resolves the packaged file relative to compiled code:

```ts
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

export type OpenApiDocumentCache = {
  yamlText: string;
  jsonDocument: Record<string, unknown>;
};

export async function loadOpenApiDocument(): Promise<OpenApiDocumentCache> {
  const yamlText = await readFile(
    new URL('../openapi.yaml', import.meta.url),
    'utf8',
  );
  const parsed = parse(yamlText);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('openapi.yaml must parse to an object document');
  }

  return {
    yamlText,
    jsonDocument: parsed as Record<string, unknown>,
  };
}
```

This path is correct after build because `src/shared/openapi.ts` becomes `dist/shared/openapi.js`, and `../openapi.yaml` resolves to `dist/openapi.yaml`.

- [ ] **Step 4: Thread the cache through startup and the Hono app with the smallest possible API change**

Update `src/app/commands/start.ts` so startup loads the cache before `createApp()`:

```ts
import { loadOpenApiDocument } from '../../shared/openapi.js';

const openApi = await loadOpenApiDocument();

const app = createApp({
  db,
  getClientIp(request) {
    return clientIps.get(request) ?? null;
  },
  getOrigins() {
    return listAllowedOrigins(db).map((origin) => origin.origin);
  },
  issuer: config.issuer,
  logger,
  openApi,
});
```

Update `src/server/app.ts` to accept `openApi` and add two routes before authenticated business routes:

```ts
import type { OpenApiDocumentCache } from '../shared/openapi.js';

type AppVariables = AuthVariables & {
  clientIp: string | null;
  db: DatabaseClient;
  issuer: string;
  logger: AppLogger;
  openApi: OpenApiDocumentCache;
  origins: string[];
  requestId: string;
};

export function createApp(input: {
  db: DatabaseClient;
  getClientIp?: (request: Request) => string | null;
  getOrigins(): string[];
  issuer: string;
  logger: AppLogger;
  openApi: OpenApiDocumentCache;
}) {
  // existing middleware
  app.use(async (c, next) => {
    c.set('openApi', input.openApi);
    await next();
  });

  app.get('/openapi.yaml', (c) => {
    return c.body(c.var.openApi.yamlText, 200, {
      'content-type': 'application/yaml; charset=utf-8',
    });
  });

  app.get('/openapi.json', (c) => {
    return c.json(c.var.openApi.jsonDocument);
  });
}
```

Update `tests/helpers/app.ts` to load the same cache for the in-memory test app:

```ts
import { loadOpenApiDocument } from '../../src/shared/openapi.js';

const openApi = await loadOpenApiDocument();

const app = createApp({
  db,
  getClientIp(request) {
    return clientIps.get(request) ?? null;
  },
  getOrigins() {
    return listAllowedOrigins(db).map((origin) => origin.origin);
  },
  issuer: 'https://issuer.example',
  logger: logCollector.logger,
  openApi,
});
```

- [ ] **Step 5: Run the targeted tests to verify the green state**

Run: `npx vitest run tests/unit/start-command.test.ts -t "loads the packaged openapi document once before creating the app"`

Expected: PASS.

Run: `npm run build && npx vitest run tests/integration/openapi-contract.test.ts -t "serves the cached openapi yaml and derived json from the same source file"`

Expected: PASS, with `/openapi.yaml` returning the checked-in YAML text and `/openapi.json` returning the parsed JSON document.

- [ ] **Step 6: Commit the runtime cache slice**

Run:

```bash
git add src/shared/openapi.ts src/app/commands/start.ts src/server/app.ts tests/helpers/app.ts tests/unit/start-command.test.ts tests/integration/openapi-contract.test.ts
git commit -m "feat: serve cached openapi documents"
```

### Task 3: Fail startup on missing or invalid packaged specs

**Files:**

- Modify: `tests/unit/start-command.test.ts`
- Modify: `src/app/commands/start.ts`
- Modify: `src/shared/openapi.ts`
- Create: `tests/unit/openapi-loader.test.ts`

- [ ] **Step 1: Add a guaranteed-red parser test plus startup failure regression coverage**

Create `tests/unit/openapi-loader.test.ts` with one valid-document case and one invalid-document case:

```ts
import { describe, expect, it } from 'vitest';
import { parseOpenApiDocument } from '../../src/shared/openapi.js';

describe('parseOpenApiDocument', () => {
  it('parses an object-shaped openapi document', () => {
    expect(parseOpenApiDocument('openapi: 3.1.0\npaths: {}\n')).toEqual({
      openapi: '3.1.0',
      paths: {},
    });
  });

  it('rejects yaml that does not parse to an object document', () => {
    expect(() => parseOpenApiDocument('true\n')).toThrow(
      'openapi.yaml must parse to an object document',
    );
  });
});
```

Extend `tests/unit/start-command.test.ts` with two explicit startup failure cases:

```ts
it('fails startup and closes the database when the packaged openapi file is missing', async () => {
  const db = { close: vi.fn() };

  createDatabaseClient.mockReturnValue(db);
  loadOpenApiDocument.mockRejectedValue(
    new Error('ENOENT: no such file or directory, openapi.yaml'),
  );

  const runStartCommand = await loadRunStartCommand();

  await expect(
    runStartCommand({ dbPath: '/tmp/auth-mini.db' }),
  ).rejects.toThrow('ENOENT: no such file or directory, openapi.yaml');
  expect(createServer).not.toHaveBeenCalled();
  expect(db.close).toHaveBeenCalledTimes(1);
});

it('fails startup and closes the database when the packaged openapi yaml is invalid', async () => {
  const db = { close: vi.fn() };

  createDatabaseClient.mockReturnValue(db);
  loadOpenApiDocument.mockRejectedValue(
    new Error('openapi.yaml must parse to an object document'),
  );

  const runStartCommand = await loadRunStartCommand();

  await expect(
    runStartCommand({ dbPath: '/tmp/auth-mini.db' }),
  ).rejects.toThrow('openapi.yaml must parse to an object document');
  expect(createServer).not.toHaveBeenCalled();
  expect(db.close).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the targeted unit test to confirm the red state**

Run: `npx vitest run tests/unit/openapi-loader.test.ts`

Expected: FAIL because `parseOpenApiDocument()` does not exist yet.

Run: `npx vitest run tests/unit/start-command.test.ts -t "fails startup and closes the database when the packaged openapi"`

Expected: PASS or FAIL is acceptable at this checkpoint. Keep the test if it already passes, because it still documents the required startup-failure behavior while the parser test provides the guaranteed red state for this task.

- [ ] **Step 3: Add a pure parser helper and keep startup fail-fast without request-time fallbacks**

Keep the implementation minimal:

```ts
export function parseOpenApiDocument(
  yamlText: string,
): Record<string, unknown> {
  const parsed = parse(yamlText);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('openapi.yaml must parse to an object document');
  }

  return parsed as Record<string, unknown>;
}

export async function loadOpenApiDocument(): Promise<OpenApiDocumentCache> {
  const yamlText = await readFile(
    new URL('../openapi.yaml', import.meta.url),
    'utf8',
  );

  return {
    yamlText,
    jsonDocument: parseOpenApiDocument(yamlText),
  };
}
```

Do not catch and downgrade these errors inside `runStartCommand()`. The existing `try`/`catch` around startup should close the database and rethrow, which is the desired startup-failure behavior from the spec.

- [ ] **Step 4: Re-run the parser test and then the full startup-command suite**

Run: `npx vitest run tests/unit/openapi-loader.test.ts`

Expected: PASS.

Run: `npx vitest run tests/unit/start-command.test.ts -t "fails startup and closes the database when the packaged openapi"`

Expected: PASS.

Run: `npx vitest run tests/unit/start-command.test.ts`

Expected: PASS, including the pre-existing startup and request handling assertions.

- [ ] **Step 5: Commit the startup-failure slice**

Run:

```bash
git add src/shared/openapi.ts src/app/commands/start.ts tests/unit/start-command.test.ts tests/unit/openapi-loader.test.ts
git commit -m "test: cover openapi startup failures"
```

### Task 4: Ship `openapi.yaml` inside build and package artifacts

**Files:**

- Modify: `scripts/build-sdk.mjs`
- Create: `tests/unit/openapi-build-artifact.test.ts`
- Reference only: `package.json`, `tests/helpers/cli.ts`

- [ ] **Step 1: Add a failing artifact test before changing the build script**

Create `tests/unit/openapi-build-artifact.test.ts` with one build-artifact assertion and one npm-pack assertion:

```ts
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('openapi build artifact', () => {
  it('copies openapi.yaml into dist and npm pack output', async () => {
    const repoRoot = process.cwd();
    const scratch = await mkdtemp(join(tmpdir(), 'auth-mini-openapi-pack-'));

    try {
      await execFileAsync('npm', ['run', 'build'], { cwd: repoRoot });

      const sourceYaml = await readFile(
        resolve(repoRoot, 'openapi.yaml'),
        'utf8',
      );
      const builtYaml = await readFile(
        resolve(repoRoot, 'dist/openapi.yaml'),
        'utf8',
      );

      expect(builtYaml).toBe(sourceYaml);

      const { stdout } = await execFileAsync('npm', ['pack', '--json'], {
        cwd: repoRoot,
      });
      const [{ filename }] = JSON.parse(stdout) as Array<{ filename: string }>;
      const tarball = resolve(repoRoot, filename);
      const listing = await execFileAsync('tar', ['-tf', tarball], {
        cwd: repoRoot,
      });

      expect(listing.stdout).toContain('package/dist/openapi.yaml');
    } finally {
      await rm(scratch, { force: true, recursive: true });
    }
  });
});
```

The test should fail immediately because `dist/openapi.yaml` is not produced by the current build.

- [ ] **Step 2: Run the focused artifact test to confirm the red state**

Run: `npx vitest run tests/unit/openapi-build-artifact.test.ts`

Expected: FAIL with `ENOENT` for `dist/openapi.yaml`.

- [ ] **Step 3: Copy the contract file into the built artifact with the smallest change**

Update `scripts/build-sdk.mjs` so the normal build writes `dist/openapi.yaml` after TypeScript compilation:

```js
import { cp } from 'node:fs/promises';

async function copyOpenApiSpec() {
  await cp('openapi.yaml', 'dist/openapi.yaml');
}

async function runBuild() {
  await runCommand(generateApiCommand);
  await runCommand(buildCommand);
  await copyOpenApiSpec();
}
```

Keep watch mode unchanged for this slice unless the copy step is trivially reusable there too. The approved scope only requires the released build artifact and npm package to contain `openapi.yaml`.

- [ ] **Step 4: Re-run the artifact test and then the full contract/integration coverage**

Run: `npx vitest run tests/unit/openapi-build-artifact.test.ts`

Expected: PASS, proving both `dist/openapi.yaml` and the packed tarball contain the contract file.

Run: `npm run build && npx vitest run tests/integration/openapi-contract.test.ts`

Expected: PASS, proving the packaged artifact and live documentation routes stay aligned with the checked-in contract.

- [ ] **Step 5: Commit the packaging slice**

Run:

```bash
git add scripts/build-sdk.mjs tests/unit/openapi-build-artifact.test.ts
git commit -m "build: ship packaged openapi spec"
```

### Task 5: Final verification and integration commit

**Files:**

- Modify: no new files; verification only

- [ ] **Step 1: Run the full repository checks touched by this feature**

Run: `npm run test:unit -- tests/unit/start-command.test.ts tests/unit/openapi-loader.test.ts tests/unit/openapi-build-artifact.test.ts`

Expected: PASS.

Run: `npm run build && npx vitest run tests/integration/openapi-contract.test.ts`

Expected: PASS.

Run: `npm run check:generated:api`

Expected: PASS, confirming the OpenAPI contract update did not leave generated client artifacts stale.

- [ ] **Step 2: Commit only if final verification required follow-up fixes**

Run:

```bash
git status --short
```

Expected: either no uncommitted changes, or only intentional follow-up verification fixes.

If verification required a small follow-up fix, then commit exactly that delta:

```bash
git add openapi.yaml src/shared/openapi.ts src/app/commands/start.ts src/server/app.ts tests/helpers/app.ts tests/unit/start-command.test.ts tests/unit/openapi-loader.test.ts tests/unit/openapi-build-artifact.test.ts tests/integration/openapi-contract.test.ts scripts/build-sdk.mjs
git commit -m "fix: align openapi endpoint verification"
```

If `git status --short` is empty, skip this step and do not create an empty commit.

- [ ] **Step 3: Record expected end state before handing off**

Confirm all of the following are true before pushing:

```text
- GET /openapi.yaml returns the exact startup-cached YAML text.
- GET /openapi.json returns the JSON document parsed from that same YAML text.
- Missing or invalid packaged openapi.yaml causes startup to fail before the server listens.
- dist/openapi.yaml exists after npm run build.
- npm pack output contains package/dist/openapi.yaml.
- openapi.yaml remains the only contract file checked into the repo.
```
