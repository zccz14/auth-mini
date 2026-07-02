import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/app/app-shell';
import { DemoProvider } from '@/app/providers/demo-provider';
import { AdminRoute } from '@/routes/admin';
import { HomeRoute } from '@/routes/home';
import { LoginRoute } from '@/routes/login';
import { SetupRoute } from '@/routes/setup';

export function AppRouter() {
  return (
    <DemoProvider>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/initialize" element={<SetupRoute />} />
          <Route path="/admin" element={<AdminRoute />} />
        </Route>
      </Routes>
    </DemoProvider>
  );
}
