import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/app/app-shell';
import { DemoProvider } from '@/app/providers/demo-provider';
import { EmailRoute } from '@/routes/email';
import { HomeRoute } from '@/routes/home';
import { PasskeyRoute } from '@/routes/passkey';
import { SessionRoute } from '@/routes/session';
import { SetupRoute } from '@/routes/setup';

export function AppRouter() {
  return (
    <DemoProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/setup" element={<SetupRoute />} />
          <Route path="/email" element={<EmailRoute />} />
          <Route path="/passkey" element={<PasskeyRoute />} />
          <Route path="/session" element={<SessionRoute />} />
        </Route>
      </Routes>
    </DemoProvider>
  );
}
