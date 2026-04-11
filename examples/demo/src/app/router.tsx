import { Route, Routes } from 'react-router-dom';
import { FlowCard } from '@/components/app/flow-card';
import { JsonPanel } from '@/components/app/json-panel';
import { Separator } from '@/components/ui/separator';
import { AppShell } from '@/components/app/app-shell';
import { DemoProvider, useDemo } from '@/app/providers/demo-provider';

function Placeholder({ title }: { title: string }) {
  const demo = useDemo();

  return (
    <FlowCard
      title={title}
      description="Task 2 keeps route content intentionally minimal while provider wiring and navigation land."
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Interactive flow controls will be added in follow-up tasks.
        </p>
        <Separator />
        <JsonPanel title="demo context" value={demo.config} />
      </div>
    </FlowCard>
  );
}

export function AppRouter() {
  return (
    <DemoProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Placeholder title="Home" />} />
          <Route path="/setup" element={<Placeholder title="Setup" />} />
          <Route path="/email" element={<Placeholder title="Email" />} />
          <Route path="/passkey" element={<Placeholder title="Passkey" />} />
          <Route path="/session" element={<Placeholder title="Session" />} />
        </Route>
      </Routes>
    </DemoProvider>
  );
}
