# Demo Session Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `Active sessions` table to `examples/demo` `/session` that lists `session.me.active_sessions`, supports single-row `Kick`, shows section-scoped pending/error states, and refreshes the shared session snapshot from `/me` after success.

**Architecture:** Keep the change local to the existing demo route by extending `examples/demo/src/routes/session.tsx` and its route test. Reuse `useDemo()` state plus the existing browser SDK `sdk.me.reload()` refresh behavior; call the already-shipped `POST /session/:session_id/logout` endpoint directly from the route instead of widening the provider or adding a new demo SDK wrapper.

**Tech Stack:** React 19, React Router 7, TypeScript, Tailwind utility classes, Vitest, Testing Library, browser `fetch`

---

## File Structure

- Modify: `examples/demo/src/routes/session.test.tsx`
  - Expand the SDK mock so `sdk.me.reload()` can update provider subscribers, then add route-level coverage for empty state, full table rendering, kick pending/success refresh, and kick failure retry.
- Modify: `examples/demo/src/routes/session.tsx`
  - Add the `Active sessions` section, row-level action state, section-scoped error copy, and direct `fetch` call to `POST /session/:session_id/logout` followed by `sdk.me.reload()`.
- Do not modify: `examples/demo/src/app/providers/demo-provider.tsx`, `examples/demo/src/lib/demo-sdk.ts`, or SDK/server files.
  - The approved spec is satisfied by the existing provider surface (`config`, `sdk`, `session`, `user`) and the already-available peer logout endpoint.

## Implementation Notes

- Use `const { clearLocalAuthState, config, sdk, session, user } = useDemo()` in `examples/demo/src/routes/session.tsx`.
- Treat `user?.active_sessions` as the only table source; render rows in the original array order without filtering out `session.sessionId`.
- Use a single `pendingSessionId: string | null` state so only one row is disabled at a time.
- Keep failures local with `const [tableError, setTableError] = useState('')` and render the message inside the new `Active sessions` section only.
- Use deterministic raw ISO strings for `created_at` and `expires_at`; do not add a formatter in this scope.
- Use the English empty-state copy `No active sessions.` so the route stays consistent with the rest of `examples/demo`.
- Use the concise error copy `Unable to kick session.` and clear it before a new request plus after a successful refresh.
- For the row action, keep the idle label `Kick` and switch the active row to `Kicking...` while the request is pending.

### Task 1: Specify The Session Table Contract In Route Tests

**Files:**

- Modify: `examples/demo/src/routes/session.test.tsx`
- Test: `examples/demo/src/routes/session.test.tsx`

- [ ] **Step 1: Expand the shared route test mock so `/me` reload can drive provider updates**

Replace the current hoisted SDK mock with a listener-aware version that exposes `listeners`, `reloadMe`, and a local `notify()` helper. Keep the route tests on the real `AppRouter`, but make `sdk.me.reload()` notify the stored `session.onChange` listeners so `SessionRoute` rerenders the shared JSON panels and sessions table after a kick.

```tsx
type MockActiveSession = {
  id: string;
  created_at: string;
  expires_at: string;
};

type MockSessionState = {
  status: string;
  authenticated: boolean;
  sessionId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  receivedAt: string | null;
  expiresAt: string | null;
  me: {
    user_id: string;
    email: string;
    webauthn_credentials: Array<unknown>;
    active_sessions: MockActiveSession[];
  } | null;
};

const sdkMocks = vi.hoisted(() => {
  const listeners: Array<(state: MockSessionState) => void> = [];
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

  const notify = () => {
    for (const listener of listeners) {
      listener(sessionState.current);
    }
  };

  const reloadMe = vi.fn(async () => {
    if (!sessionState.current.me) {
      throw new Error('No current user');
    }

    notify();
    return sessionState.current.me;
  });

  const logout = vi.fn(async () => {
    sessionState.current = {
      status: 'anonymous',
      authenticated: false,
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
      me: null,
    };
    notify();
  });

  return {
    createBrowserSdk: vi.fn(() => ({
      email: { start: vi.fn(), verify: vi.fn() },
      passkey: { register: vi.fn(), authenticate: vi.fn() },
      me: { get: vi.fn(() => sessionState.current.me), reload: reloadMe },
      session: {
        getState: () => sessionState.current,
        onChange: vi.fn((listener) => {
          listeners.push(listener);
          return vi.fn();
        }),
        refresh: vi.fn(),
        logout,
      },
      webauthn: { register: vi.fn(), authenticate: vi.fn() },
    })),
    listeners,
    logout,
    reloadMe,
    sessionState,
  };
});
```

- [ ] **Step 2: Add the empty-state and table-rendering regressions before changing the route**

Append these tests to `examples/demo/src/routes/session.test.tsx` after the existing authenticated snapshot assertions:

```tsx
it('shows the current panels and an empty active sessions state when anonymous', () => {
  render(
    <MemoryRouter initialEntries={['/session']}>
      <AppRouter />
    </MemoryRouter>,
  );

  expect(screen.getByText('Current session')).toBeInTheDocument();
  expect(screen.getByText('Current user')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Active sessions' })).toBeInTheDocument();
  expect(screen.getByText('No active sessions.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Kick' })).not.toBeInTheDocument();
});

it('renders every active session row in original order, including the current session', () => {
  sdkMocks.sessionState.current = {
    status: 'authenticated',
    authenticated: true,
    sessionId: 'session-current',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    receivedAt: '2026-04-12T00:00:00.000Z',
    expiresAt: '2026-04-12T01:00:00.000Z',
    me: {
      user_id: 'user-1',
      email: 'user@example.com',
      webauthn_credentials: [],
      active_sessions: [
        {
          id: 'session-current',
          created_at: '2026-04-12T00:00:00.000Z',
          expires_at: '2026-04-12T01:00:00.000Z',
        },
        {
          id: 'session-peer',
          created_at: '2026-04-12T00:05:00.000Z',
          expires_at: '2026-04-12T01:05:00.000Z',
        },
      ],
    },
  };

  render(
    <MemoryRouter initialEntries={['/session']}>
      <AppRouter />
    </MemoryRouter>,
  );

  expect(screen.getByRole('columnheader', { name: 'Session ID' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Created At' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Expires At' })).toBeInTheDocument();
  expect(screen.getByText('session-current')).toBeInTheDocument();
  expect(screen.getByText('session-peer')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Kick' })).toHaveLength(2);
  expect(screen.getByText(/"sessionId": "session-current"/)).toBeInTheDocument();
  expect(screen.getAllByText(/"email": "user@example.com"/)).toHaveLength(2);
});
```

- [ ] **Step 3: Add the kick success and retryable failure flows before implementation**

In the same file, add one success test that proves row-level pending plus automatic refresh, and one failure test that keeps the error inside the section and allows retry. Update the file imports to `import { render, screen, waitFor, within } from '@testing-library/react';` before adding these cases.

```tsx
it('kicks one session, shows row-level pending, and reloads the shared snapshot', async () => {
  const user = userEvent.setup();
  localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
  sdkMocks.sessionState.current = {
    status: 'authenticated',
    authenticated: true,
    sessionId: 'session-current',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    receivedAt: '2026-04-12T00:00:00.000Z',
    expiresAt: '2026-04-12T01:00:00.000Z',
    me: {
      user_id: 'user-1',
      email: 'user@example.com',
      webauthn_credentials: [],
      active_sessions: [
        {
          id: 'session-current',
          created_at: '2026-04-12T00:00:00.000Z',
          expires_at: '2026-04-12T01:00:00.000Z',
        },
        {
          id: 'session-peer',
          created_at: '2026-04-12T00:05:00.000Z',
          expires_at: '2026-04-12T01:05:00.000Z',
        },
      ],
    },
  };

  let resolveLogout: ((response: Response) => void) | undefined;
  const logoutPromise = new Promise<Response>((resolve) => {
    resolveLogout = resolve;
  });

  const fetchMock = vi.fn((input: string | URL, init?: RequestInit) => {
    expect(String(input)).toBe('https://auth.example.com/session/session-peer/logout');
    expect(init).toMatchObject({
      method: 'POST',
      headers: { authorization: 'Bearer access-token' },
    });

    sdkMocks.sessionState.current = {
      ...sdkMocks.sessionState.current,
      me: {
        ...sdkMocks.sessionState.current.me!,
        active_sessions: [
          {
            id: 'session-current',
            created_at: '2026-04-12T00:00:00.000Z',
            expires_at: '2026-04-12T01:00:00.000Z',
          },
        ],
      },
    };

    return logoutPromise;
  });

  vi.stubGlobal('fetch', fetchMock);

  render(
    <MemoryRouter initialEntries={['/session']}>
      <AppRouter />
    </MemoryRouter>,
  );

  const clickPromise = user.click(screen.getAllByRole('button', { name: 'Kick' })[1]!);

  expect(await screen.findByRole('button', { name: 'Kicking...' })).toBeDisabled();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getAllByRole('button', { name: 'Kick' })[0]).toBeEnabled();

  resolveLogout?.(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );

  await clickPromise;
  await screen.findByText('session-current');
  expect(screen.queryByText('session-peer')).not.toBeInTheDocument();
  expect(sdkMocks.reloadMe).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Unable to kick session.')).not.toBeInTheDocument();
});

it('shows a section-scoped kick error and allows retry', async () => {
  const user = userEvent.setup();
  localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
  sdkMocks.sessionState.current = {
    status: 'authenticated',
    authenticated: true,
    sessionId: 'session-current',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    receivedAt: '2026-04-12T00:00:00.000Z',
    expiresAt: '2026-04-12T01:00:00.000Z',
    me: {
      user_id: 'user-1',
      email: 'user@example.com',
      webauthn_credentials: [],
      active_sessions: [
        {
          id: 'session-current',
          created_at: '2026-04-12T00:00:00.000Z',
          expires_at: '2026-04-12T01:00:00.000Z',
        },
        {
          id: 'session-peer',
          created_at: '2026-04-12T00:05:00.000Z',
          expires_at: '2026-04-12T01:05:00.000Z',
        },
      ],
    },
  };

  const fetchMock = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'request_failed' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

  vi.stubGlobal('fetch', fetchMock);

  render(
    <MemoryRouter initialEntries={['/session']}>
      <AppRouter />
    </MemoryRouter>,
  );

  const sessionsSection = screen.getByRole('region', { name: 'Active sessions' });

  const kickButton = screen.getAllByRole('button', { name: 'Kick' })[1]!;
  await user.click(kickButton);

  expect(within(sessionsSection).getByText('Unable to kick session.')).toBeInTheDocument();
  expect(screen.getByText('session-peer')).toBeInTheDocument();
  expect(sdkMocks.reloadMe).not.toHaveBeenCalled();

  sdkMocks.sessionState.current = {
    ...sdkMocks.sessionState.current,
    me: {
      ...sdkMocks.sessionState.current.me!,
      active_sessions: [
        {
          id: 'session-current',
          created_at: '2026-04-12T00:00:00.000Z',
          expires_at: '2026-04-12T01:00:00.000Z',
        },
      ],
    },
  };

  await user.click(screen.getAllByRole('button', { name: 'Kick' })[1]!);

  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(await screen.findByText('session-current')).toBeInTheDocument();
  expect(screen.queryByText('session-peer')).not.toBeInTheDocument();
  expect(within(sessionsSection).queryByText('Unable to kick session.')).not.toBeInTheDocument();
});
```

- [ ] **Step 4: Run the focused route test to lock the missing behavior before implementation**

Run: `npm --prefix examples/demo run test -- src/routes/session.test.tsx`

Expected: FAIL because `SessionRoute` does not yet render `Active sessions`, does not expose a table, and does not issue the peer logout request.

### Task 2: Implement The Route-Local Session Table And Kick Flow

**Files:**

- Modify: `examples/demo/src/routes/session.tsx`
- Modify: `examples/demo/src/routes/session.test.tsx`

- [ ] **Step 1: Add the `Active sessions` section and route-local mutation state**

Update `examples/demo/src/routes/session.tsx` so it derives rows from `user?.active_sessions ?? []`, renders an empty state when none exist, and performs the logout request plus `sdk.me.reload()` when a row action succeeds.

```tsx
import { useState } from 'react';
import { FlowCard } from '@/components/app/flow-card';
import { JsonPanel } from '@/components/app/json-panel';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/app/providers/demo-provider';

type ActiveSession = {
  id: string;
  created_at: string;
  expires_at: string;
};

export function SessionRoute() {
  const { clearLocalAuthState, config, sdk, session, user } = useDemo();
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [tableError, setTableError] = useState('');
  const activeSessions = Array.isArray(user?.active_sessions)
    ? (user.active_sessions as ActiveSession[])
    : [];

  async function kickSession(targetSessionId: string) {
    if (
      pendingSessionId ||
      !sdk ||
      config.status !== 'ready' ||
      !session.accessToken
    ) {
      return;
    }

    setPendingSessionId(targetSessionId);
    setTableError('');

    try {
      const response = await fetch(
        new URL(`/session/${targetSessionId}/logout`, config.authOrigin),
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${session.accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Kick failed with status ${response.status}`);
      }

      await sdk.me.reload();
      setTableError('');
    } catch {
      setTableError('Unable to kick session.');
    } finally {
      setPendingSessionId(null);
    }
  }

  return (
    <FlowCard
      title="Session"
      description="Inspect the current auth snapshot and clear local state when needed."
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm text-slate-600">
            Shared provider state keeps the session snapshot and current user in
            sync with the demo SDK.
          </p>
          <Button onClick={() => void clearLocalAuthState()}>
            Clear local auth state
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <JsonPanel
            title="Current session"
            value={session ?? { status: config.status }}
          />
          <JsonPanel title="Current user" value={user} />
        </div>

        <section
          aria-labelledby="active-sessions-heading"
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <h2
            id="active-sessions-heading"
            className="text-sm font-semibold text-slate-950"
          >
            Active sessions
          </h2>
          <p className="text-sm text-slate-600">
            Review every active session returned by the current `/me` snapshot.
          </p>
          {tableError ? <p className="text-sm text-rose-600">{tableError}</p> : null}
          {activeSessions.length === 0 ? (
            <p className="text-sm text-slate-600">No active sessions.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-medium">Session ID</th>
                    <th className="py-2 pr-4 font-medium">Created At</th>
                    <th className="py-2 pr-4 font-medium">Expires At</th>
                    <th className="py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSessions.map((activeSession) => {
                    const isPending = pendingSessionId === activeSession.id;

                    return (
                      <tr
                        key={activeSession.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="py-3 pr-4 font-mono text-xs text-slate-700">
                          {activeSession.id}
                        </td>
                        <td className="py-3 pr-4">{activeSession.created_at}</td>
                        <td className="py-3 pr-4">{activeSession.expires_at}</td>
                        <td className="py-3">
                          <Button
                            disabled={isPending}
                            onClick={() => void kickSession(activeSession.id)}
                            size="sm"
                            variant="outline"
                          >
                            {isPending ? 'Kicking...' : 'Kick'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </FlowCard>
  );
}
```

- [ ] **Step 2: Keep the route test deterministic around async refresh and retry**

Adjust the new tests in `examples/demo/src/routes/session.test.tsx` to wrap the `fetch` stubs with `vi.stubGlobal('fetch', ...)` / `vi.unstubAllGlobals()` and reset `sdkMocks.reloadMe.mockClear()` in `beforeEach()` so the success and retry assertions do not leak between cases.

```tsx
beforeEach(() => {
  localStorage.clear();
  sdkMocks.createBrowserSdk.mockClear();
  sdkMocks.logout.mockClear();
  sdkMocks.reloadMe.mockClear();
  sdkMocks.listeners.length = 0;
  vi.unstubAllGlobals();
  sdkMocks.sessionState.current = {
    status: 'anonymous',
    authenticated: false,
    sessionId: null,
    accessToken: null,
    refreshToken: null,
    receivedAt: null,
    expiresAt: null,
    me: null,
  };
  localStorage.setItem(AUTH_ORIGIN_KEY, 'https://auth.example.com');
});
```

- [ ] **Step 3: Run the focused route test again and confirm the route now passes**

Run: `npm --prefix examples/demo run test -- src/routes/session.test.tsx`

Expected: PASS with the new empty-state, multi-row table, kick-success refresh, and kick-retry assertions all green.

- [ ] **Step 4: Commit the demo session table route work**

```bash
git add examples/demo/src/routes/session.tsx examples/demo/src/routes/session.test.tsx
git commit -m "feat: add demo session table"
```

### Task 3: Final Verification Sweep

**Files:**

- Modify: none
- Test: `examples/demo/src/routes/session.test.tsx`

- [ ] **Step 1: Re-run the focused session route suite from a clean test process**

Run: `npm --prefix examples/demo run test -- src/routes/session.test.tsx`

Expected: PASS with no failed assertions and no leaked `fetch` stubs.

- [ ] **Step 2: Confirm only the intended demo route files are part of the implementation commit**

Run: `git status --short`

Expected: only `examples/demo/src/routes/session.tsx` and `examples/demo/src/routes/session.test.tsx` remain modified before the implementation commit in Task 2, or the working tree is clean after the commit.
