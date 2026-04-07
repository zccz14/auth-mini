# AuthMini Rename Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the SDK's public and observable `MiniAuth` branding to `AuthMini` across runtime code, tests, demo, and README without changing behavior.

**Architecture:** Keep the existing singleton browser SDK architecture intact and treat this as a pure naming migration. Update observable/runtime identifiers first, then propagate the new name through helpers, demo bootstrap paths, and user-facing docs so tests and documentation describe one consistent contract. Any remaining browser-observable or demo-surface `MiniAuth` identifiers, including hook/config globals if they are user-reachable, must be renamed as part of the same pass.

**Tech Stack:** TypeScript, Vitest, Node.js, browser IIFE SDK, demo HTML/JS, grep

---

## File Map

- Modify: `src/sdk/types.ts` - rename exported SDK types from `MiniAuth*` to `AuthMini*`.
- Modify: `src/sdk/singleton-entry.ts` - rename global `window` property, internal factory names, and any observable SDK error names that still expose `MiniAuth`.
- Modify: `src/sdk/errors.ts` - rename observable SDK error names that still expose `MiniAuth`.
- Modify: `tests/helpers/sdk.ts` - rename imports and test helper functions that expose `MiniAuth` in names.
- Modify: `tests/unit/sdk-session.test.ts` - update helper imports/usages after helper renames.
- Modify: `tests/unit/sdk-webauthn.test.ts` - update helper imports/usages after helper renames.
- Modify: `tests/integration/sdk-login-contract.test.ts` - update helper imports/usages after helper renames.
- Modify: `tests/integration/sdk-endpoint.test.ts` - assert served source and executed SDK expose `window.AuthMini` and no longer use `window.MiniAuth`.
- Modify: `tests/unit/demo-bootstrap.test.ts` - switch fake window/global shape, failure strings, and runtime attachment assertions to `AuthMini`.
- Modify: `demo/bootstrap.js` - attach runtime to `windowObject.AuthMini` instead of `windowObject.MiniAuth`.
- Modify: `demo/main.js` - rename user-visible strings and any observable runtime references to `AuthMini`.
- Modify: `demo/index.html` - update example snippets rendered in static content.
- Modify: `README.md` - update all browser SDK examples and contract text to `AuthMini`.

## Chunk 1: SDK runtime and test helpers

### Task 1: Rename SDK runtime contract

**Files:**

- Modify: `tests/integration/sdk-endpoint.test.ts`
- Modify: `src/sdk/types.ts`
- Modify: `src/sdk/singleton-entry.ts`
- Modify: `src/sdk/errors.ts`

- [ ] **Step 1: Write the failing endpoint/global rename tests**

Update `tests/integration/sdk-endpoint.test.ts` so it expects:

```ts
expect(body).toContain('window.AuthMini');
expect(body).not.toContain('window.MiniAuth');
expect(windowObject.AuthMini.session.getState()).toMatchObject({
  status: 'recovering',
  refreshToken: 'rt',
});
expect(windowObject.MiniAuth).toBeUndefined();
```

- [ ] **Step 2: Run the targeted tests to verify failure**

Run: `npx vitest run tests/integration/sdk-endpoint.test.ts`
Expected: FAIL because the served SDK still contains `window.MiniAuth` and the executed SDK still mounts `MiniAuth`.

- [ ] **Step 3: Write the minimal runtime rename implementation**

Update `src/sdk/types.ts`, `src/sdk/singleton-entry.ts`, and `src/sdk/errors.ts` to rename observable SDK identifiers, including:

```ts
export type AuthMiniApi = { ... }
export type AuthMiniInternal = AuthMiniApi & { ready: Promise<void> }

declare global {
  interface Window {
    AuthMini: AuthMiniApi;
  }
}

export function createAuthMiniInternal(
  input: InternalSdkDeps,
): AuthMiniInternal {
  return getRuntime().createAuthMiniInternal(input) as AuthMiniInternal;
}

function installOnWindow(window, document) {
  window.AuthMini = bootstrapSingletonSdk({
    currentScript: document.currentScript,
    fetch: resolveFetch(window.fetch?.bind(window)),
  }).sdk;
}

error.name = 'AuthMiniSdkError';
```

- [ ] **Step 4: Run the targeted tests to verify pass**

Run: `npx vitest run tests/integration/sdk-endpoint.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/sdk-endpoint.test.ts src/sdk/types.ts src/sdk/singleton-entry.ts src/sdk/errors.ts
git commit -m "refactor: rename sdk runtime to authmini"
```

### Task 2: Rename SDK test helpers and dependent unit tests

**Files:**

- Modify: `tests/helpers/sdk.ts`
- Modify: `tests/unit/sdk-session.test.ts`
- Modify: `tests/unit/sdk-webauthn.test.ts`
- Modify: `tests/integration/sdk-login-contract.test.ts`

- [ ] **Step 1: Write the failing helper-rename edits in tests**

Update test imports/usages to the new helper names first, for example:

```ts
import { createAuthMiniForTest, jsonResponse } from '../helpers/sdk.js';

const sdk = createAuthMiniForTest({
  autoRecover: false,
});
```

Rename any helper names that still expose `MiniAuth`, such as `createMiniAuthForTest`.

- [ ] **Step 2: Run the targeted tests to verify failure**

Run: `npx vitest run tests/unit/sdk-session.test.ts tests/unit/sdk-webauthn.test.ts tests/integration/sdk-login-contract.test.ts`
Expected: FAIL with import/export errors because the helper implementation has not been renamed yet.

- [ ] **Step 3: Write the minimal helper rename implementation**

Update `tests/helpers/sdk.ts` to import `createAuthMiniInternal` and export renamed helpers, for example:

```ts
import { createAuthMiniInternal } from '../../src/sdk/singleton-entry.js';

export function createAuthMiniForTest(options: Partial<InternalSdkDeps> = {}) {
  return createAuthMiniInternal({
    autoRecover: false,
    baseUrl: 'https://auth.example.com',
    fetch: async () => jsonResponse({ ok: true }),
    now: () => Date.parse('2026-04-03T00:00:00.000Z'),
    publicKeyCredential: {},
    navigatorCredentials: fakeNavigatorCredentials(),
    storage: fakeStorage(),
    ...options,
  });
}
```

Only rename identifiers; keep helper behavior unchanged.

- [ ] **Step 4: Run the targeted tests to verify pass**

Run: `npx vitest run tests/unit/sdk-session.test.ts tests/unit/sdk-webauthn.test.ts tests/integration/sdk-login-contract.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/helpers/sdk.ts tests/unit/sdk-session.test.ts tests/unit/sdk-webauthn.test.ts tests/integration/sdk-login-contract.test.ts
git commit -m "test: rename sdk helpers to authmini"
```

## Chunk 2: Demo, README, and full verification

### Task 3: Rename demo runtime attachment and tested browser copy

**Files:**

- Modify: `tests/unit/demo-bootstrap.test.ts`
- Modify: `demo/bootstrap.js`
- Modify: `demo/main.js`

- [ ] **Step 1: Write the failing demo/docs assertions first**

Update `tests/unit/demo-bootstrap.test.ts` so it expects the new global and copy, for example:

```ts
type FakeWindow = {
  AuthMini?: FakeSdk;
  __AUTH_MINI_TEST_HOOKS__?: { loadSdkScript?: () => Promise<void> };
  __AUTH_MINI_SDK_URL__?: string;
};

expect(env.document.querySelector('#latest-response')?.textContent).toContain(
  'AuthMini SDK did not load',
);

env.window.AuthMini = createFakeSdk();
```

Also update any assertions that currently refer to `MiniAuth.session.logout()` or other old visible strings.
Audit `demo/**` and `tests/unit/demo-bootstrap.test.ts` for any remaining `__MINI_AUTH_*` globals/hooks; rename them to `__AUTH_MINI_*` if they can be reached from the browser/demo surface.

- [ ] **Step 2: Run the targeted tests to verify failure**

Run: `npx vitest run tests/unit/demo-bootstrap.test.ts`
Expected: FAIL because `demo/bootstrap.js` and `demo/main.js` still read `window.MiniAuth` and still render old `MiniAuth` copy.

- [ ] **Step 3: Write the minimal demo/docs implementation**

Update runtime attachment and user-visible copy only:

```js
await loadSdkScript(setupState, { document });
runtime.attachSdk(windowObject.AuthMini);
await runtime.completeStartup();
```

Then rename visible strings in `demo/main.js`, such as:

```js
state.latestAction = 'AuthMini.email.start()';
state.latestResult = `AuthMini SDK did not load: ${formatError(error)}`;
```

- [ ] **Step 4: Run the targeted tests to verify pass**

Run: `npx vitest run tests/unit/demo-bootstrap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/demo-bootstrap.test.ts demo/bootstrap.js demo/main.js
git commit -m "refactor: rename demo sdk runtime to authmini"
```

### Task 4: Rename static docs and snippets

**Files:**

- Modify: `demo/index.html`
- Modify: `README.md`

- [ ] **Step 1: Edit static snippets and explanatory copy**

Update all public snippets and narrative references from `MiniAuth` to `AuthMini`, for example:

```html
<code>window.AuthMini.webauthn.register()</code>
```

```md
await window.AuthMini.email.start({ email });
console.log(window.AuthMini.me.get());
```

- [ ] **Step 2: Run the residue check on public docs paths**

Run: `rg -n "MiniAuth" demo README.md`
Expected: no output.

- [ ] **Step 3: Review the rendered-facing diff for scope control**

Run: `git diff -- demo/index.html README.md`
Expected: only public copy and snippet renames from `MiniAuth` to `AuthMini`.

- [ ] **Step 4: Commit**

```bash
git add demo/index.html README.md
git commit -m "docs: rename public sdk references to authmini"
```

### Task 5: Full contract verification and residue check

**Files:**

- Verify only: `src/`
- Verify only: `demo/`
- Verify only: `tests/`
- Verify only: `README.md`

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS for the entire Vitest suite.

- [ ] **Step 2: Run static verification**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all commands PASS.

- [ ] **Step 3: Run the residue search**

Run: `rg -n "MiniAuth" src demo tests README.md`
Expected: no output.

- [ ] **Step 4: Inspect git diff for scope control**

Run: `git diff -- src demo tests README.md`
Expected: only SDK naming changes and supporting tests/docs.

- [ ] **Step 5: Do not create a verification-only commit**

Expected: if all implementation commits already exist and verification introduces no file changes, stop here without creating an extra commit.
