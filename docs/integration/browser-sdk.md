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

The current `ui-web/` app follows that module path as a Vite + React bundle. It imports `auth-mini/sdk/browser` at build time, mounts under a `HashRouter`, and the embedded `/web` GUI uses the same Rust server by resolving the relative base URL `..` from `window.location.href` before creating the SDK. The published demo now uses the bundled app entrypoint instead of any hand-wired browser bundle path.

Browser SDK persistence semantics remain browser-only: the maintained browser module path uses browser storage and browser-oriented recovery behavior. The new device SDK does not change those semantics.

## Redirect sign-in guidance

Passkey registration and sign-in are completed on the Auth Mini server page. Downstream apps should send users to the Auth Mini instance for browser auth and then consume the returned session or token result, similar to a "Sign in with Auth Mini" flow. WebAuthn origin is derived from the configured issuer; clients do not configure a separate business-app page origin.

For the redirect URL contract, callback fragment fields, and business App responsibilities, see [业务 App 跳转登录接入](./login-redirect.md).

HTTP CORS remains separate from WebAuthn origin policy. Auth Mini serves wildcard CORS for API routes, so downstream apps should decide whether direct API access or a proxy/gateway is appropriate for their deployment.

### Localhost example

The embedded GUI page and server share one origin:

- page URL: `http://127.0.0.1:7777/web/`
- server base URL: `http://127.0.0.1:7777`
- issuer: `http://127.0.0.1:7777`
- rp_id: `127.0.0.1`

A separate business app should redirect to that Auth Mini page for passkey sign-in instead of running the passkey ceremony on its own origin:

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
- Configure the issuer and passkey RP ID on the Auth Mini instance; passkey requests use that server-side configuration.
- Multiple tabs sharing one session can still race during refresh-token rotation, but the loser tab enters `recovering` and usually converges to the latest shared session state.
- That convergence only shares session tokens/status; `/me` remains caller-owned and must be fetched explicitly in each tab when needed.

## Demo and publishing guidance

`ui-web/` is the interactive browser-flow demo source. `docs/` remains the canonical static reference source.

The embedded `/web` GUI no longer accepts an auth-server-origin override. It always calls the same Rust server that served the GUI by resolving the relative base URL `..`.

The current publish flow builds the demo with the root-level `demo:build` script and deploys `ui-web/dist` as the static site root.

- Treat `ui-web/` as the source for the interactive demo and `ui-web/dist` as the publish artifact.
- For GitHub Pages, upload `ui-web/dist` directly rather than a sibling `demo/` + `dist/` artifact layout.
- The published page should be served from the site root for that artifact, such as `https://<user>.github.io/auth-mini/` for project Pages or `https://your-domain.example/` for a custom domain.
- Configure the issuer to the final Auth Mini server origin and set `rp_id` to that host or a valid parent domain.
- If a downstream app serves its own frontend separately from auth-mini, it should redirect users to the Auth Mini page for browser sign-in; the built-in `/web` GUI is same-server only.
- If you attach a custom GitHub Pages domain for docs, publish a matching `CNAME` file in the deployed site root so GitHub serves that domain consistently.

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

Then configure the externally visible issuer and passkey RP ID through the admin configuration page or API. The setup API initializes the admin Ed25519 credential; SMTP is optional, and admin Ed25519 bootstrap does not require SMTP.
