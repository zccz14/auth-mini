import { FlowCard } from '@/components/app/flow-card';
import { JsonPanel } from '@/components/app/json-panel';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/app/providers/demo-provider';

export function SessionRoute() {
  const { clearLocalAuthState, config, session, user } = useDemo();

  return (
    <FlowCard
      title="Session"
      description="Inspect the current auth snapshot and clear local state when needed."
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm text-slate-600">
            Shared provider state keeps the session snapshot and current user in
            sync with the demo SDK.
          </p>
          <Button onClick={() => void clearLocalAuthState()}>
            Clear local auth state
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <JsonPanel
            title="Current session"
            value={session ?? { status: config.status }}
          />
          <JsonPanel title="Current user" value={user} />
        </div>
      </div>
    </FlowCard>
  );
}
