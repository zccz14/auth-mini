import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/app/app-shell';
import { DemoProvider } from '@/app/providers/demo-provider';
import { AdminRoute } from '@/routes/admin';
import { HomeRoute } from '@/routes/home';
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
            <Route path="/" element={<HomeRoute />} />
            <Route path="/initialize" element={<SetupRoute />} />
            <Route path="/admin" element={<AdminRoute />} />
          </Route>
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </DemoProvider>
    </I18nProvider>
  );
}
