# Singleton Browser SDK Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a server-hosted singleton browser SDK at `GET /sdk/singleton-iife.js` that exposes `window.MiniAuth`, infers its base path from the script URL, persists session state in `localStorage`, auto-recovers on boot, proactively refreshes tokens, and wraps the existing email/WebAuthn flows.

**Architecture:** Keep the server API shape intact and add one SDK-serving route plus a small browser-only SDK bundle generated from TypeScript source. Split the SDK into focused modules for base-path inference, storage/state, HTTP transport, session recovery/refresh, and WebAuthn conversions so unit tests can cover browser behavior without needing a real browser runner.

**Tech Stack:** TypeScript, Hono, Vitest, existing mini-auth HTTP routes, browser APIs (`document.currentScript`, `localStorage`, `navigator.credentials`)

---

## Chunk 1: File structure and serving strategy

### Planned file map

**Create:**

- `tests/helpers/sdk.ts` - SDK unit-test harness, fake storage, fake fetch responses, browser stubs
- `src/sdk/singleton-entry.ts` - browser entrypoint that builds `window.MiniAuth`
- `src/sdk/errors.ts` - explicit SDK error types / error factories
- `src/sdk/base-url.ts` - script URL detection and base-path inference
- `src/sdk/storage.ts` - `localStorage` persistence and serialization helpers
- `src/sdk/state.ts` - in-memory singleton state, subscriptions, status transitions
- `src/sdk/http.ts` - fetch wrapper, server JSON parsing, bearer auth helper
- `src/sdk/session.ts` - boot recovery, proactive refresh, logout, `/me` sync, single-flight refresh
- `src/sdk/email.ts` - email start/verify wrappers
- `src/sdk/webauthn.ts` - WebAuthn option conversion, browser credential calls, serialization
- `src/sdk/types.ts` - public SDK types and shared payload types
- `src/sdk/build-singleton-iife.ts` - build-time script wrapper that turns compiled SDK code into one IIFE string for server delivery
- `tests/unit/sdk-base-url.test.ts`
- `tests/unit/sdk-state.test.ts`
- `tests/unit/sdk-session.test.ts`
- `tests/unit/sdk-webauthn.test.ts`
- `tests/integration/sdk-endpoint.test.ts`
- `tests/integration/sdk-login-contract.test.ts`

**Modify:**

- `src/server/app.ts` - add `GET /sdk/singleton-iife.js`
- `package.json` - add build/test glue for the SDK asset if needed
- `tsconfig.build.json` - include any SDK build-time helper needed for emitting the served asset
- `vitest.config.ts` - keep Node test environment, plus any setup needed for browser API stubs if required
- `README.md` - document the singleton SDK flow
- `demo/main.js` - optionally switch the demo to consume `window.MiniAuth` instead of duplicating client logic once the SDK exists

**Notes:**

- Keep the runtime server route simple: it should return a prebuilt JS string or a lazily loaded generated artifact, not assemble the SDK from fragments on every request.
- Concretely, use a two-step build:
  - `tsc -p tsconfig.build.json`
  - `node dist/sdk/build-singleton-iife.js`
- `build-singleton-iife.js` should read the compiled module graph rooted at `dist/sdk/singleton-entry.js` and emit one served asset at `dist/sdk/singleton-iife.js`.
- During tests, do not depend on a prebuilt `dist/sdk/singleton-iife.js`; instead, keep a small source-side asset factory that the route can call directly in test/runtime, and use the build helper only to emit the production artifact for `npm run build`.
- Do not introduce a published npm package in this plan; the HTTP endpoint is the product contract.
- Keep browser globals isolated to `src/sdk/**` so the rest of the codebase stays Node-oriented.

## Chunk 2: Implementation tasks

### Task 1: Add SDK route contract coverage first

**Files:**

- Modify: `src/server/app.ts`
- Test: `tests/integration/sdk-endpoint.test.ts`

- [ ] **Step 1: Write the failing endpoint test**

```ts
it('serves the singleton SDK as javascript', async () => {
  const testApp = await createTestApp();

  const response = await testApp.app.request('/sdk/singleton-iife.js');

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain(
    'application/javascript',
  );
  expect(await response.text()).toContain('window.MiniAuth');
});

it('documents same-origin deployment constraints in the served source comments or literals', async () => {
  const testApp = await createTestApp();
  const response = await testApp.app.request('/sdk/singleton-iife.js');
  expect(await response.text()).toContain('same-origin');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/sdk-endpoint.test.ts`
Expected: FAIL with 404 or missing SDK route.

- [ ] **Step 3: Add the minimal route and placeholder asset response**

```ts
app.get('/sdk/singleton-iife.js', (c) => {
  return c.body('window.MiniAuth={};', 200, {
    'content-type': 'application/javascript; charset=utf-8',
    'cache-control': 'no-cache',
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/integration/sdk-endpoint.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/sdk-endpoint.test.ts src/server/app.ts
git commit -m "test: pin singleton sdk route contract"
```

- [ ] **Step 5a: Add a deployment-topology documentation assertion**

Run: `npm test -- tests/integration/sdk-endpoint.test.ts`
Expected: PASS with the SDK source or endpoint-adjacent contract making the same-origin limitation discoverable and testable.

### Task 2: Add base-path inference and bootstrap failure behavior

**Files:**

- Create: `src/sdk/base-url.ts`
- Create: `src/sdk/errors.ts`
- Create: `src/sdk/singleton-entry.ts`
- Create: `tests/unit/sdk-base-url.test.ts`

- [ ] **Step 1: Write failing tests for script URL inference**

```ts
it('infers origin base path from /sdk/singleton-iife.js', () => {
  expect(inferBaseUrl('https://auth.example.com/sdk/singleton-iife.js')).toBe(
    'https://auth.example.com',
  );
});

it('preserves same-origin proxy prefixes', () => {
  expect(
    inferBaseUrl('https://app.example.com/api/sdk/singleton-iife.js'),
  ).toBe('https://app.example.com/api');
});

it('throws when the script path does not end with /sdk/singleton-iife.js', () => {
  expect(() => inferBaseUrl('https://app.example.com/app.js')).toThrow(
    'sdk_init_failed',
  );
});

it('fails bootstrap clearly when the current script URL cannot be determined', () => {
  expect(() => bootstrapSingletonSdk({ currentScript: null })).toThrow(
    'sdk_init_failed',
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/sdk-base-url.test.ts`
Expected: FAIL because `inferBaseUrl` does not exist.

- [ ] **Step 3: Implement minimal inference and explicit init errors**

```ts
export function inferBaseUrl(scriptUrl: string): string {
  const url = new URL(scriptUrl);
  if (!url.pathname.endsWith('/sdk/singleton-iife.js')) {
    throw createSdkError('sdk_init_failed', 'Cannot infer SDK base URL');
  }
  url.pathname = url.pathname.slice(0, -'/sdk/singleton-iife.js'.length) || '/';
  return `${url.origin}${url.pathname === '/' ? '' : url.pathname}`;
}
```

- [ ] **Step 3a: Add a minimal bootstrap scaffold for later tasks**

```ts
export function bootstrapSingletonSdk(input: {
  currentScript: HTMLScriptElement | null;
}) {
  if (!input.currentScript?.src) {
    throw createSdkError('sdk_init_failed', 'Cannot determine SDK script URL');
  }
}

export function createSingletonSdk() {
  return {
    email: {},
    webauthn: {},
    me: {},
    session: {},
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/sdk-base-url.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/sdk-base-url.test.ts src/sdk/base-url.ts src/sdk/errors.ts src/sdk/singleton-entry.ts
git commit -m "feat: add singleton sdk base url inference"
```

### Task 3: Build the singleton state and storage model

**Files:**

- Create: `src/sdk/types.ts`
- Create: `src/sdk/storage.ts`
- Create: `src/sdk/state.ts`
- Create: `tests/helpers/sdk.ts`
- Create: `tests/unit/sdk-state.test.ts`

- [ ] **Step 1: Write failing tests for state persistence and transitions**

```ts
it('hydrates anonymous state when storage is empty', () => {
  const sdk = createStateStore(fakeStorage());
  expect(sdk.getState().status).toBe('anonymous');
  expect(sdk.getState().me).toBeNull();
});

it('hydrates recovering state when a refresh token exists', () => {
  const sdk = createStateStore(
    fakeStorage({ refreshToken: 'rt', expiresAt: '2026-04-03T00:00:00.000Z' }),
  );
  expect(sdk.getState().status).toBe('recovering');
});

it('notifies subscribers on transition', () => {
  const sdk = createStateStore(fakeStorage());
  const listener = vi.fn();
  sdk.onChange(listener);
  sdk.setAuthenticated({
    accessToken: 'a',
    refreshToken: 'r',
    expiresAt: 'x',
    me: {
      user_id: 'u',
      email: 'u@example.com',
      webauthn_credentials: [],
      active_sessions: [],
    },
  });
  expect(listener).toHaveBeenCalled();
});

it('returns an unsubscribe function from onChange', () => {
  const sdk = createStateStore(fakeStorage());
  const listener = vi.fn();
  const unsubscribe = sdk.onChange(listener);
  unsubscribe();
  sdk.setAnonymous();
  expect(listener).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/sdk-state.test.ts`
Expected: FAIL because the state/storage modules do not exist.

- [ ] **Step 3: Implement the minimal storage and state store**

```ts
type SessionSnapshot = {
  status: 'recovering' | 'authenticated' | 'anonymous';
  authenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  me: MeResponse | null;
};
```

- [ ] **Step 3a: Add explicit shared SDK test helpers**

Create `tests/helpers/sdk.ts` with the helpers used later in the plan:

```ts
export function fakeStorage(seed?: Partial<PersistedSdkState>) {}
export function jsonResponse(body: unknown, status = 200) {}
export function createMiniAuthForTest(options?: TestSdkOptions) {}
export function fakeAuthenticatedStorage() {}
export function fakeAuthenticatedStorageWithMe() {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/sdk-state.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/sdk-state.test.ts tests/helpers/sdk.ts src/sdk/types.ts src/sdk/storage.ts src/sdk/state.ts
git commit -m "feat: add singleton sdk session state store"
```

### Task 4: Add HTTP transport and login `/me` contract

**Files:**

- Create: `src/sdk/http.ts`
- Create: `src/sdk/email.ts`
- Create: `src/sdk/session.ts`
- Create: `tests/integration/sdk-login-contract.test.ts`
- Modify: `tests/helpers/sdk.ts`

- [ ] **Step 1: Write failing tests for login completion semantics**

```ts
it('email.verify resolves only after /me is loaded', async () => {
  const sdk = createMiniAuthForTest({
    fetch: vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'a',
          refresh_token: 'r',
          expires_in: 900,
          token_type: 'Bearer',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          user_id: 'u1',
          email: 'u@example.com',
          webauthn_credentials: [],
          active_sessions: [],
        }),
      ),
  });

  const result = await sdk.email.verify({
    email: 'u@example.com',
    code: '123456',
  });

  expect(result.me.email).toBe('u@example.com');
  expect(sdk.me.get()?.email).toBe('u@example.com');
  expect(sdk.session.getState().expiresAt).toBe('2026-04-03T00:15:00.000Z');
});

it('email.verify rolls back auth state when /me fails', async () => {
  const sdk = createMiniAuthForTest({
    fetch: vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'a',
          refresh_token: 'r',
          expires_in: 900,
          token_type: 'Bearer',
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: 'internal_error' }, 500)),
  });

  await expect(
    sdk.email.verify({ email: 'u@example.com', code: '123456' }),
  ).rejects.toThrow();
  expect(sdk.session.getState().status).toBe('anonymous');
});

it('preserves server error payloads from failed JSON responses', async () => {
  const sdk = createMiniAuthForTest({
    fetch: vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'invalid_email_otp' }, 401)),
  });

  await expect(
    sdk.email.verify({ email: 'u@example.com', code: '000000' }),
  ).rejects.toMatchObject({ error: 'invalid_email_otp' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/sdk-login-contract.test.ts`
Expected: FAIL because the login wrapper and `/me` rollback logic do not exist.

- [ ] **Step 3: Implement fetch wrapper, token persistence, `/me` reload, and rollback-on-failure**

```ts
const session = normalizeSessionPayload(await post('/email/verify', body));
state.setSession(session);
try {
  const me = await reloadMe();
  state.setAuthenticated({ ...session, me });
  return { ...session, me };
} catch (error) {
  state.clear();
  throw error;
}
```

Use a fixed clock seam in `tests/helpers/sdk.ts` so `expiresAt` can be asserted exactly from `receivedAt + expires_in`.

- [ ] **Step 3a: Make the test/public API boundary explicit**

Add an internal constructor in `src/sdk/singleton-entry.ts` for tests, for example:

```ts
export function createMiniAuthInternal(deps: InternalSdkDeps): MiniAuthApi {}
```

Rules:

- `window.MiniAuth` remains the only public browser surface.
- `createMiniAuthInternal(...)` is an internal/test seam imported only by `tests/helpers/sdk.ts`.
- Do not document `ready` or internal constructors in `README.md`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/integration/sdk-login-contract.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/sdk-login-contract.test.ts tests/helpers/sdk.ts src/sdk/http.ts src/sdk/email.ts src/sdk/session.ts src/sdk/singleton-entry.ts
git commit -m "feat: enforce sdk login me readiness contract"
```

### Task 5: Implement boot recovery, proactive refresh, and single-flight refresh

**Files:**

- Create: `src/sdk/session.ts`
- Modify: `src/sdk/http.ts`
- Test: `tests/unit/sdk-session.test.ts`
- Modify: `tests/helpers/sdk.ts`

- [ ] **Step 1: Write failing tests for boot recovery and refresh deduplication**

```ts
it('starts in recovering and settles authenticated after boot recovery', async () => {
  const sdk = createMiniAuthForTest({
    storage: fakeStorage({
      refreshToken: 'rt',
      expiresAt: '2026-04-03T00:00:00.000Z',
    }),
    fetch: vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'a2',
          refresh_token: 'r2',
          expires_in: 900,
          token_type: 'Bearer',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          user_id: 'u1',
          email: 'u@example.com',
          webauthn_credentials: [],
          active_sessions: [],
        }),
      ),
  });

  expect(sdk.session.getState().status).toBe('recovering');
  await sdk.ready;
  expect(sdk.session.getState().status).toBe('authenticated');
});

it('shares one in-flight refresh across concurrent authenticated calls', async () => {
  const fetch = vi.fn();
  const sdk = createMiniAuthForTest({
    fetch,
    storage: fakeAuthenticatedStorage(),
  });
  await Promise.all([sdk.me.reload(), sdk.me.reload()]);
  expect(countRefreshCalls(fetch)).toBe(1);
});

it('refresh success also reloads me', async () => {
  const sdk = createMiniAuthForTest({
    storage: fakeAuthenticatedStorage(),
    fetch: refreshThenMeFetch(),
  });
  await sdk.session.refresh();
  expect(sdk.me.get()?.email).toBe('u@example.com');
});

it('me.reload fetches and updates cached me', async () => {
  const sdk = createMiniAuthForTest({
    storage: fakeAuthenticatedStorageWithMe(),
    fetch: changedMeFetch(),
  });
  const me = await sdk.me.reload();
  expect(me.email).toBe('updated@example.com');
  expect(sdk.me.get()?.email).toBe('updated@example.com');
});

it('clears state when refresh succeeds but me reload fails', async () => {
  const sdk = createMiniAuthForTest({
    storage: fakeAuthenticatedStorage(),
    fetch: refreshThenFailMeFetch(),
  });
  await expect(sdk.session.refresh()).rejects.toThrow();
  expect(sdk.session.getState().status).toBe('anonymous');
});

it('clears state and emits anonymous when refresh token is rejected', async () => {
  const sdk = createMiniAuthForTest({
    storage: fakeAuthenticatedStorage(),
    fetch: rejectedRefreshFetch(),
  });
  const listener = vi.fn();
  sdk.session.onChange(listener);
  await expect(sdk.session.refresh()).rejects.toThrow();
  expect(sdk.session.getState().status).toBe('anonymous');
  expect(listener).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'anonymous' }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/sdk-session.test.ts`
Expected: FAIL because recovery state and single-flight refresh do not exist.

- [ ] **Step 3: Implement recovery lifecycle and proactive refresh threshold**

```ts
function shouldRefresh(
  now: number,
  expiresAt: number,
  issuedAt: number,
): boolean {
  const lifetimeMs = expiresAt - issuedAt;
  const thresholdMs = lifetimeMs < 10 * 60_000 ? lifetimeMs / 2 : 5 * 60_000;
  return now >= expiresAt - thresholdMs;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/sdk-session.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/sdk-session.test.ts tests/helpers/sdk.ts src/sdk/session.ts src/sdk/http.ts
git commit -m "feat: add sdk recovery and proactive refresh"
```

### Task 6: Add logout semantics and `me` APIs

**Files:**

- Modify: `src/sdk/session.ts`
- Modify: `src/sdk/singleton-entry.ts`
- Test: `tests/unit/sdk-session.test.ts`
- Modify: `tests/helpers/sdk.ts`

- [ ] **Step 1: Write failing tests for logout and cached `me` behavior**

```ts
it('me.get returns cached state synchronously', () => {
  const sdk = createMiniAuthForTest({
    storage: fakeAuthenticatedStorageWithMe(),
  });
  expect(sdk.me.get()?.email).toBe('u@example.com');
});

it('logout clears local state even when remote logout fails', async () => {
  const sdk = createMiniAuthForTest({
    storage: fakeAuthenticatedStorage(),
    fetch: vi.fn().mockRejectedValueOnce(new Error('network down')),
  });
  await expect(sdk.session.logout()).resolves.toBeUndefined();
  expect(sdk.session.getState().status).toBe('anonymous');
});

it('logout refreshes first when access token is near expiry', async () => {
  const fetch = vi.fn();
  const sdk = createMiniAuthForTest({
    storage: fakeAlmostExpiredStorage(),
    fetch,
  });
  await sdk.session.logout();
  expect(countRefreshCalls(fetch)).toBe(1);
  expect(countLogoutCalls(fetch)).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/sdk-session.test.ts`
Expected: FAIL because logout and `me.get()` contract are incomplete.

- [ ] **Step 3: Implement `me.get()`, `me.reload()`, and deterministic local logout**

```ts
async function logout(): Promise<void> {
  try {
    await ensureAccessTokenIfPossible();
    await post('/session/logout', undefined, withBearer());
  } finally {
    state.clear();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/sdk-session.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/sdk-session.test.ts tests/helpers/sdk.ts src/sdk/session.ts src/sdk/singleton-entry.ts
git commit -m "feat: add sdk me api and deterministic logout"
```

### Task 7: Implement WebAuthn browser wrappers

**Files:**

- Create: `src/sdk/webauthn.ts`
- Modify: `src/sdk/singleton-entry.ts`
- Test: `tests/unit/sdk-webauthn.test.ts`
- Modify: `tests/helpers/sdk.ts`

- [ ] **Step 1: Write failing tests for WebAuthn support, cancellation, and serialization**

```ts
it('throws a dedicated error when WebAuthn is unavailable', async () => {
  const sdk = createMiniAuthForTest({ publicKeyCredential: undefined });
  await expect(sdk.webauthn.authenticate()).rejects.toThrow(
    'webauthn_unsupported',
  );
});

it('throws a dedicated error when the user cancels WebAuthn', async () => {
  const sdk = createMiniAuthForTest({
    navigatorCredentials: cancelledNavigatorCredentials(),
  });
  await expect(sdk.webauthn.authenticate()).rejects.toThrow(
    'webauthn_cancelled',
  );
});

it('serializes browser credentials and verifies them through the API', async () => {
  const sdk = createMiniAuthForTest({
    navigatorCredentials: fakeNavigatorCredentials(),
  });
  await sdk.webauthn.authenticate();
  expect(lastVerifyRequestBody()).toMatchObject({
    request_id: expect.any(String),
    credential: expect.any(Object),
  });
});

it('webauthn.authenticate rolls back local auth state when follow-up me load fails', async () => {
  const sdk = createMiniAuthForTest({
    navigatorCredentials: fakeNavigatorCredentials(),
    fetch: webauthnLoginThenFailMeFetch(),
  });
  await expect(sdk.webauthn.authenticate()).rejects.toThrow();
  expect(sdk.session.getState().status).toBe('anonymous');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/sdk-webauthn.test.ts`
Expected: FAIL because browser wrappers do not exist.

- [ ] **Step 3: Implement option conversion and credential serialization**

```ts
const credential = await navigator.credentials.get({
  publicKey: decodeAuthenticationOptions(options.publicKey),
});
if (!credential)
  throw createSdkError('webauthn_cancelled', 'Authentication cancelled');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/sdk-webauthn.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/sdk-webauthn.test.ts tests/helpers/sdk.ts src/sdk/webauthn.ts src/sdk/singleton-entry.ts
git commit -m "feat: add singleton sdk webauthn wrappers"
```

### Task 7b: Implement `webauthn.register()` using the same browser conversion layer

**Files:**

- Modify: `src/sdk/webauthn.ts`
- Modify: `src/sdk/singleton-entry.ts`
- Test: `tests/unit/sdk-webauthn.test.ts`
- Modify: `tests/helpers/sdk.ts`

- [ ] **Step 1: Write failing tests for authenticated registration flow**

```ts
it('webauthn.register requires an authenticated session', async () => {
  const sdk = createMiniAuthForTest();
  await expect(sdk.webauthn.register()).rejects.toThrow('missing_session');
});

it('webauthn.register throws a dedicated error when WebAuthn is unavailable', async () => {
  const sdk = createMiniAuthForTest({
    storage: fakeAuthenticatedStorageWithMe(),
    publicKeyCredential: undefined,
  });
  await expect(sdk.webauthn.register()).rejects.toThrow('webauthn_unsupported');
});

it('webauthn.register fetches options, creates a credential, and verifies it', async () => {
  const sdk = createMiniAuthForTest({
    storage: fakeAuthenticatedStorageWithMe(),
    navigatorCredentials: fakeNavigatorCredentials(),
  });
  await sdk.webauthn.register();
  expect(lastVerifyRequestBody()).toMatchObject({
    request_id: expect.any(String),
    credential: expect.any(Object),
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/sdk-webauthn.test.ts`
Expected: FAIL because `webauthn.register()` is not implemented.

- [ ] **Step 3: Implement authenticated registration flow**

```ts
await ensureAuthenticatedSession();
const options = await post('/webauthn/register/options');
const credential = await navigator.credentials.create({
  publicKey: decodeRegistrationOptions(options.publicKey),
});
return await post('/webauthn/register/verify', {
  request_id: options.request_id,
  credential: serializeCredential(credential),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/sdk-webauthn.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/sdk-webauthn.test.ts tests/helpers/sdk.ts src/sdk/webauthn.ts src/sdk/singleton-entry.ts
git commit -m "feat: add singleton sdk webauthn registration"
```

### Task 8: Emit the real IIFE asset and wire the server route to it

**Files:**

- Create: `src/sdk/singleton-entry.ts`
- Create: `src/sdk/build-singleton-iife.ts`
- Modify: `package.json`
- Modify: `tsconfig.build.json`
- Modify: `src/server/app.ts`
- Test: `tests/integration/sdk-endpoint.test.ts`

- [ ] **Step 1: Write failing integration assertions for the real bootstrap contract**

```ts
it('serves a script that bootstraps window.MiniAuth and uses no-cache headers', async () => {
  const testApp = await createTestApp();
  const response = await testApp.app.request('/sdk/singleton-iife.js');
  const body = await response.text();
  expect(response.headers.get('cache-control')).toContain('no-cache');
  expect(body).toContain('window.MiniAuth');
  expect(body).toContain('singleton-iife.js');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/sdk-endpoint.test.ts`
Expected: FAIL because the route still serves a placeholder asset.

- [ ] **Step 3: Implement the build step and serve the generated asset**

```ts
// source-side factory used by tests/runtime
export function renderSingletonIifeSource(): string {}

// build-time emitter used by npm run build
writeFileSync('dist/sdk/singleton-iife.js', renderSingletonIifeSource());
```

Also update `package.json` scripts concretely:

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json && node dist/sdk/build-singleton-iife.js"
  }
}
```

- [ ] **Step 4: Run targeted tests and build to verify it passes**

Run: `npm test -- tests/integration/sdk-endpoint.test.ts && npm run build`
Expected: PASS and `dist/sdk/singleton-iife.js` is emitted.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/sdk-endpoint.test.ts src/sdk/singleton-entry.ts src/sdk/build-singleton-iife.ts src/server/app.ts package.json tsconfig.build.json
git commit -m "feat: serve built singleton browser sdk"
```

### Task 9: Update docs and migrate the demo

**Files:**

- Modify: `README.md`
- Modify: `demo/index.html`
- Modify: `demo/main.js`

- [ ] **Step 1: Write the failing docs/demo verification target**

Document the manual verification target first:

```md
The demo should load `/sdk/singleton-iife.js`, call `window.MiniAuth.email.verify()`, and then read `window.MiniAuth.me.get()` without custom token code.
```

- [ ] **Step 2: Run current demo tests to capture the baseline**

Run: `npm test -- tests/unit/demo-setup.test.ts`
Expected: PASS before the demo integration changes.

- [ ] **Step 3: Update README and demo to use the SDK**

```html
<script src="/api/sdk/singleton-iife.js"></script>
```

```js
await window.MiniAuth.email.start({ email });
const session = await window.MiniAuth.email.verify({ email, code });
const me = window.MiniAuth.me.get();
```

README updates must explicitly cover:

- same-origin / same-origin proxy only deployment
- startup `recovering -> authenticated|anonymous` behavior
- `localStorage` persistence and automatic refresh
- `me.get()` vs `me.reload()` semantics
- passkey authentication example
- single-tab limitation caused by refresh-token rotation

Also add one manual verification note to `README.md`:

```md
Load the SDK from the same origin or same-origin proxy path as the auth API. Cross-origin embedding is intentionally unsupported in v1 and should fail review rather than being treated as a valid setup.
```

- [ ] **Step 4: Run docs-adjacent tests plus the full suite**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md demo/index.html demo/main.js
git commit -m "docs: adopt singleton sdk in browser examples"
```

## Chunk 3: Execution notes

- Follow @test-driven-development strictly for every task: no production code before the failing test exists and has been observed failing for the expected reason.
- Keep the placeholder route from Task 1 only until Task 8 replaces it with the real built artifact.
- Prefer focused browser shims in unit tests over adding a heavyweight browser runner unless the current Node-based Vitest environment proves insufficient.
- If the build pipeline becomes awkward, prefer a tiny checked-in build helper that emits one JS artifact over introducing a bundler dependency unless tests prove it is necessary.
- Do not add cross-origin support, multi-instance support, or multi-tab locking in this implementation.
