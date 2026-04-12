# Remove SDK HTTP API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop exposing `GET /sdk/singleton-iife.js` and `GET /sdk/singleton-iife.d.ts` while keeping npm SDK exports unchanged and proving the removal with integration tests.

**Architecture:** Drive the change from tests first by rewriting `tests/integration/sdk-endpoint.test.ts` to assert that both legacy HTTP endpoints now miss with `404`. Then simplify `createApp` by deleting only the two route registrations and the singleton-serving imports/constants that exist solely for those routes, leaving package exports, SDK build scripts, and internal singleton/IIFE source untouched.

**Tech Stack:** TypeScript, Hono, Vitest, Node.js

---

## File Map

- Modify: `tests/integration/sdk-endpoint.test.ts`
  - Replace the current endpoint-serving assertions with a minimal `404` contract for the two removed HTTP routes.
- Modify: `src/server/app.ts`
  - Delete the `/sdk/singleton-iife.js` and `/sdk/singleton-iife.d.ts` route handlers.
  - Delete the now-unused `node:fs`, `node:url`, and `../sdk/singleton-entry.js` imports plus the declaration-artifact lookup constants that only supported those routes.
- Validate only: `package.json`
  - Reuse the existing build/test tooling; do not change npm SDK exports or scripts.

### Task 1: Rewrite the integration contract to failing `404` assertions

**Files:**

- Modify: `tests/integration/sdk-endpoint.test.ts`

- [ ] **Step 1: Replace the endpoint-serving test file with the removal contract**

Rewrite `tests/integration/sdk-endpoint.test.ts` to keep only the route-removal assertions:

```ts
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/app.js';

describe('sdk endpoint removal', () => {
  it.each(['/sdk/singleton-iife.js', '/sdk/singleton-iife.d.ts'])(
    'returns 404 for %s',
    async (path) => {
      const testApp = await createTestApp();

      try {
        const response = await testApp.app.request(path);

        expect(response.status).toBe(404);
      } finally {
        testApp.close();
      }
    },
  );
});
```

This intentionally removes the old content-body, CORS-header, alternate-CWD, and served-source execution checks because they all describe behavior for the HTTP API that is being retired.

- [ ] **Step 2: Run the focused integration test to verify it fails first**

Run: `npm run build && npx vitest run tests/integration/sdk-endpoint.test.ts`

Expected: FAIL because at least one case still receives `200` from the existing route instead of the newly expected `404`.

- [ ] **Step 3: Commit nothing yet**

Keep the failing test unstaged until the production route removal is complete.

### Task 2: Remove the two legacy HTTP routes from the server

**Files:**

- Modify: `src/server/app.ts`
- Test: `tests/integration/sdk-endpoint.test.ts`

- [ ] **Step 1: Delete the singleton-serving imports and artifact preload block**

Remove these server-only HTTP endpoint dependencies from `src/server/app.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderSingletonIifeSource } from '../sdk/singleton-entry.js';

const singletonIifeDtsPathCandidates = [
  fileURLToPath(new URL('../sdk/singleton-iife.d.ts', import.meta.url)),
  fileURLToPath(new URL('../../dist/sdk/singleton-iife.d.ts', import.meta.url)),
];

const singletonIifeDtsPath = singletonIifeDtsPathCandidates.find((path) =>
  existsSync(path),
);

if (!singletonIifeDtsPath) {
  throw new Error('sdk declaration artifact not found');
}

const singletonIifeDtsSource = readFileSync(singletonIifeDtsPath, 'utf8');
```

After this step, the file header should start directly with the regular Hono and app-module imports because the server no longer needs to preload SDK HTTP artifacts.

- [ ] **Step 2: Delete the two `GET /sdk/*` route registrations**

Remove this block from `src/server/app.ts` so requests fall through to Hono's default `404` handling:

```ts
app.get('/sdk/singleton-iife.js', (c) => {
  return c.body(renderSingletonIifeSource(), 200, {
    'content-type': 'application/javascript; charset=utf-8',
    'cache-control': 'no-cache',
  });
});

app.get('/sdk/singleton-iife.d.ts', (c) => {
  return c.body(singletonIifeDtsSource, 200, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-cache',
  });
});
```

The next route after `app.onError(...)` should become `app.post('/email/start', ...)` with no replacement `/sdk/*` handler.

- [ ] **Step 3: Re-run the focused integration test**

Run: `npm run build && npx vitest run tests/integration/sdk-endpoint.test.ts`

Expected: PASS, with both removed endpoints returning `404`.

- [ ] **Step 4: Sanity-check that scope stayed narrow**

Run: `git diff -- src/server/app.ts tests/integration/sdk-endpoint.test.ts package.json`

Expected:

- `src/server/app.ts` only removes the two route handlers and their now-unused singleton-serving setup.
- `tests/integration/sdk-endpoint.test.ts` only rewrites coverage from `200` endpoint-serving behavior to `404` endpoint-removal behavior.
- `package.json` shows no diff, confirming npm SDK exports and public package APIs were left untouched.

### Task 3: Run a small regression pass and commit the scoped change

**Files:**

- Modify: `src/server/app.ts`
- Modify: `tests/integration/sdk-endpoint.test.ts`

- [ ] **Step 1: Re-run the endpoint test together with a nearby server smoke test**

Run: `npm run build && npx vitest run tests/integration/sdk-endpoint.test.ts tests/integration/cors.test.ts`

Expected: PASS. This keeps verification focused on the removed endpoints plus shared HTTP middleware behavior without expanding into unrelated SDK package refactors.

- [ ] **Step 2: Stage only the implementation and test files**

Run:

```bash
git add src/server/app.ts tests/integration/sdk-endpoint.test.ts
```

Do not stage `package.json`, `src/sdk/*`, build scripts, or generated artifacts.

- [ ] **Step 3: Commit with a narrow message**

Run:

```bash
git commit -m "fix: remove sdk http endpoints"
```

- [ ] **Step 4: Confirm the working tree is clean for this slice**

Run: `git status --short`

Expected: no output.
