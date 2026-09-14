import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useDemo } from '@/app/providers/demo-provider';
import { useI18n } from '@/lib/i18n';

type IconName = 'account' | 'email' | 'security' | 'sessions' | 'remote';

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    account: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20c.8-3.1 3.1-4.7 7-4.7s6.2 1.6 7 4.7" />
      </>
    ),
    email: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    security: (
      <>
        <path d="M12 3 20 7v5c0 4.6-3.1 7.7-8 9-4.9-1.3-8-4.4-8-9V7l8-4Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    sessions: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8m-4-4v4" />
      </>
    ),
    remote: (
      <>
        <path d="M7 7h10m-7-3 3 3-3 3M17 17H7m7 3-3-3 3-3" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}

export function OverviewRoute() {
  const { session, setupState } = useDemo();
  const { t } = useI18n();
  const brandName = setupState?.brand_name ?? 'auth-mini';
  const destinations = [
    {
      to: '/account',
      icon: 'account' as const,
      title: t('shell.account'),
      description: t('overview.accountDescription'),
    },
    {
      to: '/email',
      icon: 'email' as const,
      title: t('shell.email'),
      description: t('overview.emailDescription'),
    },
    {
      to: '/security/passkey',
      icon: 'security' as const,
      title: t('overview.credentials'),
      description: t('overview.credentialsDescription'),
    },
    {
      to: '/sessions',
      icon: 'sessions' as const,
      title: t('shell.sessions'),
      description: t('overview.sessionsDescription'),
    },
    {
      to: '/remote-logins',
      icon: 'remote' as const,
      title: t('shell.remoteLogin'),
      description: t('overview.remoteDescription'),
    },
  ];

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-slate-200 bg-white px-5 py-5 sm:px-6">
        <p className="text-sm font-medium text-slate-500">{brandName}</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
          {t('overview.title')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {t('overview.description')}
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
          <span>
            {t('overview.sessionStatus')}:{' '}
            {session.authenticated
              ? t('overview.connected')
              : t('overview.disconnected')}
          </span>
          {session.sessionId ? (
            <span className="font-mono">{session.sessionId}</span>
          ) : null}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              {t('overview.workspaceTitle')}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t('overview.workspaceDescription')}
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((destination) => (
            <Link
              className="group rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
              key={destination.to}
              to={destination.to}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-9 place-items-center rounded-md bg-slate-100 text-slate-700 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                  <Icon name={destination.icon} />
                </span>
                <span
                  aria-hidden="true"
                  className="text-lg leading-none text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500"
                >
                  →
                </span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-950">
                {destination.title}
              </h3>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                {destination.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            {t('overview.securityTitle')}
          </CardTitle>
          <CardDescription>{t('overview.securityDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
          <div>
            <span className="font-medium text-slate-950">
              {t('common.passkey')}
            </span>
            <p className="mt-1">{t('overview.passkeyHint')}</p>
          </div>
          <div>
            <span className="font-medium text-slate-950">
              {t('common.ed25519')}
            </span>
            <p className="mt-1">{t('overview.ed25519Hint')}</p>
          </div>
          <div>
            <span className="font-medium text-slate-950">
              {t('shell.sessions')}
            </span>
            <p className="mt-1">{t('overview.sessionsHint')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
