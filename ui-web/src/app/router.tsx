import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/app/app-shell';
import { DemoProvider } from '@/app/providers/demo-provider';
import { AdminRoute } from '@/routes/admin';
import { HomeRoute } from '@/routes/home';
import { OverviewRoute } from '@/routes/overview';
import { LoginRoute } from '@/routes/login';
import { PasskeyRegistrationRoute } from '@/routes/passkey-registration';
import { SetupRoute } from '@/routes/setup';
import { I18nProvider } from '@/lib/i18n';

export function AppRouter() {
  return (
    <I18nProvider>
      <DemoProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route
            path="/passkey/register"
            element={<PasskeyRegistrationRoute />}
          />
          <Route element={<AppShell />}>
            <Route path="/" element={<OverviewRoute />} />
            <Route path="/account" element={<HomeRoute section="account" />} />
            <Route path="/email" element={<HomeRoute section="email" />} />
            <Route
              path="/security/passkey"
              element={<HomeRoute section="passkey" />}
            />
            <Route
              path="/security/ed25519"
              element={<HomeRoute section="ed25519" />}
            />
            <Route
              path="/sessions"
              element={<HomeRoute section="sessions" />}
            />
            <Route
              path="/remote-logins"
              element={<HomeRoute section="remote-login" />}
            />
            <Route path="/initialize" element={<SetupRoute />} />
            <Route path="/admin" element={<AdminRoute />} />
          </Route>
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </DemoProvider>
    </I18nProvider>
  );
}
