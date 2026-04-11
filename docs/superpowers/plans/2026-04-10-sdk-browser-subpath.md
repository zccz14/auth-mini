# auth-mini `sdk/browser` 子路径导出 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public npm subpath `auth-mini/sdk/browser` that exports `createBrowserSdk(serverBaseUrl)` while preserving the existing served IIFE and `window.AuthMini` behavior.

**Architecture:** Extract a reusable browser SDK factory from the current singleton/IIFE runtime, then layer both the new module subpath export and the existing IIFE bootstrap on top of that shared implementation. Keep the current browser API surface intact so demo migration only changes how the SDK is obtained, not how the browser auth flows are called.

**Tech Stack:** TypeScript, Node ESM package exports, existing browser SDK runtime in `src/sdk/*`, Vitest, npm pack tarball verification, existing demo app.

---

## File Structure

- Create: `src/sdk/browser.ts`
  - Public ESM entry for `auth-mini/sdk/browser`.
  - Exports `createBrowserSdk(serverBaseUrl: string)`.
  - Re-exports public browser SDK types from `src/sdk/types.ts`.
- Modify: `src/sdk/singleton-entry.ts`
  - Stop being the only place that knows how to build the browser SDK instance.
  - Reuse the shared browser SDK factory for both npm module and IIFE bootstrap flows.
- Modify: `src/sdk/types.ts`
  - Ensure the public browser SDK types used by `createBrowserSdk(...)` are exported from one place.
- Modify: `package.json`
  - Add `exports["./sdk/browser"]` runtime + types mapping.
  - Preserve existing `bin` and existing build outputs.
- Modify: `tests/unit/sdk-dts-build.test.ts`
  - Extend declaration checks to cover the new module subpath.
- Create: `tests/unit/sdk-browser-module.test.ts`
  - Verifies `createBrowserSdk(serverBaseUrl)` constructs a working module SDK without touching `window`.
- Modify: `tests/fixtures/sdk-dts-consumer/tsconfig.json`
  - Compile both existing IIFE consumer checks and the new module subpath import.
- Create: `tests/fixtures/sdk-dts-consumer/module-browser-usage.ts`
  - TypeScript fixture importing `createBrowserSdk` and public types from `auth-mini/sdk/browser`.
- Modify: `tests/helpers/cli.ts`
  - Add helper(s) for importing packed tarball subpath exports after `npm pack`.
- Create: `tests/integration/sdk-browser-package.test.ts`
  - Real tarball install/import test for `auth-mini/sdk/browser`.
- Modify: `demo/main.js`
  - Replace dynamic script loading and `window.AuthMini` lookup with module import / injected SDK construction.
- Modify: `demo/setup.js`
  - Switch setup state from script URL language to explicit browser SDK base URL language.
- Modify: `demo/content.js`
  - Update docs snippets from `<script src="/sdk/singleton-iife.js">` / `window.AuthMini` to npm module usage.
- Modify: `demo/index.html`
  - Update copy that currently assumes `sdk-origin` means “where to load the IIFE script from”.

### Task 1: Extract Shared Browser SDK Factory

**Files:**

- Create: `src/sdk/browser.ts`
- Modify: `src/sdk/singleton-entry.ts`
- Modify: `src/sdk/types.ts`
- Test: `tests/unit/sdk-browser-module.test.ts`

- [ ] **Step 1: Write the failing browser module factory test**

Create `tests/unit/sdk-browser-module.test.ts` with a focused test that imports `createBrowserSdk`, builds an SDK from an explicit base URL, and proves it does not install anything on `window`.

```ts
import { describe, expect, it, vi } from 'vitest';
import { createBrowserSdk } from '../../src/sdk/browser.js';
import { fakeStorage } from '../helpers/sdk.js';

describe('browser module sdk', () => {
  it('creates an AuthMini-shaped sdk from an explicit base URL without window side effects', async () => {
    const storage = fakeStorage();
    const fetch = vi.fn();
    const sdk = createBrowserSdk('https://auth.example.com', {
      fetch,
      storage,
      currentScript: null,
    });

    expect(typeof sdk.email.start).toBe('function');
    expect(typeof sdk.session.onChange).toBe('function');
    expect('AuthMini' in globalThis).toBe(false);
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `npm test -- tests/unit/sdk-browser-module.test.ts`
Expected: FAIL with module-not-found or missing export for `../../src/sdk/browser.js` / `createBrowserSdk`.

- [ ] **Step 3: Add the shared browser factory entrypoint**

Create `src/sdk/browser.ts` and make it the explicit module-facing factory. Keep the module public API small and reuse the existing runtime internals instead of reimplementing browser auth flows.

```ts
import {
  createAuthMiniInternal,
  type BrowserSdkFactoryOptions,
} from './singleton-entry.js';
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

export function createBrowserSdk(
  serverBaseUrl: string,
  options: BrowserSdkFactoryOptions = {},
): AuthMiniApi {
  return createAuthMiniInternal({
    baseUrl: serverBaseUrl,
    autoRecover: true,
    ...options,
  });
}
```

- [ ] **Step 4: Refactor singleton runtime to expose a reusable factory**

Update `src/sdk/singleton-entry.ts` so the browser SDK constructor logic is reusable by both the module entry and the IIFE bootstrap. Do not let the new module path depend on script URL inference or `window` mutation.

```ts
export type BrowserSdkFactoryOptions = {
  fetch?: FetchLike;
  now?: () => number;
  storage?: Storage;
  currentScript?: { src?: string | null } | null;
};

export function createAuthMiniInternal(
  input: InternalSdkDeps,
): AuthMiniInternal {
  return getRuntime().createAuthMiniInternal(input) as AuthMiniInternal;
}

export function createBrowserSdkInternal(
  baseUrl: string,
  options: BrowserSdkFactoryOptions = {},
): AuthMiniInternal {
  const runtime = getRuntime();
  return runtime.createSingletonSdk({
    baseUrl,
    fetch: options.fetch,
    now: options.now,
    storage: options.storage,
  }) as AuthMiniInternal;
}
```

When adjusting internals, preserve these behaviors already exercised by existing tests:

- global `fetch` fallback
- `localStorage` fallback for browser storage
- auto-recovery on boot
- storage-event synchronization

- [ ] **Step 5: Align exported public types with the factory contract**

Update `src/sdk/types.ts` only as needed so the public `AuthMiniApi` + browser SDK types are directly reusable from the new module path without inventing new parallel names.

```ts
export type AuthMiniApi = {
  email: {
    start(input: EmailStartInput): Promise<EmailStartResponse>;
    verify(input: EmailVerifyInput): Promise<SessionResult>;
  };
  passkey: {
    authenticate(input?: PasskeyOptionsInput): Promise<SessionResult>;
    register(input?: PasskeyOptionsInput): Promise<WebauthnVerifyResponse>;
  };
  me: {
    get(): MeResponse | null;
    reload(): Promise<MeResponse>;
  };
  session: {
    getState(): SessionSnapshot;
    onChange(listener: Listener): () => void;
    refresh(): Promise<SessionResult>;
    logout(): Promise<void>;
  };
  webauthn: {
    authenticate(input?: PasskeyOptionsInput): Promise<SessionResult>;
    register(input?: PasskeyOptionsInput): Promise<WebauthnVerifyResponse>;
  };
};
```

- [ ] **Step 6: Run the focused unit tests to verify the factory passes**

Run: `npm test -- tests/unit/sdk-browser-module.test.ts tests/unit/sdk-session.test.ts tests/unit/sdk-state.test.ts`
Expected: PASS for the new module-factory test and no regressions in existing browser SDK behavior.

- [ ] **Step 7: Commit the shared browser factory extraction**

```bash
git add src/sdk/browser.ts src/sdk/singleton-entry.ts src/sdk/types.ts tests/unit/sdk-browser-module.test.ts
git commit -m "feat: add reusable browser sdk factory"
```

### Task 2: Publish `auth-mini/sdk/browser` With Types And Tarball Coverage

**Files:**

- Modify: `package.json`
- Modify: `tests/unit/sdk-dts-build.test.ts`
- Modify: `tests/fixtures/sdk-dts-consumer/tsconfig.json`
- Create: `tests/fixtures/sdk-dts-consumer/module-browser-usage.ts`
- Modify: `tests/helpers/cli.ts`
- Create: `tests/integration/sdk-browser-package.test.ts`

- [ ] **Step 1: Write the failing DTS consumer fixture**

Create `tests/fixtures/sdk-dts-consumer/module-browser-usage.ts` with an explicit subpath import and a concrete use of the public types.

```ts
import { createBrowserSdk } from 'auth-mini/sdk/browser';
import type {
  AuthMiniApi,
  MeResponse,
  SessionSnapshot,
} from 'auth-mini/sdk/browser';

const sdk: AuthMiniApi = createBrowserSdk('https://auth.example.com');

const state: SessionSnapshot = sdk.session.getState();
const me: MeResponse | null = sdk.me.get();

void state;
void me;
```

- [ ] **Step 2: Make the DTS fixture compile in the consumer tsconfig**

Update `tests/fixtures/sdk-dts-consumer/tsconfig.json` to include the new module consumer file in addition to the existing IIFE typing fixture.

```json
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["global-usage.ts", "module-browser-usage.ts"]
}
```

- [ ] **Step 3: Run the DTS compile to verify it fails before exports are added**

Run: `npx tsc -p tests/fixtures/sdk-dts-consumer/tsconfig.json`
Expected: FAIL with cannot-resolve-module or missing exported type errors for `auth-mini/sdk/browser`.

- [ ] **Step 4: Add the public subpath export to `package.json`**

Update `package.json` to publish the browser subpath while preserving existing CLI packaging and dist-only files.

```json
{
  "type": "module",
  "files": ["dist"],
  "exports": {
    "./sdk/browser": {
      "types": "./dist/sdk/browser.d.ts",
      "import": "./dist/sdk/browser.js"
    }
  },
  "bin": {
    "auth-mini": "dist/index.js"
  }
}
```

Do not remove or repoint the CLI `bin` in this task.

- [ ] **Step 5: Extend unit declaration tests for the module browser subpath**

Update `tests/unit/sdk-dts-build.test.ts` to assert that the build emits the browser subpath declaration file and that it includes the expected public names.

```ts
it('emits browser sdk module declarations', () => {
  const output = readFileSync(
    resolve(process.cwd(), 'dist/sdk/browser.d.ts'),
    'utf8',
  );

  expect(output).toContain('export declare function createBrowserSdk');
  expect(output).toContain('export type AuthMiniApi');
  expect(output).toContain('export type SessionSnapshot');
});
```

- [ ] **Step 6: Add a tarball install/import integration test**

Create `tests/integration/sdk-browser-package.test.ts` to verify the packed package exposes the new subpath at runtime.

```ts
import { describe, expect, it } from 'vitest';
import { importPackedModule } from '../helpers/cli.js';

describe('browser sdk package export', () => {
  it('imports createBrowserSdk from the packed browser subpath', async () => {
    const mod = await importPackedModule('auth-mini/sdk/browser');

    expect(typeof mod.createBrowserSdk).toBe('function');
  });
});
```

Add the helper to `tests/helpers/cli.ts` using the existing packed-install staging flow:

```ts
export async function importPackedModule(
  specifier: string,
): Promise<Record<string, unknown>> {
  const installDir = await ensurePackedCliInstall();
  const script = `import * as mod from ${JSON.stringify(specifier)}; console.log(JSON.stringify(Object.keys(mod)));`;
  const result = await runCommand(
    process.execPath,
    ['--input-type=module', '--eval', script],
    {
      cwd: installDir,
      env: { NODE_ENV: 'production' },
    },
  );

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || 'module import failed');
  }

  return Object.fromEntries(
    JSON.parse(result.stdout.trim()).map((key: string) => [key, true]),
  );
}
```

If you prefer stronger verification, change the helper to print `typeof mod.createBrowserSdk` instead of only keys.

- [ ] **Step 7: Run packaging and type verification**

Run: `npm test -- tests/unit/sdk-dts-build.test.ts tests/integration/sdk-browser-package.test.ts`
Expected: PASS, including a successful build, DTS assertions, and packed tarball import of `auth-mini/sdk/browser`.

- [ ] **Step 8: Commit the published browser subpath work**

```bash
git add package.json tests/unit/sdk-dts-build.test.ts tests/fixtures/sdk-dts-consumer/tsconfig.json tests/fixtures/sdk-dts-consumer/module-browser-usage.ts tests/helpers/cli.ts tests/integration/sdk-browser-package.test.ts
git commit -m "feat: publish browser sdk subpath"
```

### Task 3: Migrate The Demo To The Module Browser SDK

**Files:**

- Modify: `demo/main.js`
- Modify: `demo/setup.js`
- Modify: `demo/content.js`
- Modify: `demo/index.html`
- Test: `tests/unit/demo-bootstrap.test.ts`
- Test: `tests/unit/demo-render.test.ts`

- [ ] **Step 1: Write failing demo expectations against module-based setup**

Add or update focused demo tests to assert the setup language now revolves around an auth origin / browser SDK base URL instead of a served singleton script URL.

```ts
expect(
  getDemoSetupState({
    origin: 'https://docs.example.com',
    sdkOriginInput: 'https://auth.example.com',
  }),
).toMatchObject({
  sdkOrigin: 'https://auth.example.com',
  issuer: 'https://auth.example.com',
  configStatus: 'ready',
});
```

And add a demo runtime test that uses an injected SDK factory instead of appending a `<script>` tag.

```ts
const sdk = {
  email: { start: vi.fn(), verify: vi.fn() },
  webauthn: { register: vi.fn(), authenticate: vi.fn() },
  passkey: { register: vi.fn(), authenticate: vi.fn() },
  me: { get: vi.fn(() => null), reload: vi.fn() },
  session: {
    getState: vi.fn(() => ({
      status: 'anonymous',
      authenticated: false,
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
      me: null,
    })),
    onChange: vi.fn(() => () => {}),
    refresh: vi.fn(),
    logout: vi.fn(),
  },
};
```

- [ ] **Step 2: Run the demo-focused tests to verify they fail**

Run: `npm test -- tests/unit/demo-bootstrap.test.ts tests/unit/demo-render.test.ts`
Expected: FAIL because the demo still assumes `sdkScriptUrl`, dynamic script loading, and `window.AuthMini`.

- [ ] **Step 3: Replace script loading with module SDK construction in `demo/main.js`**

Refactor the demo runtime so it accepts a factory and builds its `AuthMini` object from an explicit base URL.

```js
import { bootstrapDemoPage } from './bootstrap.js';
import { createBrowserSdk } from 'auth-mini/sdk/browser';

export function createDemoRuntime({
  root,
  setupState,
  history,
  localStorage,
  location,
  windowObject,
  createSdk = createBrowserSdk,
}) {
  let sdk = null;

  return {
    async connectSdk() {
      if (setupState.configStatus !== 'ready') {
        return;
      }

      sdk = createSdk(setupState.sdkOrigin);
      bindSdk(root, sdk);
    },
  };
}
```

Remove the old `loadSdkScript(...)` path once tests are updated, but do not touch the server endpoint itself in this task.

- [ ] **Step 4: Rewrite demo setup copy around explicit SDK origin**

Update `demo/setup.js`, `demo/content.js`, and `demo/index.html` so the copy no longer tells users that the docs page will inject `/sdk/singleton-iife.js`.

Use wording like:

```js
return {
  sdkOrigin,
  issuer,
  jwksUrl: new URL('/jwks', sdkOrigin).toString(),
  startupCommand: [
    `npx auth-mini origin add ./auth-mini.sqlite --value ${origin}`,
    `npx auth-mini start ./auth-mini.sqlite --issuer ${issuer}`,
  ].join('\n'),
};
```

And update docs snippets to show module usage:

```js
import { createBrowserSdk } from 'auth-mini/sdk/browser';

const AuthMini = createBrowserSdk('https://auth.example.com');
```

- [ ] **Step 5: Run the demo tests to verify the migrated flow passes**

Run: `npm test -- tests/unit/demo-bootstrap.test.ts tests/unit/demo-render.test.ts`
Expected: PASS with the demo wired to the module browser SDK and no remaining `window.AuthMini` dependency in the demo runtime.

- [ ] **Step 6: Commit the demo migration**

```bash
git add demo/main.js demo/setup.js demo/content.js demo/index.html tests/unit/demo-bootstrap.test.ts tests/unit/demo-render.test.ts
git commit -m "docs: migrate demo to browser sdk module"
```

### Task 4: Final Verification And Regression Sweep

**Files:**

- Modify: none expected
- Test: `tests/unit/sdk-browser-module.test.ts`
- Test: `tests/unit/sdk-dts-build.test.ts`
- Test: `tests/integration/sdk-browser-package.test.ts`
- Test: `tests/integration/sdk-endpoint.test.ts`
- Test: `tests/unit/demo-bootstrap.test.ts`
- Test: `tests/unit/demo-render.test.ts`

- [ ] **Step 1: Run the targeted regression suite**

Run:

```bash
npm test -- tests/unit/sdk-browser-module.test.ts tests/unit/sdk-session.test.ts tests/unit/sdk-state.test.ts tests/unit/sdk-dts-build.test.ts tests/integration/sdk-browser-package.test.ts tests/integration/sdk-endpoint.test.ts tests/unit/demo-bootstrap.test.ts tests/unit/demo-render.test.ts
```

Expected: PASS. This proves the new browser subpath works, the old IIFE endpoint still works, and the demo has moved to the module path.

- [ ] **Step 2: Run the full project test suite**

Run: `npm test`
Expected: PASS with the existing full build + test flow, including the DTS consumer compile.

- [ ] **Step 3: Inspect the packed package contents**

Run: `npm pack --json --dry-run`
Expected: output includes `dist/sdk/browser.js` and `dist/sdk/browser.d.ts`, while still including existing CLI and IIFE artifacts.

- [ ] **Step 4: Commit the verification sweep only if code changed during verification**

```bash
git status --short
```

Expected: no changes. If verification exposed a small fix that required code changes, create a final commit such as:

```bash
git add <fixed-files>
git commit -m "fix: align browser sdk module rollout"
```

## Self-Review

- Spec coverage: covered the public `./sdk/browser` export, explicit `createBrowserSdk(serverBaseUrl)` contract, shared implementation reuse with IIFE, TypeScript export coverage, packed-install verification, and demo migration away from `window.AuthMini`.
- Placeholder scan: no `TODO` / `TBD` / “similar to previous task” placeholders remain; every task names exact files and commands.
- Type consistency: the plan consistently uses `createBrowserSdk(serverBaseUrl): AuthMiniApi` and preserves existing public browser SDK result types (`EmailStartResponse`, `SessionResult`, `SessionSnapshot`, `MeResponse`).
