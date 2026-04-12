import { useState } from 'react';
import { FlowCard } from '@/components/app/flow-card';
import { JsonPanel } from '@/components/app/json-panel';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/app/providers/demo-provider';

export function SessionRoute() {
  const { clearLocalAuthState, config, sdk, session, user } = useDemo();
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [tableError, setTableError] = useState('');
  const rows = user?.active_sessions ?? [];

  async function kickSession(sessionId: string) {
    if (!sdk || !session.accessToken || config.status !== 'ready') {
      setTableError('Unable to kick session.');
      return;
    }

    setPendingSessionId(sessionId);

    try {
      const response = await fetch(
        new URL(`/session/${sessionId}/logout`, config.authOrigin),
        {
          method: 'POST',
          headers: { authorization: `Bearer ${session.accessToken}` },
        },
      );

      if (!response.ok) {
        throw new Error('Unable to kick session.');
      }

      await sdk.me.reload();
      setTableError('');
    } catch {
      setTableError('Unable to kick session.');
    } finally {
      setPendingSessionId(null);
    }
  }

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

        <section
          aria-labelledby="active-sessions-heading"
          className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <div className="space-y-1">
            <h3 id="active-sessions-heading" className="text-base font-semibold text-slate-950">
              Active sessions
            </h3>
            <p className="text-sm text-slate-600">
              Review every active session in the current snapshot and kick peers as needed.
            </p>
          </div>

          {tableError ? <p className="text-sm text-rose-600">Unable to kick session.</p> : null}

          {rows.length === 0 ? (
            <p className="text-sm text-slate-600">No active sessions.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="px-3 py-2 font-medium">Session ID</th>
                    <th className="px-3 py-2 font-medium">Created At</th>
                    <th className="px-3 py-2 font-medium">Expires At</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((activeSession) => {
                    const isPending = pendingSessionId === activeSession.id;

                    return (
                      <tr key={activeSession.id} className="border-b border-slate-200 last:border-b-0">
                        <td className="px-3 py-2 font-mono text-xs text-slate-950">
                          {activeSession.id}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-950">
                          {activeSession.created_at}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-950">
                          {activeSession.expires_at}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            disabled={isPending}
                            onClick={() => void kickSession(activeSession.id)}
                          >
                            {isPending ? 'Kicking...' : 'Kick'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </FlowCard>
  );
}
