# Device SDK integration

Use `auth-mini/sdk/device` for Node.js clients (or other runtimes that provide Node's `node:crypto` APIs) that hold an Ed25519 private key seed locally and want an isolated memory-only session.

For the low-level HTTP API contract, see `openapi.yaml` and [`auth-mini/sdk/api`](./api-sdk.md).
This guide covers higher-level runtime behavior for the device SDK only.

## Recommended: module/device-subpath usage

```ts
import { createDeviceSdk } from 'auth-mini/sdk/device';

const sdk = createDeviceSdk({
  serverBaseUrl: 'https://auth.example.com',
  credentialId: '550e8400-e29b-41d4-a716-446655440000',
  privateKeySeed: '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM',
});

await sdk.ready;
console.log(sdk.session.getState().status);
console.log(sdk.me.get());

await sdk.dispose();
```

## Auto-login lifecycle

`createDeviceSdk(...)` starts the device sign-in flow immediately:

1. `POST /ed25519/start` with the configured `credentialId`
2. decode the configured `privateKeySeed`, derive the Ed25519 private key locally, and sign the returned challenge
3. `POST /ed25519/verify` with the signature payload
4. store the resulting session in the instance's in-memory state
5. load `/me` so `sdk.ready` resolves only after the authenticated user snapshot is available

If any step fails, `sdk.ready` rejects and the instance stays responsible only for its own in-memory state.

## Memory-only session semantics

- Device SDK state is instance-local and memory-only.
- It does not read from or write to `Storage`, `localStorage`, or other browser persistence layers.
- Each `createDeviceSdk(...)` call returns a fresh isolated instance with its own session state, `/me` cache, listeners, and refresh lifecycle.
- Restarting the process or disposing the instance drops all locally held device session state.

If you want browser persistence and cross-tab recovery semantics instead, use the browser-specific guide: [Browser SDK integration](./browser-sdk.md).

## `ready`, session state, and refresh

- `sdk.ready` resolves when the initial device login and `/me` sync both succeed.
- `sdk.session.getState()` exposes the same `recovering | authenticated | anonymous` state model used by the browser SDK session controller.
- `sdk.session.refresh()` keeps using the normal session refresh flow, but only against this instance's in-memory session.

## Disposal contract

Device SDK instances support both explicit disposal styles:

```ts
await sdk.dispose();
await sdk[Symbol.asyncDispose]();
```

Both entrypoints are equivalent and idempotent:

- they attempt remote logout when a session is still present
- they always clear the local in-memory session state
- they stop future refresh or recovery updates for that instance

After `dispose()` or `await sdk[Symbol.asyncDispose]()`, APIs that require a live session reject with the SDK error code `disposed_session`, including `sdk.session.refresh()` and `sdk.me.reload()`.
