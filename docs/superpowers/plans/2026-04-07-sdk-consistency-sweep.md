# SDK / Docs Consistency Sweep Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align README, deploy docs, demo/docs output, and SDK base-url behavior with the approved source/test contract, without introducing any scope beyond the approved inconsistency inventory.

**Architecture:** Treat the work as three bounded slices. First fix static README/deploy examples and the tests that lock them. Next rewrite the demo/docs guidance and generated commands so they match the current CLI contract (`origin add` plus `start --issuer`). Finally remove the SDK’s concrete-domain fallback by requiring an explicit base URL for direct `createSingletonSdk()` usage while keeping the normal browser bootstrap path script-derived.

**Tech Stack:** TypeScript, Vitest, browser demo modules, Markdown docs

---

## File Map

- Modify: `README.md` - unify `npx auth-mini` examples, switch default auth origin examples to `https://auth.zccz14.com`, and fix WebAuthn options request guidance.
- Modify: `docs/deploy/docker-cloudflared.md` - unify user-facing CLI examples and default issuer examples.
- Modify: `tests/integration/oclif-cli.test.ts` - lock README command examples, removed flags, and updated default issuer examples.
- Modify: `demo/index.html` - remove old `--origin` startup guidance from static shell copy.
- Modify: `demo/setup.js` - replace single old startup command generation with current CLI-contract guidance.
- Modify: `demo/content.js` - rewrite how-it-works, deployment notes, known issues, and WebAuthn request examples to match the current origin command contract.
- Modify: `demo/main.js` - not in scope; preserve the existing single-string render slot by changing only the produced string content.
- Modify: `tests/unit/demo-setup.test.ts` - lock new generated setup contract.
- Modify: `tests/unit/demo-content.test.ts` - lock new demo guidance text and WebAuthn request examples.
- Modify: `tests/unit/demo-render.test.ts` - lock rendered command/guidance output.
- Modify: `tests/unit/demo-bootstrap.test.ts` - lock bootstrap-rendered docs output under the new guidance.
- Modify: `src/sdk/singleton-entry.ts` - remove the concrete-domain `baseUrl` fallback from `createSingletonSdk()` while preserving bootstrap-from-script behavior.
- Modify: `tests/unit/sdk-base-url.test.ts` - assert no concrete-domain fallback remains and bootstrap continues to infer from script URL.
- Modify: `tests/unit/sdk-state.test.ts` - only if the approved implementation makes direct `createSingletonSdk()` require an explicit `baseUrl`.

## Chunk 1: README / Deploy Static Contract

### Task 1: Lock static docs to the current CLI and WebAuthn contract

**Files:**

- Modify: `tests/integration/oclif-cli.test.ts`
- Modify: `README.md`
- Modify: `docs/deploy/docker-cloudflared.md`

- [ ] **Step 1: Write the failing README/deploy assertions**

In `tests/integration/oclif-cli.test.ts`, tighten the README assertions so they require:

```ts
expect(readme).toContain(
  'npx auth-mini origin add ./auth-mini.sqlite --value https://app.example.com',
);
expect(readme).toContain(
  'npx auth-mini smtp add ./auth-mini.sqlite --host smtp.example.com --port 587',
);
expect(readme).toContain('npx auth-mini rotate jwks ./auth-mini.sqlite');
expect(readme).toContain('--issuer https://auth.zccz14.com');
expect(readme).not.toContain('https://auth.example.com');
expect(readme).not.toContain('authenticate/options` with an empty body');
```

Also add a small deploy-doc assertion in the same test file by reading `docs/deploy/docker-cloudflared.md` and checking it contains:

```ts
expect(deployDoc).toContain(
  'npx auth-mini origin add /data/auth.sqlite --value https://app.example.com',
);
expect(deployDoc).toContain('AUTH_ISSUER=https://auth.zccz14.com');
expect(deployDoc).not.toContain('https://auth.example.com');
```

- [ ] **Step 2: Run docs contract test to verify failure**

Run: `npm test -- tests/integration/oclif-cli.test.ts`
Expected: FAIL because README and deploy docs still contain bare `auth-mini`, `auth.example.com`, and the stale empty-body WebAuthn note.

- [ ] **Step 3: Write the minimal static docs changes**

In `README.md`:

- convert user-facing `origin`, `smtp`, `rotate jwks`, and remaining `start` examples to `npx auth-mini ...`
- replace default auth-server examples such as:

```md
https://auth.example.com
```

with:

```md
https://auth.zccz14.com
```

- replace the stale flow sentence:

```md
Later, call `POST /webauthn/authenticate/options` with an empty body.
```

with an explicit `rp_id` request note, e.g.:

```md
Later, call `POST /webauthn/authenticate/options` with `{ "rp_id": "example.com" }`.
```

- add the same explicit `rp_id` guidance to the registration-options step.

In `docs/deploy/docker-cloudflared.md`:

- change the default public hostname / issuer examples to `https://auth.zccz14.com`
- change post-start origin setup to `npx auth-mini origin add ...`

- [ ] **Step 4: Run docs contract test to verify pass**

Run: `npm test -- tests/integration/oclif-cli.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit static docs alignment**

```bash
git add tests/integration/oclif-cli.test.ts README.md docs/deploy/docker-cloudflared.md
git commit -m "docs: align sdk and cli examples"
```

## Chunk 2: Demo / Docs Contract Rewrite

### Task 2: Replace the demo’s old `--origin` startup story with the current CLI contract

**Files:**

- Modify: `tests/unit/demo-setup.test.ts`
- Modify: `tests/unit/demo-content.test.ts`
- Modify: `tests/unit/demo-render.test.ts`
- Modify: `tests/unit/demo-bootstrap.test.ts`
- Modify: `demo/index.html`
- Modify: `demo/setup.js`
- Modify: `demo/content.js`

- [ ] **Step 1: Write the failing demo tests**

Update the demo tests so they stop expecting generated `start --origin ...` output and instead require the current two-step setup story, while preserving the existing `startupCommand: string` shape.

For `tests/unit/demo-setup.test.ts`, replace expectations like:

```ts
startupCommand: 'auth-mini start ./auth-mini.sqlite --issuer https://auth.example.com --origin https://docs.example.com';
```

with one exact new expectation:

```ts
expect(state.startupCommand).toBe(
  [
    'npx auth-mini origin add ./auth-mini.sqlite --value https://docs.example.com',
    'npx auth-mini start ./auth-mini.sqlite --issuer https://auth.zccz14.com',
  ].join('\n'),
);
```

Do not introduce a new setup-state property. The tests must require:

- no generated `--origin` command
- `origin add` guidance uses the page origin
- `start` guidance keeps only `--issuer`
- demo default placeholder/auth origin examples use `https://auth.zccz14.com`

For `tests/unit/demo-content.test.ts`, `tests/unit/demo-render.test.ts`, and `tests/unit/demo-bootstrap.test.ts`, update expectations so they require:

```ts
expect(renderedText).toContain('npx auth-mini origin add');
expect(renderedText).not.toContain('--origin https://docs.example.com');
expect(renderedText).toContain('https://auth.zccz14.com');
expect(renderedText).toContain('rp_id');
```

Also update API-reference expectations so both `/webauthn/register/options` and `/webauthn/authenticate/options` request snippets include a JSON body with `rp_id`.

- [ ] **Step 2: Run demo unit tests to verify failure**

Run: `npm test -- tests/unit/demo-setup.test.ts tests/unit/demo-content.test.ts tests/unit/demo-render.test.ts tests/unit/demo-bootstrap.test.ts`
Expected: FAIL because demo copy, generated commands, and API examples still reference `--origin` and omit explicit `rp_id` request bodies.

- [ ] **Step 3: Write the minimal demo implementation**

In `demo/setup.js`, replace the old single command output:

```js
startupCommand: `auth-mini start ./auth-mini.sqlite --issuer ${issuer} --origin ${origin}`,
```

with one exact multi-line string contract:

```js
startupCommand: [
  `npx auth-mini origin add ./auth-mini.sqlite --value ${origin}`,
  `npx auth-mini start ./auth-mini.sqlite --issuer ${issuer}`,
].join('\n'),
```

Then update `demo/content.js` and `demo/index.html` so:

- all help text replaces `--origin` wording with `origin add` wording
- the default auth server placeholder/example becomes `https://auth.zccz14.com`
- deployment notes and known issues describe page-origin allowlisting via `origin add`
- API reference entries for both WebAuthn options endpoints show a request body containing `rp_id`

- [ ] **Step 4: Run demo unit tests to verify pass**

Run: `npm test -- tests/unit/demo-setup.test.ts tests/unit/demo-content.test.ts tests/unit/demo-render.test.ts tests/unit/demo-bootstrap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit demo contract rewrite**

```bash
git add tests/unit/demo-setup.test.ts tests/unit/demo-content.test.ts tests/unit/demo-render.test.ts tests/unit/demo-bootstrap.test.ts demo/index.html demo/setup.js demo/content.js
git commit -m "docs: update demo setup guidance"
```

## Chunk 3: SDK Base URL No-Fallback Contract

### Task 3: Remove concrete-domain fallback from direct singleton construction

**Files:**

- Modify: `tests/unit/sdk-base-url.test.ts`
- Modify: `tests/unit/sdk-state.test.ts` (only if the approved implementation requires it)
- Modify: `src/sdk/singleton-entry.ts`

- [ ] **Step 1: Write the failing SDK base-url tests**

In `tests/unit/sdk-base-url.test.ts`, add a direct-construction assertion that forbids a concrete-domain fallback with one exact failure contract:

```ts
import { createSingletonSdk } from '../../src/sdk/singleton-entry.js';

it('fails direct singleton creation when baseUrl is omitted', () => {
  expect(() => createSingletonSdk({ storage: fakeStorage() })).toThrow(
    'sdk_init_failed: Cannot determine SDK base URL',
  );
});
```

Keep the existing bootstrap inference tests intact so this slice still guarantees:

```ts
expect(bootstrapSingletonSdk({ currentScript }).baseUrl).toBe(
  'https://auth.example.com',
);
```

If the approved implementation makes direct `createSingletonSdk()` require an explicit base URL, update `tests/unit/sdk-state.test.ts` to pass one:

```ts
const sdk = createSingletonSdk({
  baseUrl: 'https://auth.example.com',
  storage: fakeStorage({
    refreshToken: 'rt',
    expiresAt: '2026-04-03T00:00:00.000Z',
  }),
});
```

- [ ] **Step 2: Run SDK unit tests to verify failure**

Run: `npm test -- tests/unit/sdk-base-url.test.ts`
Expected: FAIL because `createSingletonSdk()` still falls back to `https://auth-mini.local`.

- [ ] **Step 3: Write the minimal SDK implementation**

In `src/sdk/singleton-entry.ts`, replace:

```ts
baseUrl: input.baseUrl ?? 'https://auth-mini.local',
```

with an explicit missing-base-url failure in the direct-construction path, e.g.:

```ts
const baseUrl = input.baseUrl;
if (!baseUrl) {
  throw createSdkError('sdk_init_failed', 'Cannot determine SDK base URL');
}
```

and then pass that `baseUrl` into `createAuthMiniInternal(...)`.

Do not change `bootstrapSingletonSdk()` semantics; it should keep deriving the base URL from the script URL and then call `createSingletonSdk({ baseUrl, ... })`.

- [ ] **Step 4: Run SDK unit tests to verify pass**

Run: `npm test -- tests/unit/sdk-base-url.test.ts`
Expected: PASS.

If `tests/unit/sdk-state.test.ts` changed in Step 1, also run:

`npm test -- tests/unit/sdk-state.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit SDK no-fallback change**

```bash
git add tests/unit/sdk-base-url.test.ts src/sdk/singleton-entry.ts tests/unit/sdk-state.test.ts
git commit -m "fix: remove sdk concrete base url fallback"
```

## Chunk 4: Final Verification

### Task 4: Verify the approved scope only

**Files:**

- Modify: none (verification only)

- [ ] **Step 1: Run the full approved test slice**

Run: `npm test -- tests/integration/oclif-cli.test.ts tests/unit/demo-setup.test.ts tests/unit/demo-content.test.ts tests/unit/demo-render.test.ts tests/unit/demo-bootstrap.test.ts tests/unit/sdk-webauthn.test.ts tests/unit/sdk-base-url.test.ts`
Expected: PASS.

If `tests/unit/sdk-state.test.ts` changed as part of Task 3, run it as an additional approved test:

`npm test -- tests/unit/sdk-state.test.ts`

Expected: PASS.

- [ ] **Step 2: Rebuild generated output if needed**

Run: `npm run build`
Expected: PASS. If `dist/` changes, stop and amend the spec before committing because generated output is not currently in the approved scope.

- [ ] **Step 3: Inspect working tree scope**

Run: `git status --short`
Expected: every modified path is in this approved allowlist and no other path appears:

```text
README.md
docs/deploy/docker-cloudflared.md
demo/index.html
demo/setup.js
demo/content.js
src/sdk/singleton-entry.ts
tests/integration/oclif-cli.test.ts
tests/unit/demo-setup.test.ts
tests/unit/demo-content.test.ts
tests/unit/demo-render.test.ts
tests/unit/demo-bootstrap.test.ts
tests/unit/sdk-base-url.test.ts
tests/unit/sdk-state.test.ts
```

Only include `tests/unit/sdk-state.test.ts` if that file was part of the approved implementation path for Task 3.

- [ ] **Step 4: Commit final verification-only follow-up if needed**

If build or test fixes changed files beyond the three feature commits, commit only those minimal follow-up changes:

```bash
git add <approved-files>
git commit -m "test: finalize sdk consistency sweep"
```
