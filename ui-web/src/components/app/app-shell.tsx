import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { useDemo } from '@/app/providers/demo-provider';
import { LanguageSelect } from '@/components/app/language-select';
import { useI18n } from '@/lib/i18n';

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

export function AppShell() {
  const { clearLocalAuthState, session, setupError, setupLoading, setupState } =
    useDemo();
  const { t } = useI18n();
  const location = useLocation();
  const initialized = Boolean(setupState?.admin_user_id);
  const authenticated = session.authenticated;
  const admin = accessTokenHasAdmin(session.accessToken);
  const brandName = setupState?.brand_name ?? t('common.loading');
  const setupPath = location.pathname === '/initialize';
  const loginPath = location.pathname === '/login';

  if (setupLoading) {
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

  if (initialized && authenticated && loginPath) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link
            className="min-w-0 flex-1 truncate text-base font-semibold text-slate-950 outline-none transition hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
            title={brandName}
            to="/"
          >
            {brandName}
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSelect />
            {authenticated ? (
              <nav className="flex shrink-0 items-center gap-2">
                {admin ? (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      cn(
                        'inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950',
                        isActive &&
                          'bg-slate-900 text-white hover:bg-slate-900 hover:text-white',
                      )
                    }
                  >
                    {t('shell.admin')}
                  </NavLink>
                ) : null}
                <Button
                  className="whitespace-nowrap bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  onClick={() => void clearLocalAuthState()}
                >
                  {t('shell.signOut')}
                </Button>
              </nav>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:gap-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
