import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/app/app-shell';
import { AppProvider } from '@/app/providers/app-provider';
import { AdminRoute } from '@/routes/admin';
import { AdminConfigurationRoute } from '@/routes/admin-configuration';
import { AdminJwksRoute } from '@/routes/admin-jwks';
import { AdminResourcesRoute } from '@/routes/admin-resources';
import { AdminUsersRoute } from '@/routes/admin-users';
import { HomeRoute } from '@/routes/home';
import { OverviewRoute } from '@/routes/overview';
import { LoginRoute } from '@/routes/login';
import { PasskeyRegistrationRoute } from '@/routes/passkey-registration';
import { SetupRoute } from '@/routes/setup';
import { I18nProvider } from '@/lib/i18n';

export function AppRouter() {
  return (
    <I18nProvider>
      <AppProvider>
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
            <Route path="/admin">
              <Route index element={<AdminRoute />} />
              <Route
                path="configuration"
                element={<AdminConfigurationRoute />}
              />
              <Route path="jwks" element={<AdminJwksRoute />} />
              <Route path="resources" element={<AdminResourcesRoute />} />
              <Route path="users" element={<AdminUsersRoute />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </AppProvider>
    </I18nProvider>
  );
}
