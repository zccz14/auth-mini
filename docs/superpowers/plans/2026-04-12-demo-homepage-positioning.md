# Demo Homepage Positioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition `examples/demo` homepage as the default `auth-mini` product landing page while preserving the existing app shell and keeping Setup, Email, Passkey, and Session as separate proof-flow routes.

**Architecture:** Keep all homepage work inside `examples/demo/src/routes/home.tsx` plus focused route tests so the redesign stays local to the demo landing page. Reuse the existing app shell, provider, Tailwind utility classes, and card primitives; do not move responsibilities into other routes or add global styling unless a specific layout bug cannot be solved with existing utilities.

**Tech Stack:** React, TypeScript, react-router-dom, Tailwind CSS utilities, existing demo UI primitives, Vitest, Testing Library

---

## File Structure

- Create: `examples/demo/src/routes/home.test.tsx`
  - focused homepage assertions for the approved five-section information architecture, exact hero title, CTA labels, and helper setup-status copy
- Modify: `examples/demo/src/routes/home.tsx`
  - replace the current `FlowCard`-style intro with a product-positioned homepage that keeps all content local to the home route
- Modify: `examples/demo/src/routes/router.test.tsx`
  - preserve router-level coverage that `/` still renders inside the existing app shell with top navigation plus the new homepage headline

## Task 1: Lock Homepage Positioning With Failing Route Tests

**Files:**

- Create: `examples/demo/src/routes/home.test.tsx`
- Modify: `examples/demo/src/routes/router.test.tsx`

- [ ] **Step 1: Create a focused failing homepage test for the approved content structure**

Create `examples/demo/src/routes/home.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DemoProvider } from '@/app/providers/demo-provider';
import { HomeRoute } from './home';

function renderHomeRoute(authOrigin?: string) {
  localStorage.clear();

  if (authOrigin) {
    localStorage.setItem('auth-mini-demo.auth-origin', authOrigin);
  }

  render(
    <MemoryRouter initialEntries={['/']}>
      <DemoProvider
        initialLocation={{
          hash: '#/',
          search: '',
          origin: 'https://demo.example.com',
        }}
      >
        <HomeRoute />
      </DemoProvider>
    </MemoryRouter>,
  );
}

describe('HomeRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the approved homepage positioning and section order', () => {
    renderHomeRoute();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Minimal Self-Hosted Auth Server for your Apps',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Official auth-mini Auth Server demo'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Why teams pick auth-mini',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Auth server capabilities',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Good fit' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Not included' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Validate the browser flows when you are ready',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Start with official Auth Server setup',
      }),
    ).toHaveAttribute('href', '/setup');
    expect(
      screen.getByRole('link', { name: 'Try browser auth flows' }),
    ).toHaveAttribute('href', '/email');
    expect(
      screen.getByText(
        'Demo setup status: visit Setup to connect an auth origin before trying live browser flows.',
      ),
    ).toBeInTheDocument();
  });

  it('demotes setup readiness to helper copy when an auth origin exists', () => {
    renderHomeRoute('https://auth.example.com');

    expect(
      screen.getByText(
        'Demo setup status: ready — auth origin configured for interactive browser flows.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Keep auth in your stack'),
    ).toBeInTheDocument();
    expect(screen.getByText('JWT access + refresh tokens')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the focused homepage test to confirm the current route fails the new expectations**

Run: `npm --prefix examples/demo test -- src/routes/home.test.tsx`

Expected: FAIL because `examples/demo/src/routes/home.tsx` still renders `A formal browser auth demo` inside a single `FlowCard` and does not contain the new section headings or CTA links.

- [ ] **Step 3: Add a router-level regression for app-shell preservation on `/`**

Update `examples/demo/src/routes/router.test.tsx` by extending the first test body:

```tsx
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
  expect(
    screen.getByRole('heading', {
      level: 1,
      name: 'Minimal Self-Hosted Auth Server for your Apps',
    }),
  ).toBeInTheDocument();
});
```

- [ ] **Step 4: Run the router regression test and confirm the home-route assertion fails before implementation**

Run: `npm --prefix examples/demo test -- src/routes/router.test.tsx`

Expected: FAIL on the new hero-heading assertion while the nav assertions still pass, proving the redesign is isolated to the homepage content rather than the app shell.

- [ ] **Step 5: Commit the failing tests before changing production code**

```bash
git add examples/demo/src/routes/home.test.tsx examples/demo/src/routes/router.test.tsx
git commit -m "test: define demo homepage positioning coverage"
```

## Task 2: Implement The Five-Section Homepage In `home.tsx`

**Files:**

- Modify: `examples/demo/src/routes/home.tsx`

- [ ] **Step 1: Replace the current landing-card copy with structured homepage content data**

Update `examples/demo/src/routes/home.tsx` to define the exact content blocks that match the spec and README tone:

```tsx
import { Link } from 'react-router-dom';
import { useDemo } from '@/app/providers/demo-provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const valueCards = [
  {
    title: 'Keep auth in your stack',
    description:
      'Self-host the auth server, keep service ownership, and keep auth data under your control instead of outsourcing the core identity path.',
  },
  {
    title: 'Start password-less by default',
    description:
      'Email OTP and passkeys cover the main browser sign-in path without adding another password reset system.',
  },
  {
    title: 'Verify API access cleanly',
    description:
      'Issue short-lived JWT access tokens with refresh tokens and JWKS so frontends and APIs can integrate against a familiar auth-server contract.',
  },
  {
    title: 'Operate with SQLite simplicity',
    description:
      'Run auth with a single SQLite file that is easy to inspect, back up, move, and deploy without another database tier.',
  },
] as const;

const capabilityItems = [
  'Email OTP',
  'Passkey sign-in',
  'Session state',
  'JWT access + refresh tokens',
  'JWKS for backend verification',
  'Cross-origin frontend integration',
] as const;

const goodFitItems = [
  'A self-hosted auth server for browser apps and backend token verification.',
  'A smaller auth core with clear operational ownership and predictable data flow.',
  'A product that needs authentication without bundling authorization or user-management scope.',
] as const;

const notIncludedItems = [
  'Authorization models such as RBAC, ACLs, roles, permissions, or groups.',
  'Social login providers or enterprise identity federation.',
  'SMS or TOTP multi-factor flows.',
  'User profiles, admin backoffice tooling, or a general user-management suite.',
] as const;
```

- [ ] **Step 2: Render the approved Hero, Core Value Grid, Capability Strip, Scope Boundary, and Demo Entry sections**

Replace the component body in `examples/demo/src/routes/home.tsx` with:

```tsx
export function HomeRoute() {
  const { config } = useDemo();

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-8">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Official auth-mini Auth Server demo
          </p>
          <div className="space-y-3">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Minimal Self-Hosted Auth Server for your Apps
            </h1>
            <p className="max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              Run a self-hosted auth core for your apps with email OTP, passkeys,
              sessions, and JWKS-backed token verification while keeping service
              ownership and user data in your stack.
            </p>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              This is the default product overview for the official demo. Setup,
              Email, Passkey, and Session still exist as proof-flow pages inside the
              current app shell when you want to validate the implementation.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {config.status === 'ready'
              ? 'Demo setup status: ready — auth origin configured for interactive browser flows.'
              : 'Demo setup status: visit Setup to connect an auth origin before trying live browser flows.'}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-950">
            Why teams pick auth-mini
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            The value proposition stays narrow on purpose: a trustworthy auth server
            core that covers the common sign-in and token-verification path without
            turning into a larger identity platform.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {valueCards.map((item) => (
            <Card key={item.title} className="h-full">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-950 px-6 py-6 text-white shadow-sm">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Auth server capabilities</h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-300">
            Scan the auth core quickly, then dive into the dedicated demo routes only
            when you want hands-on verification.
          </p>
          <div className="flex flex-wrap gap-2">
            {capabilityItems.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-white"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Good fit</CardTitle>
            <CardDescription>
              Choose auth-mini when you want a self-hosted authentication core with
              clear scope and a backend-friendly verification story.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm leading-6 text-slate-600">
              {goodFitItems.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="h-full border-amber-200 bg-amber-50/60">
          <CardHeader>
            <CardTitle>Not included</CardTitle>
            <CardDescription>
              Keep the boundary explicit so the homepage does not imply a full identity
              platform or broader product suite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm leading-6 text-slate-700">
              {notIncludedItems.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-amber-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-950">
              Validate the browser flows when you are ready
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Use Setup to connect your auth origin, then move through Email,
              Passkey, and Session to inspect the product in action without turning
              the homepage into a setup checklist.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/setup"
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Start with official Auth Server setup
            </Link>
            <Link
              to="/email"
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Try browser auth flows
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Run the targeted homepage and router tests until the new content passes**

Run: `npm --prefix examples/demo test -- src/routes/home.test.tsx src/routes/router.test.tsx`

Expected: PASS, proving the hero title, section ordering, CTA destinations, helper status text, and nav-preserving route integration all match the approved spec.

- [ ] **Step 4: Commit the homepage implementation once the focused tests are green**

```bash
git add examples/demo/src/routes/home.tsx examples/demo/src/routes/home.test.tsx examples/demo/src/routes/router.test.tsx
git commit -m "feat: reposition demo homepage around auth-mini value"
```

## Task 3: Run Demo-Level Verification Without Expanding Scope

**Files:**

- Verify: `examples/demo/src/routes/home.tsx`
- Verify: `examples/demo/src/routes/home.test.tsx`
- Verify: `examples/demo/src/routes/router.test.tsx`

- [ ] **Step 1: Run the full demo route test suite to confirm the redesign did not affect other route responsibilities**

Run: `npm --prefix examples/demo test`

Expected: PASS for `home.test.tsx`, `router.test.tsx`, and the existing setup/email/passkey/session/provider/storage tests, confirming the homepage redesign did not spill into other demo flows.

- [ ] **Step 2: Run the demo typecheck from the repo root helper script**

Run: `npm run demo:typecheck`

Expected: PASS with no TypeScript errors in `examples/demo`, proving the new homepage JSX and route test additions remain type-safe.

- [ ] **Step 3: Run the demo build from the repo root helper script**

Run: `npm run demo:build`

Expected: PASS after the root package build and `examples/demo` Vite build complete, confirming the homepage redesign does not break the published SDK package or demo bundle.

- [ ] **Step 4: Perform a quick manual browser check against the existing app shell**

Run: `npm --prefix examples/demo run dev -- --host 127.0.0.1 --port 3000`

Expected: The `/` route shows the exact hero title, the five sections appear in order, the status helper remains visually secondary to product copy, the top nav stays unchanged, and Setup / Email / Passkey / Session still present as separate proof-flow routes.

## Self-Review Notes

- **Spec coverage:** Hero, Core Value Grid, Capability Strip, Scope Boundary, and Demo Entry each map to explicit test assertions and rendering work in Task 1 and Task 2; app-shell preservation and non-home route responsibility boundaries are protected by `router.test.tsx` plus full demo verification in Task 3.
- **Placeholder scan:** The plan uses fixed copy, fixed file paths, fixed CTA labels, and fixed commands throughout; no deferred implementation wording remains.
- **Type consistency:** The plan consistently uses `HomeRoute`, `DemoProvider`, `valueCards`, `capabilityItems`, `goodFitItems`, and `notIncludedItems`; CTA destinations are fixed to `/setup` and `/email` across tests and implementation.

Plan complete and saved to `docs/superpowers/plans/2026-04-12-demo-homepage-positioning.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
