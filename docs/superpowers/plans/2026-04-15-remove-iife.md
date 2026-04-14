# Remove Active IIFE Concepts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every repo-owned, non-historical IIFE/browser-global SDK contract while keeping `auth-mini/sdk/browser` as the only maintained browser delivery path.

**Architecture:** First extract the shared browser runtime out of `src/sdk/singleton-entry.ts` into a neutral module that contains no script-bootstrap or `window.AuthMini` behavior. Then repoint the browser subpath and all shared-runtime tests to that neutral module, delete IIFE-only source/build/type assets, and finally update docs and verification so the repo no longer promises `singleton-iife` artifacts anywhere outside historical spec/plan records.

**Tech Stack:** TypeScript, Node.js, Vitest, npm scripts, ripgrep

---

## File Map

- Create: `src/sdk/browser-runtime.ts`
  - Hold the shared browser runtime previously embedded in `src/sdk/singleton-entry.ts`, including `createAuthMiniInternal`, `createBrowserSdkInternal`, `BrowserSdkFactoryOptions`, and the private runtime helpers used by module-browser tests.
- Modify: `src/sdk/browser.ts`
  - Import `createBrowserSdkInternal` from `./browser-runtime.js` instead of `./singleton-entry.js`.
- Delete: `src/sdk/singleton-entry.ts`
  - Remove the old mixed-responsibility file after its shared runtime has been moved and all imports have been repointed.
- Delete: `src/sdk/singleton-global.ts`
  - Remove the `Window.AuthMini` global typing source because the global/browser-IIFE contract is being retired.
- Delete: `src/sdk/build-singleton-iife.ts`
  - Remove the dedicated JS artifact builder for `dist/sdk/singleton-iife.js`.
- Delete: `src/sdk/build-singleton-dts.ts`
  - Remove the dedicated `.d.ts` artifact builder for `dist/sdk/singleton-iife.d.ts`.
- Modify: `scripts/build-sdk.mjs`
  - Stop post-build generation of singleton/IIFE artifacts in both one-shot and watch mode.
- Validate only: `scripts/run-tests.js`
  - Confirm the repo-wide build/test ordering still works after the singleton fixture entries are removed.
- Modify: `tests/unit/sdk-state.test.ts`
  - Repoint shared-runtime state assertions from `../../src/sdk/singleton-entry.js` to `../../src/sdk/browser-runtime.js`.
- Modify: `tests/unit/sdk-webauthn.test.ts`
  - Repoint shared-runtime WebAuthn assertions from `../../src/sdk/singleton-entry.js` to `../../src/sdk/browser-runtime.js`.
- Modify: `tests/unit/sdk-base-url.test.ts`
  - Keep the neutral runtime/module assertions and delete the script-bootstrap-specific cases.
- Modify: `tests/unit/sdk-browser-module.test.ts`
  - Keep module-browser behavior coverage and delete the remaining `renderSingletonIifeSource()` / served-singleton sections.
- Modify: `tests/helpers/sdk.ts`
  - Remove `executeServedSdk` and any singleton-only default script URL helpers that only exist to execute the IIFE bundle.
- Modify: `tests/unit/sdk-dts-build.test.ts`
  - Remove singleton-global declaration artifact assertions while keeping module declaration and build-pipeline checks that still matter.
- Modify: `tests/unit/examples-demo-dev-script.test.ts`
  - Repoint watch/build assertions away from `singleton-iife` outputs to standard browser-module artifacts that still exist after the cleanup.
- Modify: `tests/fixtures/sdk-dts-consumer/tsconfig.json`
  - Stop compiling the removed `dist/sdk/singleton-iife.d.ts` artifact and stop including the removed global-usage fixture.
- Delete: `tests/fixtures/sdk-dts-consumer/global-usage.ts`
  - Remove the `window.AuthMini` consumer fixture.
- Modify: `README.md`
  - Replace the script-tag/browser-global quick start with the module-browser SDK path.
- Modify: `docs/integration/browser-sdk.md`
  - Remove singleton-script guidance and rewrite the guide around `auth-mini/sdk/browser` only.
- Validate only: `tests/integration/sdk-endpoint.test.ts`
  - Keep the existing `404` contract as proof that the removed HTTP endpoints stay gone.

### Task 1: Extract the neutral shared browser runtime

**Files:**

- Create: `src/sdk/browser-runtime.ts`
- Modify: `src/sdk/browser.ts`
- Test: `tests/unit/sdk-state.test.ts`
- Test: `tests/unit/sdk-webauthn.test.ts`
- Test: `tests/unit/sdk-base-url.test.ts`

- [ ] **Step 1: Move the shared runtime exports into a new neutral module**

Create `src/sdk/browser-runtime.ts` by moving the runtime pieces from `src/sdk/singleton-entry.ts` and dropping the script-bootstrap-only export:

```ts
import { parseMeResponse } from './me.js';
import type {
  AuthMiniInternal,
  FetchLike,
  InternalSdkDeps,
} from './types.js';

export type BrowserSdkFactoryOptions = {
  fetch?: FetchLike;
  now?: () => number;
  storage?: Storage;
};

let runtimeCache: ReturnType<typeof createRuntime> | null = null;

export function createAuthMiniInternal(
  input: InternalSdkDeps,
): AuthMiniInternal {
  return getRuntime().createAuthMiniInternal(input) as AuthMiniInternal;
}

export function createBrowserSdkInternal(
  baseUrl: string,
  options: BrowserSdkFactoryOptions = {},
): AuthMiniInternal {
  return getRuntime().createBrowserSdkInternal({
    ...options,
    baseUrl,
  }) as AuthMiniInternal;
}

function getRuntime() {
  runtimeCache ??= createRuntime();
  return runtimeCache;
}

function createRuntime(parseMeResponseImpl = parseMeResponse) {
  const SDK_STORAGE_KEY = 'auth-mini.sdk';
}
```

Then paste the full helper block from `src/sdk/singleton-entry.ts` starting at `function createSdkError(code, message) {` and ending at the returned object that exposes `createAuthMiniInternal` and `createBrowserSdkInternal`, preserving those helper bodies exactly while removing only the IIFE-specific pieces called out below.

Inside the moved `createRuntime(...)`, delete the IIFE-only base-url inference pieces:

```ts
const SDK_PATH_SUFFIX = '/sdk/singleton-iife.js';

function inferBaseUrl(scriptUrl) {
  const url = new URL(scriptUrl);
  if (!url.pathname.endsWith(SDK_PATH_SUFFIX)) {
    throw createSdkError('sdk_init_failed', 'Cannot infer SDK base URL');
  }
  const basePath = url.pathname.slice(0, -SDK_PATH_SUFFIX.length);
  return `${url.origin}${basePath}`;
}
```

Also delete `renderSingletonIifeSource()` entirely instead of carrying it into the new module.

- [ ] **Step 2: Repoint the public browser module to the neutral runtime**

Update `src/sdk/browser.ts` to import from the new file only:

```ts
import { createBrowserSdkInternal } from './browser-runtime.js';
import type { AuthMiniApi } from './types.js';

export type {
  AuthMiniApi,
  EmailStartInput,
  EmailStartResponse,
  EmailVerifyInput,
  MeResponse,
  PasskeyOptionsInput,
  SessionResult,
  SessionSnapshot,
  SdkStatus,
  WebauthnVerifyResponse,
} from './types.js';

export function createBrowserSdk(serverBaseUrl: string): AuthMiniApi {
  return createBrowserSdkInternal(serverBaseUrl);
}
```

- [ ] **Step 3: Repoint the shared-runtime unit tests before deleting the old file**

Update the imports in `tests/unit/sdk-state.test.ts` and `tests/unit/sdk-webauthn.test.ts`:

```ts
import { createBrowserSdkInternal } from '../../src/sdk/browser-runtime.js';
```

```ts
import { createAuthMiniInternal } from '../../src/sdk/browser-runtime.js';
```

Update `tests/unit/sdk-base-url.test.ts` so it keeps only the neutral runtime assertion:

```ts
import { describe, expect, it } from 'vitest';
import { createBrowserSdkInternal } from '../../src/sdk/browser-runtime.js';
import { fakeStorage } from '../helpers/sdk.js';

describe('sdk base url validation', () => {
  it('fails direct browser sdk creation when baseUrl is omitted', () => {
    expect(() =>
      createBrowserSdkInternal(undefined as never, { storage: fakeStorage() }),
    ).toThrow('sdk_init_failed: Cannot determine SDK base URL');
  });
});
```

- [ ] **Step 4: Run the focused shared-runtime tests**

Run: `npm run build && npx vitest run tests/unit/sdk-state.test.ts tests/unit/sdk-webauthn.test.ts tests/unit/sdk-base-url.test.ts`

Expected: PASS. The shared browser runtime now works without importing `src/sdk/singleton-entry.ts`.

- [ ] **Step 5: Commit the runtime extraction slice**

Run:

```bash
git add src/sdk/browser-runtime.ts src/sdk/browser.ts tests/unit/sdk-state.test.ts tests/unit/sdk-webauthn.test.ts tests/unit/sdk-base-url.test.ts
git commit -m "refactor: extract browser sdk runtime"
```

### Task 2: Repoint module-browser coverage and delete singleton-only test helpers

**Files:**

- Modify: `tests/unit/sdk-browser-module.test.ts`
- Modify: `tests/helpers/sdk.ts`
- Test: `tests/unit/sdk-browser-module.test.ts`

- [ ] **Step 1: Remove the served-singleton helper from the shared test utilities**

Delete `executeServedSdk(...)` from `tests/helpers/sdk.ts`:

```ts
export function executeServedSdk(
  source: string,
  options: {
    currentScriptSrc?: string | null;
    fetch?: typeof globalThis.fetch;
    storage?: Storage;
    storageUnavailable?: boolean;
  } = {},
): Window & typeof globalThis {
  const windowObject = {} as Window & typeof globalThis;
  const storageListeners = new Set<(event: StorageEvent) => void>();
  const document = {
    currentScript:
      options.currentScriptSrc === undefined
        ? { src: 'https://app.example.com/sdk/singleton-iife.js' }
        : options.currentScriptSrc === null
          ? null
          : { src: options.currentScriptSrc },
  };
}
```

No replacement is needed because no remaining test should execute a generated browser-global bundle.

- [ ] **Step 2: Rewrite the browser-module test file so it only covers module/shared-runtime behavior**

Trim the top of `tests/unit/sdk-browser-module.test.ts` to remove singleton-only imports:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createBrowserSdk } from '../../src/sdk/browser.js';
import type { AuthMiniApi } from '../../src/sdk/types.js';
import {
  browserSdkStorageKey,
  fakeStorage,
  jsonResponse,
  seedBrowserSdkStorage,
} from '../helpers/sdk.js';
```

Delete the singleton-only cases beginning with these test names:

```ts
it('rejects malformed /me payloads in explicit singleton me.fetch calls', async () => {
it('singleton startup recovery keeps token-only state without requesting /me', async () => {
it('ignores legacy persisted me blobs when the served singleton restores from localStorage', async () => {
```

Keep the module assertions such as:

```ts
it('preserves base-path prefixes in browser sdk requests without window side effects', async () => {
  expect('AuthMini' in globalThis).toBe(false);
  await expect(sdk.email.start({ email: 'user@example.com' })).resolves.toEqual({
    ok: true,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
});
```

and keep the declaration guard updated to the new runtime import:

```ts
expect(source).not.toMatch(
  /type\s+BrowserSdkFactoryOptions[\s\S]*from '\.\/browser-runtime\.js'/,
);
expect(source).toContain('createBrowserSdkInternal');
expect(source).toContain("from './types.js'");
```

- [ ] **Step 3: Run the focused browser-module test**

Run: `npm run build && npx vitest run tests/unit/sdk-browser-module.test.ts`

Expected: PASS, and the file no longer mentions `renderSingletonIifeSource`, `window.AuthMini`, or `singleton-iife.js`.

- [ ] **Step 4: Commit the test cleanup slice**

Run:

```bash
git add tests/helpers/sdk.ts tests/unit/sdk-browser-module.test.ts
git commit -m "test: drop singleton browser coverage"
```

### Task 3: Remove IIFE-only source, build hooks, declaration fixtures, and artifact checks

**Files:**

- Delete: `src/sdk/singleton-entry.ts`
- Delete: `src/sdk/singleton-global.ts`
- Delete: `src/sdk/build-singleton-iife.ts`
- Delete: `src/sdk/build-singleton-dts.ts`
- Modify: `scripts/build-sdk.mjs`
- Validate: `scripts/run-tests.js`
- Modify: `tests/unit/sdk-dts-build.test.ts`
- Modify: `tests/unit/examples-demo-dev-script.test.ts`
- Modify: `tests/fixtures/sdk-dts-consumer/tsconfig.json`
- Delete: `tests/fixtures/sdk-dts-consumer/global-usage.ts`
- Validate: `tests/integration/sdk-endpoint.test.ts`

- [ ] **Step 1: Delete the IIFE-only source files**

Remove these files entirely:

```text
src/sdk/singleton-entry.ts
src/sdk/singleton-global.ts
src/sdk/build-singleton-iife.ts
src/sdk/build-singleton-dts.ts
tests/fixtures/sdk-dts-consumer/global-usage.ts
```

After this step, `rg -n "singleton-entry|singleton-global|build-singleton" src tests` should only report files that still need to be edited in this task.

- [ ] **Step 2: Stop the main build from generating removed singleton artifacts**

Simplify `scripts/build-sdk.mjs` so the build ends after TypeScript compilation:

```ts
import { spawn } from 'node:child_process';

const isWatchMode = process.argv.includes('--watch');
const generateApiCommand = 'npm run generate:api';
const buildCommand = 'tsc -p tsconfig.build.json --declaration';
const watchCommand =
  'tsc -p tsconfig.build.json --declaration --watch --preserveWatchOutput';

async function runBuild() {
  await runCommand(generateApiCommand);
  await runCommand(buildCommand);
}
```

Delete `postBuildCommands`, `runPostBuild()`, `maybeRunPostBuild()`, and the watch-mode logic that waited for singleton artifacts to be regenerated.

- [ ] **Step 3: Validate that the repo test runner still has the correct ordering**

`scripts/run-tests.js` should still keep this exact flow after the fixture cleanup, with no new singleton-specific logic reintroduced:

```js
export const main = (args) => {
  run('npm', ['run', 'build']);

  if (isTargetedVitestRun(args)) {
    run('npx', ['vitest', 'run', ...args]);
    return;
  }

  run('npm', ['run', 'check:generated:api']);
  run('npx', ['vitest', 'run', 'tests', ...args]);
  run('npx', ['tsc', '-p', 'tests/fixtures/sdk-dts-consumer/tsconfig.json']);
};
```

- [ ] **Step 4: Rewrite the declaration-build test around surviving module artifacts**

Delete singleton-specific helpers and assertions from `tests/unit/sdk-dts-build.test.ts`, including:

```ts
const readBuiltDeclaration = () =>
  readFileSync(resolve(process.cwd(), 'dist/sdk/singleton-iife.d.ts'), 'utf8');

const loadSingletonDtsModule = async () =>
  import(
    pathToFileURL(resolve(process.cwd(), 'src/sdk/build-singleton-dts.ts')).href
  );
```

Also delete the singleton-only tests named `contains only a global Window.AuthMini declaration surface`, `matches the approved Window.AuthMini contract`, `inlines inherited members from imported exported interfaces`, `substitutes type arguments when inlining imported generic aliases`, and `matches the cli entrypoint guard against relative argv paths`, because all of them exist only to validate the removed singleton declaration generator.

Keep and tighten the still-relevant module assertions:

```ts
it('runs generated artifact drift checks before the standard test suite and dts compile', () => {
  const buildScriptSource = readFileSync(
    resolve(process.cwd(), 'scripts/build-sdk.mjs'),
    'utf8',
  );

  expect(buildScriptSource).toContain('npm run generate:api');
  expect(buildScriptSource).not.toContain('build-singleton-iife');
  expect(buildScriptSource).not.toContain('build-singleton-dts');
});
```

Keep the existing browser/api/device declaration checks that read:

```ts
dist/sdk/browser.d.ts
dist/sdk/device.d.ts
dist/sdk/types.d.ts
dist/sdk/api.d.ts
```

and update the consumer-fixture assertion loop to module-only fixtures:

```ts
for (const fixture of ['module-browser-usage.ts', 'module-api-usage.ts', 'module-device-usage.ts']) {
  const source = readConsumerFixture(fixture);
  expect(source).toContain('me.active_sessions[0].auth_method');
  expect(source).toContain('me.active_sessions[0].ip');
  expect(source).toContain('me.active_sessions[0].user_agent');
}
```

- [ ] **Step 5: Repoint the demo watch test to normal browser-module artifacts**

In `tests/unit/examples-demo-dev-script.test.ts`, replace the singleton artifact constants with module-browser outputs:

```ts
const browserSourcePath = resolve(repoRoot, 'src/sdk/browser.ts');
const browserRuntimePath = resolve(repoRoot, 'dist/sdk/browser.js');
const browserTypesPath = resolve(repoRoot, 'dist/sdk/browser.d.ts');
```

Update the watcher helpers accordingly:

```ts
async function readArtifactMtimes() {
  const [runtimeStat, dtsStat] = await Promise.all([
    stat(browserRuntimePath),
    stat(browserTypesPath),
  ]);

  return {
    runtime: runtimeStat.mtimeMs,
    dts: dtsStat.mtimeMs,
  };
}
```

and replace the old singleton-command assertions with:

```ts
expect(buildScript).not.toContain('node dist/sdk/build-singleton-iife.js');
expect(buildScript).not.toContain('node dist/sdk/build-singleton-dts.js');
```

- [ ] **Step 6: Remove the global declaration consumer fixture from the fixture tsconfig**

Rewrite `tests/fixtures/sdk-dts-consumer/tsconfig.json` to compile only surviving module-based fixtures:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "DOM", "ESNext.Disposable"],
    "strict": true,
    "noEmit": true,
    "types": []
  },
  "files": [
    "./module-api-usage.ts",
    "./module-browser-usage.ts",
    "./module-device-usage.ts"
  ]
}
```

- [ ] **Step 7: Run the build/test slice that used to enforce singleton artifacts**

Run: `npm run build && npx vitest run tests/unit/sdk-dts-build.test.ts tests/unit/examples-demo-dev-script.test.ts tests/integration/sdk-endpoint.test.ts && npx tsc -p tests/fixtures/sdk-dts-consumer/tsconfig.json`

Expected: PASS. `dist/sdk/browser.js` and `dist/sdk/browser.d.ts` still rebuild in watch mode, the consumer fixture still compiles, and `/sdk/singleton-iife.js` plus `/sdk/singleton-iife.d.ts` still return `404`.

- [ ] **Step 8: Commit the removal of singleton artifacts**

Run:

```bash
git add scripts/build-sdk.mjs scripts/run-tests.js tests/unit/sdk-dts-build.test.ts tests/unit/examples-demo-dev-script.test.ts tests/fixtures/sdk-dts-consumer/tsconfig.json tests/integration/sdk-endpoint.test.ts
git add -u src/sdk tests/fixtures/sdk-dts-consumer
git commit -m "refactor: remove singleton sdk artifacts"
```

### Task 4: Remove non-historical IIFE guidance from README and browser integration docs

**Files:**

- Modify: `README.md`
- Modify: `docs/integration/browser-sdk.md`

- [ ] **Step 1: Replace the README quick-start example with module-browser usage**

Replace the script-tag block in `README.md`:

```html
<script src="https://auth.your-domain.com/sdk/singleton-iife.js"></script>
<script>
  window.AuthMini.session.onChange((state) => {
    console.log('auth status:', state.status);
  });
</script>
```

with an npm/module example:

```ts
import { createBrowserSdk } from 'auth-mini/sdk/browser';

const sdk = createBrowserSdk('https://auth.your-domain.com');

sdk.session.onChange((state) => {
  console.log('auth status:', state.status);
});
```

Also remove any prose that says the browser SDK is served as `singleton-iife` or exposed as `window.AuthMini`.

- [ ] **Step 2: Rewrite the browser integration guide around the module path only**

Delete these sections from `docs/integration/browser-sdk.md`:

```md
For browser delivery, auth-mini also serves the browser SDK as `GET /sdk/singleton-iife.js`, which exposes `window.AuthMini` and infers its API base URL from the script `src`.

## Singleton script usage

auth-mini also serves a singleton browser SDK at `GET /sdk/singleton-iife.js`.
```

Replace the intro with module-only wording:

```md
auth-mini exposes one low-level API SDK plus higher-level runtime SDKs:

- `auth-mini/sdk/api`: typed low-level HTTP/OpenAPI SDK. See [API SDK integration](./api-sdk.md).
- `auth-mini/sdk/browser`: high-level browser SDK with browser storage and cross-tab semantics.
- `auth-mini/sdk/device`: high-level device SDK for isolated memory-only sessions in non-browser clients. See [Device SDK integration](./device-sdk.md).

Import the browser SDK module and construct it with your auth server origin:

```ts
import { createBrowserSdk } from 'auth-mini/sdk/browser';

const sdk = createBrowserSdk('https://auth.zccz14.com');
```
```

Update the later examples so they call `sdk.email.verify(...)`, `sdk.webauthn.authenticate()`, and `sdk.me.fetch()` instead of `window.AuthMini.*`.

- [ ] **Step 3: Run a docs-focused grep before the full suite**

Run: `rg -n "singleton-iife|window\.AuthMini|\bIIFE\b" README.md docs/integration`

Expected: no matches.

- [ ] **Step 4: Commit the documentation cleanup**

Run:

```bash
git add README.md docs/integration/browser-sdk.md
git commit -m "docs: remove iife browser sdk guidance"
```

### Task 5: Run full verification and prove non-historical IIFE concepts are gone

**Files:**

- Validate: `package.json`
- Validate: `src/sdk/browser-runtime.ts`
- Validate: `src/sdk/browser.ts`
- Validate: `README.md`
- Validate: `docs/integration/browser-sdk.md`
- Validate: `tests/**`
- Validate: `scripts/**`

- [ ] **Step 1: Run the full required repo checks**

Run: `npm run build && npm run typecheck && npm run lint && npm test`

Expected: PASS. The repo still builds, type-checks, lints, and passes all tests without generating or consuming any singleton/IIFE artifacts.

- [ ] **Step 2: Run the repo-owned non-historical grep checks**

Run:

```bash
rg -n "singleton-iife|window\.AuthMini|singleton-entry|singleton-global|build-singleton-(iife|dts)" README.md docs/integration src tests scripts package.json
rg -n "\bIIFE\b" README.md docs/integration src tests scripts package.json
```

Expected: no matches.

- [ ] **Step 3: Sanity-check the remaining diff stays inside the intended scope**

Run: `git diff --stat origin/main...HEAD`

Expected: the diff is limited to the neutral browser runtime extraction, singleton/IIFE source/build/test removal, fixture cleanup, and README/browser-doc updates. Historical files under `docs/superpowers/specs/` and `docs/superpowers/plans/` are unchanged except for this implementation plan's own commit history.

- [ ] **Step 4: Create the final implementation commit**

Run:

```bash
git add README.md docs/integration/browser-sdk.md scripts src/sdk tests package.json
git commit -m "refactor: remove active iife sdk concepts"
```

- [ ] **Step 5: Confirm the branch is ready for the repo's follow-up workflow**

Run: `git status --short`

Expected: no output.
