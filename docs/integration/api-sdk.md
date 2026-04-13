# API SDK integration

Use `auth-mini/sdk/api` when you want a typed low-level client for the auth-mini HTTP API.

```ts
import { createApiSdk } from 'auth-mini/sdk/api';

const sdk = createApiSdk({
  baseUrl: 'https://auth.example.com',
});

await sdk.email.start({
  body: { email: 'user@example.com' },
});
```

## Positioning

- `auth-mini/sdk/api`: low-level HTTP contract wrapper around generated OpenAPI operations
- `auth-mini/sdk/browser`: browser storage, recovery, and session lifecycle
- `auth-mini/sdk/device`: Ed25519 device-login lifecycle for Node.js-style runtimes

Use the browser or device SDK when you want those higher-level runtime behaviors. `auth-mini/sdk/api` does not add browser persistence, cross-tab recovery, `ready`, or device-key login orchestration on top of the HTTP contract.

## Runtime configuration

`auth-mini/sdk/api` requires `baseUrl` at runtime. Its public wrapper does not bake in a deployment-specific server origin, so each caller must point the SDK at the auth-mini instance it should talk to.

For the exact route, auth, and schema contract, treat `openapi.yaml` as the source of truth.

## Authenticated requests

For bearer-token endpoints, pass an `auth` callback when you construct the client:

```ts
import { createApiSdk } from 'auth-mini/sdk/api';

const sdk = createApiSdk({
  auth: () => 'access-token',
  baseUrl: 'https://auth.example.com',
});

const me = await sdk.me.get();
```

The SDK applies the bearer header for operations that require authenticated access.
