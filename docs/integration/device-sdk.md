# Device SDK integration

Use `auth-mini/sdk/device` for Node or other non-browser clients that hold an Ed25519 private key locally and want an isolated memory-only session.

## Recommended: module/device-subpath usage

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

## Auto-login lifecycle

`createDeviceSdk(...)` starts the device sign-in flow immediately:

1. `POST /ed25519/start` with the configured `credentialId`
2. sign the returned challenge locally with `privateKey`
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
