import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { useDemo } from '@/app/providers/demo-provider';

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
  const location = useLocation();
  const initialized = Boolean(setupState?.admin_user_id);
  const authenticated = session.authenticated;
  const admin = accessTokenHasAdmin(session.accessToken);
  const setupPath = location.pathname === '/initialize';
  const loginPath = location.pathname === '/login';

  if (setupLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Loading auth-mini...
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="text-base font-semibold">auth-mini</div>
          </div>
          {authenticated ? (
            <nav className="flex flex-wrap items-center gap-2">
              {admin ? (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950',
                      isActive &&
                        'bg-slate-900 text-white hover:bg-slate-900 hover:text-white',
                    )
                  }
                >
                  Admin
                </NavLink>
              ) : null}
              <Button
                className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={() => void clearLocalAuthState()}
              >
                Sign out
              </Button>
            </nav>
          ) : null}
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
