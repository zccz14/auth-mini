# SDK IIFE `.d.ts` Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a generated `GET /sdk/singleton-iife.d.ts` endpoint that types only `window.AuthMini` for browser SDK consumers.

**Architecture:** Keep `src/sdk/types.ts` as the source of truth, add one thin global-declaration entry that reuses those types, and generate a single-file declaration artifact during build. Serve that built artifact from the existing SDK endpoint layer, then lock the result with endpoint assertions and a minimal consumer typecheck fixture.

**Tech Stack:** TypeScript, Node.js build scripts, Hono, Vitest

---

## File Map

- Modify: `package.json`
  - Add the extra build step(s) needed to emit and flatten the browser-global `.d.ts` artifact.
- Create: `src/sdk/singleton-global.ts`
  - Thin declaration-source entry that imports `AuthMiniApi` and augments `Window` inside `declare global`.
- Create: `src/sdk/build-singleton-dts.ts`
  - Build helper that compiles the declaration entry and writes the final single-file `dist/sdk/singleton-iife.d.ts` artifact.
- Modify: `src/server/app.ts`
  - Serve `GET /sdk/singleton-iife.d.ts` with text content-type and `no-cache`.
- Modify: `tests/integration/sdk-endpoint.test.ts`
  - Add endpoint coverage for the new `.d.ts` route and shape guards.
- Create: `tests/fixtures/sdk-dts-consumer/global-usage.ts`
  - Minimal browser-consumer file that references `window.AuthMini`.
- Create: `tests/fixtures/sdk-dts-consumer/tsconfig.json`
  - Fixture config that typechecks only the downloaded/generated `.d.ts` plus the usage file.
- Create: `tests/unit/sdk-dts-build.test.ts`
  - Locks the generated declaration file shape and “no extra top-level named declarations” rule.

## Chunk 1: Generate the `.d.ts` Artifact

### Task 1: Add a thin global declaration source

**Files:**

- Create: `src/sdk/singleton-global.ts`
- Test: `tests/unit/sdk-dts-build.test.ts`

- [ ] **Step 1: Write the failing build-shape test**

Create `tests/unit/sdk-dts-build.test.ts` with assertions against the future built file:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

describe('sdk d.ts build artifact', () => {
  it('contains only a global Window.AuthMini declaration surface', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'dist/sdk/singleton-iife.d.ts'),
      'utf8',
    );

    expect(source).toContain('declare global');
    expect(source).toContain('interface Window');
    expect(source).toContain('AuthMini:');
    expect(source).not.toMatch(/from ['"][.]{1,2}\//);
    expect(source).not.toContain('src/sdk/');

    const file = ts.createSourceFile(
      'singleton-iife.d.ts',
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    expect(file.statements).toHaveLength(2);
    expect(ts.isExportDeclaration(file.statements[0])).toBe(true);
    expect(ts.isModuleDeclaration(file.statements[1])).toBe(true);

    const globalBlock = file.statements[1];
    expect(globalBlock.name.text).toBe('global');
    expect(globalBlock.body?.statements).toHaveLength(1);
    expect(ts.isInterfaceDeclaration(globalBlock.body!.statements[0])).toBe(
      true,
    );
    const windowDecl = globalBlock.body!.statements[0];
    expect(windowDecl.name.text).toBe('Window');
    expect(windowDecl.members).toHaveLength(1);
    expect(ts.isPropertySignature(windowDecl.members[0])).toBe(true);
    expect(windowDecl.members[0].name.getText(file)).toBe('AuthMini');
  });

  it('matches the approved Window.AuthMini contract', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'dist/sdk/singleton-iife.d.ts'),
      'utf8',
    );

    expect(source).toMatchInlineSnapshot();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run build && npx vitest run tests/unit/sdk-dts-build.test.ts`

Expected: FAIL because `dist/sdk/singleton-iife.d.ts` does not exist yet.

- [ ] **Step 3: Add the declaration entry**

Create `src/sdk/singleton-global.ts` as a thin module-form source:

```ts
import type { AuthMiniApi } from './types.js';

export {};

declare global {
  interface Window {
    AuthMini: AuthMiniApi;
  }
}
```

Do not add any extra exported types. The point of this file is only to make TypeScript emit the `Window` augmentation.

- [ ] **Step 4: Add the minimal build helper**

Create `src/sdk/build-singleton-dts.ts`.

Implementation requirements:

- run a declaration-only TypeScript emit for `src/sdk/singleton-global.ts`
- emit into a temporary location under `dist/`
- read the generated `.d.ts`
- inline the imported `AuthMiniApi` dependency chain into one file
- fail if the result still contains relative imports or extra top-level named declarations
- write the final output to `dist/sdk/singleton-iife.d.ts`

Use the TypeScript compiler API rather than shelling out to ad-hoc text tools, so the build stays deterministic inside Node.

- [ ] **Step 5: Wire the helper into build**

Update `package.json` so `npm run build` still does the normal JS build, then writes both SDK artifacts:

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json && node dist/sdk/build-singleton-iife.js && node dist/sdk/build-singleton-dts.js"
  }
}
```

If the helper needs temporary declaration emit config, keep that logic inside the Node script rather than adding another public npm script unless necessary.

- [ ] **Step 6: Re-run the focused test**

Run: `npm run build && npx vitest run tests/unit/sdk-dts-build.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the artifact-generation slice**

```bash
git add package.json src/sdk/singleton-global.ts src/sdk/build-singleton-dts.ts tests/unit/sdk-dts-build.test.ts
git commit -m "build: generate sdk global d.ts"
```

## Chunk 2: Serve the Artifact and Lock the Endpoint Contract

### Task 2: Add the HTTP endpoint

**Files:**

- Modify: `src/server/app.ts`
- Modify: `tests/integration/sdk-endpoint.test.ts`

- [ ] **Step 1: Write the failing endpoint test**

Extend `tests/integration/sdk-endpoint.test.ts` with a new case:

```ts
it('serves the singleton sdk declaration as text with no-cache headers', async () => {
  const testApp = await createTestApp();

  try {
    const response = await testApp.app.request('/sdk/singleton-iife.d.ts');
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(response.headers.get('cache-control')).toContain('no-cache');
    const built = readFileSync(
      resolve(process.cwd(), 'dist/sdk/singleton-iife.d.ts'),
      'utf8',
    );

    expect(body).toBe(built);
  } finally {
    testApp.close();
  }
});
```

Add a second case that checks the `.d.ts` route also gets allowed-origin CORS headers, mirroring the JS endpoint contract. Treat this as parity coverage for inherited endpoint behavior, not as new feature scope.

- [ ] **Step 2: Run the endpoint tests to verify failure**

Run: `npm run build && npx vitest run tests/integration/sdk-endpoint.test.ts`

Expected: FAIL with 404 for `/sdk/singleton-iife.d.ts`.

- [ ] **Step 3: Implement the route**

In `src/server/app.ts`, add a sibling route next to `/sdk/singleton-iife.js` that reads and returns the generated file with:

- `content-type: text/plain; charset=utf-8`
- `cache-control: no-cache`

Reuse the same style as the JS route. Keep the implementation minimal and static; do not regenerate the file per request.

- [ ] **Step 4: Re-run the endpoint tests**

Run: `npm run build && npx vitest run tests/integration/sdk-endpoint.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the endpoint slice**

```bash
git add src/server/app.ts tests/integration/sdk-endpoint.test.ts
git commit -m "feat: serve sdk global d.ts"
```

## Chunk 3: Verify External Consumption

### Task 3: Add a consumer fixture typecheck

**Files:**

- Create: `tests/fixtures/sdk-dts-consumer/global-usage.ts`
- Create: `tests/fixtures/sdk-dts-consumer/tsconfig.json`
- Modify: `tests/unit/sdk-dts-build.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the fixture usage file**

Create `tests/fixtures/sdk-dts-consumer/global-usage.ts`:

```ts
window.AuthMini.session.onChange((state) => {
  state.status;
  state.me?.email;
});

window.AuthMini.email.start({ email: 'user@example.com' });
window.AuthMini.email.verify({ email: 'user@example.com', code: '123456' });
window.AuthMini.passkey.authenticate({ rpId: 'auth.example.com' });
window.AuthMini.webauthn.register();
window.AuthMini.me.get();
window.AuthMini.me.reload();
window.AuthMini.session.getState();
window.AuthMini.session.refresh();
window.AuthMini.session.logout();
```

- [ ] **Step 2: Write the fixture tsconfig**

Create `tests/fixtures/sdk-dts-consumer/tsconfig.json` so it includes:

- the browser DOM libs
- `./global-usage.ts`
- the generated file at `../../../dist/sdk/singleton-iife.d.ts`

Example:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noEmit": true
  },
  "files": ["../../../dist/sdk/singleton-iife.d.ts", "./global-usage.ts"]
}
```

- [ ] **Step 3: Add a failing full-surface verification hook**

Extend `tests/unit/sdk-dts-build.test.ts` so the approved contract is enforced by a full-file inline snapshot (or equivalent checked-in full-text assertion), not only by substrings. Keep a small method-name loop only as a readability aid if desired:

```ts
for (const name of [
  'email:',
  'verify(',
  'passkey:',
  'webauthn:',
  'session:',
  'onChange(',
  'refresh(',
  'logout(',
]) {
  expect(source).toContain(name);
}
```

This guards against a “minimal but incomplete” generated file.

- [ ] **Step 4: Run the consumer typecheck to verify it fails first**

Run: `npm run build && npx tsc -p tests/fixtures/sdk-dts-consumer/tsconfig.json`

Expected: FAIL until the generated artifact fully matches the approved contract and can be consumed standalone.

- [ ] **Step 5: Make the minimal fixes needed for the fixture to pass**

Adjust the generation helper only as needed so the produced `.d.ts`:

- includes the full `window.AuthMini` method surface
- remains single-file
- still exposes no extra top-level named declarations
- still satisfies the AST whitelist of exactly `export {}` plus `declare global { interface Window { AuthMini: ... } }`, with no extra siblings inside `declare global` or `Window`

- [ ] **Step 6: Run the focused verification commands**

Run all of:

```bash
npm run build
npx vitest run tests/unit/sdk-dts-build.test.ts
npx vitest run tests/integration/sdk-endpoint.test.ts
npx tsc -p tests/fixtures/sdk-dts-consumer/tsconfig.json
```

Expected: all PASS.

- [ ] **Step 7: Commit the verification slice**

```bash
git add package.json tests/fixtures/sdk-dts-consumer/global-usage.ts tests/fixtures/sdk-dts-consumer/tsconfig.json tests/unit/sdk-dts-build.test.ts
git commit -m "test: verify sdk global d.ts consumption"
```

## Chunk 4: Docs and Final Verification

### Task 4: Document the URL and verify the full repo checks

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Write the failing README assertion or targeted doc test if one exists**

If there is already a README/doc assertion pattern in the repo for SDK docs, extend it first. Otherwise skip directly to the README edit and rely on final verification.

- [ ] **Step 2: Update Browser SDK docs**

In `README.md`, add a short note near the browser SDK section stating:

- the declaration file lives at `GET /sdk/singleton-iife.d.ts`
- it types `window.AuthMini`
- consumers can download the file and include it in their TS project
- consumers may also use it as the source for a triple-slash/editor workflow if their toolchain supports that setup

Do not document extra global type names, because this feature intentionally does not expose them.

- [ ] **Step 3: Run final verification**

Run:

```bash
npm test
npm run typecheck
npm run lint
```

Expected: all PASS.

- [ ] **Step 4: Commit the docs/final-verification slice**

```bash
git add README.md
git commit -m "docs: add sdk d.ts endpoint"
```

## Notes for Implementer

- Prefer the smallest build pipeline change that keeps `src/sdk/types.ts` as the source of truth.
- The final `dist/sdk/singleton-iife.d.ts` must be a generated artifact, not a hand-maintained file.
- Do not expand scope into npm package splitting, workspace setup, or additional public type exports.
- If the declaration bundling turns out to need more than one helper file, keep that complexity inside `src/sdk/` and the build script; do not leak it into the runtime server path.
