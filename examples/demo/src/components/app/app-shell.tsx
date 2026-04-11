import { NavLink, Outlet } from 'react-router-dom';
import { StatusBanner } from '@/components/app/status-banner';
import { cn } from '@/lib/cn';

const links = [
  ['/', 'Home'],
  ['/setup', 'Setup'],
  ['/email', 'Email'],
  ['/passkey', 'Passkey'],
  ['/session', 'Session'],
] as const;

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-4">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950',
                  isActive &&
                    'bg-slate-900 text-white hover:bg-slate-900 hover:text-white',
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        <StatusBanner />
        <Outlet />
      </main>
    </div>
  );
}
