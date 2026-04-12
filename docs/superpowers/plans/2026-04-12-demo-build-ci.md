# Demo Build CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a clean `examples/demo` build, then add a dedicated pull-request CI workflow that runs the demo build, typecheck, and test commands without expanding scope beyond the approved spec.

**Architecture:** Treat the current TypeScript failure as the source of truth: reproduce it with the real repo commands after installing both dependency trees, then fix only the broken demo test code that blocks `tsc -p examples/demo/tsconfig.json`. Add one focused GitHub Actions workflow for demo quality gates on `pull_request -> main`, while leaving `.github/workflows/pages.yml` deployment-focused and free of extra demo test/typecheck responsibilities.

**Tech Stack:** npm scripts, TypeScript, React Testing Library, Vitest, GitHub Actions YAML

---

## File Structure

- Create: `.github/workflows/demo-ci.yml`
  - dedicated demo-only PR workflow for `demo:build`, `demo:typecheck`, and `npm --prefix examples/demo test`
- Modify: `examples/demo/src/routes/credentials.test.tsx`
  - minimal TypeScript-safe fix for the currently failing delete-flow tests that reference `user` before declaration

## Known Baseline

- Root build entrypoint: `package.json` defines `demo:build` as `npm run build && npm --prefix examples/demo run build`.
- Demo package build entrypoint: `examples/demo/package.json` defines `build` as `tsc -p tsconfig.json && vite build`.
- Current reproduced failure after installing demo dependencies: `npm run demo:build` fails in `examples/demo/src/routes/credentials.test.tsx` with `TS2304: Cannot find name 'user'` at lines 281 and 333.
- `pages.yml` already installs root + demo dependencies and builds the demo artifact for deployment; this plan keeps it deployment-only and does not add demo test/typecheck work there.

### Task 1: Reproduce The Current Demo Build Failure

**Files:**

- Reference only: `package.json`
- Reference only: `examples/demo/package.json`
- Reference only: `examples/demo/tsconfig.json`
- Reference only: `examples/demo/src/routes/credentials.test.tsx`

- [ ] **Step 1: Install both dependency trees exactly the way CI needs them**

Run from repo root:

```bash
npm ci
npm --prefix examples/demo ci
```

Expected: both installs succeed; `examples/demo/node_modules` now exists so build failures come from source/config, not missing packages.

- [ ] **Step 2: Reproduce the real failing build command from the approved spec**

Run:

```bash
npm run demo:build
```

Expected: FAIL with TypeScript errors in `examples/demo/src/routes/credentials.test.tsx`:

- `src/routes/credentials.test.tsx(281,11): error TS2304: Cannot find name 'user'.`
- `src/routes/credentials.test.tsx(333,11): error TS2304: Cannot find name 'user'.`

- [ ] **Step 3: Confirm the failure also blocks the standalone demo typecheck path**

Run:

```bash
npm run demo:typecheck
```

Expected: FAIL with the same two `TS2304` errors, proving the root cause is in demo TypeScript/test source rather than Vite bundling.

- [ ] **Step 4: Capture the exact broken call sites before editing**

Run:

```bash
rg -n "await user\.click|const user = userEvent\.setup\(" examples/demo/src/routes/credentials.test.tsx
```

Expected: the file shows `await user.click(...)` calls for the passkey-delete and device-delete tests without a local `const user = userEvent.setup();` immediately above them.

### Task 2: Add The Dedicated Demo CI Workflow Before The Fix

**Files:**

- Create: `.github/workflows/demo-ci.yml`
- Reference only: `.github/workflows/pages.yml`

- [ ] **Step 1: Create the demo-only PR workflow that should fail until the source fix lands**

Create `.github/workflows/demo-ci.yml` with this exact content:

```yml
name: Demo CI

on:
  pull_request:
    branches:
      - main

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  demo:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm

      - name: Install root dependencies
        run: npm ci

      - name: Install examples/demo dependencies
        run: npm --prefix examples/demo ci

      - name: Build demo
        run: npm run demo:build

      - name: Typecheck demo
        run: npm run demo:typecheck

      - name: Test demo
        run: npm --prefix examples/demo test
```

- [ ] **Step 2: Verify the new workflow stays within the approved CI boundary**

Run:

```bash
rg -n "pull_request:|node-version:|'24'|npm ci|npm --prefix examples/demo ci|npm run demo:build|npm run demo:typecheck|npm --prefix examples/demo test" .github/workflows/demo-ci.yml
```

Expected: every required trigger/runtime/command appears exactly once in the new file.

- [ ] **Step 3: Confirm Pages remains deployment-focused and untouched by the new CI contract**

Run:

```bash
rg -n "demo:typecheck|npm --prefix examples/demo test|pull_request" .github/workflows/pages.yml .github/workflows/demo-ci.yml
```

Expected:

- `.github/workflows/demo-ci.yml` contains the new `pull_request` trigger plus demo typecheck/test commands.
- `.github/workflows/pages.yml` does **not** contain `pull_request`, `demo:typecheck`, or `npm --prefix examples/demo test`.

- [ ] **Step 4: Commit the failing-check addition before the source fix**

Run:

```bash
git add .github/workflows/demo-ci.yml
git commit -m "test: add dedicated demo CI workflow"
```

Expected: commit succeeds and the branch now contains a check definition that will fail until Task 3 fixes the demo source.

### Task 3: Apply The Minimal Demo Build Fix In `credentials.test.tsx`

**Files:**

- Modify: `examples/demo/src/routes/credentials.test.tsx`

- [ ] **Step 1: Fix the passkey delete test by creating its local user-event controller**

Insert `const user = userEvent.setup();` at the start of the first async delete test so the existing `await user.click(...)` call has a real binding:

```tsx
it('deletes a passkey after confirm and reloads /me from the server', async () => {
  const user = userEvent.setup();
  localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
  sdkMocks.sessionState.current = authenticatedSession({
    webauthn_credentials: [
      {
        id: 'passkey-row-1',
        credential_id: 'passkey-credential-abcdef123456',
        created_at: '2026-04-10T12:00:00.000Z',
      },
    ],
  });

  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  sdkMocks.fetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
  sdkMocks.reloadMe.mockImplementationOnce(async () => {
    sdkMocks.sessionState.current = authenticatedSession({
      webauthn_credentials: [],
    });
    return sdkMocks.sessionState.current.me!;
  });

  render(
    <MemoryRouter initialEntries={['/credentials']}>
      <AppRouter />
    </MemoryRouter>,
  );

  await user.click(
    screen.getByRole('button', {
      name: 'Delete passkey passkey-credential-abcdef123456',
    }),
  );

  expectDeleteConfirmation(confirmSpy, 'passkey');
  expectDeleteRequest(
    sdkMocks.fetch,
    '/webauthn/credentials/passkey-row-1',
    sdkMocks.sessionState.current.accessToken!,
  );
  expect(sdkMocks.reloadMe).toHaveBeenCalledTimes(1);
  expect(
    await screen.findByText('No passkeys are currently bound to this account.'),
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Re-run demo typecheck to prove one failure remains before fixing the second test**

Run:

```bash
npm run demo:typecheck
```

Expected: FAIL with exactly one remaining `TS2304: Cannot find name 'user'` at `src/routes/credentials.test.tsx(333,11)`.

- [ ] **Step 3: Fix the Ed25519 delete test the same way, and do not change unrelated logic**

Insert the same one-line setup at the start of the second async delete test:

```tsx
it('deletes an ed25519 credential after confirm and reloads /me from the server', async () => {
  const user = userEvent.setup();
  localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
  sdkMocks.sessionState.current = authenticatedSession({
    ed25519_credentials: [
      {
        id: 'device-row-1',
        name: 'Build runner',
        public_key: 'MCowBQYDK2VwAyEAlongPublicKeyValueForTesting1234567890=',
        last_used_at: null,
        created_at: '2026-04-09T09:15:00.000Z',
      },
    ],
  });

  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  sdkMocks.fetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
  sdkMocks.reloadMe.mockImplementationOnce(async () => {
    sdkMocks.sessionState.current = authenticatedSession({
      ed25519_credentials: [],
    });
    return sdkMocks.sessionState.current.me!;
  });

  render(
    <MemoryRouter initialEntries={['/credentials']}>
      <AppRouter />
    </MemoryRouter>,
  );

  await user.click(
    screen.getByRole('button', { name: 'Delete device key Build runner' }),
  );

  expectDeleteConfirmation(confirmSpy, 'Ed25519');
  expectDeleteRequest(
    sdkMocks.fetch,
    '/ed25519/credentials/device-row-1',
    sdkMocks.sessionState.current.accessToken!,
  );
  expect(sdkMocks.reloadMe).toHaveBeenCalledTimes(1);
  expect(
    await screen.findByText(
      'No Ed25519 credentials are currently bound to this account.',
    ),
  ).toBeInTheDocument();
});
```

- [ ] **Step 4: Re-run the exact build and typecheck commands from the spec**

Run:

```bash
npm run demo:build
npm run demo:typecheck
```

Expected: both commands PASS.

- [ ] **Step 5: Commit only the minimal source fix**

Run:

```bash
git add examples/demo/src/routes/credentials.test.tsx
git commit -m "fix: restore demo build by defining test user setup"
```

Expected: commit succeeds with exactly one demo test file changed.

### Task 4: Verify The Full Demo CI Command Set Locally

**Files:**

- Reference only: `.github/workflows/demo-ci.yml`
- Reference only: `examples/demo/src/routes/credentials.test.tsx`

- [ ] **Step 1: Run the dedicated demo test command exactly as CI will run it**

Run:

```bash
npm --prefix examples/demo test
```

Expected: PASS.

- [ ] **Step 2: Run the full local CI sequence in the same order as the workflow**

Run:

```bash
npm ci
npm --prefix examples/demo ci
npm run demo:build
npm run demo:typecheck
npm --prefix examples/demo test
```

Expected: every command PASS in sequence.

- [ ] **Step 3: Confirm the final diff stayed minimal and inside spec scope**

Run:

```bash
git diff origin/main...HEAD -- .github/workflows/demo-ci.yml examples/demo/src/routes/credentials.test.tsx .github/workflows/pages.yml
```

Expected:

- diff shows the new `.github/workflows/demo-ci.yml`
- diff shows only the two `const user = userEvent.setup();` insertions in `credentials.test.tsx`
- no diff appears for `.github/workflows/pages.yml`

- [ ] **Step 4: Confirm the worktree is clean after the two planned commits and verification reruns**

Run:

```bash
git status --short
```

Expected: no output; the branch is clean and ready for the required later `git rebase origin/main`, push, and PR steps outside this plan.
