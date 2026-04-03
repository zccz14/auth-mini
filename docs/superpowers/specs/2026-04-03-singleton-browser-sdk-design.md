# Singleton browser SDK Design

## Context

- The current server already exposes the core auth HTTP API, including email OTP, session refresh/logout, WebAuthn registration/authentication, and `GET /me`.
- The current browser integration in `demo/main.js` still carries a large amount of client-side glue: HTTP calls, token persistence, WebAuthn binary conversions, and flow sequencing.
- The immediate product goal is simpler frontend adoption, not maximum SDK flexibility.
- The user prefers a server-hosted browser SDK distributed as a single IIFE file, with the simplest possible integration path.

## Goals

- Reduce frontend integration code by moving common auth client logic into a server-hosted browser SDK.
- Let browser apps integrate by loading a single script from the auth server.
- Expose one global singleton API on `window` with no explicit client construction or configuration step.
- Always persist session data in `localStorage`.
- Always enable automatic token refresh.
- Guarantee that successful login promises resolve only after both session tokens and the current `/me` state are ready for immediate use.

## Non-goals

- Supporting multiple client instances in v1.
- Supporting reliable multi-tab session coordination in v1.
- Supporting runtime SDK configuration for storage mode, refresh behavior, or base URL.
- Shipping UI components, prebuilt forms, or opinionated DOM helpers.
- Changing existing auth route paths or business semantics.
- Reworking unrelated server modules.

## Decision

Add a server endpoint at `GET /sdk/singleton-iife.js` that returns a browser IIFE SDK. The script injects `window.MiniAuth`, infers its API base URL from the script `src`, persists auth state in `localStorage`, automatically refreshes tokens ahead of expiry, and exposes a singleton auth API that wraps the existing HTTP and WebAuthn flows.

## Why this direction

- A singleton global is the shortest path from “no SDK” to “frontend can drop in one script and start calling auth methods.”
- Removing configuration options avoids pushing setup complexity back to application code.
- Using the script URL as the source of truth keeps deployment and integration aligned: the SDK naturally talks to the same auth server that served it.
- Keeping v1 singleton-only avoids over-design. If a future multi-instance SDK is needed, it can be shipped from a separate endpoint without breaking this contract.

## Distribution and bootstrap

### Endpoint

- Add `GET /sdk/singleton-iife.js`.
- Respond with `Content-Type: application/javascript`.
- The response body is a self-executing browser bundle, not JSON.

### Initialization model

- The SDK must work with a plain external script tag:

```html
<script src="https://auth.example.com/sdk/singleton-iife.js"></script>
```

- On load, the script creates `window.MiniAuth`.
- The SDK must not require `configure()` or `createClient()` in v1.
- The SDK must assume it was loaded as an external script. If it cannot determine its own script URL, initialization should fail with an explicit SDK error rather than silently guessing.

### Base URL inference

- Infer the API base URL from the currently executing script URL by stripping the trailing `/sdk/singleton-iife.js` path segment.
- Example: if the SDK script URL is `https://auth.example.com/sdk/singleton-iife.js`, the inferred API base URL is `https://auth.example.com`.
- Example: if the SDK script URL is `https://app.example.com/api/sdk/singleton-iife.js`, the inferred API base URL is `https://app.example.com/api`.
- SDK API calls should then target the existing server routes relative to that inferred base URL, such as `<baseUrl>/email/start`.
- Do not expose a runtime override in v1.

### Deployment topology

- v1 is defined for same-origin SDK/API deployment only.
- In practice this means the page should either:
  - be served from the same origin as the auth server, or
  - reach the auth server through a same-origin reverse proxy such as `/api`, while also loading the SDK from that same proxied base path.
- Cross-origin script loading plus cross-origin API calls is out of scope for v1 because the current server does not define CORS behavior and authenticated requests use `Authorization` headers.
- If cross-origin browser integration is needed later, it should be designed explicitly as a separate contract rather than assumed by this singleton SDK.

## Public API

The SDK injects a single global object:

- `window.MiniAuth`

Recommended public shape:

- `MiniAuth.email.start({ email })`
- `MiniAuth.email.verify({ email, code })`
- `MiniAuth.webauthn.register()`
- `MiniAuth.webauthn.authenticate()`
- `MiniAuth.me.get()`
- `MiniAuth.me.reload()`
- `MiniAuth.session.refresh()`
- `MiniAuth.session.logout()`
- `MiniAuth.session.getState()`
- `MiniAuth.session.onChange(listener)`

### API semantics

- `email.start()` forwards to `POST /email/start` and returns the server JSON response.
- `email.verify()` forwards to `POST /email/verify`, persists the returned session tokens, immediately fetches `GET /me`, updates singleton state, and resolves only after both steps succeed.
- If `email.verify()` receives tokens successfully but the follow-up `/me` load fails, the SDK must clear the just-persisted session state, clear cached `me`, transition to anonymous, and reject the promise.
- `webauthn.register()` wraps both registration routes plus browser WebAuthn APIs and returns the registration verification result.
- `webauthn.authenticate()` wraps both authentication routes plus browser WebAuthn APIs, persists the returned session tokens, immediately fetches `GET /me`, updates singleton state, and resolves only after both steps succeed.
- If `webauthn.authenticate()` receives tokens successfully but the follow-up `/me` load fails, the SDK must clear the just-persisted session state, clear cached `me`, transition to anonymous, and reject the promise.
- `me.get()` is a synchronous cached getter that returns the current in-memory `me` snapshot without performing network I/O.
- `me.reload()` performs `GET /me` using the current session and refresh rules, updates singleton state, and resolves with the fresh `/me` payload.
- `session.refresh()` is publicly callable but also used internally by the SDK.
- `session.logout()` first ensures an access token is available using the normal refresh rules when possible, then attempts `POST /session/logout`, and finally clears local singleton state regardless of remote result.
- `session.getState()` returns the current in-memory snapshot.
- `session.onChange(listener)` subscribes to state transitions and returns an unsubscribe function.

## State model

The singleton keeps one logical auth state shared across the page.

State should include:

- `status: 'recovering' | 'authenticated' | 'anonymous'`
- `authenticated: boolean`
- `accessToken: string | null`
- `refreshToken: string | null`
- `expiresAt: string | null`
- `me: <GET /me payload> | null`

### Persistence

- Persist session state in `localStorage` only.
- On startup, the SDK reads persisted state from `localStorage` and hydrates the singleton.
- The cached `me` payload may also be stored so page reloads can restore a last-known authenticated snapshot immediately, but any authenticated API use must still obey refresh and verification rules.
- Persisted `expiresAt` is computed client-side when a login or refresh response is received: `expiresAt = receivedAt + expires_in`.
- `receivedAt` should be captured from the client clock immediately when the successful response is processed.
- On boot, if the persisted refresh token is missing, the SDK starts unauthenticated.
- On boot, if the persisted refresh token exists, the SDK must enter `status: 'recovering'`, hydrate the cached snapshot as provisional UI data, and immediately start session recovery.
- Boot-time recovery should attempt refresh when needed under the normal proactive-refresh rules, then load `/me`, then transition to either `status: 'authenticated'` or `status: 'anonymous'`.
- While `status` is `recovering`, `me.get()` may return the cached snapshot, but callers can distinguish this from a verified authenticated state via `session.getState().status` or `onChange` notifications.

### Immediate post-login guarantee

- For both `email.verify()` and `webauthn.authenticate()`, promise resolution means all of the following are already complete:
  - session tokens have been persisted
  - singleton in-memory session state has been updated
  - `GET /me` has succeeded
  - singleton `me` state is populated
- Therefore, immediately after a resolved login call, synchronous `MiniAuth.me.get()` must return a consistent authenticated state without relying on caller-managed timing.

## Automatic refresh behavior

### Default behavior

- Automatic refresh is mandatory in v1.
- The SDK should refresh access tokens proactively rather than waiting for near-expiry failure windows.

### Refresh threshold

- Use an early-refresh window of 5 minutes before token expiry.
- If the token lifetime is shorter than 10 minutes, use half of the token lifetime as the proactive refresh threshold instead.
- The intent is to avoid a narrow “expires in seconds” window that could fail during transient network issues or page activity bursts.

### Request gating

- Before sending any authenticated request, the SDK checks whether the current access token is inside the proactive refresh window.
- If yes, it refreshes first and only then continues the original request.

### Single-flight refresh

- At most one refresh request may be in flight at a time.
- If multiple SDK calls detect that refresh is needed, they all wait on the same in-flight refresh operation.
- When the refresh succeeds, waiting requests continue with the new access token.

### Multi-tab limitation

- v1 does not attempt robust multi-tab refresh-token coordination.
- Because refresh tokens rotate, multiple tabs using the same persisted session may race and invalidate one another.
- The documented v1 contract is therefore single-tab reliability, not multi-tab correctness.
- Implementation may still listen to the `storage` event and rehydrate state as a best-effort improvement, but correct cross-tab locking is not required for this version.

### Post-refresh state

- After a successful refresh, the SDK should also refresh `/me` so that singleton state stays coherent, not merely token-valid.
- Refresh success updates persisted state, in-memory state, and subscriber notifications.

### Refresh failure

- If refresh fails because the refresh token is invalid, expired, rejected, or the `/me` reload cannot complete after refresh, the SDK clears persisted session data and cached `me` data.
- The SDK must emit a state change indicating the user is no longer authenticated.
- The original caller receives a clear authentication error.

## Logout behavior

- `session.logout()` should follow this exact order:
  - if there is no session, clear local state and resolve successfully
  - if the current access token is inside the proactive refresh window and a refresh token exists, attempt refresh first
  - if an access token is available after refresh handling, attempt `POST /session/logout` with `Authorization: Bearer <access_token>`
  - regardless of remote logout result, clear persisted session state and cached `me` state locally
- Network or server logout failures should not prevent local logout completion.
- The public contract for v1 is: `session.logout()` resolves successfully after local state is cleared and does not throw for remote logout failures.
- Remote logout failures may be logged internally, but they are intentionally hidden from callers so the browser app always gets deterministic local sign-out behavior.

## WebAuthn integration

- The SDK should absorb the current client-side conversion work required to call `navigator.credentials.create()` and `navigator.credentials.get()` with data from the server routes.
- `webauthn.register()` should:
  - call `POST /webauthn/register/options`
  - convert the returned options into browser-compatible binary structures
  - call `navigator.credentials.create()`
  - serialize the resulting credential
  - call `POST /webauthn/register/verify`
- `webauthn.authenticate()` should:
  - call `POST /webauthn/authenticate/options`
  - convert the returned options into browser-compatible binary structures
  - call `navigator.credentials.get()`
  - serialize the resulting credential
  - call `POST /webauthn/authenticate/verify`
  - then execute the same post-login persistence + `/me` loading contract as email login
- If the browser does not support WebAuthn, both methods must fail with explicit SDK errors.
- If the user cancels a WebAuthn browser prompt, the SDK should surface a clear cancellation error rather than an opaque browser exception.

## Error handling

- Preserve server error payloads as much as possible, especially `{ error: ... }` responses from the current API.
- Wrap browser-only failures into explicit SDK error categories such as initialization failure, WebAuthn unsupported, WebAuthn cancelled, or missing session state.
- Do not silently swallow refresh or `/me` synchronization failures.

## Server implementation constraints

- The server should own the SDK asset and serve it from the main app, rather than requiring an external CDN or separate frontend package for v1.
- `GET /sdk/singleton-iife.js` should use conservative cache behavior in v1, preferably `Cache-Control: no-cache`, so server rollouts are not blocked by stale browser copies of a stable URL.
- The IIFE source may be generated from TypeScript modules during build time, but the runtime contract is the served JS endpoint, not a package manager dependency.

## Testing strategy

Required coverage should include:

- the SDK endpoint returns JavaScript with the expected content type
- the SDK infers base URL correctly from its script URL
- the SDK fails clearly when it cannot infer its script URL
- the documented browser topology is same-origin or same-origin proxy, not generic cross-origin embedding
- startup restores persisted session state from `localStorage`
- startup computes and persists `expiresAt` from `expires_in`
- startup enters `recovering` when a persisted refresh token exists and then settles to `authenticated` or `anonymous`
- `email.verify()` resolves only after tokens are stored and `/me` has been loaded
- `webauthn.authenticate()` resolves only after tokens are stored and `/me` has been loaded
- `me.get()` is synchronous and returns the cached `me` snapshot
- `me.reload()` fetches and updates `/me`
- authenticated SDK calls trigger proactive refresh before expiry
- concurrent authenticated calls share one in-flight refresh
- refresh failure clears persisted state and emits an unauthenticated transition
- refresh failure after a successful token refresh but failed `/me` reload also clears local state predictably
- `session.logout()` clears local state reliably
- `session.logout()` refreshes first when needed to obtain a usable access token
- single-tab behavior is supported; multi-tab refresh races are documented as a v1 limitation
- WebAuthn methods fail clearly when the browser lacks WebAuthn support
- WebAuthn cancellation surfaces a dedicated SDK error
- WebAuthn helper paths still perform the required request and serialization flow

Testing should cover both unit-level SDK state behavior and at least one end-to-end integration path proving the browser-facing contract remains usable.

## Documentation updates

- Update `README.md` to document the singleton SDK endpoint and the zero-config script-tag integration flow.
- Add a browser integration example showing email login, `me.get()`, and passkey authentication.
- Clarify that v1 is intentionally singleton-only, same-origin only, and always uses `localStorage` plus automatic refresh.
- Document that `me.get()` is synchronous cached state and `me.reload()` performs network refresh.
- Document the `recovering -> authenticated|anonymous` startup state model.
- Document the v1 single-tab limitation caused by refresh-token rotation.

## Risks and mitigations

### Risk: singleton global is too inflexible later

- Mitigation: keep the transport/state internals separable so a future multi-instance SDK can be exported from a different endpoint without changing the current singleton contract.

### Risk: script URL inference fails in unusual embedding scenarios

- Mitigation: explicitly support only normal external script loading in v1 and fail fast otherwise.

### Risk: refresh plus `/me` reload introduces extra request overhead

- Mitigation: accept the extra call in exchange for stronger client-state guarantees in v1; optimize later only if real usage shows it is necessary.

### Risk: stale cached `me` data after reload

- Mitigation: treat cached `me` as a convenience snapshot; authenticated operations still validate and refresh session state before protected requests.

### Risk: multi-tab refresh races invalidate shared local state

- Mitigation: explicitly scope v1 to single-tab reliability and document the limitation rather than shipping partial locking semantics that look correct but are not.

## Acceptance criteria

- A browser app can integrate by loading only `GET /sdk/singleton-iife.js` and calling `window.MiniAuth`.
- The SDK requires no explicit configuration and infers its server origin from the script URL.
- The SDK is documented and tested for same-origin deployment only.
- Successful email OTP login and passkey authentication both leave synchronous `MiniAuth.me.get()` immediately usable.
- Session state is persisted in `localStorage` and restored on reload.
- Boot-time recovery exposes a distinct `recovering` state before settling to `authenticated` or `anonymous`.
- Automatic refresh happens proactively and deduplicates concurrent refresh attempts.
- Refresh or session recovery failure clears local auth state predictably.
- `session.logout()` always clears local state and resolves successfully even if remote logout fails.
