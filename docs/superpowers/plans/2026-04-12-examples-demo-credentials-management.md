# Examples Demo Credentials Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a top-level `Credentials` page to `examples/demo` that shows the current signed-in user's email, passkeys, and Ed25519 credentials in sectioned tables, supports credential deletion with confirm + `/me` reload, and stays safe/read-only for anonymous users.

**Architecture:** Keep the change local to the demo app by adding a single new route component and its focused route tests, then wire that route into the existing app shell navigation and router. Reuse the shared provider's existing `session`, `user`, `config`, and `sdk.me.reload()` state instead of adding new providers or optimistic local caches; the new page should normalize the `/me` snapshot into table rows, call the existing authenticated DELETE endpoints directly with the current access token, and rely on `/me` reload to refresh the UI after mutations.

**Tech Stack:** React 19, React Router 7, TypeScript, Tailwind utility classes, Vitest, Testing Library, browser `fetch`, native `window.confirm`

---

## File Structure

- Create: `examples/demo/src/routes/credentials.tsx`
  - new top-level demo page with Email / Passkey / Ed25519 sections, row actions, section-scoped pending/error state, snapshot normalization, and `/me` reload after deletes
- Create: `examples/demo/src/routes/credentials.test.tsx`
  - route-focused coverage for anonymous state, authenticated rendering, passkey delete, Ed25519 delete, and email read-only behavior
- Modify: `examples/demo/src/app/router.tsx`
  - register the new `/credentials` route beside the existing top-level routes
- Modify: `examples/demo/src/components/app/app-shell.tsx`
  - add `Credentials` to the top navigation list in the same tier as Setup / Email / Passkey / Session
- Modify: `examples/demo/src/routes/router.test.tsx`
  - lock the new nav entry and prove `/credentials` renders the credentials page through the real router

## Implementation Notes

- Use only the current demo provider state: `const { config, sdk, session, user } = useDemo()`.
- Treat `session.authenticated`, `session.accessToken`, `config.status === 'ready'`, and `sdk` presence as the gate for destructive actions.
- Read email from `user?.email ?? ''`.
- Normalize `user?.webauthn_credentials` and `user?.ed25519_credentials` inside `examples/demo/src/routes/credentials.tsx` with narrow local TypeScript guards instead of introducing a wider refactor.
- Call `fetch(new URL(path, config.authOrigin), { method: 'DELETE', headers: { authorization: \`Bearer ${session.accessToken}\` } })` for delete actions, then `await sdk.me.reload()` on success.
- Keep errors local: one error/pending bucket for Passkey, one for Ed25519, none for Email.
- Use native `window.confirm(...)`; if it returns `false`, exit without calling `fetch`.
- Keep table formatting deterministic for tests by rendering raw ISO timestamps as-is unless an existing demo formatter is already present in the touched file.
- Truncate long credential strings in the cell text with a small helper (for example `abcd…wxyz`) while preserving the full value in a `title` attribute.

### Task 1: Lock The Router And Navigation Contract First

**Files:**

- Modify: `examples/demo/src/routes/router.test.tsx`
- Test: `examples/demo/src/routes/router.test.tsx`

- [ ] **Step 1: Extend the existing router test with the new nav expectation**

Add one more assertion to `examples/demo/src/routes/router.test.tsx` inside `it('renders top-level nav entries for the app shell', ...)`:

```tsx
expect(screen.getByRole('link', { name: 'Credentials' })).toBeInTheDocument();
```

- [ ] **Step 2: Add a real-route smoke test for `/credentials` before implementation**

Append this test to `examples/demo/src/routes/router.test.tsx`:

```tsx
it('renders the credentials route', () => {
  render(
    <MemoryRouter initialEntries={['/credentials']}>
      <AppRouter />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole('heading', { name: 'Credentials' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Email')).toBeInTheDocument();
  expect(screen.getByText('Passkey')).toBeInTheDocument();
  expect(screen.getByText('Ed25519')).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the focused router test and verify it fails before wiring the route**

Run: `npm --prefix examples/demo run test -- src/routes/router.test.tsx`

Expected: FAIL because the nav does not contain `Credentials` and `/credentials` does not resolve yet.

### Task 2: Specify The Credentials Page Behaviors With Route Tests

**Files:**

- Create: `examples/demo/src/routes/credentials.test.tsx`
- Test: `examples/demo/src/routes/credentials.test.tsx`

- [ ] **Step 1: Create the shared SDK mock contract for the new route test**

Create `examples/demo/src/routes/credentials.test.tsx` with a hoisted mock that exposes: `createBrowserSdk`, `sessionState`, `reloadMe`, and a stubbed `fetch`. Use the same `MemoryRouter` + `AppRouter` test style as the other route tests, but include both credential collections in the mocked `me` snapshot.

```tsx
type MockMe = {
  user_id: string;
  email: string;
  webauthn_credentials: Array<{
    id: string;
    credential_id: string;
    created_at: string;
  }>;
  ed25519_credentials: Array<{
    id: string;
    name: string;
    public_key: string;
    last_used_at: string | null;
    created_at: string;
  }>;
  active_sessions: Array<unknown>;
};

type MockSessionState = {
  status: string;
  authenticated: boolean;
  sessionId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  receivedAt: string | null;
  expiresAt: string | null;
  me: MockMe | null;
};

const sdkMocks = vi.hoisted(() => {
  const sessionState = {
    current: {
      status: 'anonymous',
      authenticated: false,
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
      me: null,
    } as MockSessionState,
  };
  const reloadMe = vi.fn(async () => {
    if (!sessionState.current.me) {
      throw new Error('No current user');
    }

    return sessionState.current.me;
  });

  return {
    createBrowserSdk: vi.fn(() => ({
      email: { start: vi.fn(), verify: vi.fn() },
      passkey: { register: vi.fn(), authenticate: vi.fn() },
      me: { get: vi.fn(() => sessionState.current.me), reload: reloadMe },
      session: {
        getState: () => sessionState.current,
        onChange: vi.fn(() => vi.fn()),
        refresh: vi.fn(),
        logout: vi.fn(),
      },
      webauthn: { register: vi.fn(), authenticate: vi.fn() },
    })),
    reloadMe,
    sessionState,
  };
});
```

- [ ] **Step 2: Write the anonymous-state regression first**

Add this test to the new file:

```tsx
it('shows sign-in-required copy for all sections and no destructive actions when anonymous', () => {
  localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');

  render(
    <MemoryRouter initialEntries={['/credentials']}>
      <AppRouter />
    </MemoryRouter>,
  );

  expect(
    screen.getByText('Sign in to inspect the current account email.'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Sign in to inspect current passkeys.'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Sign in to inspect current Ed25519 credentials.'),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /delete passkey/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /delete device key/i }),
  ).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Write the authenticated rendering test with all three sections**

Add this test after the anonymous test:

```tsx
it('renders email, passkey, and ed25519 tables from the current /me snapshot', () => {
  localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
  sdkMocks.sessionState.current = {
    status: 'authenticated',
    authenticated: true,
    sessionId: 'session-1',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    receivedAt: '2026-04-12T00:00:00.000Z',
    expiresAt: '2026-04-12T01:00:00.000Z',
    me: {
      user_id: 'user-1',
      email: 'user@example.com',
      webauthn_credentials: [
        {
          id: 'passkey-row-1',
          credential_id: 'passkey-credential-abcdef123456',
          created_at: '2026-04-10T12:00:00.000Z',
        },
      ],
      ed25519_credentials: [
        {
          id: 'device-row-1',
          name: 'Build runner',
          public_key: 'MCowBQYDK2VwAyEAlongPublicKeyValueForTesting1234567890=',
          last_used_at: '2026-04-11T08:30:00.000Z',
          created_at: '2026-04-09T09:15:00.000Z',
        },
      ],
      active_sessions: [],
    },
  };

  render(
    <MemoryRouter initialEntries={['/credentials']}>
      <AppRouter />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole('cell', { name: 'user@example.com' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Primary email')).toBeInTheDocument();
  expect(screen.getByText('Read-only')).toBeInTheDocument();
  expect(screen.getByText(/passkey-credential-abc/i)).toBeInTheDocument();
  expect(
    screen.getByRole('button', {
      name: 'Delete passkey passkey-credential-abcdef123456',
    }),
  ).toBeInTheDocument();
  expect(screen.getByText('Build runner')).toBeInTheDocument();
  expect(screen.getByText(/MCowBQYDK2VwAyEA/i)).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Delete device key Build runner' }),
  ).toBeInTheDocument();
});
```

- [ ] **Step 4: Write the passkey delete success flow before implementation**

Add this test with explicit confirm, DELETE, reload, and refreshed UI assertions:

```tsx
it('deletes a passkey after confirm and reloads /me from the server', async () => {
  const user = userEvent.setup();
  localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
  sdkMocks.sessionState.current = {
    status: 'authenticated',
    authenticated: true,
    sessionId: 'session-1',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    receivedAt: '2026-04-12T00:00:00.000Z',
    expiresAt: '2026-04-12T01:00:00.000Z',
    me: {
      user_id: 'user-1',
      email: 'user@example.com',
      webauthn_credentials: [
        {
          id: 'passkey-row-1',
          credential_id: 'passkey-credential-abcdef123456',
          created_at: '2026-04-10T12:00:00.000Z',
        },
      ],
      ed25519_credentials: [],
      active_sessions: [],
    },
  };

  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
  sdkMocks.reloadMe.mockImplementationOnce(async () => {
    sdkMocks.sessionState.current = {
      ...sdkMocks.sessionState.current,
      me: {
        ...sdkMocks.sessionState.current.me!,
        webauthn_credentials: [],
      },
    };
    return sdkMocks.sessionState.current.me!;
  });

  render(
    <MemoryRouter initialEntries={['/credentials']}>
      <AppRouter />
    </MemoryRouter>,
  );

  await user.click(
    screen.getByRole('button', {
      name: 'Delete passkey passkey-credential-abcdef123456',
    }),
  );

  expect(confirmSpy).toHaveBeenCalledWith(
    'Delete this passkey from the current account? This cannot be undone.',
  );
  expect(fetchSpy).toHaveBeenCalledWith(
    new URL('/webauthn/credentials/passkey-row-1', 'https://auth.example.com'),
    expect.objectContaining({
      method: 'DELETE',
      headers: expect.objectContaining({
        authorization: 'Bearer access-token',
      }),
    }),
  );
  expect(sdkMocks.reloadMe).toHaveBeenCalledTimes(1);
  expect(
    await screen.findByText('No passkeys are currently bound to this account.'),
  ).toBeInTheDocument();
});
```

- [ ] **Step 5: Write the Ed25519 delete success flow before implementation**

Add the matching Ed25519 delete test:

```tsx
it('deletes an ed25519 credential after confirm and reloads /me from the server', async () => {
  const user = userEvent.setup();
  localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
  sdkMocks.sessionState.current = {
    status: 'authenticated',
    authenticated: true,
    sessionId: 'session-1',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    receivedAt: '2026-04-12T00:00:00.000Z',
    expiresAt: '2026-04-12T01:00:00.000Z',
    me: {
      user_id: 'user-1',
      email: 'user@example.com',
      webauthn_credentials: [],
      ed25519_credentials: [
        {
          id: 'device-row-1',
          name: 'Build runner',
          public_key: 'MCowBQYDK2VwAyEAlongPublicKeyValueForTesting1234567890=',
          last_used_at: null,
          created_at: '2026-04-09T09:15:00.000Z',
        },
      ],
      active_sessions: [],
    },
  };

  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
  sdkMocks.reloadMe.mockImplementationOnce(async () => {
    sdkMocks.sessionState.current = {
      ...sdkMocks.sessionState.current,
      me: {
        ...sdkMocks.sessionState.current.me!,
        ed25519_credentials: [],
      },
    };
    return sdkMocks.sessionState.current.me!;
  });

  render(
    <MemoryRouter initialEntries={['/credentials']}>
      <AppRouter />
    </MemoryRouter>,
  );

  await user.click(
    screen.getByRole('button', { name: 'Delete device key Build runner' }),
  );

  expect(confirmSpy).toHaveBeenCalledWith(
    'Delete this Ed25519 credential from the current account? This cannot be undone.',
  );
  expect(fetchSpy).toHaveBeenCalledWith(
    new URL('/ed25519/credentials/device-row-1', 'https://auth.example.com'),
    expect.objectContaining({
      method: 'DELETE',
      headers: expect.objectContaining({
        authorization: 'Bearer access-token',
      }),
    }),
  );
  expect(sdkMocks.reloadMe).toHaveBeenCalledTimes(1);
  expect(
    await screen.findByText(
      'No Ed25519 credentials are currently bound to this account.',
    ),
  ).toBeInTheDocument();
});
```

- [ ] **Step 6: Write the email read-only regression**

Add a final test that proves email never exposes destructive UI:

```tsx
it('keeps the email section read-only even when the user has a primary email', () => {
  localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
  sdkMocks.sessionState.current = {
    status: 'authenticated',
    authenticated: true,
    sessionId: 'session-1',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    receivedAt: '2026-04-12T00:00:00.000Z',
    expiresAt: '2026-04-12T01:00:00.000Z',
    me: {
      user_id: 'user-1',
      email: 'user@example.com',
      webauthn_credentials: [],
      ed25519_credentials: [],
      active_sessions: [],
    },
  };

  render(
    <MemoryRouter initialEntries={['/credentials']}>
      <AppRouter />
    </MemoryRouter>,
  );

  expect(screen.getByText('Managed via email OTP sign-in')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /delete email/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /unbind email/i }),
  ).not.toBeInTheDocument();
});
```

- [ ] **Step 7: Run the new route test file and verify it fails before page implementation**

Run: `npm --prefix examples/demo run test -- src/routes/credentials.test.tsx`

Expected: FAIL because the `/credentials` page does not exist yet and the required headings / buttons / delete flow are absent.

- [ ] **Step 8: Add one confirm-cancel regression so delete is never sent on cancel**

Add this targeted guard test:

```tsx
it('does not send a delete request when the native confirm is cancelled', async () => {
  const user = userEvent.setup();
  localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
  sdkMocks.sessionState.current = {
    status: 'authenticated',
    authenticated: true,
    sessionId: 'session-1',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    receivedAt: '2026-04-12T00:00:00.000Z',
    expiresAt: '2026-04-12T01:00:00.000Z',
    me: {
      user_id: 'user-1',
      email: 'user@example.com',
      webauthn_credentials: [
        {
          id: 'passkey-row-1',
          credential_id: 'passkey-credential-abcdef123456',
          created_at: '2026-04-10T12:00:00.000Z',
        },
      ],
      ed25519_credentials: [],
      active_sessions: [],
    },
  };

  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
  const fetchSpy = vi.spyOn(globalThis, 'fetch');

  render(
    <MemoryRouter initialEntries={['/credentials']}>
      <AppRouter />
    </MemoryRouter>,
  );

  await user.click(
    screen.getByRole('button', {
      name: 'Delete passkey passkey-credential-abcdef123456',
    }),
  );

  expect(confirmSpy).toHaveBeenCalledTimes(1);
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(sdkMocks.reloadMe).not.toHaveBeenCalled();
});
```

- [ ] **Step 9: Re-run the new route test file and verify the whole contract still fails for the missing page**

Run: `npm --prefix examples/demo run test -- src/routes/credentials.test.tsx`

Expected: FAIL because the `/credentials` page does not exist yet and the required headings / buttons / delete flow are absent.

### Task 3: Implement The Credentials Route, Navigation, And Delete Flows

**Files:**

- Create: `examples/demo/src/routes/credentials.tsx`
- Modify: `examples/demo/src/app/router.tsx`
- Modify: `examples/demo/src/components/app/app-shell.tsx`

- [ ] **Step 1: Register the new top-level route in the app router**

Update `examples/demo/src/app/router.tsx` to import the route and mount `/credentials` between `/passkey` and `/session`:

```tsx
import { CredentialsRoute } from '@/routes/credentials';

// inside <Routes>
<Route path="/credentials" element={<CredentialsRoute />} />
```

- [ ] **Step 2: Add `Credentials` to the existing app-shell nav list**

Update the `links` constant in `examples/demo/src/components/app/app-shell.tsx`:

```tsx
const links = [
  ['/', 'Home'],
  ['/setup', 'Setup'],
  ['/email', 'Email'],
  ['/passkey', 'Passkey'],
  ['/credentials', 'Credentials'],
  ['/session', 'Session'],
] as const;
```

- [ ] **Step 3: Create the credentials route with local snapshot normalizers and shared delete helper**

Create `examples/demo/src/routes/credentials.tsx` with a `FlowCard` page, section cards, and focused helpers like these:

```tsx
type PasskeyRow = {
  id: string;
  credential_id: string;
  created_at: string;
};

type Ed25519Row = {
  id: string;
  name: string;
  public_key: string;
  last_used_at: string | null;
  created_at: string;
};

function asPasskeyRows(value: unknown): PasskeyRow[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((row) => {
    if (
      typeof row === 'object' &&
      row !== null &&
      typeof (row as Record<string, unknown>).id === 'string' &&
      typeof (row as Record<string, unknown>).credential_id === 'string' &&
      typeof (row as Record<string, unknown>).created_at === 'string'
    ) {
      return [row as PasskeyRow];
    }
    return [];
  });
}

function asEd25519Rows(value: unknown): Ed25519Row[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((row) => {
    if (
      typeof row === 'object' &&
      row !== null &&
      typeof (row as Record<string, unknown>).id === 'string' &&
      typeof (row as Record<string, unknown>).name === 'string' &&
      typeof (row as Record<string, unknown>).public_key === 'string' &&
      (typeof (row as Record<string, unknown>).last_used_at === 'string' ||
        (row as Record<string, unknown>).last_used_at === null) &&
      typeof (row as Record<string, unknown>).created_at === 'string'
    ) {
      return [row as Ed25519Row];
    }
    return [];
  });
}

function truncateMiddle(value: string, edge = 8) {
  return value.length <= edge * 2 + 1
    ? value
    : `${value.slice(0, edge)}…${value.slice(-edge)}`;
}
```

- [ ] **Step 4: Implement the page state and guarded delete actions**

Inside `CredentialsRoute`, keep the state minimal and section-scoped:

```tsx
const { config, sdk, session, user } = useDemo();
const [pendingSection, setPendingSection] = useState<
  'passkey' | 'ed25519' | null
>(null);
const [passkeyError, setPasskeyError] = useState('');
const [ed25519Error, setEd25519Error] = useState('');

const authenticated =
  config.status === 'ready' &&
  Boolean(sdk) &&
  session.authenticated &&
  typeof session.accessToken === 'string' &&
  session.accessToken.length > 0;

async function deleteCredential(input: {
  section: 'passkey' | 'ed25519';
  confirmMessage: string;
  path: string;
}) {
  if (!authenticated || !sdk || !window.confirm(input.confirmMessage)) {
    return;
  }

  const setError =
    input.section === 'passkey' ? setPasskeyError : setEd25519Error;
  setPendingSection(input.section);
  setError('');

  try {
    const response = await fetch(new URL(input.path, config.authOrigin), {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Delete failed with status ${response.status}`);
    }

    await sdk.me.reload();
  } catch (cause) {
    setError(cause instanceof Error ? cause.message : 'Delete failed');
  } finally {
    setPendingSection(null);
  }
}
```

- [ ] **Step 5: Render the three vertical sections exactly to spec**

Render the page in this order: Email, Passkey, Ed25519. Use semantic tables for authenticated data and short empty-state copy otherwise:

```tsx
<FlowCard
  title="Credentials"
  description="Inspect the current account credentials and remove bound authenticators when needed."
>
  <div className="space-y-6">
    <section aria-labelledby="credentials-email-heading" className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 id="credentials-email-heading" className="text-sm font-semibold text-slate-950">Email</h2>
    </section>
    <section aria-labelledby="credentials-passkey-heading" className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 id="credentials-passkey-heading" className="text-sm font-semibold text-slate-950">Passkey</h2>
    </section>
    <section aria-labelledby="credentials-ed25519-heading" className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 id="credentials-ed25519-heading" className="text-sm font-semibold text-slate-950">Ed25519</h2>
    </section>
  </div>
</FlowCard>
```

Within those sections, keep these behaviors exact:

```tsx
// Email section
// - if anonymous: "Sign in to inspect the current account email."
// - if authenticated without email: "This account does not currently have a bound email."
// - if authenticated with email: one-row table with Email / Type / Status columns,
//   row values: user.email / "Primary email" / "Read-only"
// - helper copy: "Managed via email OTP sign-in"

// Passkey section
// - table columns: Credential ID / Created At / Action
// - empty authenticated copy: "No passkeys are currently bound to this account."
// - anonymous copy: "Sign in to inspect current passkeys."
// - button label: `Delete passkey ${row.credential_id}`
// - button disabled only while pendingSection === 'passkey'
// - do not render any register/sign-in/create actions on this page

// Ed25519 section
// - table columns: Name / Public Key / Last Used / Created At / Action
// - truncate public key in the cell, keep full key in title
// - render `Never` for null last_used_at
// - empty authenticated copy: "No Ed25519 credentials are currently bound to this account."
// - anonymous copy: "Sign in to inspect current Ed25519 credentials."
// - button label: `Delete device key ${row.name}`
// - button disabled only while pendingSection === 'ed25519'
// - do not render any create/sign-in/update actions on this page
```

- [ ] **Step 6: Render section-scoped error feedback without blocking the rest of the page**

Use the existing alert/text styling patterns already present in the demo; the error output can stay simple:

```tsx
{passkeyError ? <p className="text-sm text-rose-600">{passkeyError}</p> : null}
{ed25519Error ? <p className="text-sm text-rose-600">{ed25519Error}</p> : null}
```

Place each message inside its matching section, below the section intro and above the table/empty state.

- [ ] **Step 7: Run the router and credentials route tests after implementation**

Run: `npm --prefix examples/demo run test -- src/routes/router.test.tsx src/routes/credentials.test.tsx`

Expected: PASS.

### Task 4: Finish With Focused Verification And A Small Commit

**Files:**

- Modify: `examples/demo/src/app/router.tsx`
- Modify: `examples/demo/src/components/app/app-shell.tsx`
- Create: `examples/demo/src/routes/credentials.tsx`
- Create: `examples/demo/src/routes/credentials.test.tsx`
- Modify: `examples/demo/src/routes/router.test.tsx`

- [ ] **Step 1: Run the focused example-demo test suite one more time**

Run: `npm --prefix examples/demo run test -- src/routes/router.test.tsx src/routes/credentials.test.tsx`

Expected: PASS with the new credentials page coverage green.

- [ ] **Step 2: Run the example-demo typecheck to catch route-level typing drift**

Run: `npm --prefix examples/demo run typecheck`

Expected: PASS.

- [ ] **Step 3: Review the final diff for scope discipline**

Run: `git diff -- examples/demo/src/app/router.tsx examples/demo/src/components/app/app-shell.tsx examples/demo/src/routes/router.test.tsx examples/demo/src/routes/credentials.tsx examples/demo/src/routes/credentials.test.tsx`

Expected: only the new route, nav link, and route tests appear; no unrelated demo pages change.

- [ ] **Step 4: Commit the implementation in one focused changeset**

Run:

```bash
git add examples/demo/src/app/router.tsx \
  examples/demo/src/components/app/app-shell.tsx \
  examples/demo/src/routes/router.test.tsx \
  examples/demo/src/routes/credentials.tsx \
  examples/demo/src/routes/credentials.test.tsx
git commit -m "feat: add demo credentials management page"
```

Expected: commit succeeds with only the credentials-route files staged.
