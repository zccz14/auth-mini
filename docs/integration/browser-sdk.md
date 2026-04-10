# Browser SDK integration

auth-mini supports two browser SDK integration paths:

- Recommended module path: import `createBrowserSdk` from `auth-mini/sdk/browser` and pass the auth server origin explicitly.
- Singleton script path: load `GET /sdk/singleton-iife.js`, which exposes `window.AuthMini` and infers its API base URL from the script `src`.

## Recommended: module/browser-subpath usage

Import the browser SDK module and construct it with your auth server origin:

```ts
import { createBrowserSdk } from 'auth-mini/sdk/browser';

const AuthMini = createBrowserSdk('https://auth.zccz14.com');
```

The hosted demo/docs page follows that module path. It imports `auth-mini/sdk/browser`, uses an import map to resolve that specifier to `../dist/sdk/browser.js`, and feeds `?sdk-origin=https://your-auth-origin` into `createBrowserSdk(serverBaseUrl)`. That query parameter no longer tells the page to load `/sdk/singleton-iife.js`.

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

`demo/` is an interactive companion for trying the browser flow. `docs/` is the canonical static reference source.

The published demo/docs page does **not** auto-target localhost anymore. It stays in a neutral docs-only state until you provide `?sdk-origin=https://your-auth-origin`, which becomes the `createBrowserSdk(serverBaseUrl)` value for the playground.

The published static site keeps both `demo/` and `dist/` in the artifact.

- Publish a static site root that includes both `demo/` and `dist/sdk/browser.js`, then serve the interactive page from `/demo/` so its import map can keep resolving `auth-mini/sdk/browser` to `../dist/sdk/browser.js`.
- For GitHub Pages, that means the Pages artifact/root should contain sibling `demo/` and `dist/` directories rather than only the contents of `demo/`.
- Project Pages subpaths such as `https://<user>.github.io/auth-mini/demo/` are fine because the demo uses relative local assets.
- `npx auth-mini origin add <instance> --value ...` must use the final **page origin** (`window.location.origin`), not the auth server origin.
- If the docs page and auth server live on different origins, keep the docs page on its static host under `/demo/` and append `?sdk-origin=https://your-auth-origin` so the page still imports the local module bundle while `createBrowserSdk(...)` points API calls at the auth host.
- If you attach a custom GitHub Pages domain, publish a matching `CNAME` file at the static site root so GitHub serves that domain consistently; then store `https://your-domain.example` with `npx auth-mini origin add <instance> --value https://your-domain.example`.

Example:

- published site root: `https://example.github.io/auth-mini`
- auth server origin: `https://auth.zccz14.com`

Open:

```text
https://example.github.io/auth-mini/demo/?sdk-origin=https://auth.zccz14.com
```

Configure the published docs origin, then start auth-mini with:

```bash
npx auth-mini origin add ./auth-mini.sqlite --value https://example.github.io
npx auth-mini start ./auth-mini.sqlite --issuer https://auth.zccz14.com
```
