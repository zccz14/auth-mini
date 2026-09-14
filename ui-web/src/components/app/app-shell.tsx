import { useState } from 'react';
import { useAuthMini } from 'auth-mini-react-components';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { useApp } from '@/app/providers/app-provider';
import { LanguageSelect } from '@/components/app/language-select';
import { useI18n } from '@/lib/i18n';

type IconName =
  | 'overview'
  | 'account'
  | 'email'
  | 'passkey'
  | 'key'
  | 'sessions'
  | 'remote'
  | 'admin'
  | 'menu'
  | 'close';

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    overview: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),
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
    passkey: (
      <>
        <circle cx="8" cy="15" r="4" />
        <path d="m11 12 8-8m-3 3 2 2m-5 0 2 2" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="15" r="4" />
        <path d="M11 12 20 3m-3 3 2 2m-5 0 2 2" />
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
    admin: (
      <>
        <path d="M12 3 20 7v5c0 4.6-3.1 7.7-8 9-4.9-1.3-8-4.4-8-9V7l8-4Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    menu: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="size-[18px] shrink-0"
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

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  return atob(normalized + '='.repeat(padding));
}

function accessTokenHasAdmin(accessToken: string | null) {
  if (!accessToken) {
    return false;
  }

  try {
    const payload = JSON.parse(
      decodeBase64Url(accessToken.split('.')[1] ?? ''),
    );
    return payload.auth_admin === true;
  } catch {
    return false;
  }
}

function pageTitle(pathname: string, t: ReturnType<typeof useI18n>['t']) {
  if (pathname === '/account') return t('shell.account');
  if (pathname === '/email') return t('shell.email');
  if (pathname === '/security/passkey') return t('shell.passkey');
  if (pathname === '/security/ed25519') return t('shell.ed25519');
  if (pathname === '/sessions') return t('shell.sessions');
  if (pathname === '/remote-logins') return t('shell.remoteLogin');
  if (pathname === '/admin') return t('shell.admin');
  return t('shell.overview');
}

function SidebarLink({
  icon,
  label,
  to,
  onNavigate,
}: {
  icon: IconName;
  label: string;
  to: string;
  onNavigate: () => void;
}) {
  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          'flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950',
          isActive &&
            'bg-slate-900 text-white hover:bg-slate-900 hover:text-white',
        )
      }
      onClick={onNavigate}
      to={to}
    >
      <Icon name={icon} />
      <span>{label}</span>
    </NavLink>
  );
}

export function AppShell() {
  const { session, setupError, setupLoading, setupState } = useApp();
  const { isReady, signOut } = useAuthMini();
  const { t } = useI18n();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initialized = Boolean(setupState?.admin_user_id);
  const authenticated = session.authenticated;
  const admin = accessTokenHasAdmin(session.accessToken);
  const brandName = setupState?.brand_name ?? t('common.loading');
  const logoSrc = `${import.meta.env.BASE_URL}auth-mini-logo.png`;
  const setupPath = location.pathname === '/initialize';
  const loginPath = location.pathname === '/login';

  if (setupLoading || !isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        {t('common.loadingAuthMini')}
      </div>
    );
  }

  if (!setupError && !initialized && !setupPath) {
    return <Navigate to="/initialize" replace />;
  }

  if (initialized && setupPath) {
    return <Navigate to="/login" replace />;
  }

  if (initialized && !authenticated && !loginPath) {
    return <Navigate to="/login" replace />;
  }

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside
        aria-label={t('shell.navigation')}
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center border-b border-slate-200 px-4">
          <Link
            aria-label={brandName}
            className="flex min-w-0 items-center gap-2.5 rounded-md font-semibold outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
            onClick={closeMobile}
            title={brandName}
            to="/"
          >
            <img
              alt={`${brandName} logo`}
              className="size-8 rounded-md object-contain"
              src={logoSrc}
            />
            <span className="truncate text-sm">{brandName}</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {t('shell.workspace')}
          </p>
          <div className="grid gap-1">
            <SidebarLink
              icon="overview"
              label={t('shell.overview')}
              onNavigate={closeMobile}
              to="/"
            />
            <SidebarLink
              icon="account"
              label={t('shell.account')}
              onNavigate={closeMobile}
              to="/account"
            />
            <SidebarLink
              icon="email"
              label={t('shell.email')}
              onNavigate={closeMobile}
              to="/email"
            />
            <SidebarLink
              icon="remote"
              label={t('shell.remoteLogin')}
              onNavigate={closeMobile}
              to="/remote-logins"
            />
          </div>

          <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {t('shell.security')}
          </p>
          <div className="grid gap-1">
            <SidebarLink
              icon="passkey"
              label={t('shell.passkey')}
              onNavigate={closeMobile}
              to="/security/passkey"
            />
            <SidebarLink
              icon="key"
              label={t('shell.ed25519')}
              onNavigate={closeMobile}
              to="/security/ed25519"
            />
            <SidebarLink
              icon="sessions"
              label={t('shell.sessions')}
              onNavigate={closeMobile}
              to="/sessions"
            />
          </div>

          {admin ? (
            <>
              <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {t('shell.system')}
              </p>
              <div className="grid gap-1">
                <SidebarLink
                  icon="admin"
                  label={t('shell.admin')}
                  onNavigate={closeMobile}
                  to="/admin"
                />
              </div>
            </>
          ) : null}
        </nav>

        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          auth-mini
        </div>
      </aside>

      {mobileOpen ? (
        <button
          aria-label={t('shell.closeMenu')}
          className="fixed inset-0 z-30 bg-slate-950/20 md:hidden"
          onClick={closeMobile}
          type="button"
        />
      ) : null}

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            aria-label={mobileOpen ? t('shell.closeMenu') : t('shell.openMenu')}
            className="inline-flex size-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            type="button"
          >
            <Icon name={mobileOpen ? 'close' : 'menu'} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-slate-950">
              {pageTitle(location.pathname, t)}
            </h1>
          </div>
          {admin ? (
            <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
              {t('shell.admin')}
            </span>
          ) : null}
          <LanguageSelect />
          {authenticated ? (
            <Button
              className="min-h-9 bg-white px-3 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              onClick={() => void signOut()}
            >
              {t('shell.signOut')}
            </Button>
          ) : null}
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
