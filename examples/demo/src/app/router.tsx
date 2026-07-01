import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/app/app-shell';
import { DemoProvider } from '@/app/providers/demo-provider';
import { AdminRoute } from '@/routes/admin';
import { CredentialsRoute } from '@/routes/credentials';
import { HomeRoute } from '@/routes/home';
import { LoginRoute } from '@/routes/login';
import { SessionRoute } from '@/routes/session';
import { SetupRoute } from '@/routes/setup';

export function AppRouter() {
  return (
    <DemoProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/initialize" element={<SetupRoute />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="/credentials" element={<CredentialsRoute />} />
          <Route path="/sessions" element={<SessionRoute />} />
        </Route>
      </Routes>
    </DemoProvider>
  );
}
