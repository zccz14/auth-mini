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
            <h3 className="text-lg font-semibold text-slate-950">Good fit</h3>
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
            <h3 className="text-lg font-semibold text-slate-950">Not included</h3>
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
