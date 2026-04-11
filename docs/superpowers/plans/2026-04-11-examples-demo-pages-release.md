# Examples Demo Pages Release Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch the GitHub Pages release chain from the legacy `demo/` site to the root `npm run demo:build` entrypoint that produces `examples/demo/dist`, update README wording to match, and retire the old `demo/` implementation once no repo code still depends on it.

**Architecture:** Keep the release contract centralized at the repo root: `package.json` owns `demo:build`, `.github/workflows/pages.yml` installs both dependency trees and publishes only `examples/demo/dist`, and a focused unit test reads those files to prevent regressions. Treat the old `demo/` directory as removable legacy code: after the release-path assertions are in place and a grep audit shows only legacy files depend on it, delete the old source/tests and clean the remaining config hooks that referenced `demo/**/*.js`.

**Tech Stack:** GitHub Actions workflow YAML, npm scripts, Vite demo package in `examples/demo`, Vitest, Markdown

---

## File Structure

- Create: `tests/unit/examples-demo-pages-release.test.ts`
  - regression coverage for the new Pages build contract, artifact path, and README wording
- Modify: `.github/workflows/pages.yml`
  - install both dependency trees, run the root release build, and upload `examples/demo/dist`
- Modify: `README.md`
  - align live demo / interactive demo wording with `examples/demo`
- Modify: `package.json`
  - keep `demo:build` as the single root release entrypoint and correct any drift back to the approved command
- Modify: `tsconfig.json`
  - remove the legacy `demo/**/*.js` include once `demo/` is deleted
- Modify: `eslint.config.js`
  - remove the `demo/**/*.js` browser-only override once `demo/` is deleted
- Delete: `demo/bootstrap.js`
- Delete: `demo/content.js`
- Delete: `demo/index.html`
- Delete: `demo/main.js`
- Delete: `demo/setup.d.ts`
- Delete: `demo/setup.js`
- Delete: `demo/style.css`
  - legacy single-page demo implementation retired from the release chain
- Delete: `tests/unit/demo-bootstrap.test.ts`
- Delete: `tests/unit/demo-content.test.ts`
- Delete: `tests/unit/demo-render.test.ts`
- Delete: `tests/unit/demo-setup.test.ts`
  - legacy unit coverage tied directly to the deleted `demo/` implementation

### Task 1: Add A Regression Test For The New Release Contract

**Files:**

- Create: `tests/unit/examples-demo-pages-release.test.ts`

- [ ] **Step 1: Write the failing release-contract test file**

Create `tests/unit/examples-demo-pages-release.test.ts` with assertions that read the repo files directly and lock the required release contract:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('examples demo Pages release contract', () => {
  it('keeps demo:build as the root-first release entrypoint', () => {
    const packageJson = JSON.parse(readRepoFile('package.json')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['demo:build']).toBe(
      'npm run build && npm --prefix examples/demo run build',
    );
  });

  it('builds Pages from the root entrypoint and uploads examples/demo/dist', () => {
    const workflow = readRepoFile('.github/workflows/pages.yml');

    expect(workflow).toContain('uses: actions/setup-node@v4');
    expect(workflow).toContain("node-version: '20.10.0'");
    expect(workflow).toContain('cache: npm');
    expect(workflow).toContain('run: npm ci');
    expect(workflow).toContain('run: npm --prefix examples/demo ci');
    expect(workflow).toContain('run: npm run demo:build');
    expect(workflow).toContain('path: examples/demo/dist');
    expect(workflow).not.toContain('path: demo');
  });

  it('documents examples/demo as the current interactive demo source', () => {
    const readme = readRepoFile('README.md');

    expect(readme).toContain(
      '[Live demo](https://auth-mini.zccz14.com/?sdk-origin=https%3A%2F%2Fauth.zccz14.com)',
    );
    expect(readme).toContain(
      '`docs/` is the canonical static reference source.',
    );
    expect(readme).toContain(
      '`examples/demo/` is the current interactive demo source and Pages publish target.',
    );
    expect(readme).not.toContain(
      '[`demo/`](demo/) is an interactive companion',
    );
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails on the current branch**

Run: `npx vitest run tests/unit/examples-demo-pages-release.test.ts`

Expected: FAIL with assertions that still find the old workflow state (`path: demo`, missing install/build steps) and the old README wording that links `demo/`.

### Task 2: Switch GitHub Pages To The Root `demo:build` Release Path

**Files:**

- Modify: `.github/workflows/pages.yml`
- Modify: `package.json`

- [ ] **Step 1: Update the Pages workflow to install both packages and publish `examples/demo/dist`**

Replace the body of `.github/workflows/pages.yml` with a deployment job that keeps the existing trigger/permissions/concurrency block and uses these build steps:

```yml
jobs:
  deploy:
    runs-on: ubuntu-latest

    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.10.0'
          cache: npm

      - name: Install root dependencies
        run: npm ci

      - name: Install examples/demo dependencies
        run: npm --prefix examples/demo ci

      - name: Build demo release artifact
        run: npm run demo:build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload demo artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: examples/demo/dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Keep the root build entrypoint explicit and unchanged**

Open `package.json` and confirm the scripts block still contains the exact release entrypoint below. If it differs, normalize it back to this exact value and do not add a second Pages-only build script:

```json
{
  "scripts": {
    "build": "node scripts/build-sdk.mjs",
    "demo:build": "npm run build && npm --prefix examples/demo run build",
    "demo:dev": "node scripts/dev-examples-demo.mjs",
    "demo:typecheck": "npm --prefix examples/demo run typecheck"
  }
}
```

- [ ] **Step 3: Re-run the targeted test and confirm only the README assertion remains before Task 3**

Run: `npx vitest run tests/unit/examples-demo-pages-release.test.ts`

Expected: the workflow and `demo:build` assertions PASS; the README assertion still FAILS until Task 3 updates the docs paragraph.

### Task 3: Update README Wording To `examples/demo`

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Rewrite the docs/demo positioning paragraph near the docs section**

Replace the current paragraph at `README.md:169-180` with text that keeps `docs/` as the canonical static reference while naming `examples/demo/` as the current interactive demo source and Pages publish target:

```md
## Docs and next steps

`docs/` is the canonical static reference source. `examples/demo/` is the current interactive demo source and Pages publish target, while the deployed live demo remains the easiest way to try the browser flows end-to-end.

- Browser SDK integration: [docs/integration/browser-sdk.md](docs/integration/browser-sdk.md)
- WebAuthn integration: [docs/integration/webauthn.md](docs/integration/webauthn.md)
- Backend JWT verification: [docs/integration/backend-jwt-verification.md](docs/integration/backend-jwt-verification.md)
- HTTP API reference: [docs/reference/http-api.md](docs/reference/http-api.md)
- CLI and operations: [docs/reference/cli-and-operations.md](docs/reference/cli-and-operations.md)
- Docker + Cloudflared deployment: [docs/deploy/docker-cloudflared.md](docs/deploy/docker-cloudflared.md)
```

- [ ] **Step 2: Re-run the release-contract test after the README edit**

Run: `npx vitest run tests/unit/examples-demo-pages-release.test.ts`

Expected: PASS.

- [ ] **Step 3: Run a focused text scan for stale release-path wording in the edited surfaces**

Run: `rg -n "path: demo|publish the contents of demo/|\[`demo/`\]\(demo/\)" .github/workflows/pages.yml README.md tests/unit/examples-demo-pages-release.test.ts`

Expected: no matches.

### Task 4: Retire The Legacy `demo/` Implementation After A Dependency Audit

**Files:**

- Modify: `tsconfig.json`
- Modify: `eslint.config.js`
- Delete: `demo/bootstrap.js`
- Delete: `demo/content.js`
- Delete: `demo/index.html`
- Delete: `demo/main.js`
- Delete: `demo/setup.d.ts`
- Delete: `demo/setup.js`
- Delete: `demo/style.css`
- Delete: `tests/unit/demo-bootstrap.test.ts`
- Delete: `tests/unit/demo-content.test.ts`
- Delete: `tests/unit/demo-render.test.ts`
- Delete: `tests/unit/demo-setup.test.ts`

- [ ] **Step 1: Prove the remaining `demo/` references are legacy-only and can be removed together**

Run: `rg -n "from '../../demo/|\.\./\.\./demo/|publish the contents of demo/|demo/\*\*|path: demo" tests/unit demo tsconfig.json eslint.config.js .github/workflows/pages.yml README.md`

Expected before deletion:

- the four legacy unit test files import `../../demo/*`
- `demo/content.js` contains the old GitHub Pages text `publish the contents of demo/`
- `tsconfig.json` includes `demo/**/*.js`
- `eslint.config.js` includes `files: ['demo/**/*.js']`
- `.github/workflows/pages.yml` and `README.md` no longer appear in the results because Tasks 2-3 already cleaned them

- [ ] **Step 2: Delete the legacy demo source and its dedicated unit tests in one change**

Delete exactly these files:

```text
demo/bootstrap.js
demo/content.js
demo/index.html
demo/main.js
demo/setup.d.ts
demo/setup.js
demo/style.css
tests/unit/demo-bootstrap.test.ts
tests/unit/demo-content.test.ts
tests/unit/demo-render.test.ts
tests/unit/demo-setup.test.ts
```

- [ ] **Step 3: Remove the now-dead `demo/**/\*.js` hooks from TypeScript and ESLint config\*\*

Update `tsconfig.json` so `include` no longer mentions `demo/**/*.js`:

```json
{
  "include": ["src/**/*.ts", "tests/**/*"],
  "exclude": ["tests/fixtures/**/*"]
}
```

Update `eslint.config.js` by deleting the legacy override block so the file ends with the shared TypeScript config only:

```js
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
);
```

- [ ] **Step 4: Re-run the legacy-reference audit and confirm only historical docs still mention `demo/` as prior context**

Run: `rg -n "from '../../demo/|\.\./\.\./demo/|publish the contents of demo/|demo/\*\*|path: demo" .`

Expected after deletion:

- no matches in runtime code, workflow files, README, tests, or config
- any remaining matches are only in historical spec/plan documents that describe previous decisions

### Task 5: Verify The Final Release Path End To End

**Files:**

- Test: `tests/unit/examples-demo-pages-release.test.ts`
- Test: `tests/unit/examples-demo-dev-script.test.ts`
- Verify build output: `examples/demo/dist`

- [ ] **Step 1: Run the focused regression tests for the release path**

Run: `npx vitest run tests/unit/examples-demo-pages-release.test.ts tests/unit/examples-demo-dev-script.test.ts`

Expected: PASS.

- [ ] **Step 2: Run the demo package typecheck before the final build**

Run: `npm --prefix examples/demo run typecheck`

Expected: PASS.

- [ ] **Step 3: Run the root release build entrypoint and confirm it emits the new artifact directory**

Run: `npm run demo:build`

Expected:

- PASS
- `dist/` is rebuilt for the root package
- `examples/demo/dist` exists and contains the Pages site artifact

- [ ] **Step 4: Confirm the Pages workflow points at the built artifact path**

Run: `rg -n "path: examples/demo/dist|run: npm --prefix examples/demo ci|run: npm run demo:build" .github/workflows/pages.yml`

Expected:

- one match for `run: npm --prefix examples/demo ci`
- one match for `run: npm run demo:build`
- one match for `path: examples/demo/dist`
