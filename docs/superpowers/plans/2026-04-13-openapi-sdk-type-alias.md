# OpenAPI SDK Type Alias Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the browser SDK public type names stable while replacing only the structurally equivalent handwritten SDK types in `src/sdk/types.ts` with aliases to generated OpenAPI types.

**Architecture:** Keep `src/sdk/types.ts` as the only public type facade for the browser SDK, but import selected generated types from `src/generated/api/index.ts` and re-export them under the existing SDK names. Treat this as a type-only change: runtime parsing and request-shaping code stay in the handwritten SDK modules, especially `/me` parsing in `src/sdk/me.ts` and the camelCase-to-snake_case passkey payload bridge in `src/sdk/singleton-entry.ts`.

**Tech Stack:** TypeScript, generated OpenAPI SDK types, Vitest, `tsc`, Node.js

---

## File Map

- Modify: `src/sdk/types.ts`
  - Replace only the structurally equivalent handwritten public SDK types with generated-type aliases while keeping SDK-owned types and `WebauthnVerifyResponse` handwritten.
- Modify: `tests/unit/sdk-dts-build.test.ts`
  - Add declaration-build assertions that lock the approved alias set and keep the browser facade pointed at `./types.js` instead of generated paths.
- Reference only: `src/sdk/browser.ts`
  - Public browser facade that must keep re-exporting from `./types.js`.
- Reference only: `src/generated/api/index.ts`
  - Stable import surface for generated type names used by the SDK facade.
- Reference only: `src/generated/api/types.gen.ts`
  - Canonical generated shapes to compare against the handwritten SDK types before aliasing.
- Reference only: `src/sdk/email.ts`
  - Shows that `EmailStartResponse` is still the browser SDK's looser response contract.
- Reference only: `src/sdk/singleton-entry.ts`
  - Shows that `PasskeyOptionsInput` still uses camelCase `rpId` and is translated to `{ rp_id }` at runtime.
- Reference only unless compile breaks: `tests/fixtures/sdk-dts-consumer/module-browser-usage.ts`, `tests/fixtures/sdk-dts-consumer/global-usage.ts`, `tests/helpers/sdk.ts`
  - Existing type-only consumers that should continue compiling without import-path changes.

### Task 1: Lock the alias decision matrix with a failing declaration test

**Files:**

- Modify: `tests/unit/sdk-dts-build.test.ts`
- Reference only: `src/sdk/types.ts`, `src/generated/api/index.ts`, `src/generated/api/types.gen.ts`, `src/sdk/browser.ts`, `src/sdk/email.ts`, `src/sdk/singleton-entry.ts`

- [ ] **Step 1: Add a focused failing assertion for the allowed alias set**

Append a new `it(...)` block near the existing shared declaration assertions in `tests/unit/sdk-dts-build.test.ts`:

```ts
it('aliases only the structurally equivalent browser sdk public types', () => {
  const sharedTypes = readSharedTypesDeclaration();
  const browserOutput = readBrowserModuleDeclaration();

  expect(sharedTypes).toContain(
    'import type { Ed25519Credential as GeneratedMeEd25519Credential',
  );
  expect(sharedTypes).toContain(
    'EmailStartRequest as GeneratedEmailStartInput',
  );
  expect(sharedTypes).toContain(
    'EmailVerifyRequest as GeneratedEmailVerifyInput',
  );
  expect(sharedTypes).toContain('MeResponse as GeneratedMeResponse');
  expect(sharedTypes).toContain('SessionSummary as GeneratedMeActiveSession');
  expect(sharedTypes).toContain(
    'WebauthnCredential as GeneratedMeWebauthnCredential',
  );
  expect(sharedTypes).toContain(
    'export type MeWebauthnCredential = GeneratedMeWebauthnCredential;',
  );
  expect(sharedTypes).toContain(
    'export type MeEd25519Credential = GeneratedMeEd25519Credential;',
  );
  expect(sharedTypes).toContain(
    'export type MeActiveSession = GeneratedMeActiveSession;',
  );
  expect(sharedTypes).toContain(
    'export type MeResponse = GeneratedMeResponse;',
  );
  expect(sharedTypes).toContain(
    'export type EmailStartInput = GeneratedEmailStartInput;',
  );
  expect(sharedTypes).toContain(
    'export type EmailVerifyInput = GeneratedEmailVerifyInput;',
  );
  expect(sharedTypes).toContain('export type EmailStartResponse = {');
  expect(sharedTypes).toContain('export type PasskeyOptionsInput = {');
  expect(sharedTypes).toContain(
    'export type WebauthnVerifyResponse = Record<string, unknown>;',
  );
  expect(browserOutput).toContain("} from './types.js';");
  expect(browserOutput).not.toContain('../generated/api');
});
```

This codifies the exact plan boundary discovered during repo inspection: `EmailStartResponse` is still a looser SDK-owned contract than generated `OkResponse`, and `PasskeyOptionsInput` is still the camelCase facade for the runtime `{ rp_id }` payload builder.

- [ ] **Step 2: Run the focused declaration test to confirm the red state**

Run: `npm run build && npx vitest run tests/unit/sdk-dts-build.test.ts`

Expected: FAIL because `dist/sdk/types.d.ts` still contains the handwritten object types instead of the generated alias imports and exports.

- [ ] **Step 3: Commit nothing yet**

Do not create a commit for a knowingly failing state. Move directly to the minimal implementation in Task 2.

### Task 2: Alias the approved equivalent SDK types in the public facade

**Files:**

- Modify: `src/sdk/types.ts`
- Reference only: `src/sdk/browser.ts`, `src/generated/api/index.ts`, `src/generated/api/types.gen.ts`

- [ ] **Step 1: Add the generated type-only imports at the top of `src/sdk/types.ts`**

Insert this import block before `export type SdkStatus = ...`:

```ts
import type {
  Ed25519Credential as GeneratedMeEd25519Credential,
  EmailStartRequest as GeneratedEmailStartInput,
  EmailVerifyRequest as GeneratedEmailVerifyInput,
  MeResponse as GeneratedMeResponse,
  SessionSummary as GeneratedMeActiveSession,
  WebauthnCredential as GeneratedMeWebauthnCredential,
} from '../generated/api/index.js';
```

- [ ] **Step 2: Replace only the equivalent handwritten type bodies with aliases**

In `src/sdk/types.ts`, replace the current object definitions for the six equivalent types with these aliases:

```ts
export type MeWebauthnCredential = GeneratedMeWebauthnCredential;

export type MeEd25519Credential = GeneratedMeEd25519Credential;

export type MeActiveSession = GeneratedMeActiveSession;

export type MeResponse = GeneratedMeResponse;

export type EmailStartInput = GeneratedEmailStartInput;

export type EmailVerifyInput = GeneratedEmailVerifyInput;
```

Leave these definitions handwritten exactly because the current public SDK contract is not structurally equivalent to the generated shapes:

```ts
export type EmailStartResponse = {
  ok?: boolean;
} & Record<string, unknown>;

export type WebauthnVerifyResponse = Record<string, unknown>;

export type PasskeyOptionsInput = {
  rpId?: string;
};
```

Do not modify any SDK-owned session/state/error types below them.

- [ ] **Step 3: Preserve the browser facade boundary**

Open `src/sdk/browser.ts` and confirm the type re-export block still goes through `./types.js` only. The file should still match this shape after the alias change:

```ts
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
```

Do not add any `../generated/api/*` import or re-export to `src/sdk/browser.ts`.

- [ ] **Step 4: Re-run the focused red/green loop**

Run: `npm run build && npx vitest run tests/unit/sdk-dts-build.test.ts`

Expected: PASS. `dist/sdk/types.d.ts` should now show generated type imports for the six approved aliases, while `dist/sdk/browser.d.ts` should still re-export browser-facing names from `./types.js`.

- [ ] **Step 5: Compile the existing type-only SDK consumer fixture**

Run: `npx tsc -p tests/fixtures/sdk-dts-consumer/tsconfig.json`

Expected: PASS without changing consumer import paths or public type names.

- [ ] **Step 6: Only if the consumer fixture compile fails, apply the smallest annotation-only fix**

The allowed fixture edits are limited to the exact failing file under `tests/fixtures/sdk-dts-consumer/` or `tests/helpers/sdk.ts`, and they must keep consuming the browser SDK facade rather than generated modules. Use the same public names and import paths, for example:

```ts
import type { MeResponse, PasskeyOptionsInput } from 'auth-mini/sdk/browser';

const passkeyInput: PasskeyOptionsInput = { rpId: 'auth.example.com' };
const me: MeResponse = await sdk.me.fetch();
```

After any such minimal fix, re-run: `npx tsc -p tests/fixtures/sdk-dts-consumer/tsconfig.json`

- [ ] **Step 7: Commit the alias slice**

Run:

```bash
git add src/sdk/types.ts tests/unit/sdk-dts-build.test.ts tests/fixtures/sdk-dts-consumer/module-browser-usage.ts tests/fixtures/sdk-dts-consumer/global-usage.ts tests/helpers/sdk.ts
git commit -m "refactor: alias sdk public types to generated models"
```

If Step 6 was unnecessary, remove the untouched fixture paths from `git add` before committing.

### Task 3: Run the full verification set and record the finished state

**Files:**

- Modify: none unless Task 2 Step 6 found a real consumer-fixture break

- [ ] **Step 1: Run the project typecheck after the focused checks pass**

Run: `npm run typecheck`

Expected: PASS, proving the alias swap did not break internal TypeScript consumers.

- [ ] **Step 2: Re-run the build once more from a clean green state**

Run: `npm run build`

Expected: PASS, including generated API refresh and SDK declaration output.

- [ ] **Step 3: Create a verification commit only if Task 2 required follow-up edits after the alias commit**

If Task 2 Step 6 or Task 3 Steps 1-2 required an additional code adjustment, run:

```bash
git add src/sdk/types.ts tests/unit/sdk-dts-build.test.ts tests/fixtures/sdk-dts-consumer/module-browser-usage.ts tests/fixtures/sdk-dts-consumer/global-usage.ts tests/helpers/sdk.ts
git commit -m "test: keep sdk type consumers green"
```

Otherwise, do not create an extra commit.

- [ ] **Step 4: Sanity-check the final diff before handing off**

Run: `git diff --stat origin/main...HEAD`

Expected: Only the planned type-facade and type-test files changed; no runtime SDK modules such as `src/sdk/me.ts`, `src/sdk/email.ts`, or `src/sdk/singleton-entry.ts` should appear unless a fixture-only follow-up was genuinely necessary.

## Self-Review Checklist

- Spec coverage checked: this plan covers the allowed alias set, preserves `src/sdk/types.ts` / `src/sdk/browser.ts` as the public facade, keeps `/me` parsing and passkey request shaping unchanged, and requires consumer-facing type verification.
- Placeholder scan checked: no `TODO`, `TBD`, or "similar to above" placeholders remain.
- Type consistency checked: generated import aliases, public SDK names, and verification commands use one naming scheme throughout the plan.
