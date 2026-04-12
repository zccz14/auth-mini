# SDK Device Session Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated `createDeviceSdk(...)` subpath that performs automatic ED25519 device login into an isolated memory-only session, exposes `ready`, preserves the existing SDK session semantics, and supports idempotent `dispose()` / `[Symbol.asyncDispose]()` without changing browser SDK behavior.

**Architecture:** Keep the browser SDK contract untouched and add a parallel device-only entrypoint layered on the existing SDK `http` / `session` / `state` modules instead of branching `createBrowserSdk(...)`. Generalize the modular state store so it can use either browser persistence or an in-memory backing store, then build device login bootstrap and disposal guards on top of that shared session controller.

**Tech Stack:** TypeScript, Node `crypto` Ed25519 signing, existing SDK modules in `src/sdk/*`, npm subpath exports, Vitest unit/integration tests, markdown docs in `README.md` and `docs/integration/*`

---

## File Structure

- Create: `src/sdk/device.ts`
  - Public `auth-mini/sdk/device` entrypoint.
  - Exports `createDeviceSdk(...)`, device-only public types, and `ready` / dispose-capable API.
- Create: `src/sdk/device-auth.ts`
  - Implements the device bootstrap flow: `/ed25519/start` → sign challenge with `privateKey` → `/ed25519/verify` → `session.acceptSessionResponse(...)`.
- Modify: `src/sdk/types.ts`
  - Add `DevicePrivateKeyJwk`, `DeviceSdkOptions`, and `DeviceSdkApi` while keeping existing browser types stable.
- Modify: `src/sdk/errors.ts`
  - Add the SDK error code `disposed_session`.
- Modify: `src/sdk/state.ts`
  - Generalize the state store to support both browser persistence and a pure in-memory backing store.
- Modify: `package.json`
  - Publish `./sdk/device` alongside the existing `./sdk/browser` export.
- Create: `tests/unit/sdk-device-module.test.ts`
  - Cover auto login, instance isolation, memory-only behavior, refresh semantics, and dispose / async-dispose behavior.
- Modify: `tests/unit/sdk-state.test.ts`
  - Cover the new in-memory persistence path without regressing browser-storage behavior.
- Modify: `tests/unit/sdk-browser-module.test.ts`
  - Keep the explicit “browser SDK unchanged” guard close to the new device work.
- Modify: `tests/unit/sdk-dts-build.test.ts`
  - Assert the built `dist/sdk/device.d.ts` contract.
- Create: `tests/fixtures/sdk-dts-consumer/module-device-usage.ts`
  - TypeScript consumer fixture importing `createDeviceSdk` and device types from `auth-mini/sdk/device`.
- Modify: `tests/fixtures/sdk-dts-consumer/tsconfig.json`
  - Compile the new device consumer fixture with the existing DTS checks.
- Modify: `tests/integration/sdk-browser-package.test.ts`
  - Extend packed-package verification to import `auth-mini/sdk/device` without regressing `auth-mini/sdk/browser`.
- Modify: `tests/helpers/sdk.ts`
  - Add reusable device private-key fixtures / fetch helpers for `createDeviceSdk(...)` tests.
- Create: `docs/integration/device-sdk.md`
  - Document the new device SDK setup, auto-login lifecycle, and disposal contract.
- Modify: `docs/integration/browser-sdk.md`
  - Clarify that browser persistence semantics stay browser-only and link to the new device SDK doc.
- Modify: `README.md`
  - Add the new Device SDK integration doc link and a minimal `createDeviceSdk(...)` example.

## Task 1: Generalize SDK state for memory-backed instances

**Files:**

- Modify: `src/sdk/state.ts`
- Modify: `tests/unit/sdk-state.test.ts`

- [ ] **Step 1: Write the failing in-memory state-store tests**

Extend `tests/unit/sdk-state.test.ts` with two focused cases that prove the modular state store can run without browser storage:

```ts
it('hydrates anonymous state from an in-memory persistence adapter', () => {
  const sdk = createStateStore({
    clear() {},
    read() {
      return null;
    },
    write() {},
  });

  expect(sdk.getState()).toMatchObject({
    status: 'anonymous',
    refreshToken: null,
  });
});

it('does not leak authenticated device state across separate memory adapters', () => {
  let firstState: PersistedSdkState | null = null;
  const first = createStateStore({
    clear() {
      firstState = null;
    },
    read() {
      return firstState;
    },
    write(next) {
      firstState = next;
    },
  });
  const second = createStateStore({
    clear() {},
    read() {
      return null;
    },
    write() {},
  });

  first.setAuthenticated({
    sessionId: 'session-1',
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    receivedAt: '2026-04-12T00:00:00.000Z',
    expiresAt: '2026-04-12T00:15:00.000Z',
    me: null,
  });

  expect(second.getState().status).toBe('anonymous');
});
```

- [ ] **Step 2: Run the targeted state tests to verify they fail**

Run: `npm test -- tests/unit/sdk-state.test.ts`
Expected: FAIL because `createStateStore(...)` currently only accepts `Storage` and has no generic persistence adapter.

- [ ] **Step 3: Add a persistence adapter interface to the state store**

Update `src/sdk/state.ts` so the state store can work with either browser `Storage` or a pure in-memory adapter:

```ts
export type SdkStatePersistence = {
  clear(): void;
  read(): PersistedSdkState | null;
  write(state: PersistedSdkState): void;
};

export function createStateStore(input: Storage | SdkStatePersistence) {
  const persistence = resolvePersistence(input);
  const listeners = new Set<Listener>();
  let state = hydrateSnapshot(persistence.read());

  return {
    getState(): SessionSnapshot {
      return cloneSnapshot(state);
    },
    onChange(listener: Listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setAuthenticated(next: AuthenticatedStateInput): void {
      updatePersistedState({
        status: 'authenticated',
        authenticated: true,
        ...next,
      });
    },
    setRecovering(next: AuthenticatedStateInput): void {
      updatePersistedState({
        status: 'recovering',
        authenticated: false,
        ...next,
      });
    },
    setAnonymous(): void {
      persistence.clear();
      updateState(createSnapshot('anonymous'));
    },
    applyPersistedState(next: PersistedSdkState | null): void {
      updateState(hydrateSnapshot(next));
    },
    setAnonymousLocal(): void {
      updateState(createSnapshot('anonymous'));
    },
  };

  function updatePersistedState(next: SessionSnapshot): void {
    const persisted = clonePersistedState(next);
    persistence.write(persisted);
    updateState({
      status: next.status,
      authenticated: next.authenticated,
      ...persisted,
    });
  }
}
```

- [ ] **Step 4: Preserve the existing browser-storage path behind a resolver helper**

Keep the public browser-oriented usage valid by adding a small adapter helper instead of rewriting test callers:

```ts
function resolvePersistence(
  input: Storage | SdkStatePersistence,
): SdkStatePersistence {
  if ('read' in input && 'write' in input && 'clear' in input) {
    return input;
  }

  return {
    clear() {
      clearPersistedSdkState(input);
    },
    read() {
      return readPersistedSdkState(input);
    },
    write(state) {
      writePersistedSdkState(input, state);
    },
  };
}
```

Do not change the existing snapshot cloning / freezing logic; device instances must keep the same immutable state semantics as browser instances.

- [ ] **Step 5: Re-run the state-store tests to verify the new abstraction passes**

Run: `npm test -- tests/unit/sdk-state.test.ts`
Expected: PASS with both the old browser-storage expectations and the new in-memory adapter expectations.

- [ ] **Step 6: Commit the state-store groundwork**

```bash
git add src/sdk/state.ts tests/unit/sdk-state.test.ts
git commit -m "refactor: support memory-backed sdk state"
```

## Task 2: Add the device SDK bootstrap and public API

**Files:**

- Create: `src/sdk/device.ts`
- Create: `src/sdk/device-auth.ts`
- Modify: `src/sdk/types.ts`
- Modify: `src/sdk/errors.ts`
- Modify: `tests/helpers/sdk.ts`
- Create: `tests/unit/sdk-device-module.test.ts`
- Modify: `tests/unit/sdk-browser-module.test.ts`

- [ ] **Step 1: Write the failing device module tests first**

Create `tests/unit/sdk-device-module.test.ts` with the first TDD slice covering auto-login, memory-only behavior, and browser isolation:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createDeviceSdk } from '../../src/sdk/device.js';
import {
  createDevicePrivateKey,
  jsonResponse,
  readJsonBody,
} from '../helpers/sdk.js';

describe('device module sdk', () => {
  it('auto-authenticates on construction and resolves ready after /me', async () => {
    const fetch = vi.fn(async (input: URL | RequestInfo) => {
      const url = input instanceof URL ? input : new URL(String(input));

      if (url.pathname === '/ed25519/start') {
        return jsonResponse({
          request_id: 'request-1',
          challenge: 'challenge-1',
        });
      }
      if (url.pathname === '/ed25519/verify') {
        return jsonResponse({
          session_id: 'session-1',
          access_token: 'access-1',
          refresh_token: 'refresh-1',
          expires_in: 900,
        });
      }
      if (url.pathname === '/me') {
        return jsonResponse({
          user_id: 'user-1',
          email: 'device@example.com',
          webauthn_credentials: [],
          ed25519_credentials: [],
          active_sessions: [],
        });
      }
      throw new Error(`Unhandled path: ${url.pathname}`);
    });

    const sdk = createDeviceSdk({
      serverBaseUrl: 'https://auth.example.com',
      credentialId: '550e8400-e29b-41d4-a716-446655440000',
      privateKey: createDevicePrivateKey(),
      fetch,
      now: () => Date.parse('2026-04-12T00:00:00.000Z'),
    });

    await expect(sdk.ready).resolves.toBeUndefined();
    expect(sdk.session.getState()).toMatchObject({ status: 'authenticated' });
    expect(readJsonBody(fetch, '/ed25519/start')).toEqual({
      credential_id: '550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('never touches localStorage while booting a device sdk', async () => {
    const localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal('localStorage', localStorage);

    const sdk = createDeviceSdk({
      serverBaseUrl: 'https://auth.example.com',
      credentialId: '550e8400-e29b-41d4-a716-446655440000',
      privateKey: createDevicePrivateKey(),
      fetch: vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ request_id: 'request-1', challenge: 'challenge-1' }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            session_id: 'session-1',
            access_token: 'access-1',
            refresh_token: 'refresh-1',
            expires_in: 900,
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            user_id: 'user-1',
            email: 'device@example.com',
            webauthn_credentials: [],
            ed25519_credentials: [],
            active_sessions: [],
          }),
        ),
    });

    try {
      await sdk.ready;
      expect(localStorage.getItem).not.toHaveBeenCalled();
      expect(localStorage.setItem).not.toHaveBeenCalled();
      expect(localStorage.removeItem).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
```

Also extend `tests/unit/sdk-browser-module.test.ts` with one explicit guard:

```ts
it('does not export createDeviceSdk from the browser module', () => {
  expect(createBrowserSdk).toBeTypeOf('function');
  expect(
    readFileSync(resolve(process.cwd(), 'src/sdk/browser.ts'), 'utf8'),
  ).not.toContain('createDeviceSdk');
});
```

- [ ] **Step 2: Run the new focused SDK module tests to verify they fail**

Run: `npm test -- tests/unit/sdk-device-module.test.ts tests/unit/sdk-browser-module.test.ts`
Expected: FAIL because `src/sdk/device.ts`, the device types, and the helper fixture do not exist yet.

- [ ] **Step 3: Add the device-only public types**

Update `src/sdk/types.ts` with concrete device-facing contracts while leaving `AuthMiniApi` untouched:

```ts
export type DevicePrivateKeyJwk = {
  crv: 'Ed25519';
  d: string;
  kty: 'OKP';
  x: string;
};

export type DeviceSdkOptions = {
  serverBaseUrl: string;
  credentialId: string;
  privateKey: DevicePrivateKeyJwk;
  fetch?: FetchLike;
  now?: () => number;
};

export type DeviceSdkApi = {
  ready: Promise<void>;
  dispose(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
  me: {
    get(): MeResponse | null;
    reload(): Promise<MeResponse>;
  };
  session: {
    getState(): SessionSnapshot;
    onChange(listener: Listener): () => void;
    refresh(): Promise<SessionResult>;
    logout(): Promise<void>;
  };
};
```

- [ ] **Step 4: Add the device login bootstrap helper**

Create `src/sdk/device-auth.ts` to own challenge start / sign / verify logic:

```ts
import { createPrivateKey, sign } from 'node:crypto';
import { encodeBase64Url } from '../shared/crypto.js';
import type { HttpClient } from './http.js';
import type { DevicePrivateKeyJwk } from './types.js';

export async function authenticateDevice(input: {
  credentialId: string;
  http: HttpClient;
  privateKey: DevicePrivateKeyJwk;
  session: {
    acceptSessionResponse(response: unknown): Promise<unknown>;
  };
}): Promise<void> {
  const start = await input.http.postJson<{
    request_id: string;
    challenge: string;
  }>('/ed25519/start', { credential_id: input.credentialId });
  const signature = encodeBase64Url(
    sign(
      null,
      Buffer.from(start.challenge, 'utf8'),
      createPrivateKey({ format: 'jwk', key: input.privateKey }),
    ),
  );
  const response = await input.http.postJson('/ed25519/verify', {
    request_id: start.request_id,
    signature,
  });

  await input.session.acceptSessionResponse(response);
}
```

- [ ] **Step 5: Add the public `createDeviceSdk(...)` entrypoint with isolated memory state**

Create `src/sdk/device.ts` and build it on the modular `http` / `session` / `state` helpers, not on `createBrowserSdk(...)`:

```ts
import { createHttpClient } from './http.js';
import { createSessionController } from './session.js';
import { createStateStore } from './state.js';
import { authenticateDevice } from './device-auth.js';
import { createSdkError } from './errors.js';
import type {
  DeviceSdkApi,
  DeviceSdkOptions,
  PersistedSdkState,
} from './types.js';

export function createDeviceSdk(options: DeviceSdkOptions): DeviceSdkApi {
  let persisted: PersistedSdkState | null = null;
  let disposed = false;

  const state = createStateStore({
    clear() {
      persisted = null;
    },
    read() {
      return persisted;
    },
    write(next) {
      persisted = next;
    },
  });
  const http = createHttpClient({
    baseUrl: options.serverBaseUrl,
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
  });
  const session = createSessionController({
    http,
    now: options.now ?? (() => Date.now()),
    state,
  });

  const assertUsable = () => {
    if (disposed) {
      throw createSdkError(
        'disposed_session',
        'Device SDK instance has been disposed',
      );
    }
  };

  const ready = (async () => {
    assertUsable();
    await authenticateDevice({
      credentialId: options.credentialId,
      http,
      privateKey: options.privateKey,
      session,
    });
  })();

  async function dispose(): Promise<void> {
    if (disposed) {
      return;
    }
    disposed = true;
    try {
      await session.logout();
    } finally {
      state.setAnonymous();
    }
  }

  return {
    ready,
    dispose,
    async [Symbol.asyncDispose]() {
      await dispose();
    },
    me: {
      get() {
        return state.getState().me;
      },
      reload() {
        assertUsable();
        return session.reloadMe();
      },
    },
    session: {
      getState() {
        return state.getState();
      },
      onChange(listener) {
        return state.onChange(listener);
      },
      refresh() {
        assertUsable();
        return session.refresh();
      },
      logout() {
        assertUsable();
        return session.logout();
      },
    },
  };
}
```

Do not import `createBrowserSdk(...)` here, and do not add any storage sync or `window` assumptions.

- [ ] **Step 6: Add the new disposed-session SDK error code**

Update `src/sdk/errors.ts` so the guard above uses a typed SDK error instead of raw `Error`:

```ts
export type SdkErrorCode =
  | 'disposed_session'
  | 'sdk_init_failed'
  | 'missing_session'
  | 'request_failed'
  | 'webauthn_cancelled'
  | 'webauthn_unsupported';
```

- [ ] **Step 7: Add device test helpers instead of duplicating key fixtures inside tests**

Extend `tests/helpers/sdk.ts` with a deterministic helper that reuses the existing ED25519 test fixture shape:

```ts
export function createDevicePrivateKey(): DevicePrivateKeyJwk {
  return {
    crv: 'Ed25519',
    d: '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM',
    kty: 'OKP',
    x: 'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
  };
}
```

- [ ] **Step 8: Re-run the focused SDK tests to verify the device entrypoint works**

Run: `npm test -- tests/unit/sdk-device-module.test.ts tests/unit/sdk-browser-module.test.ts tests/unit/sdk-state.test.ts`
Expected: PASS with automatic device login succeeding, no `localStorage` traffic, and the browser module remaining unchanged.

- [ ] **Step 9: Commit the new device SDK entrypoint**

```bash
git add src/sdk/device.ts src/sdk/device-auth.ts src/sdk/types.ts src/sdk/errors.ts tests/helpers/sdk.ts tests/unit/sdk-device-module.test.ts tests/unit/sdk-browser-module.test.ts tests/unit/sdk-state.test.ts
git commit -m "feat: add device sdk module"
```

## Task 3: Finish refresh and dispose semantics, then publish the subpath

**Files:**

- Modify: `src/sdk/device.ts`
- Modify: `package.json`
- Modify: `tests/unit/sdk-device-module.test.ts`
- Modify: `tests/unit/sdk-dts-build.test.ts`
- Create: `tests/fixtures/sdk-dts-consumer/module-device-usage.ts`
- Modify: `tests/fixtures/sdk-dts-consumer/tsconfig.json`
- Modify: `tests/integration/sdk-browser-package.test.ts`

- [ ] **Step 1: Add failing tests for refresh and disposal behavior**

Extend `tests/unit/sdk-device-module.test.ts` with the remaining spec-critical cases:

```ts
it('keeps recoverable state when refresh fails transiently', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      jsonResponse({ request_id: 'request-1', challenge: 'challenge-1' }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        session_id: 'session-1',
        access_token: 'access-1',
        refresh_token: 'refresh-1',
        expires_in: 60,
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        user_id: 'user-1',
        email: 'device@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [],
        active_sessions: [],
      }),
    )
    .mockResolvedValueOnce(jsonResponse({ error: 'internal_error' }, 500));

  const sdk = createDeviceSdk({
    serverBaseUrl: 'https://auth.example.com',
    credentialId: '550e8400-e29b-41d4-a716-446655440000',
    privateKey: createDevicePrivateKey(),
    fetch,
    now: () => Date.parse('2026-04-12T00:01:00.000Z'),
  });

  await sdk.ready;
  await expect(sdk.session.refresh()).rejects.toMatchObject({
    error: 'internal_error',
  });
  expect(sdk.session.getState()).toMatchObject({
    status: 'recovering',
    refreshToken: 'refresh-1',
  });
});

it('clears local memory and rejects future session-dependent calls after dispose', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      jsonResponse({ request_id: 'request-1', challenge: 'challenge-1' }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        session_id: 'session-1',
        access_token: 'access-1',
        refresh_token: 'refresh-1',
        expires_in: 900,
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        user_id: 'user-1',
        email: 'device@example.com',
        webauthn_credentials: [],
        ed25519_credentials: [],
        active_sessions: [],
      }),
    )
    .mockResolvedValueOnce(jsonResponse({ ok: true }));

  const sdk = createDeviceSdk({
    serverBaseUrl: 'https://auth.example.com',
    credentialId: '550e8400-e29b-41d4-a716-446655440000',
    privateKey: createDevicePrivateKey(),
    fetch,
  });

  await sdk.ready;
  await sdk.dispose();

  expect(sdk.session.getState()).toMatchObject({ status: 'anonymous' });
  await expect(sdk.session.refresh()).rejects.toMatchObject({
    code: 'disposed_session',
  });
  await expect(sdk.me.reload()).rejects.toMatchObject({
    code: 'disposed_session',
  });
});

it('uses the same cleanup path for Symbol.asyncDispose and repeated dispose calls', async () => {
  const sdk = createDeviceSdk({
    serverBaseUrl: 'https://auth.example.com',
    credentialId: '550e8400-e29b-41d4-a716-446655440000',
    privateKey: createDevicePrivateKey(),
    fetch: vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ request_id: 'request-1', challenge: 'challenge-1' }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          session_id: 'session-1',
          access_token: 'access-1',
          refresh_token: 'refresh-1',
          expires_in: 900,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          user_id: 'user-1',
          email: 'device@example.com',
          webauthn_credentials: [],
          ed25519_credentials: [],
          active_sessions: [],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true })),
  });

  await sdk.ready;
  await sdk[Symbol.asyncDispose]();
  await expect(sdk.dispose()).resolves.toBeUndefined();
});
```

- [ ] **Step 2: Run the targeted device tests to verify the new semantics fail before implementation**

Run: `npm test -- tests/unit/sdk-device-module.test.ts`
Expected: FAIL because `dispose()` is not yet guarding future calls, and the module has no explicit async-dispose contract.

- [ ] **Step 3: Tighten `dispose()` so logout happens before the instance becomes permanently unusable**

Adjust `src/sdk/device.ts` so the dispose flow attempts remote logout once, always clears local memory, then permanently blocks session-dependent calls:

```ts
let disposePromise: Promise<void> | null = null;
let disposed = false;

async function dispose(): Promise<void> {
  if (disposePromise) {
    return disposePromise;
  }

  disposePromise = (async () => {
    const canLogout = !disposed;

    try {
      if (canLogout) {
        await session.logout();
      }
    } finally {
      disposed = true;
      state.setAnonymous();
    }
  })();

  return disposePromise;
}
```

Keep `session.getState()`, `session.onChange(...)`, and `me.get()` readable after dispose so callers can still observe the final anonymous snapshot. Only methods that require an active session should throw `disposed_session`.

- [ ] **Step 4: Publish the device subpath and its declaration file**

Update `package.json` with a second SDK export:

```json
"exports": {
  "./sdk/browser": {
    "types": "./dist/sdk/browser.d.ts",
    "import": "./dist/sdk/browser.js"
  },
  "./sdk/device": {
    "types": "./dist/sdk/device.d.ts",
    "import": "./dist/sdk/device.js"
  }
}
```

- [ ] **Step 5: Add DTS consumer coverage for the device module**

Create `tests/fixtures/sdk-dts-consumer/module-device-usage.ts`:

```ts
import { createDeviceSdk } from 'auth-mini/sdk/device';
import type {
  DevicePrivateKeyJwk,
  DeviceSdkApi,
  SessionSnapshot,
} from 'auth-mini/sdk/device';

const privateKey: DevicePrivateKeyJwk = {
  crv: 'Ed25519',
  d: '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM',
  kty: 'OKP',
  x: 'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
};

const sdk: DeviceSdkApi = createDeviceSdk({
  serverBaseUrl: 'https://auth.example.com',
  credentialId: '550e8400-e29b-41d4-a716-446655440000',
  privateKey,
});

const state: SessionSnapshot = sdk.session.getState();

void sdk.ready;
void state;
```

Then update `tests/fixtures/sdk-dts-consumer/tsconfig.json` to include `./module-device-usage.ts`.

- [ ] **Step 6: Assert the built declaration and packed tarball export**

Extend `tests/unit/sdk-dts-build.test.ts` with concrete checks:

```ts
const readDeviceModuleDeclaration = () =>
  readFileSync(resolve(process.cwd(), 'dist/sdk/device.d.ts'), 'utf8');

it('emits device sdk module declarations', () => {
  const output = readDeviceModuleDeclaration();

  expect(output).toContain('export declare function createDeviceSdk');
  expect(output).toContain('DeviceSdkApi');
  expect(output).toContain('DevicePrivateKeyJwk');
  expect(output).toContain('Symbol.asyncDispose');
});
```

Extend `tests/integration/sdk-browser-package.test.ts` rather than creating a second near-duplicate integration file:

```ts
it('imports createDeviceSdk from the packed device subpath', async () => {
  const mod = await importPackedModule('auth-mini/sdk/device');

  expect(mod.createDeviceSdk).toBe('function');
});
```

- [ ] **Step 7: Re-run the focused packaging and device tests**

Run:

```bash
npm test -- tests/unit/sdk-device-module.test.ts tests/unit/sdk-dts-build.test.ts tests/integration/sdk-browser-package.test.ts
```

Expected: PASS with device dispose semantics covered, `dist/sdk/device.d.ts` checked, and packed-package import succeeding for both browser and device subpaths.

- [ ] **Step 8: Commit the dispose + packaging slice**

```bash
git add src/sdk/device.ts package.json tests/unit/sdk-device-module.test.ts tests/unit/sdk-dts-build.test.ts tests/fixtures/sdk-dts-consumer/module-device-usage.ts tests/fixtures/sdk-dts-consumer/tsconfig.json tests/integration/sdk-browser-package.test.ts
git commit -m "feat: publish device sdk subpath"
```

## Task 4: Document the new device SDK and run the repo-level verification sweep

**Files:**

- Create: `docs/integration/device-sdk.md`
- Modify: `docs/integration/browser-sdk.md`
- Modify: `README.md`

- [ ] **Step 1: Write the docs after code is already green**

Create `docs/integration/device-sdk.md` with a concrete Node-oriented example and explicit disposal guidance:

````md
# Device SDK integration

```ts
import { createDeviceSdk } from 'auth-mini/sdk/device';

const sdk = createDeviceSdk({
  serverBaseUrl: 'https://auth.example.com',
  credentialId: '550e8400-e29b-41d4-a716-446655440000',
  privateKey: {
    crv: 'Ed25519',
    d: '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM',
    kty: 'OKP',
    x: 'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
  },
});

await sdk.ready;
console.log(sdk.session.getState().status);
console.log(sdk.me.get());

await sdk.dispose();
```

- `createDeviceSdk(...)` performs `/ed25519/start`, local challenge signing, `/ed25519/verify`, and `/me` loading automatically.
- Device session state is instance-local and memory-only.
- After `dispose()` or `await sdk[Symbol.asyncDispose]()`, `session.refresh()` and `me.reload()` reject with `disposed_session`.

````

- [ ] **Step 2: Cross-link the browser SDK doc without changing browser semantics**

Update `docs/integration/browser-sdk.md` near the top-level integration-path section:

```md
auth-mini supports two SDK integration paths:

- Browser SDK: import `createBrowserSdk` from `auth-mini/sdk/browser` for browser storage + cross-tab semantics.
- Device SDK: import `createDeviceSdk` from `auth-mini/sdk/device` for isolated memory-only sessions in non-browser clients.
```

Do not rewrite the rest of the browser doc into a generic SDK doc; keep browser-specific storage guidance intact.

- [ ] **Step 3: Add the README entry and docs link**

Update `README.md` in two places:

1. Add a minimal device SDK example next to the current browser example:

```ts
import { createDeviceSdk } from 'auth-mini/sdk/device';

const sdk = createDeviceSdk({
  serverBaseUrl: 'https://auth.your-domain.com',
  credentialId: '550e8400-e29b-41d4-a716-446655440000',
  privateKey: {
    crv: 'Ed25519',
    d: '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM',
    kty: 'OKP',
    x: 'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
  },
});

await sdk.ready;
```

2. Add the new doc link under “Docs and next steps”:

```md
- Device SDK integration: [docs/integration/device-sdk.md](docs/integration/device-sdk.md)
```

- [ ] **Step 4: Run the focused docs-adjacent and SDK verification suite**

Run:

```bash
npm test -- tests/unit/sdk-device-module.test.ts tests/unit/sdk-browser-module.test.ts tests/unit/sdk-session.test.ts tests/unit/sdk-state.test.ts tests/unit/sdk-dts-build.test.ts tests/integration/sdk-browser-package.test.ts
```

Expected: PASS. This proves the new device SDK contract, browser non-regression, shared session semantics, and package exports all work together.

- [ ] **Step 5: Run the full project test suite**

Run: `npm test`
Expected: PASS with the existing build + unit + integration flow, including the DTS consumer compile and packed-package verification.

- [ ] **Step 6: Inspect the packed package contents**

Run: `npm pack --json --dry-run`
Expected: output includes `dist/sdk/browser.js`, `dist/sdk/browser.d.ts`, `dist/sdk/device.js`, and `dist/sdk/device.d.ts` while preserving the existing CLI and singleton SDK artifacts.

- [ ] **Step 7: Commit the docs and final verification-only changes if needed**

```bash
git add README.md docs/integration/browser-sdk.md docs/integration/device-sdk.md
git commit -m "docs: add device sdk guide"
```

If verification exposes a tiny follow-up fix, create one final narrow commit after fixing it instead of folding unrelated edits into the docs commit.

## Self-Review

- Spec coverage: covered the dedicated `createDeviceSdk(...)` entrypoint, memory-only instance isolation, automatic ED25519 login from `serverBaseUrl` / `credentialId` / `privateKey`, `ready`, refresh semantics aligned with existing session behavior, idempotent `dispose()` / `[Symbol.asyncDispose]`, `disposed_session`, browser SDK non-regression, and required tests/docs/package exports.
- Placeholder scan: no `TODO`, `TBD`, or “similar to previous task” placeholders remain; every task names exact files, commands, and concrete snippets.
- Type consistency: the plan consistently uses `DevicePrivateKeyJwk`, `DeviceSdkOptions`, `DeviceSdkApi`, `createDeviceSdk(...)`, and the existing `SessionSnapshot` / `SessionResult` / `MeResponse` types across code, tests, DTS fixtures, and docs.
