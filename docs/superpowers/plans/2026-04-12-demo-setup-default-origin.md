# Demo Setup Default Origin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `examples/demo` default to the public hosted auth origin when no hash or stored override exists, and update the Setup page so it clearly documents optional self-hosted setup with the new minimal command list.

**Architecture:** Keep the existing config precedence (`hash auth-origin` > stored auth origin > built-in fallback) by introducing one explicit hosted default in the demo config layer instead of scattering fallback logic through routes. Then rewrite Setup route copy and command rendering around the self-hosted-only path while keeping the editable auth origin input and current-origin visibility. Finally, update focused demo tests that currently encode the old “missing origin blocks the app” behavior so the new default-ready state and command list remain stable.

**Tech Stack:** React 19, React Router 7, TypeScript, Testing Library, Vitest, Vite

---

## File Map

- Modify: `examples/demo/src/lib/demo-config.ts` - add the hosted default origin fallback while preserving hash/storage precedence.
- Modify: `examples/demo/src/lib/demo-config.test.ts` - replace old waiting-state expectations with hosted-default expectations and keep invalid-origin coverage.
- Modify: `examples/demo/src/routes/setup.tsx` - update Setup heading/description/copy and render the new self-hosted command sequence.
- Modify: `examples/demo/src/routes/setup.test.tsx` - assert the new command list and the removal of demo-dev / `--host` / `--port` output.
- Modify: `examples/demo/src/routes/router.test.tsx` - update the Setup route integration assertions to the new copy and default command values.
- Modify: `examples/demo/src/app/providers/demo-provider.test.tsx` - replace the old “missing origin disables app” expectation with default hosted-origin readiness.
- Modify: `examples/demo/src/routes/email.test.tsx` - remove the test that assumes no configured origin disables the page, or rewrite it to confirm the page is usable under the default hosted origin.
- Modify: `examples/demo/src/routes/session.test.tsx` - update clear-state expectations so clearing local overrides falls back to the hosted default instead of a blocking waiting state.
- Read only: `README.md` - copy the SMTP example structure exactly when rewriting Setup commands.

## Task 1: Default demo config to the hosted auth origin

**Files:**

- Modify: `examples/demo/src/lib/demo-config.test.ts`
- Modify: `examples/demo/src/lib/demo-config.ts`
- Modify: `examples/demo/src/app/providers/demo-provider.test.tsx`

- [ ] **Step 1: Write the failing config tests**

In `examples/demo/src/lib/demo-config.test.ts`, replace the current “returns waiting status when no auth origin is present” case with a hosted-default case:

```ts
expect(
  getInitialDemoConfig({
    hash: '#/',
    search: '',
    storageOrigin: '',
    pageOrigin: 'https://demo.example.com',
  }),
).toEqual({
  authOrigin: 'https://auth.zccz14.com',
  configError: '',
  pageOrigin: 'https://demo.example.com',
  status: 'ready',
});
```

Keep the precedence tests, and add one more assertion that a stored origin still wins when hash is absent:

```ts
expect(
  getInitialDemoConfig({
    hash: '#/setup',
    search: '',
    storageOrigin: 'https://self-hosted.example.com',
    pageOrigin: 'https://demo.example.com',
  }),
).toMatchObject({
  authOrigin: 'https://self-hosted.example.com',
  status: 'ready',
});
```

In `examples/demo/src/app/providers/demo-provider.test.tsx`, replace the old “keeps the app disabled when auth origin is missing” assertion with:

```ts
expect(screen.getByTestId('config-status')).toHaveTextContent('ready');
expect(sdkMocks.createBrowserSdk).toHaveBeenCalledWith(
  'https://auth.zccz14.com',
);
```

- [ ] **Step 2: Run targeted config tests to verify failure**

Run: `npm --prefix examples/demo run test -- src/lib/demo-config.test.ts src/app/providers/demo-provider.test.tsx`

Expected: FAIL because the config layer still returns `waiting` with an empty auth origin.

- [ ] **Step 3: Implement the minimal config fallback**

In `examples/demo/src/lib/demo-config.ts`, introduce a single constant and only use it after the existing hash/storage precedence resolves to empty:

```ts
const DEFAULT_AUTH_ORIGIN = 'https://auth.zccz14.com';

export function getInitialDemoConfig(...) {
  const hashOrigin = readHashAuthOrigin(hash);
  const candidateOrigin = hashOrigin || storageOrigin || DEFAULT_AUTH_ORIGIN;
  const configState = parseConfiguredOrigin(candidateOrigin);
  ...
}
```

Do not change invalid-hash behavior: an invalid hash value must still block even if storage or the default hosted origin would otherwise be usable.

- [ ] **Step 4: Run targeted config tests to verify pass**

Run: `npm --prefix examples/demo run test -- src/lib/demo-config.test.ts src/app/providers/demo-provider.test.tsx`

Expected: PASS.

## Task 2: Rewrite Setup page copy and command rendering for the self-hosted path

**Files:**

- Modify: `examples/demo/src/routes/setup.test.tsx`
- Modify: `examples/demo/src/routes/router.test.tsx`
- Modify: `examples/demo/src/routes/setup.tsx`
- Read only: `README.md:111-128`

- [ ] **Step 1: Write the failing Setup route tests**

In `examples/demo/src/routes/setup.test.tsx`, replace the demo-dev-port assertion with a command-list contract test that renders `/setup` and checks all of the new requirements:

```ts
expect(
  screen.getByText(
    "npx auth-mini smtp add ./auth-mini.sqlite  --from-email 'sample@your-domain.com' --from-name 'sample-name' --host 'smtp.sample.com' --port 465 --secure --username 'sample@your-domain.com' --password '<smtp-password>'",
  ),
).toBeInTheDocument();
expect(
  screen.getByText(
    'npx auth-mini origin add ./auth-mini.sqlite --value https://demo.example.com',
  ),
).toBeInTheDocument();
expect(
  screen.getByText(
    'npx auth-mini start ./auth-mini.sqlite --issuer https://auth.zccz14.com',
  ),
).toBeInTheDocument();
expect(
  screen.queryByText(/npm --prefix examples\/demo run dev/i),
).not.toBeInTheDocument();
expect(screen.queryByText(/--host\s/)).not.toBeInTheDocument();
expect(screen.queryByText(/--port\s/)).not.toBeInTheDocument();
```

In `examples/demo/src/routes/router.test.tsx`, update the route-level assertions to expect self-hosted-oriented copy, for example:

```ts
expect(
  screen.getByText(/only need this page when you want to self-host/i),
).toBeInTheDocument();
expect(
  screen.getByText(/official demo backend already works by default/i),
).toBeInTheDocument();
```

- [ ] **Step 2: Run Setup route tests to verify failure**

Run: `npm --prefix examples/demo run test -- src/routes/setup.test.tsx src/routes/router.test.tsx`

Expected: FAIL because Setup still renders the old “configure before flows” copy plus demo-dev / `--host` / `--port` commands.

- [ ] **Step 3: Implement the new Setup copy and commands**

In `examples/demo/src/routes/setup.tsx`:

1. Change the card title/description and helper copy so the page says Setup is only needed for self-hosting `auth-mini`, and the official demo backend already works without extra setup.
2. Keep the editable auth origin input and the displayed `Page origin` / current auth origin context.
3. Replace `getStartupCommands()` with a focused self-hosted command builder that returns exactly four entries in this order:

```ts
return [
  `npx auth-mini init ${INSTANCE_PATH}`,
  "npx auth-mini smtp add ./auth-mini.sqlite  --from-email 'sample@your-domain.com' --from-name 'sample-name' --host 'smtp.sample.com' --port 465 --secure --username 'sample@your-domain.com' --password '<smtp-password>'",
  `npx auth-mini origin add ${INSTANCE_PATH} --value ${pageUrl.origin}`,
  `npx auth-mini start ${INSTANCE_PATH} --issuer ${authUrl.origin}`,
];
```

Keep the auth-origin URL parsing fallback defensive, but the rendered start command must never include `--host` or `--port`, and the list must never include a demo dev command.

- [ ] **Step 4: Run Setup route tests to verify pass**

Run: `npm --prefix examples/demo run test -- src/routes/setup.test.tsx src/routes/router.test.tsx`

Expected: PASS.

## Task 3: Update downstream demo tests that still encode the old waiting-state semantics

**Files:**

- Modify: `examples/demo/src/routes/email.test.tsx`
- Modify: `examples/demo/src/routes/session.test.tsx`

- [ ] **Step 1: Rewrite the stale behavior tests**

In `examples/demo/src/routes/email.test.tsx`, replace the disabled-without-config test with a default-hosted-origin behavior test, e.g.:

```ts
render(
  <MemoryRouter initialEntries={['/email']}>
    <AppRouter />
  </MemoryRouter>,
);

expect(sdkMocks.createBrowserSdk).toHaveBeenCalledWith(
  'https://auth.zccz14.com',
);
expect(
  screen.getByRole('button', { name: 'Start email sign-in' }),
).toBeDisabled();
```

The button should still be disabled on first render because the email input is empty, not because setup is missing.

In `examples/demo/src/routes/session.test.tsx`, rename and rewrite the clear-state test so clearing local overrides falls back to the hosted default:

```ts
expect(localStorage.getItem(AUTH_ORIGIN_KEY)).toBe('https://auth.zccz14.com');
expect(sdkMocks.createBrowserSdk).toHaveBeenLastCalledWith(
  'https://auth.zccz14.com',
);
expect(
  screen.queryByText(/must be configured before interactive flows/i),
).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the stale-behavior tests to verify failure**

Run: `npm --prefix examples/demo run test -- src/routes/email.test.tsx src/routes/session.test.tsx`

Expected: FAIL because the suite still expects waiting-state behavior after clearing or when no local override exists.

- [ ] **Step 3: Apply the minimal test-only updates**

Do not widen feature scope here. Only update assertions whose old meaning was “the demo is unusable until setup is completed.” Keep the existing anonymous-session and authenticated-session coverage intact.

- [ ] **Step 4: Run the stale-behavior tests to verify pass**

Run: `npm --prefix examples/demo run test -- src/routes/email.test.tsx src/routes/session.test.tsx`

Expected: PASS.

## Task 4: Final verification for the demo Setup change

**Files:**

- Test only: `examples/demo/src/lib/demo-config.test.ts`
- Test only: `examples/demo/src/app/providers/demo-provider.test.tsx`
- Test only: `examples/demo/src/routes/setup.test.tsx`
- Test only: `examples/demo/src/routes/router.test.tsx`
- Test only: `examples/demo/src/routes/email.test.tsx`
- Test only: `examples/demo/src/routes/session.test.tsx`

- [ ] **Step 1: Run the focused demo test batch**

Run: `npm --prefix examples/demo run test -- src/lib/demo-config.test.ts src/app/providers/demo-provider.test.tsx src/routes/setup.test.tsx src/routes/router.test.tsx src/routes/email.test.tsx src/routes/session.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run the full demo test suite**

Run: `npm --prefix examples/demo run test`

Expected: PASS.

- [ ] **Step 3: Run demo typecheck**

Run: `npm --prefix examples/demo run typecheck`

Expected: PASS.

## Self-Review Coverage Notes

- Spec requirement 1 (default auth origin fallback) is covered by Task 1.
- Spec requirement 2 (Setup page semantics) is covered by Task 2.
- Spec requirement 3 (Setup command list constraints) is covered by Task 2.
- Spec test requirements and stale waiting-state assertions are covered by Tasks 1, 3, and 4.
