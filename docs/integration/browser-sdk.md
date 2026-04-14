# Browser SDK integration

auth-mini exposes one low-level API SDK plus higher-level runtime SDKs:

- `auth-mini/sdk/api`: typed low-level HTTP/OpenAPI SDK. See [API SDK integration](./api-sdk.md).
- `auth-mini/sdk/browser`: high-level browser SDK with browser storage and cross-tab semantics.
- `auth-mini/sdk/device`: high-level device SDK for isolated memory-only sessions in non-browser clients. See [Device SDK integration](./device-sdk.md).

For the low-level HTTP API contract, see `openapi.yaml` and [`auth-mini/sdk/api`](./api-sdk.md).
This guide covers higher-level runtime behavior for the browser SDK only.

## Recommended: module/browser-subpath usage

Import the browser SDK module and construct it with your auth server origin:

```ts
import { createBrowserSdk } from 'auth-mini/sdk/browser';

const sdk = createBrowserSdk('https://auth.zccz14.com');
```

The current `examples/demo/` app follows that module path as a Vite + React bundle. It imports `auth-mini/sdk/browser` at build time, mounts under a `HashRouter`, stays docs-only until you provide `/#/setup?auth-origin=https://your-auth-origin`, then reads `auth-origin` from `window.location.hash` and passes that origin into `createBrowserSdk(serverBaseUrl)`. The published demo now uses the bundled app entrypoint instead of any hand-wired browser bundle path.

Browser SDK persistence semantics remain browser-only: the maintained browser module path uses browser storage and browser-oriented recovery behavior. The new device SDK does not change those semantics.

## Cross-origin guidance

Browser pages may be hosted on a different origin than the auth server as long as the page origin is explicitly stored in the instance with `npx auth-mini origin add <instance> --value <page-origin>`.

Same-origin proxy deployment is still supported if you prefer to front auth-mini through your app origin, but direct cross-origin loading is the primary browser SDK path.

### Localhost example

This page:

- page origin: `http://localhost:3000`
- auth server origin: `http://127.0.0.1:7777`

works when `http://localhost:3000` has been added with `npx auth-mini origin add ./auth-mini.sqlite --value http://localhost:3000` and the page loads the SDK from the auth server:

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

const sdk = createBrowserSdk('https://auth.zccz14.com');

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

- The browser SDK requires an explicit auth server origin via `createBrowserSdk(serverBaseUrl)`.
- Cross-origin browser pages are supported only when the page origin is stored via the `origin` topic commands.
- Multiple tabs sharing one session can still race during refresh-token rotation, but the loser tab enters `recovering` and usually converges to the latest shared session state.
- That convergence only shares session tokens/status; `/me` remains caller-owned and must be fetched explicitly in each tab when needed.

## Demo and publishing guidance

`examples/demo/` is the interactive browser-flow demo source. `docs/` remains the canonical static reference source.

The published demo/docs page does **not** auto-target localhost anymore. It stays in a neutral docs-only state until you provide `/#/setup?auth-origin=https://your-auth-origin`, which becomes the `createBrowserSdk(serverBaseUrl)` value for the playground.

The current publish flow builds the demo with the root-level `demo:build` script and deploys `examples/demo/dist` as the static site root.

- Treat `examples/demo/` as the source for the interactive demo and `examples/demo/dist` as the publish artifact.
- For GitHub Pages, upload `examples/demo/dist` directly rather than a sibling `demo/` + `dist/` artifact layout.
- The published page should be served from the site root for that artifact, such as `https://<user>.github.io/auth-mini/` for project Pages or `https://your-domain.example/` for a custom domain.
- `npx auth-mini origin add <instance> --value ...` must use the final **page origin** (`window.location.origin`), not the auth server origin.
- If the docs page and auth server live on different origins, keep the page on its static host and append `/#/setup?auth-origin=https://your-auth-origin` so the published demo continues calling `createBrowserSdk(...)` against the auth host.
- If you attach a custom GitHub Pages domain, publish a matching `CNAME` file in the deployed site root so GitHub serves that domain consistently; then store `https://your-domain.example` with `npx auth-mini origin add <instance> --value https://your-domain.example`.

Example:

- published site root: `https://example.github.io/auth-mini`
- auth server origin: `https://auth.zccz14.com`

Open:

```text
https://example.github.io/auth-mini/#/setup?auth-origin=https://auth.zccz14.com
```

Configure the published docs origin, then start auth-mini with:

```bash
npx auth-mini origin add ./auth-mini.sqlite --value https://example.github.io
npx auth-mini start ./auth-mini.sqlite --issuer https://auth.zccz14.com
```
