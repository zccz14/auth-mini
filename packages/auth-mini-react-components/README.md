# auth-mini-react-components

`auth-mini-react-components` provides a shared Auth Mini session for React and
shadcn/ui. `AuthMiniProvider` owns Browser SDK persistence and redirect
handling once for the whole application. Its `useAuthMini` hook makes the
current session available anywhere below the Provider, while `AuthMiniButton`
renders the standard sign-in and account-security control.

## Install

```bash
npm install auth-mini auth-mini-react-components
```

Import the package stylesheet once after your shadcn/ui theme. The stylesheet
uses the standard shadcn semantic CSS variables, so it does not require your
Tailwind scanner to include `node_modules`.

```tsx
import 'auth-mini-react-components/styles.css';
import {
  AuthMiniButton,
  AuthMiniProvider,
  useAuthMini,
} from 'auth-mini-react-components';
```

## Usage

```tsx
function App() {
  return (
    <AuthMiniProvider
      autoRedirectToLogin={false}
      authMiniBaseUrl="https://auth.example.com"
    >
      <Page />
      <AuthMiniButton lang="en" />
    </AuthMiniProvider>
  );
}

function Page() {
  const { session, isAuthenticated, signOut } = useAuthMini();

  // Read session.accessToken at request time. Browser SDK refreshes it.
  return isAuthenticated ? (
    <button onClick={() => void signOut()}>
      {session?.sessionId}: Sign out
    </button>
  ) : null;
}
```

On an ordinary HTTPS app, the Provider uses the current URL as the callback by
default. Override `callbackUrl` only when the app has a dedicated callback
route. `audience` is for a loopback development callback only; do not pass it
for an HTTPS callback because Auth Mini derives that audience from the callback
hostname.

Every Provider must set `autoRedirectToLogin` explicitly. Set it to `true` for
an application whose every route requires a signed-in user. After Auth Mini has
processed a possible login callback, the Provider redirects an anonymous
browser session directly to the Auth Mini login page. Set it to `false` when
the application offers anonymous pages and should decide when to call
`signIn()`.

```tsx
<AuthMiniProvider
  autoRedirectToLogin
  authMiniBaseUrl="https://auth.example.com"
>
  <App />
</AuthMiniProvider>
```

```tsx
<AuthMiniProvider
  autoRedirectToLogin={false}
  authMiniBaseUrl="https://auth.example.com"
  callbackUrl="http://localhost:5173/auth/callback"
  audience="app.example.com"
>
  <App />
</AuthMiniProvider>
```

The Provider supports ordinary fragment callbacks and HashRouter callback
queries. It creates and verifies a one-time `state` value before asking Browser
SDK to persist the token response. Callback tokens are removed from the address
bar immediately and never rendered. It is the only component that initializes
the Browser SDK, subscribes to session changes, or adopts a callback.

## Security settings

The signed-in User IconButton opens a dialog that displays a copyable User ID,
links to Auth Mini's real sign-in-method management page at `/web/#/`, and
contains the destructive sign-out action. The management page opens in a new
tab with `noopener,noreferrer` semantics by default.

The downstream app's access token has the downstream app audience, while
Auth Mini account management requires Auth Mini's self audience. The user may
therefore need to sign in again in that Auth Mini tab; the component does not
transfer a downstream token across that boundary.

## AuthMiniProvider props

| Prop                  | Description                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `authMiniBaseUrl`     | Required Auth Mini issuer/server base URL.                                                                       |
| `callbackUrl`         | Callback URL string or lazy callback; defaults to the current browser URL.                                       |
| `audience`            | Explicit audience for loopback callbacks only.                                                                   |
| `autoRedirectToLogin` | Required. `true` redirects anonymous sessions after callback processing; `false` leaves them in the application. |
| `onAuthStateChange`   | Receives every Browser SDK session snapshot.                                                                     |
| `onAuthError`         | Receives callback, SDK, or redirect-preparation errors.                                                          |

## useAuthMini

`useAuthMini()` must be called below `AuthMiniProvider`. It returns the shared
`sdk`, `session`, `status`, `isReady`, `isAuthenticated`, `error`, `signIn`,
and `signOut` values. The Browser SDK remains the authority for session tokens;
the hook does not create a second token store.

## AuthMiniButton props

`AuthMiniButton` must be rendered below `AuthMiniProvider` and inherits the
Provider configuration.

| Prop                           | Description                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `lang`                         | Required language string. `zh` and `zh-*` use Chinese; other values use English. |
| `securitySettingsUrl`          | Overrides the default Auth Mini `/web/#/` target.                                |
| `securitySettingsTarget`       | `_blank` by default; `_self` is supported.                                       |
| `variant`, `size`, `className` | Match familiar shadcn button customization when signed out.                      |
| `labels`                       | Overrides individual visible control text.                                       |
