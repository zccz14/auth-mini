# Browser SDK integration

auth-mini exposes one low-level API SDK plus higher-level runtime SDKs:

- `auth-mini/sdk/api`: typed low-level HTTP/OpenAPI SDK. See [API SDK integration](./api-sdk.md).
- `auth-mini/sdk/browser`: high-level browser SDK with browser storage and cross-tab semantics.
- `auth-mini/sdk/device`: high-level device SDK for isolated memory-only sessions in non-browser clients. See [Device SDK integration](./device-sdk.md).

For the low-level HTTP API contract, see `openapi.yaml` and [`auth-mini/sdk/api`](./api-sdk.md).
This guide covers higher-level runtime behavior for the browser SDK only.

## Recommended: module/browser-subpath usage

Import the browser SDK module and construct it with your server base URL:

```ts
import { createBrowserSdk } from 'auth-mini/sdk/browser';

const sdk = createBrowserSdk('https://auth.example.com');
```

The current `examples/demo/` app follows that module path as a Vite + React bundle. It imports `auth-mini/sdk/browser` at build time, mounts under a `HashRouter`, and the embedded `/web` GUI uses the same Rust server by resolving the relative base URL `..` from `window.location.href` before creating the SDK. The published demo now uses the bundled app entrypoint instead of any hand-wired browser bundle path.

Browser SDK persistence semantics remain browser-only: the maintained browser module path uses browser storage and browser-oriented recovery behavior. The new device SDK does not change those semantics.

## Cross-origin guidance

Browser pages may be hosted on a different origin than the auth server. Store the page origin with the demo setup page or loopback-only `PUT /admin/setup` for WebAuthn and related origin checks; HTTP CORS is served separately with `Access-Control-Allow-Origin: *`.

Same-origin proxy deployment is still supported if you prefer to front auth-mini through your app origin, but direct cross-origin browser access to the auth-mini API is also supported. Because auth-mini serves wildcard CORS for HTTP routes, downstream apps should decide whether to keep direct access or place their own proxy/gateway controls in front.

### Localhost example

This page:

- page origin: `http://localhost:3000`
- server base URL: `http://127.0.0.1:7777`

works when `http://localhost:3000` has been added from the setup page or local admin setup API and the browser app initializes the SDK with that server base URL:

```ts
import { createBrowserSdk } from 'auth-mini/sdk/browser';

const sdk = createBrowserSdk('http://127.0.0.1:7777');
```

## Startup state model

If a refresh token is already stored, startup enters `recovering` first and then settles to `authenticated` or `anonymous` after recovery completes. `sdk.session.getState()` only exposes session/auth fields; it never includes a cached `/me` snapshot.

## Explicit `/me` reads

- `await sdk.me.fetch()` performs one explicit authenticated `/me` request and resolves with that response.
- `sdk.me.fetch()` may refresh the access token first when the stored session requires it, but it does not write `/me` into shared session state or browser storage.
- Callers own any local memoization, loading state, error state, and refresh timing for `/me`.

## Passkey example

```ts
import { createBrowserSdk } from 'auth-mini/sdk/browser';

const sdk = createBrowserSdk('https://auth.example.com');

async function signIn(email: string, code: string) {
  await sdk.email.start({ email });
  await sdk.email.verify({ email, code });
  console.log(await sdk.me.fetch());
}

async function signInWithPasskey() {
  await sdk.webauthn.authenticate();
  console.log(await sdk.me.fetch());
}
```

## Operational limits

- The browser SDK requires an explicit server base URL via `createBrowserSdk(serverBaseUrl)`.
- Store the browser page origin via the setup page or `PUT /admin/setup` for WebAuthn and related origin checks; this is separate from the HTTP CORS policy.
- Multiple tabs sharing one session can still race during refresh-token rotation, but the loser tab enters `recovering` and usually converges to the latest shared session state.
- That convergence only shares session tokens/status; `/me` remains caller-owned and must be fetched explicitly in each tab when needed.

## Demo and publishing guidance

`examples/demo/` is the interactive browser-flow demo source. `docs/` remains the canonical static reference source.

The embedded `/web` GUI no longer accepts an auth-server-origin override. It always calls the same Rust server that served the GUI by resolving the relative base URL `..`.

The current publish flow builds the demo with the root-level `demo:build` script and deploys `examples/demo/dist` as the static site root.

- Treat `examples/demo/` as the source for the interactive demo and `examples/demo/dist` as the publish artifact.
- For GitHub Pages, upload `examples/demo/dist` directly rather than a sibling `demo/` + `dist/` artifact layout.
- The published page should be served from the site root for that artifact, such as `https://<user>.github.io/auth-mini/` for project Pages or `https://your-domain.example/` for a custom domain.
- The stored setup origin must use the final **page origin** (`window.location.origin`) for WebAuthn/browser origin checks, not the server base URL.
- If a downstream app serves its own frontend separately from auth-mini, that app should pass its chosen server base URL to `createBrowserSdk(...)`; the built-in `/web` GUI is same-server only.
- If you attach a custom GitHub Pages domain, publish a matching `CNAME` file in the deployed site root so GitHub serves that domain consistently; then store `https://your-domain.example` from the setup page or local admin setup API.

Example:

- embedded GUI: `https://auth.example.com/web/`
- server base URL used by the GUI: `https://auth.example.com/`

Open:

```text
https://auth.example.com/web/
```

Start auth-mini with the local listener and database options:

```bash
auth-mini --host 127.0.0.1 --port 7777 --db ./auth-mini.sqlite
```

Then configure the externally visible issuer and published docs origin through the setup page or local admin setup API. The setup API writes `app_meta`, including `app_meta.issuer`; SMTP is optional, and admin Ed25519 bootstrap does not require SMTP.
