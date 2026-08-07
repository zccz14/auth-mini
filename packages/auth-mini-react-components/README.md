# auth-mini-react-components

`auth-mini-react-components` provides one React control for the standard Auth
Mini browser flow in a shadcn/ui app. It initializes Browser SDK persistence,
redirects anonymous users to Auth Mini, verifies and adopts the returned
callback, and gives signed-in users an account-security dialog.

## Install

```bash
npm install auth-mini auth-mini-react-components
```

Import the package stylesheet once after your shadcn/ui theme. The stylesheet
uses the standard shadcn semantic CSS variables, so it does not require your
Tailwind scanner to include `node_modules`.

```tsx
import 'auth-mini-react-components/styles.css';
import { AuthMiniButton } from 'auth-mini-react-components';
```

## Usage

```tsx
<AuthMiniButton
  authMiniBaseUrl="https://auth.example.com"
  onAuthStateChange={(session) => {
    // Read session.accessToken at request time. Browser SDK refreshes it.
  }}
/>
```

On an ordinary HTTPS app, the component uses the current URL as the callback
by default. Override `callbackUrl` only when the app has a dedicated callback
route. `audience` is for a loopback development callback only; do not pass it
for an HTTPS callback because Auth Mini derives that audience from the callback
hostname.

```tsx
<AuthMiniButton
  authMiniBaseUrl="https://auth.example.com"
  callbackUrl="http://localhost:5173/auth/callback"
  audience="app.example.com"
/>
```

The component supports ordinary fragment callbacks and HashRouter callback
queries. It creates and verifies a one-time `state` value before asking
Browser SDK to persist the token response. Callback tokens are removed from
the address bar immediately and never rendered.

## Security settings

The signed-in dialog opens Auth Mini's real account-security page at
`/web/#/`, where users can manage PassKeys, Ed25519 credentials, and active
sessions. The default opens a new tab with `noopener,noreferrer` semantics.

The downstream app's access token has the downstream app audience, while
Auth Mini account management requires Auth Mini's self audience. The user may
therefore need to sign in again in that Auth Mini tab; the component does not
transfer a downstream token across that boundary.

## Props

| Prop                           | Description                                                                |
| ------------------------------ | -------------------------------------------------------------------------- |
| `authMiniBaseUrl`              | Required Auth Mini issuer/server base URL.                                 |
| `callbackUrl`                  | Callback URL string or lazy callback; defaults to the current browser URL. |
| `audience`                     | Explicit audience for loopback callbacks only.                             |
| `onAuthStateChange`            | Receives every Browser SDK session snapshot.                               |
| `onAuthError`                  | Receives callback, SDK, or redirect-preparation errors.                    |
| `securitySettingsUrl`          | Overrides the default Auth Mini `/web/#/` target.                          |
| `securitySettingsTarget`       | `_blank` by default; `_self` is supported.                                 |
| `variant`, `size`, `className` | Match familiar shadcn button customization.                                |
| `labels`                       | Overrides visible control text.                                            |
