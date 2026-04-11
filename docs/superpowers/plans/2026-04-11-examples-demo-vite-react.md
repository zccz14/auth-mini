# Examples Demo Vite React Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new formal demo app in `examples/demo` using Vite + React + TypeScript, keeping the core auth flows while removing the API reference and leaving the existing `demo/` and CI unchanged.

**Architecture:** Create `examples/demo` as an isolated frontend package that consumes `auth-mini/sdk/browser` through `"auth-mini": "file:../.."`. Use `HashRouter` plus a shared provider that owns config, SDK lifecycle, session state, and route-spanning action status. Keep UI composition simple: app shell, route pages, and focused flow components backed by a small `lib/` layer.

**Tech Stack:** Vite, React, TypeScript, react-router, Tailwind CSS, shadcn/ui, Vitest, Testing Library, auth-mini browser SDK

---

## File Structure

- Create: `examples/demo/package.json`
  - standalone frontend package metadata, scripts, and dependencies
- Create: `examples/demo/tsconfig.json`
  - TypeScript config for the demo app
- Create: `examples/demo/tsconfig.node.json`
  - TS config for Vite config typing
- Create: `examples/demo/vite.config.ts`
  - Vite config with `HashRouter`-friendly dev/build defaults and test config
- Create: `examples/demo/index.html`
  - Vite HTML entry
- Create: `examples/demo/postcss.config.js`
  - Tailwind PostCSS wiring
- Create: `examples/demo/tailwind.config.ts`
  - Tailwind content + theme config
- Create: `examples/demo/components.json`
  - shadcn/ui config
- Create: `examples/demo/src/main.tsx`
  - React bootstrap
- Create: `examples/demo/src/app/router.tsx`
  - route tree and shared app shell
- Create: `examples/demo/src/app/providers/demo-provider.tsx`
  - central SDK/config/session/action context
- Create: `examples/demo/src/app/providers/demo-provider.test.tsx`
  - provider lifecycle and disabled-state tests
- Create: `examples/demo/src/components/app/app-shell.tsx`
  - top nav + environment bar + outlet layout
- Create: `examples/demo/src/components/app/status-banner.tsx`
  - global setup / invalid-config / session-status banner
- Create: `examples/demo/src/components/app/flow-card.tsx`
  - reusable card wrapper for interactive flows
- Create: `examples/demo/src/components/app/json-panel.tsx`
  - compact state/result renderer
- Create: `examples/demo/src/components/ui/button.tsx`
- Create: `examples/demo/src/components/ui/input.tsx`
- Create: `examples/demo/src/components/ui/card.tsx`
- Create: `examples/demo/src/components/ui/alert.tsx`
- Create: `examples/demo/src/components/ui/badge.tsx`
- Create: `examples/demo/src/components/ui/tabs.tsx`
- Create: `examples/demo/src/components/ui/separator.tsx`
- Create: `examples/demo/src/lib/cn.ts`
  - `clsx` + `tailwind-merge` helper
- Create: `examples/demo/src/lib/demo-config.ts`
  - parse/normalize/persist auth origin state
- Create: `examples/demo/src/lib/demo-config.test.ts`
  - config parsing tests
- Create: `examples/demo/src/lib/demo-sdk.ts`
  - thin types/helpers over `createBrowserSdk`
- Create: `examples/demo/src/lib/demo-storage.ts`
  - storage helpers for auth origin and flow inputs
- Create: `examples/demo/src/routes/home.tsx`
  - landing page
- Create: `examples/demo/src/routes/setup.tsx`
  - setup/config page
- Create: `examples/demo/src/routes/email.tsx`
  - email flow page
- Create: `examples/demo/src/routes/passkey.tsx`
  - passkey flow page
- Create: `examples/demo/src/routes/session.tsx`
  - session state page
- Create: `examples/demo/src/routes/router.test.tsx`
  - route shell coverage
- Create: `examples/demo/src/routes/email.test.tsx`
  - email flow coverage
- Create: `examples/demo/src/routes/passkey.test.tsx`
  - passkey flow coverage
- Create: `examples/demo/src/routes/session.test.tsx`
  - session page coverage
- Create: `examples/demo/src/styles/globals.css`
  - Tailwind layers and base theme tokens
- Modify: `package.json`
  - add a root helper script for demo dev/build orchestration if needed
- Create: `scripts/dev-examples-demo.mjs`
  - run root build/watch and `examples/demo` dev together

## Task 1: Scaffold `examples/demo` Package And Tooling

**Files:**

- Create: `examples/demo/package.json`
- Create: `examples/demo/tsconfig.json`
- Create: `examples/demo/tsconfig.node.json`
- Create: `examples/demo/vite.config.ts`
- Create: `examples/demo/index.html`
- Create: `examples/demo/postcss.config.js`
- Create: `examples/demo/tailwind.config.ts`
- Create: `examples/demo/components.json`
- Create: `examples/demo/src/main.tsx`
- Create: `examples/demo/src/styles/globals.css`

- [ ] **Step 1: Write the failing config and bootstrap tests**

Create `examples/demo/src/lib/demo-config.test.ts` with an explicit failing expectation for missing `auth-origin` handling:

```ts
import { describe, expect, it } from 'vitest';
import { getInitialDemoConfig } from './demo-config';

describe('getInitialDemoConfig', () => {
  it('returns waiting status when no auth origin is present', () => {
    expect(
      getInitialDemoConfig({
        hash: '#/',
        search: '',
        storageOrigin: '',
        pageOrigin: 'https://demo.example.com',
      }),
    ).toEqual({
      authOrigin: '',
      configError:
        'auth-origin must be configured before interactive flows are enabled.',
      pageOrigin: 'https://demo.example.com',
      status: 'waiting',
    });
  });
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm --prefix examples/demo test -- src/lib/demo-config.test.ts`

Expected: FAIL because `examples/demo` and `src/lib/demo-config.ts` do not exist yet.

- [ ] **Step 3: Create the package and Vite/Tailwind/shadcn scaffold with minimal passing config**

Create `examples/demo/package.json`:

```json
{
  "name": "auth-mini-examples-demo",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-alert-dialog": "^1.1.14",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-tabs": "^1.1.12",
    "auth-mini": "file:../..",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.511.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.0",
    "tailwind-merge": "^3.3.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "@vitejs/plugin-react": "^4.4.1",
    "autoprefixer": "^10.4.21",
    "jsdom": "^26.1.0",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.8.3",
    "vite": "^6.3.5",
    "vitest": "^3.2.4"
  }
}
```

Create `examples/demo/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

Create `examples/demo/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AppRouter } from './app/router';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AppRouter />
    </HashRouter>
  </React.StrictMode>,
);
```

Create `examples/demo/src/lib/demo-config.ts`:

```ts
export function getInitialDemoConfig({
  hash,
  search,
  storageOrigin,
  pageOrigin,
}: {
  hash: string;
  search: string;
  storageOrigin: string;
  pageOrigin: string;
}) {
  void hash;
  void search;

  if (!storageOrigin) {
    return {
      authOrigin: '',
      configError:
        'auth-origin must be configured before interactive flows are enabled.',
      pageOrigin,
      status: 'waiting' as const,
    };
  }

  return {
    authOrigin: storageOrigin,
    configError: '',
    pageOrigin,
    status: 'ready' as const,
  };
}
```

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `npm --prefix examples/demo test -- src/lib/demo-config.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the scaffold**

```bash
git add examples/demo/package.json examples/demo/tsconfig.json examples/demo/tsconfig.node.json examples/demo/vite.config.ts examples/demo/index.html examples/demo/postcss.config.js examples/demo/tailwind.config.ts examples/demo/components.json examples/demo/src/main.tsx examples/demo/src/styles/globals.css examples/demo/src/lib/demo-config.ts examples/demo/src/lib/demo-config.test.ts
git commit -m "feat: scaffold examples demo app"
```

## Task 2: Add Shared Provider, SDK Wiring, And App Shell

**Files:**

- Create: `examples/demo/src/app/router.tsx`
- Create: `examples/demo/src/app/providers/demo-provider.tsx`
- Create: `examples/demo/src/app/providers/demo-provider.test.tsx`
- Create: `examples/demo/src/components/app/app-shell.tsx`
- Create: `examples/demo/src/components/app/status-banner.tsx`
- Create: `examples/demo/src/components/app/flow-card.tsx`
- Create: `examples/demo/src/components/app/json-panel.tsx`
- Create: `examples/demo/src/lib/demo-sdk.ts`
- Create: `examples/demo/src/lib/demo-storage.ts`
- Create: `examples/demo/src/components/ui/button.tsx`
- Create: `examples/demo/src/components/ui/input.tsx`
- Create: `examples/demo/src/components/ui/card.tsx`
- Create: `examples/demo/src/components/ui/alert.tsx`
- Create: `examples/demo/src/components/ui/badge.tsx`
- Create: `examples/demo/src/components/ui/tabs.tsx`
- Create: `examples/demo/src/components/ui/separator.tsx`
- Create: `examples/demo/src/lib/cn.ts`
- Test: `examples/demo/src/app/providers/demo-provider.test.tsx`
- Test: `examples/demo/src/routes/router.test.tsx`

- [ ] **Step 1: Write the failing provider and router tests**

Create `examples/demo/src/app/providers/demo-provider.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DemoProvider, useDemo } from './demo-provider';

vi.mock('auth-mini/sdk/browser', () => ({
  createBrowserSdk: vi.fn(() => ({
    session: { getState: () => ({ status: 'anonymous' }), onChange: vi.fn() },
    me: { get: () => null, reload: vi.fn() },
  })),
}));

function Probe() {
  const demo = useDemo();
  return <div>{demo.config.status}</div>;
}

describe('DemoProvider', () => {
  it('keeps the app disabled when auth origin is missing', () => {
    render(
      <DemoProvider
        initialLocation={{
          hash: '#/setup',
          search: '',
          origin: 'https://demo.example.com',
        }}
      >
        <Probe />
      </DemoProvider>,
    );

    expect(screen.getByText('waiting')).toBeInTheDocument();
  });
});
```

Create `examples/demo/src/routes/router.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from '../app/router';

describe('AppRouter', () => {
  it('renders top-level nav entries for the app shell', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Setup' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Passkey' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Session' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the provider/router tests to verify they fail**

Run: `npm --prefix examples/demo test -- src/app/providers/demo-provider.test.tsx src/routes/router.test.tsx`

Expected: FAIL because the provider, router, and shell files do not exist yet.

- [ ] **Step 3: Implement the shared provider, shell, and base UI primitives**

Create `examples/demo/src/lib/demo-sdk.ts`:

```ts
import { createBrowserSdk } from 'auth-mini/sdk/browser';

export type DemoSdk = ReturnType<typeof createBrowserSdk>;

export function createDemoSdk(authOrigin: string): DemoSdk {
  return createBrowserSdk(authOrigin);
}
```

Create `examples/demo/src/app/providers/demo-provider.tsx`:

```tsx
import { createContext, useContext, useMemo } from 'react';
import { getInitialDemoConfig } from '@/lib/demo-config';
import { createDemoSdk } from '@/lib/demo-sdk';

const DemoContext = createContext<null | {
  config: ReturnType<typeof getInitialDemoConfig>;
  sdk: ReturnType<typeof createDemoSdk> | null;
}>(null);

export function DemoProvider({
  children,
  initialLocation,
}: React.PropsWithChildren<{
  initialLocation?: { hash: string; search: string; origin: string };
}>) {
  const config = getInitialDemoConfig({
    hash: initialLocation?.hash ?? window.location.hash,
    search: initialLocation?.search ?? window.location.search,
    storageOrigin: '',
    pageOrigin: initialLocation?.origin ?? window.location.origin,
  });

  const value = useMemo(
    () => ({
      config,
      sdk: config.status === 'ready' ? createDemoSdk(config.authOrigin) : null,
    }),
    [config],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error('useDemo must be used inside DemoProvider');
  return value;
}
```

Create `examples/demo/src/components/app/app-shell.tsx`:

```tsx
import { NavLink, Outlet } from 'react-router-dom';

const links = [
  ['/', 'Home'],
  ['/setup', 'Setup'],
  ['/email', 'Email'],
  ['/passkey', 'Passkey'],
  ['/session', 'Session'],
] as const;

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <nav className="mx-auto flex max-w-6xl gap-6 px-6 py-4">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
```

Create `examples/demo/src/app/router.tsx`:

```tsx
import { Routes, Route } from 'react-router-dom';
import { DemoProvider } from './providers/demo-provider';
import { AppShell } from '@/components/app/app-shell';

function Placeholder({ title }: { title: string }) {
  return (
    <section>
      <h1>{title}</h1>
    </section>
  );
}

export function AppRouter() {
  return (
    <DemoProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Placeholder title="Home" />} />
          <Route path="/setup" element={<Placeholder title="Setup" />} />
          <Route path="/email" element={<Placeholder title="Email" />} />
          <Route path="/passkey" element={<Placeholder title="Passkey" />} />
          <Route path="/session" element={<Placeholder title="Session" />} />
        </Route>
      </Routes>
    </DemoProvider>
  );
}
```

- [ ] **Step 4: Run the provider/router tests to verify they pass**

Run: `npm --prefix examples/demo test -- src/app/providers/demo-provider.test.tsx src/routes/router.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the provider and shell**

```bash
git add examples/demo/src/app/router.tsx examples/demo/src/app/providers/demo-provider.tsx examples/demo/src/app/providers/demo-provider.test.tsx examples/demo/src/components/app/app-shell.tsx examples/demo/src/components/app/status-banner.tsx examples/demo/src/components/app/flow-card.tsx examples/demo/src/components/app/json-panel.tsx examples/demo/src/components/ui/button.tsx examples/demo/src/components/ui/input.tsx examples/demo/src/components/ui/card.tsx examples/demo/src/components/ui/alert.tsx examples/demo/src/components/ui/badge.tsx examples/demo/src/components/ui/tabs.tsx examples/demo/src/components/ui/separator.tsx examples/demo/src/lib/cn.ts examples/demo/src/lib/demo-sdk.ts examples/demo/src/lib/demo-storage.ts examples/demo/src/routes/router.test.tsx
git commit -m "feat: add demo app shell and provider"
```

## Task 3: Implement Setup And Home Routes

**Files:**

- Create: `examples/demo/src/routes/home.tsx`
- Create: `examples/demo/src/routes/setup.tsx`
- Modify: `examples/demo/src/app/router.tsx`
- Modify: `examples/demo/src/app/providers/demo-provider.tsx`
- Modify: `examples/demo/src/lib/demo-config.ts`
- Modify: `examples/demo/src/lib/demo-config.test.ts`
- Test: `examples/demo/src/routes/router.test.tsx`

- [ ] **Step 1: Extend the failing tests for setup persistence and home readiness copy**

Add to `examples/demo/src/lib/demo-config.test.ts`:

```ts
it('prefers the hash auth-origin query over storage', () => {
  expect(
    getInitialDemoConfig({
      hash: '#/setup?auth-origin=https://auth.example.com',
      search: '',
      storageOrigin: 'https://stale.example.com',
      pageOrigin: 'https://demo.example.com',
    }),
  ).toMatchObject({
    authOrigin: 'https://auth.example.com',
    status: 'ready',
  });
});
```

Add to `examples/demo/src/routes/router.test.tsx`:

```tsx
it('renders the setup route with an auth origin form', () => {
  render(
    <MemoryRouter initialEntries={['/setup']}>
      <AppRouter />
    </MemoryRouter>,
  );

  expect(screen.getByLabelText('Auth server origin')).toBeInTheDocument();
  expect(screen.getByText('Page origin')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the setup/home tests to verify they fail**

Run: `npm --prefix examples/demo test -- src/lib/demo-config.test.ts src/routes/router.test.tsx`

Expected: FAIL because hash parsing and concrete setup/home route rendering are not implemented yet.

- [ ] **Step 3: Implement setup parsing, persistence, and the first real routes**

Update `examples/demo/src/lib/demo-config.ts`:

```ts
function readHashAuthOrigin(hash: string) {
  const queryIndex = hash.indexOf('?');
  if (queryIndex < 0) return '';

  const params = new URLSearchParams(hash.slice(queryIndex + 1));
  return params.get('auth-origin') ?? '';
}

export function getInitialDemoConfig({
  hash,
  storageOrigin,
  pageOrigin,
}: {
  hash: string;
  search: string;
  storageOrigin: string;
  pageOrigin: string;
}) {
  const candidateOrigin = readHashAuthOrigin(hash) || storageOrigin;

  if (!candidateOrigin) {
    return {
      authOrigin: '',
      configError:
        'auth-origin must be configured before interactive flows are enabled.',
      pageOrigin,
      status: 'waiting' as const,
    };
  }

  return {
    authOrigin: candidateOrigin,
    configError: '',
    pageOrigin,
    status: 'ready' as const,
  };
}
```

Create `examples/demo/src/routes/home.tsx`:

```tsx
import { useDemo } from '@/app/providers/demo-provider';

export function HomeRoute() {
  const { config } = useDemo();

  return (
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground">auth-mini</p>
      <h1 className="text-3xl font-semibold">A formal browser auth demo</h1>
      <p className="max-w-2xl text-muted-foreground">
        Explore email OTP, passkey registration, passkey sign-in, and current
        session state through a compact product-style UI.
      </p>
      <div>
        {config.status === 'ready'
          ? 'Interactive flows enabled'
          : 'Complete setup to enable flows'}
      </div>
    </section>
  );
}
```

Create `examples/demo/src/routes/setup.tsx`:

```tsx
import { useDemo } from '@/app/providers/demo-provider';

export function SetupRoute() {
  const { config } = useDemo();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Setup</h1>
        <p className="text-muted-foreground">
          Configure the auth origin before running browser flows.
        </p>
      </div>

      <label className="grid gap-2">
        <span>Auth server origin</span>
        <input
          aria-label="Auth server origin"
          defaultValue={config.authOrigin}
        />
      </label>

      <div>
        <strong>Page origin</strong>
        <div>{config.pageOrigin}</div>
      </div>
    </section>
  );
}
```

Update `examples/demo/src/app/router.tsx` to use `HomeRoute` and `SetupRoute`.

- [ ] **Step 4: Run the setup/home tests to verify they pass**

Run: `npm --prefix examples/demo test -- src/lib/demo-config.test.ts src/routes/router.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the setup/home routes**

```bash
git add examples/demo/src/lib/demo-config.ts examples/demo/src/lib/demo-config.test.ts examples/demo/src/routes/home.tsx examples/demo/src/routes/setup.tsx examples/demo/src/app/router.tsx examples/demo/src/routes/router.test.tsx
git commit -m "feat: add demo home and setup routes"
```

## Task 4: Implement Email And Passkey Routes

**Files:**

- Create: `examples/demo/src/routes/email.tsx`
- Create: `examples/demo/src/routes/passkey.tsx`
- Create: `examples/demo/src/routes/email.test.tsx`
- Create: `examples/demo/src/routes/passkey.test.tsx`
- Modify: `examples/demo/src/app/providers/demo-provider.tsx`
- Modify: `examples/demo/src/app/router.tsx`

- [ ] **Step 1: Write the failing email and passkey route tests**

Create `examples/demo/src/routes/email.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from '@/app/router';

describe('EmailRoute', () => {
  it('disables the start button until auth origin is configured', async () => {
    render(
      <MemoryRouter initialEntries={['/email']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: 'Send email code' }),
    ).toBeDisabled();
  });
});
```

Create `examples/demo/src/routes/passkey.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from '@/app/router';

describe('PasskeyRoute', () => {
  it('renders both register and sign-in actions', () => {
    render(
      <MemoryRouter initialEntries={['/passkey']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: 'Create passkey' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sign in with passkey' }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the route tests to verify they fail**

Run: `npm --prefix examples/demo test -- src/routes/email.test.tsx src/routes/passkey.test.tsx`

Expected: FAIL because email and passkey pages are still placeholders.

- [ ] **Step 3: Implement the email and passkey routes with provider-backed actions**

Create `examples/demo/src/routes/email.tsx`:

```tsx
import { useState } from 'react';
import { useDemo } from '@/app/providers/demo-provider';

export function EmailRoute() {
  const { config } = useDemo();
  const [email, setEmail] = useState('');
  const interactive = config.status === 'ready';

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <article>
        <h1>Email sign-in</h1>
        <label>
          <span>Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button disabled={!interactive}>Send email code</button>
      </article>
      <article>
        <h2>Verify code</h2>
        <input aria-label="OTP code" />
        <button disabled={!interactive}>Verify email code</button>
      </article>
    </section>
  );
}
```

Create `examples/demo/src/routes/passkey.tsx`:

```tsx
import { useDemo } from '@/app/providers/demo-provider';

export function PasskeyRoute() {
  const { config } = useDemo();
  const interactive = config.status === 'ready';

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <article>
        <h1>Register a passkey</h1>
        <p>Create a new credential for the current user after email sign-in.</p>
        <button disabled={!interactive}>Create passkey</button>
      </article>
      <article>
        <h2>Sign in with passkey</h2>
        <p>Run username-less authentication with the configured auth origin.</p>
        <button disabled={!interactive}>Sign in with passkey</button>
      </article>
    </section>
  );
}
```

Update `examples/demo/src/app/router.tsx` to mount these route components.

- [ ] **Step 4: Run the route tests to verify they pass**

Run: `npm --prefix examples/demo test -- src/routes/email.test.tsx src/routes/passkey.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the email and passkey pages**

```bash
git add examples/demo/src/routes/email.tsx examples/demo/src/routes/passkey.tsx examples/demo/src/routes/email.test.tsx examples/demo/src/routes/passkey.test.tsx examples/demo/src/app/router.tsx examples/demo/src/app/providers/demo-provider.tsx
git commit -m "feat: add demo auth flow routes"
```

## Task 5: Implement Session Route And Shared Result Panels

**Files:**

- Create: `examples/demo/src/routes/session.tsx`
- Create: `examples/demo/src/routes/session.test.tsx`
- Modify: `examples/demo/src/components/app/json-panel.tsx`
- Modify: `examples/demo/src/app/providers/demo-provider.tsx`
- Modify: `examples/demo/src/app/router.tsx`

- [ ] **Step 1: Write the failing session route tests**

Create `examples/demo/src/routes/session.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from '@/app/router';

describe('SessionRoute', () => {
  it('shows the current session and user sections', () => {
    render(
      <MemoryRouter initialEntries={['/session']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByText('Current session')).toBeInTheDocument();
    expect(screen.getByText('Current user')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Clear local auth state' }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the session test to verify it fails**

Run: `npm --prefix examples/demo test -- src/routes/session.test.tsx`

Expected: FAIL because the session route is still a placeholder.

- [ ] **Step 3: Implement the session route with compact state panels**

Create `examples/demo/src/components/app/json-panel.tsx`:

```tsx
export function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">
        {title}
      </h2>
      <pre className="overflow-x-auto text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}
```

Create `examples/demo/src/routes/session.tsx`:

```tsx
import { JsonPanel } from '@/components/app/json-panel';
import { useDemo } from '@/app/providers/demo-provider';

export function SessionRoute() {
  const { config, sdk } = useDemo();

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Session</h1>
          <p className="text-muted-foreground">
            Inspect the current auth snapshot and clear local state when needed.
          </p>
        </div>
        <button>Clear local auth state</button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <JsonPanel
          title="Current session"
          value={sdk?.session.getState() ?? { status: config.status }}
        />
        <JsonPanel title="Current user" value={sdk?.me.get() ?? null} />
      </div>
    </section>
  );
}
```

Update `examples/demo/src/app/router.tsx` to mount `SessionRoute`.

- [ ] **Step 4: Run the session test to verify it passes**

Run: `npm --prefix examples/demo test -- src/routes/session.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the session route**

```bash
git add examples/demo/src/routes/session.tsx examples/demo/src/routes/session.test.tsx examples/demo/src/components/app/json-panel.tsx examples/demo/src/app/router.tsx examples/demo/src/app/providers/demo-provider.tsx
git commit -m "feat: add demo session route"
```

## Task 6: Add Root-Level Dev Orchestration And Final Verification

**Files:**

- Create: `scripts/dev-examples-demo.mjs`
- Modify: `package.json`
- Test: `examples/demo/src/lib/demo-config.test.ts`
- Test: `examples/demo/src/app/providers/demo-provider.test.tsx`
- Test: `examples/demo/src/routes/router.test.tsx`
- Test: `examples/demo/src/routes/email.test.tsx`
- Test: `examples/demo/src/routes/passkey.test.tsx`
- Test: `examples/demo/src/routes/session.test.tsx`

- [ ] **Step 1: Write the failing orchestration expectation**

Add this unit test to `tests/unit/examples-demo-dev-script.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

describe('examples demo dev script', () => {
  it('runs both the root SDK build watch and demo vite dev server', async () => {
    const source = await readFile('scripts/dev-examples-demo.mjs', 'utf8');

    expect(source).toContain('npm run build -- --watch');
    expect(source).toContain('npm --prefix examples/demo run dev');
  });
});
```

- [ ] **Step 2: Run the orchestration test to verify it fails**

Run: `npm test -- tests/unit/examples-demo-dev-script.test.ts`

Expected: FAIL because `scripts/dev-examples-demo.mjs` does not exist yet.

- [ ] **Step 3: Implement the dev helper and root script entry**

Create `scripts/dev-examples-demo.mjs`:

```js
import { spawn } from 'node:child_process';

const processes = [
  spawn('npm', ['run', 'build', '--', '--watch'], {
    stdio: 'inherit',
    shell: true,
  }),
  spawn('npm', ['--prefix', 'examples/demo', 'run', 'dev'], {
    stdio: 'inherit',
    shell: true,
  }),
];

const terminate = () => {
  for (const child of processes) {
    child.kill('SIGTERM');
  }
};

process.on('SIGINT', terminate);
process.on('SIGTERM', terminate);
```

Update root `package.json` scripts:

```json
{
  "scripts": {
    "demo:dev": "node scripts/dev-examples-demo.mjs",
    "demo:build": "npm run build && npm --prefix examples/demo run build",
    "demo:typecheck": "npm --prefix examples/demo run typecheck"
  }
}
```

- [ ] **Step 4: Run the orchestration and app verification commands**

Run: `npm test -- tests/unit/examples-demo-dev-script.test.ts && npm --prefix examples/demo test && npm --prefix examples/demo run typecheck && npm run demo:build`

Expected: PASS. The new helper script exists, the demo tests pass, the demo typechecks, and both the root package and `examples/demo` build successfully.

- [ ] **Step 5: Commit the final demo tooling and verification changes**

```bash
git add package.json scripts/dev-examples-demo.mjs tests/unit/examples-demo-dev-script.test.ts examples/demo
git commit -m "feat: add examples demo workflow"
```

## Self-Review

- Spec coverage:
  - Independent package boundary: covered in Tasks 1 and 6.
  - `file:../..` SDK consumption: covered in Tasks 1 and 2.
  - `HashRouter` multi-route app: covered in Tasks 1, 2, 3, 4, and 5.
  - shadcn/ui component structure: covered in Task 2.
  - formal simplified UI with setup/email/passkey/session pages: covered in Tasks 3, 4, and 5.
  - keep old `demo/` and CI unchanged: no tasks modify `demo/` or CI.
- Placeholder scan:
  - Removed `TBD`/`TODO` style language.
  - Each task includes explicit files, tests, commands, and code blocks.
- Type consistency:
  - `DemoProvider`, `useDemo`, `createDemoSdk`, and route names are used consistently across tasks.
