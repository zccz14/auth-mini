# SDK `/me` Fetch UI Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shrink the browser/device SDK contract so `/me` is only available through explicit `sdk.me.fetch()`, then move every `examples/demo` `/me` consumer to page-owned fetch/load/error/refresh logic.

**Architecture:** First lock the new public contract in tests and type fixtures: session snapshots/persistence stop carrying `me`, auth actions stop implicitly fetching `/me`, and the only remaining public `/me` API is `fetch()`. Then update the demo in two layers: the provider keeps only SDK/session/auth wiring, while each route that needs profile data owns its own `/me` fetch cycle and local refresh decisions.

**Tech Stack:** TypeScript, React 19, React Router 7, Vitest, Testing Library, browser `fetch`, localStorage-backed browser SDK state

---

## File Structure

- Modify: `src/sdk/types.ts`
  - remove `me` from `SessionSnapshot`, `PersistedSdkState`, and auth result types; replace `get()/reload()` with `fetch()` in public SDK APIs
- Modify: `src/sdk/storage.ts`
  - stop parsing, persisting, and hydrating cached `/me` payloads from browser storage
- Modify: `src/sdk/state.ts`
  - remove snapshot cloning/freezing logic for `me`; keep state focused on session tokens/status only
- Modify: `src/sdk/session.ts`
  - remove implicit `/me` fetches from `acceptSessionResponse()`, `refresh()`, and recovery paths; add explicit `fetchMe()` helper for `sdk.me.fetch()` only
- Modify: `src/sdk/device.ts`
  - expose `sdk.me.fetch()` instead of synchronous cache APIs and stop treating `/me` as device session state
- Modify: `src/sdk/singleton-entry.ts`
  - mirror the same contract change for the browser runtime/global singleton implementation
- Modify: `src/sdk/browser.ts`
  - re-export the narrowed session/auth types and new `/me` API surface
- Modify: `tests/helpers/sdk.ts`
  - remove `me` from persisted storage seeds and keep `/me` helper payloads explicit per test
- Modify: `tests/unit/sdk-session.test.ts`
  - lock removal of cached `me`, implicit `/me` refresh, and the new `sdk.me.fetch()` semantics
- Modify: `tests/unit/sdk-browser-module.test.ts`
  - update browser module expectations to the new public API
- Modify: `tests/unit/sdk-device-module.test.ts`
  - update device SDK expectations to explicit `/me` fetch behavior
- Modify: `tests/unit/sdk-webauthn.test.ts`
  - remove assertions that depend on synchronous cached `me`
- Modify: `tests/integration/sdk-login-contract.test.ts`
  - prove sign-in success no longer auto-loads `/me`
- Modify: `tests/fixtures/sdk-dts-consumer/module-browser-usage.ts`
- Modify: `tests/fixtures/sdk-dts-consumer/global-usage.ts`
  - type-check `sdk.me.fetch()` and ensure `session.getState()` no longer exposes `me`
- Modify: `docs/integration/browser-sdk.md`
- Modify: `docs/integration/device-sdk.md`
  - document explicit `/me` fetch ownership and removal of cached `me` semantics
- Modify: `examples/demo/src/lib/demo-sdk.ts`
  - persist session tokens only and keep helper refresh logic independent from `/me`
- Modify: `examples/demo/src/lib/demo-sdk.test.ts`
  - lock the narrower token-only contract used by the demo wrapper
- Modify: `examples/demo/src/app/providers/demo-provider.tsx`
  - remove `user` from context and stop implicit `/me` loads during session adoption
- Modify: `examples/demo/src/app/providers/demo-provider.test.tsx`
  - verify provider exposes only session/auth wiring and no shared user snapshot
- Modify: `examples/demo/src/routes/session.tsx`
- Modify: `examples/demo/src/routes/session.test.tsx`
  - move `/me` ownership into the Session page for initial load and post-kick refresh
- Modify: `examples/demo/src/routes/credentials.tsx`
- Modify: `examples/demo/src/routes/credentials.test.tsx`
  - replace provider user state with local `/me` state and explicit refresh after deletes
- Modify: `examples/demo/src/routes/ed25519.tsx`
- Modify: `examples/demo/src/routes/ed25519.test.tsx`
  - refresh local `/me` explicitly after credential registration
- Modify: `examples/demo/src/routes/passkey.tsx`
- Modify: `examples/demo/src/routes/passkey.test.tsx`
  - gate registration from local `/me` ownership instead of `session.me`

## Implementation Notes

- Keep `MeResponse` and `src/sdk/me.ts` intact as the payload parser; only the ownership/call sites change.
- Rename public auth return types from “session plus me” to token-only session results in one pass, so type errors lead implementers to every stale call site.
- Do not add a new shared `/me` cache, provider store, or hidden recovery sync path; explicit page-owned fetches are the entire point of this change.
- `sdk.me.fetch()` should perform exactly one explicit authenticated `/me` request, reusing existing session-refresh rules only to obtain a valid access token; it must not write the result into session state or persistence.
- Demo routes should use the existing `session.authenticated`, `session.accessToken`, `session.refreshToken`, `config.status`, and `sdk` checks to decide whether `/me` can be fetched.
- Historical spec/plan files under `docs/superpowers/specs/` and `docs/superpowers/plans/` are historical artifacts; do not rewrite them for this contract change.

### Task 1: Lock The New SDK Contract In Tests And Type Fixtures

**Files:**

- Modify: `tests/unit/sdk-session.test.ts`
- Modify: `tests/unit/sdk-browser-module.test.ts`
- Modify: `tests/unit/sdk-device-module.test.ts`
- Modify: `tests/unit/sdk-webauthn.test.ts`
- Modify: `tests/integration/sdk-login-contract.test.ts`
- Modify: `tests/fixtures/sdk-dts-consumer/module-browser-usage.ts`
- Modify: `tests/fixtures/sdk-dts-consumer/global-usage.ts`

- [ ] **Step 1: Add failing session-flow assertions that prove `/me` is no longer implicit**

Update `tests/unit/sdk-session.test.ts` so the red state proves both auth flows and refresh stop auto-populating `me`:

```ts
it('refresh success keeps session state token-only', async () => {
  const sdk = createAuthMiniForTest({
    storage: fakeAuthenticatedStorage(),
    fetch: vi.fn().mockResolvedValueOnce(
      jsonResponse({
        session_id: 's2',
        access_token: 'a2',
        refresh_token: 'r2',
        expires_in: 900,
        token_type: 'Bearer',
      }),
    ),
  });

  const refreshed = await sdk.session.refresh();

  expect(refreshed).toMatchObject({
    sessionId: 's2',
    accessToken: 'a2',
    refreshToken: 'r2',
  });
  expect(sdk.session.getState()).not.toHaveProperty('me');
});

it('me.fetch performs an explicit /me request without mutating session state', async () => {
  const sdk = createAuthMiniForTest({
    storage: fakeAuthenticatedStorage(),
    fetch: vi.fn().mockResolvedValueOnce(
      jsonResponse({
        user_id: 'u1',
        email: 'updated@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [],
        active_sessions: [],
      }),
    ),
  });

  const me = await sdk.me.fetch();

  expect(me.email).toBe('updated@example.com');
  expect(sdk.session.getState()).not.toHaveProperty('me');
});
```

- [ ] **Step 2: Add failing public API expectations for browser/device consumers**

Update the module tests and DTS fixtures so the old methods disappear and `fetch()` becomes the only public entrypoint:

```ts
// tests/integration/sdk-login-contract.test.ts
it('email.verify resolves before any explicit /me fetch', async () => {
  const sdk = createAuthMiniForTest({
    fetch: vi.fn().mockResolvedValueOnce(
      jsonResponse({
        session_id: 's1',
        access_token: 'a',
        refresh_token: 'r',
        expires_in: 900,
        token_type: 'Bearer',
      }),
    ),
  });

  const result = await sdk.email.verify({
    email: 'u@example.com',
    code: '123456',
  });

  expect(result).toMatchObject({ sessionId: 's1', accessToken: 'a' });
  expect(sdk.session.getState()).not.toHaveProperty('me');
});

// tests/fixtures/sdk-dts-consumer/module-browser-usage.ts
const state: SessionSnapshot = sdk.session.getState();
const me: MeResponse = await sdk.me.fetch();

void state.accessToken;
void me.email;
```

- [ ] **Step 3: Run the focused contract checks to capture the red state**

Run: `npm run test:unit -- tests/unit/sdk-session.test.ts tests/unit/sdk-browser-module.test.ts tests/unit/sdk-device-module.test.ts tests/unit/sdk-webauthn.test.ts`

Expected: FAIL with stale references to `me` on session snapshots and missing `sdk.me.fetch()` implementations.

Run: `npm run test:integration -- tests/integration/sdk-login-contract.test.ts`

Expected: FAIL because auth flows still auto-request `/me` and return `me` in the result.

Run: `npx tsc -p tests/fixtures/sdk-dts-consumer/tsconfig.json`

Expected: FAIL because the exported SDK types still advertise `get()/reload()` and `session.me`.

### Task 2: Remove Cached `me` From SDK State, Persistence, And Auth Side Effects

**Files:**

- Modify: `src/sdk/types.ts`
- Modify: `src/sdk/storage.ts`
- Modify: `src/sdk/state.ts`
- Modify: `src/sdk/session.ts`
- Modify: `tests/helpers/sdk.ts`

- [ ] **Step 1: Narrow the SDK types to token-only session/auth state**

Change `src/sdk/types.ts` first so the compiler drives every downstream edit:

```ts
export type SessionSnapshot = {
  status: SdkStatus;
  authenticated: boolean;
  sessionId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  receivedAt: string | null;
  expiresAt: string | null;
};

export type PersistedSdkState = {
  sessionId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  receivedAt: string | null;
  expiresAt: string | null;
};

export type SessionResult = SessionTokens;

export type AuthMiniApi = {
  email: {
    start(input: EmailStartInput): Promise<EmailStartResponse>;
    verify(input: EmailVerifyInput): Promise<SessionResult>;
  };
  me: {
    fetch(): Promise<MeResponse>;
  };
  session: {
    getState(): SessionSnapshot;
    onChange(listener: Listener): () => void;
    refresh(): Promise<SessionResult>;
    logout(): Promise<void>;
  };
};
```

- [ ] **Step 2: Delete `/me` from persistence and snapshot cloning**

Update `src/sdk/storage.ts`, `src/sdk/state.ts`, and `tests/helpers/sdk.ts` so persisted state is token-only and helper storage seeds no longer write `me: null`:

```ts
// src/sdk/storage.ts
return {
  sessionId: requireStringOrNull(value.sessionId),
  accessToken: requireStringOrNull(value.accessToken),
  refreshToken: requireStringOrNull(value.refreshToken),
  receivedAt: requireStringOrNull(value.receivedAt),
  expiresAt: requireStringOrNull(value.expiresAt),
};

// src/sdk/state.ts
function createSnapshot(status: SdkStatus): SessionSnapshot {
  return freezeSnapshot({
    status,
    authenticated: status === 'authenticated',
    sessionId: null,
    accessToken: null,
    refreshToken: null,
    receivedAt: null,
    expiresAt: null,
  });
}
```

- [ ] **Step 3: Remove implicit `/me` loads from session controller flows and keep one explicit fetch path**

Refactor `src/sdk/session.ts` so `acceptSessionResponse()`, `refresh()`, and `recover()` only manage tokens, while explicit `/me` reads stay isolated:

```ts
async acceptSessionResponse(response: unknown): Promise<SessionResult> {
  const session = normalizeTokenResponse(response, input.now);
  input.state.setAuthenticated(session);
  return session;
}

async fetchMe(): Promise<MeResponse> {
  const snapshot = input.state.getState();
  const accessToken =
    !snapshot.accessToken || needsRefresh(snapshot, input.now())
      ? (await this.refresh()).accessToken
      : snapshot.accessToken;

  if (!accessToken) {
    throw createSdkError('missing_session', 'Missing access token');
  }

  return parseMeResponse(await input.http.getJson('/me', { accessToken }));
}
```

- [ ] **Step 4: Run the focused SDK checks and make them green**

Run: `npm run test:unit -- tests/unit/sdk-session.test.ts tests/unit/sdk-state.test.ts`

Expected: PASS with token-only session snapshots and no persisted `/me` field.

Run: `npm run test:integration -- tests/integration/sdk-login-contract.test.ts`

Expected: PASS with sign-in returning session tokens only and no implicit `/me` request.

### Task 3: Rebuild The Browser/Device Public API Around `sdk.me.fetch()`

**Files:**

- Modify: `src/sdk/singleton-entry.ts`
- Modify: `src/sdk/device.ts`
- Modify: `src/sdk/browser.ts`
- Modify: `tests/unit/sdk-browser-module.test.ts`
- Modify: `tests/unit/sdk-device-module.test.ts`
- Modify: `tests/unit/sdk-webauthn.test.ts`
- Modify: `docs/integration/browser-sdk.md`
- Modify: `docs/integration/device-sdk.md`

- [ ] **Step 1: Swap the browser/device runtime surface from cache APIs to explicit fetch**

Update both runtime entrypoints so `me` only exposes `fetch()`:

```ts
// src/sdk/singleton-entry.ts and src/sdk/device.ts
me: {
  async fetch() {
    assertNotDisposed();
    return await session.fetchMe();
  },
},
```

- [ ] **Step 2: Rewrite the public module tests around explicit `/me` reads**

Replace old synchronous-cache assertions with explicit network assertions:

```ts
// tests/unit/sdk-device-module.test.ts
it('sdk.me.fetch returns the current /me payload', async () => {
  const sdk = await createDeviceSdkForTest();

  await expect(sdk.me.fetch()).resolves.toMatchObject({
    email: 'device@example.com',
  });
  expect(sdk.session.getState()).not.toHaveProperty('me');
});

// tests/unit/sdk-browser-module.test.ts
await expect(sdk.me.fetch()).rejects.toMatchObject({
  error: 'missing_session',
});
```

- [ ] **Step 3: Update the browser/device docs to the new ownership model**

Edit the integration guides so examples no longer read cached `me` synchronously:

```md
## Explicit `/me` reads

- `AuthMini.session.getState()` exposes auth/session status only.
- `await AuthMini.me.fetch()` performs one authenticated `/me` request and returns that response.
- The SDK does not cache `/me` in shared session state; callers own any local memoization or refresh timing.
```

- [ ] **Step 4: Run the public API verification commands**

Run: `npm run test:unit -- tests/unit/sdk-browser-module.test.ts tests/unit/sdk-device-module.test.ts tests/unit/sdk-webauthn.test.ts`

Expected: PASS with only `sdk.me.fetch()` available and no cached `me` expectations left.

Run: `npx tsc -p tests/fixtures/sdk-dts-consumer/tsconfig.json`

Expected: PASS with both module and global browser fixtures compiling against `sdk.me.fetch()` and token-only session snapshots.

### Task 4: Remove Shared `/me` Ownership From The Demo Provider Layer

**Files:**

- Modify: `examples/demo/src/lib/demo-sdk.ts`
- Modify: `examples/demo/src/lib/demo-sdk.test.ts`
- Modify: `examples/demo/src/app/providers/demo-provider.tsx`
- Modify: `examples/demo/src/app/providers/demo-provider.test.tsx`

- [ ] **Step 1: Lock the demo wrapper/provider red state first**

Update the provider/demo-sdk tests so they fail until provider `user` disappears and `persistDemoSession()` stops writing `me`:

```ts
// examples/demo/src/app/providers/demo-provider.test.tsx
expect(screen.queryByTestId('user-email')).not.toBeInTheDocument();
expect(screen.getByTestId('session-status')).toHaveTextContent('authenticated');

// examples/demo/src/lib/demo-sdk.test.ts
const storedValue = storage.getItem(
  browserSdkStorageKey('https://auth.example.com'),
);
expect(JSON.parse(storedValue)).toEqual({
  sessionId: 'session-1',
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  receivedAt: expect.any(String),
  expiresAt: expect.any(String),
});
```

- [ ] **Step 2: Remove provider `user` and implicit `/me` reload during session adoption**

Apply the contract change in the demo layer itself:

```ts
type DemoContextValue = {
  config: ReturnType<typeof getInitialDemoConfig>;
  sdk: DemoSdk | null;
  session: DemoSession;
  adoptDemoSession: (tokens: DemoSessionTokens) => Promise<void>;
  clearLocalAuthState: () => Promise<void>;
  setAuthOrigin: (authOrigin: string) => void;
};

persistDemoSession(storage, config.authOrigin, tokens);
const nextSdk = createDemoSdk(config.authOrigin);
attachSdk(nextSdk);
```

- [ ] **Step 3: Keep `createDemoSdk()` token-only and let routes fetch `/me` themselves**

Remove the storage seed `me: null` field and keep helper refresh logic only for access-token retry:

```ts
storage.setItem(
  browserSdkStorageKey(authOrigin),
  JSON.stringify({
    sessionId: tokens.session_id,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    receivedAt,
    expiresAt,
  }),
);
```

- [ ] **Step 4: Run the focused demo provider checks**

Run: `npm --prefix examples/demo run test -- src/app/providers/demo-provider.test.tsx src/lib/demo-sdk.test.ts`

Expected: PASS with provider state narrowed to session/auth wiring only and persisted demo session data containing no `me` field.

### Task 5: Move Demo Routes To Page-Owned `/me` Fetch, Error, And Refresh Logic

**Files:**

- Modify: `examples/demo/src/routes/session.tsx`
- Modify: `examples/demo/src/routes/session.test.tsx`
- Modify: `examples/demo/src/routes/credentials.tsx`
- Modify: `examples/demo/src/routes/credentials.test.tsx`
- Modify: `examples/demo/src/routes/ed25519.tsx`
- Modify: `examples/demo/src/routes/ed25519.test.tsx`
- Modify: `examples/demo/src/routes/passkey.tsx`
- Modify: `examples/demo/src/routes/passkey.test.tsx`

- [ ] **Step 1: Add route-level red tests for page-owned `/me` state**

Before touching the routes, add failures that prove pages own loading/error/refresh instead of consuming provider `user`:

```tsx
// examples/demo/src/routes/session.test.tsx
it('fetches /me inside the route after authenticated render', async () => {
  render(
    <MemoryRouter initialEntries={['/session']}>
      <AppRouter />
    </MemoryRouter>,
  );

  expect(screen.getByText('Loading current user…')).toBeInTheDocument();
  await screen.findByText(/"email": "user@example.com"/);
});

// examples/demo/src/routes/credentials.test.tsx
it('reloads local /me after deleting a passkey', async () => {
  await user.click(screen.getByRole('button', { name: 'Delete passkey' }));
  await screen.findByText('updated@example.com');
});
```

- [ ] **Step 2: Give each route its own `loadMe()` helper and local state buckets**

Refactor `session.tsx`, `credentials.tsx`, `ed25519.tsx`, and `passkey.tsx` so they stop reading provider `user`/`session.me` and instead own local `/me` state:

```tsx
const { clearLocalAuthState, config, sdk, session } = useDemo();
const [me, setMe] = useState<MeResponse | null>(null);
const [loadingMe, setLoadingMe] = useState(false);
const [meError, setMeError] = useState('');

async function loadMe() {
  if (!sdk || config.status !== 'ready' || !session.authenticated) {
    setMe(null);
    return;
  }

  setLoadingMe(true);
  setMeError('');
  try {
    setMe(await sdk.me.fetch());
  } catch (cause) {
    setMeError(cause instanceof Error ? cause.message : 'Unable to load /me');
  } finally {
    setLoadingMe(false);
  }
}
```

- [ ] **Step 3: Make page-local refresh explicit after destructive or state-changing actions**

Wire every stale `sdk.me.reload()` call and `session.me` gate to the local helper instead:

```tsx
// examples/demo/src/routes/session.tsx
await fetch(new URL(`/session/${sessionId}/logout`, config.authOrigin), {
  method: 'POST',
  headers: { authorization: `Bearer ${session.accessToken}` },
});
await loadMe();

// examples/demo/src/routes/ed25519.tsx
await sdk.ed25519.register({
  name: credentialName.trim(),
  public_key: publicKey.trim(),
});
await loadMe();

// examples/demo/src/routes/passkey.tsx
const canRegister = setupReady && session.authenticated && me !== null;
```

- [ ] **Step 4: Run the demo route verification suite**

Run: `npm --prefix examples/demo run test -- src/routes/session.test.tsx src/routes/credentials.test.tsx src/routes/ed25519.test.tsx src/routes/passkey.test.tsx`

Expected: PASS with each page handling its own `/me` loading, error, and refresh flow.

Run: `npm --prefix examples/demo run typecheck`

Expected: PASS with `useDemo()` consumers no longer reading `user` or `session.me`.

### Task 6: Final Contract Sweep And Regression Verification

**Files:**

- Modify: `docs/integration/browser-sdk.md`
- Modify: `docs/integration/device-sdk.md`
- Revisit only the files already listed in Tasks 1-5 if the final verification exposes a stale contract reference

- [ ] **Step 1: Remove any last stale references to `sdk.me.get()`, `sdk.me.reload()`, `session.me`, or provider `user`**

Use the compiler/test failures from the prior tasks to finish the sweep; the end state should match this contract everywhere touched:

```ts
await sdk.me.fetch();
const session = sdk.session.getState();
// session contains auth/session fields only
```

- [ ] **Step 2: Run the full verification set for this spec**

Run: `npm run test:unit -- tests/unit/sdk-session.test.ts tests/unit/sdk-state.test.ts tests/unit/sdk-browser-module.test.ts tests/unit/sdk-device-module.test.ts tests/unit/sdk-webauthn.test.ts`

Expected: PASS with no cached `me` assumptions in SDK unit coverage.

Run: `npm run test:integration -- tests/integration/sdk-login-contract.test.ts`

Expected: PASS with auth success no longer blocked on implicit `/me` refresh.

Run: `npx tsc -p tests/fixtures/sdk-dts-consumer/tsconfig.json`

Expected: PASS with module/global browser consumer fixtures using `sdk.me.fetch()`.

Run: `npm --prefix examples/demo run test -- src/app/providers/demo-provider.test.tsx src/lib/demo-sdk.test.ts src/routes/session.test.tsx src/routes/credentials.test.tsx src/routes/ed25519.test.tsx src/routes/passkey.test.tsx`

Expected: PASS with provider-owned auth state and page-owned `/me` state separated cleanly.

Run: `npm --prefix examples/demo run typecheck`

Expected: PASS with no `user` or `session.me` dependencies left in the demo app.

## Self-Review Coverage

- Session type/store/persistence removal of `me`: covered by Tasks 1-3.
- Replacement of `sdk.me.get()/reload()` with `sdk.me.fetch()`: covered by Tasks 1-3 and Task 6 verification.
- Removal of implicit `/me` refresh side effects: covered by Tasks 1-2 and integration verification.
- Demo provider API changes: covered by Task 4.
- Page-level `/me` ownership migration in demo routes/tests: covered by Task 5.
- Docs/tests/type updates for the contract change: covered by Tasks 1, 3, and 6.
