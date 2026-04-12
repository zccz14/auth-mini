# Device SDK Seed Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the public Device SDK `privateKey` JWK input with a `privateKeySeed` base64url string, validate it during SDK construction, derive the Ed25519 private key internally, and remove JWK usage from the public surface.

**Architecture:** Keep the Device SDK boot flow and lifecycle unchanged: `createDeviceSdk(...)` still performs `/ed25519/start`, local challenge signing, `/ed25519/verify`, and `/me` loading automatically. The only contract change is at the Device SDK boundary: accept a base64url-encoded 32-byte seed, validate it synchronously during construction, derive a Node `KeyObject` once, then reuse that derived key for the existing signing flow.

**Tech Stack:** TypeScript, Node `crypto`, Vitest unit tests, TypeScript declaration build, markdown docs

---

## File Structure

- Modify: `src/sdk/types.ts` - replace `DevicePrivateKeyJwk` usage in `DeviceSdkOptions` with `privateKeySeed: string` so the public type surface matches the spec.
- Modify: `src/sdk/device.ts` - stop re-exporting `DevicePrivateKeyJwk`, validate/derive the seed-backed key during `createDeviceSdk(...)`, and keep lifecycle logic unchanged.
- Modify: `src/sdk/device-auth.ts` - decode/validate the seed and derive an Ed25519 `KeyObject` used for challenge signing.
- Modify: `tests/helpers/sdk.ts` - replace the JWK fixture helper with a deterministic base64url seed fixture.
- Modify: `tests/unit/sdk-device-module.test.ts` - switch all Device SDK construction sites to `privateKeySeed` and add invalid-seed coverage while preserving lifecycle assertions.
- Modify: `tests/unit/sdk-dts-build.test.ts` - assert the generated declaration surface exposes `privateKeySeed: string` and no `DevicePrivateKeyJwk` type.
- Modify: `tests/fixtures/sdk-dts-consumer/module-device-usage.ts` - typecheck the public module surface using `privateKeySeed` only.
- Modify: `docs/integration/device-sdk.md` - update the public integration guide and bootstrap narrative to show seed input instead of JWK input.
- Modify: `README.md` - update the top-level Device SDK example so the repo no longer demonstrates the old API.

## Task 1: Rename the public Device SDK input and keep the happy path green

**Files:**

- Modify: `tests/helpers/sdk.ts`
- Modify: `tests/unit/sdk-device-module.test.ts`
- Modify: `src/sdk/types.ts`
- Modify: `src/sdk/device-auth.ts`
- Modify: `src/sdk/device.ts`

- [ ] **Step 1: Write the failing happy-path test updates first**

Update `tests/helpers/sdk.ts` and `tests/unit/sdk-device-module.test.ts` so every Device SDK call site uses `privateKeySeed` instead of `privateKey`.

Use this fixture helper:

```ts
export function createDevicePrivateKeySeed(): string {
  return '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM';
}
```

Then update every `createDeviceSdk(...)` call in `tests/unit/sdk-device-module.test.ts` to this shape:

```ts
const sdk = createDeviceSdk({
  serverBaseUrl: 'https://auth.example.com',
  credentialId: '550e8400-e29b-41d4-a716-446655440000',
  privateKeySeed: createDevicePrivateKeySeed(),
  fetch,
  now: () => Date.parse('2026-04-12T00:00:00.000Z'),
});
```

- [ ] **Step 2: Run the Device SDK unit file and confirm it fails on the old API**

Run: `npx vitest run tests/unit/sdk-device-module.test.ts`

Expected: FAIL because `DeviceSdkOptions` still requires `privateKey`, and runtime code still tries to pass a JWK into `authenticateDevice(...)`.

- [ ] **Step 3: Rename the public options type and remove the public JWK export**

Update `src/sdk/types.ts` so the public surface becomes:

```ts
export type DeviceSdkOptions = {
  serverBaseUrl: string;
  credentialId: string;
  privateKeySeed: string;
  fetch?: FetchLike;
  now?: () => number;
};
```

Update the export block in `src/sdk/device.ts` so it no longer re-exports `DevicePrivateKeyJwk`:

```ts
export type {
  DeviceSdkApi,
  DeviceSdkOptions,
  Listener,
  MeResponse,
  SessionResult,
  SessionSnapshot,
  SdkStatus,
} from './types.js';
```

- [ ] **Step 4: Implement synchronous seed validation and Ed25519 key derivation in the bootstrap path**

Update `src/sdk/device-auth.ts` to accept a derived `KeyObject` instead of a JWK, and add a local derivation helper:

```ts
import { createPrivateKey, sign, type KeyObject } from 'node:crypto';
import { createSdkError } from './errors.js';

const DEVICE_SEED_ERROR =
  'privateKeySeed must be a base64url-encoded 32-byte string';
const ED25519_PKCS8_SEED_PREFIX = Buffer.from(
  '302e020100300506032b657004220420',
  'hex',
);

export function deriveDevicePrivateKey(privateKeySeed: string): KeyObject {
  if (typeof privateKeySeed !== 'string') {
    throw createSdkError('sdk_init_failed', DEVICE_SEED_ERROR);
  }

  if (!/^[A-Za-z0-9_-]+$/.test(privateKeySeed)) {
    throw createSdkError('sdk_init_failed', DEVICE_SEED_ERROR);
  }

  const seed = Buffer.from(privateKeySeed, 'base64url');

  if (seed.length !== 32) {
    throw createSdkError('sdk_init_failed', DEVICE_SEED_ERROR);
  }

  return createPrivateKey({
    format: 'der',
    type: 'pkcs8',
    key: Buffer.concat([ED25519_PKCS8_SEED_PREFIX, seed]),
  });
}
```

Then change the `authenticateDevice(...)` input contract to:

```ts
export async function authenticateDevice(input: {
  credentialId: string;
  http: HttpClient;
  privateKey: KeyObject;
  session: DeviceAuthSession;
}): Promise<void> {
```

and keep signing with the already-derived key:

```ts
const signature = encodeBase64Url(
  sign(null, Buffer.from(start.challenge, 'utf8'), input.privateKey),
);
```

Finally, update `src/sdk/device.ts` so construction validates immediately and caches the derived key before `ready` starts:

```ts
const privateKey = deriveDevicePrivateKey(options.privateKeySeed);

const ready = (async () => {
  await authenticateDevice({
    credentialId: options.credentialId,
    http,
    privateKey,
    session: {
      async acceptSessionResponse(response) {
        // existing body unchanged
      },
    },
  });
})();
```

- [ ] **Step 5: Re-run the Device SDK unit file and confirm the renamed happy path passes**

Run: `npx vitest run tests/unit/sdk-device-module.test.ts`

Expected: PASS. The existing success-path and lifecycle tests should still pass, now using `privateKeySeed`.

- [ ] **Step 6: Commit the public contract rename + seed derivation slice**

```bash
git add src/sdk/types.ts src/sdk/device.ts src/sdk/device-auth.ts tests/helpers/sdk.ts tests/unit/sdk-device-module.test.ts
git commit -m "feat: switch device sdk input to seed"
```

## Task 2: Add invalid-seed coverage and lock initialization-time failures

**Files:**

- Modify: `tests/unit/sdk-device-module.test.ts`
- Modify: `src/sdk/device-auth.ts`

- [ ] **Step 1: Add the two new failing initialization tests**

Extend `tests/unit/sdk-device-module.test.ts` with these exact cases near the other construction tests:

```ts
it('throws during construction for invalid base64url seed text', () => {
  expect(() =>
    createDeviceSdk({
      serverBaseUrl: 'https://auth.example.com',
      credentialId: '550e8400-e29b-41d4-a716-446655440000',
      privateKeySeed: 'not/base64url+',
      fetch: vi.fn(),
    }),
  ).toThrowError(
    /sdk_init_failed: privateKeySeed must be a base64url-encoded 32-byte string/,
  );
});

it('throws during construction for decoded seeds that are not 32 bytes', () => {
  expect(() =>
    createDeviceSdk({
      serverBaseUrl: 'https://auth.example.com',
      credentialId: '550e8400-e29b-41d4-a716-446655440000',
      privateKeySeed: Buffer.alloc(31, 1).toString('base64url'),
      fetch: vi.fn(),
    }),
  ).toThrowError(
    /sdk_init_failed: privateKeySeed must be a base64url-encoded 32-byte string/,
  );
});
```

These tests intentionally assert synchronous construction failure, not `sdk.ready` rejection.

- [ ] **Step 2: Run the targeted invalid-input tests and confirm the first red state**

Run: `npx vitest run tests/unit/sdk-device-module.test.ts -t "throws during construction"`

Expected: FAIL if validation is still too permissive or if errors are delayed into the async login path.

- [ ] **Step 3: Tighten the validation helper without changing the login protocol**

Keep the validation rules in `src/sdk/device-auth.ts` aligned exactly with the spec:

```ts
if (typeof privateKeySeed !== 'string') {
  throw createSdkError('sdk_init_failed', DEVICE_SEED_ERROR);
}

if (!/^[A-Za-z0-9_-]+$/.test(privateKeySeed)) {
  throw createSdkError('sdk_init_failed', DEVICE_SEED_ERROR);
}

const seed = Buffer.from(privateKeySeed, 'base64url');

if (seed.length !== 32) {
  throw createSdkError('sdk_init_failed', DEVICE_SEED_ERROR);
}
```

Do **not** change `/ed25519/start`, `/ed25519/verify`, session refresh, `ready`, `dispose()`, or `logout()` behavior in this task.

- [ ] **Step 4: Re-run the full Device SDK unit file to prove success + invalid input + lifecycle non-regression together**

Run: `npx vitest run tests/unit/sdk-device-module.test.ts`

Expected: PASS. This single file should now cover:

1. valid `privateKeySeed` login success,
2. invalid base64url initialization failure,
3. wrong decoded length initialization failure,
4. non-regression for `ready`, `dispose`, `logout`, and async-disposal behavior.

- [ ] **Step 5: Commit the validation coverage**

```bash
git add src/sdk/device-auth.ts tests/unit/sdk-device-module.test.ts
git commit -m "test: cover invalid device seed input"
```

## Task 3: Remove JWK from the declaration surface and DTS consumer fixtures

**Files:**

- Modify: `tests/unit/sdk-dts-build.test.ts`
- Modify: `tests/fixtures/sdk-dts-consumer/module-device-usage.ts`
- Modify: `src/sdk/types.ts`
- Modify: `src/sdk/device.ts`

- [ ] **Step 1: Write the failing declaration assertions and consumer fixture first**

Update `tests/fixtures/sdk-dts-consumer/module-device-usage.ts` to typecheck only the new public surface:

```ts
import { createDeviceSdk } from 'auth-mini/sdk/device';
import type { DeviceSdkApi, SessionSnapshot } from 'auth-mini/sdk/device';

const privateKeySeed = '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM';

const sdk: DeviceSdkApi = createDeviceSdk({
  serverBaseUrl: 'https://auth.example.com',
  credentialId: '550e8400-e29b-41d4-a716-446655440000',
  privateKeySeed,
});

const state: SessionSnapshot = sdk.session.getState();
void state;
```

Then extend `tests/unit/sdk-dts-build.test.ts` with these concrete assertions:

```ts
it('emits device sdk module declarations with seed input only', () => {
  const output = readDeviceModuleDeclaration();
  const sharedTypes = readSharedTypesDeclaration();

  expect(output).toContain('export declare function createDeviceSdk');
  expect(sharedTypes).toContain('privateKeySeed: string');
  expect(sharedTypes).not.toContain('DevicePrivateKeyJwk');
  expect(sharedTypes).not.toContain('privateKey: DevicePrivateKeyJwk');
});
```

- [ ] **Step 2: Run the declaration build and typecheck commands to capture the failing surface**

Run: `npm run build && npx vitest run tests/unit/sdk-dts-build.test.ts && npx tsc -p tests/fixtures/sdk-dts-consumer/tsconfig.json`

Expected: FAIL until the emitted declarations and consumer fixture both stop depending on `DevicePrivateKeyJwk`.

- [ ] **Step 3: Finish the public-surface cleanup in source**

Ensure the source-of-truth declarations match the new fixture expectations:

```ts
export type DeviceSdkOptions = {
  serverBaseUrl: string;
  credentialId: string;
  privateKeySeed: string;
  fetch?: FetchLike;
  now?: () => number;
};
```

and keep `src/sdk/device.ts` free of `DevicePrivateKeyJwk` exports or references.

- [ ] **Step 4: Re-run the declaration build and consumer typecheck until both pass**

Run: `npm run build && npx vitest run tests/unit/sdk-dts-build.test.ts && npx tsc -p tests/fixtures/sdk-dts-consumer/tsconfig.json`

Expected: PASS. The built declaration surface and the consumer fixture should expose `privateKeySeed` only.

- [ ] **Step 5: Commit the declaration-surface cleanup**

```bash
git add src/sdk/types.ts src/sdk/device.ts tests/unit/sdk-dts-build.test.ts tests/fixtures/sdk-dts-consumer/module-device-usage.ts
git commit -m "test: lock device sdk seed declarations"
```

## Task 4: Update repo docs/examples that still demonstrate the old API

**Files:**

- Modify: `docs/integration/device-sdk.md`
- Modify: `README.md`

- [ ] **Step 1: Replace the public JWK examples with seed-string examples**

Update the main code example in `docs/integration/device-sdk.md` to:

```ts
const sdk = createDeviceSdk({
  serverBaseUrl: 'https://auth.example.com',
  credentialId: '550e8400-e29b-41d4-a716-446655440000',
  privateKeySeed: '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM',
});
```

Update the login-flow narrative there so step 2 says:

```md
2. decode the configured `privateKeySeed`, derive the Ed25519 private key locally, and sign the returned challenge
```

Then update the Device SDK snippet in `README.md` to the same `privateKeySeed` example.

- [ ] **Step 2: Verify there are no remaining public doc examples using the old field**

Run: `npx vitest run tests/unit/sdk-device-module.test.ts tests/unit/sdk-dts-build.test.ts && npx tsc -p tests/fixtures/sdk-dts-consumer/tsconfig.json`

Expected: PASS. There is no dedicated markdown linter in `package.json`, so the regression proof for this docs task is keeping the runtime/declaration checks green after the doc edits.

- [ ] **Step 3: Commit the docs cleanup**

```bash
git add docs/integration/device-sdk.md README.md
git commit -m "docs: update device sdk seed examples"
```

## Final Verification

- [ ] Run: `npm run build && npx vitest run tests/unit/sdk-device-module.test.ts tests/unit/sdk-dts-build.test.ts && npx tsc -p tests/fixtures/sdk-dts-consumer/tsconfig.json`
- [ ] Expected: PASS with the Device SDK using `privateKeySeed`, initialization-time validation enforced, lifecycle tests still green, and declaration fixtures free of `DevicePrivateKeyJwk`.

## Self-Review

- **Spec coverage:** Covered the public rename to `privateKeySeed`, synchronous string/base64url/32-byte validation, internal Ed25519 derivation, unchanged `/ed25519/start` + `/ed25519/verify` protocol, success + invalid-base64url + wrong-length + lifecycle tests, DTS/fixture/export cleanup, and doc updates in the surfaces that currently demonstrate the old API.
- **Placeholder scan:** No `TODO`, `TBD`, “appropriate error handling”, “write tests”, or “similar to previous task” placeholders remain; every task names exact files, snippets, commands, and commit messages.
- **Type consistency:** The plan consistently uses `privateKeySeed: string` as the only public Device SDK key input, keeps `DeviceSdkApi` / `SessionSnapshot` naming unchanged, and removes `DevicePrivateKeyJwk` from the public module/declaration examples.
