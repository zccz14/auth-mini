# Browser SDK integration

auth-mini supports two SDK integration paths:

- Browser SDK: import `createBrowserSdk` from `auth-mini/sdk/browser` for browser storage + cross-tab semantics.
- Device SDK: import `createDeviceSdk` from `auth-mini/sdk/device` for isolated memory-only sessions in non-browser clients. See [Device SDK integration](./device-sdk.md).
- Browser singleton script path: load `GET /sdk/singleton-iife.js`, which exposes `window.AuthMini` and infers its API base URL from the script `src`.

## Recommended: module/browser-subpath usage

Import the browser SDK module and construct it with your auth server origin:

```ts
import { createBrowserSdk } from 'auth-mini/sdk/browser';

const AuthMini = createBrowserSdk('https://auth.zccz14.com');
```

The current `examples/demo/` app follows that module path as a Vite + React bundle. It imports `auth-mini/sdk/browser` at build time, mounts under a `HashRouter`, stays docs-only until you provide `/#/setup?auth-origin=https://your-auth-origin`, then reads `auth-origin` from `window.location.hash` and passes that origin into `createBrowserSdk(serverBaseUrl)`. The published demo now uses the bundled app entrypoint instead of any hand-wired browser bundle path.

Browser SDK persistence semantics remain browser-only: the module and singleton browser paths still use browser storage and browser-oriented recovery behavior. The new device SDK does not change those semantics.

## Singleton script usage

auth-mini also serves a singleton browser SDK at `GET /sdk/singleton-iife.js`.

For TypeScript consumers, the matching declaration file is available at `GET /sdk/singleton-iife.d.ts`. It types `window.AuthMini`, so you can download that file and include it in your TS project. If your toolchain supports it, you can also use that same file as the source for a triple-slash reference or editor-only workflow.

Load the script from the auth server origin. The singleton SDK infers its API base URL from its own `src`, so the script origin and API origin must match.

```html
<script src="https://auth.zccz14.com/sdk/singleton-iife.js"></script>
<script>
  window.AuthMini.session.onChange((state) => {
    console.log('auth status:', state.status);
  });
</script>
```

v1 is intentionally zero-config: the script infers its API base URL from its own `src`, persists session state in `localStorage`, and automatically refreshes access tokens.

## Cross-origin guidance

Browser pages may be hosted on a different origin than the auth server as long as the page origin is explicitly stored in the instance with `npx auth-mini origin add <instance> --value <page-origin>`.

Same-origin proxy deployment is still supported if you prefer to front auth-mini through your app origin, but direct cross-origin loading is the primary browser SDK path.

### Localhost example

This page:

- page origin: `http://localhost:3000`
- auth server origin: `http://127.0.0.1:7777`

works when `http://localhost:3000` has been added with `npx auth-mini origin add ./auth-mini.sqlite --value http://localhost:3000` and the page loads the SDK from the auth server:

```html
<script src="http://127.0.0.1:7777/sdk/singleton-iife.js"></script>
```

## Startup state model

If a refresh token is already stored, startup enters `recovering` first and then settles to `authenticated` or `anonymous` after recovery completes. During recovery, `AuthMini.me.get()` may return the last cached snapshot while `AuthMini.session.getState().status` still reports `recovering`.

## `me.get()` vs `me.reload()`

- `AuthMini.me.get()` returns the current cached `/me` snapshot synchronously.
- `AuthMini.me.reload()` performs authenticated network I/O, follows the SDK refresh rules, updates cached state, and resolves with the fresh `/me` payload.

## Passkey example

```html
<script src="https://auth.zccz14.com/sdk/singleton-iife.js"></script>
<script>
  async function signIn(email, code) {
    await window.AuthMini.email.start({ email });
    await window.AuthMini.email.verify({ email, code });
    console.log(window.AuthMini.me.get());
  }

  async function signInWithPasskey() {
    await window.AuthMini.webauthn.authenticate();
    console.log(window.AuthMini.me.get());
  }
</script>
```

## Operational limits

- The SDK script origin must match the auth API origin because the singleton client derives its base URL from the script `src`.
- Cross-origin browser pages are supported only when the page origin is stored via the `origin` topic commands.
- Multiple tabs sharing one session can still race during refresh-token rotation, but the loser tab enters `recovering` and usually converges to the latest shared session state.
- That convergence depends on receiving a usable shared snapshot before the recovery timeout; otherwise only the local in-memory state falls back to anonymous.

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
