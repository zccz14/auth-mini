import { FlowCard } from '@/components/app/flow-card';
import { JsonPanel } from '@/components/app/json-panel';
import { useDemo } from '@/app/providers/demo-provider';

function readCurrentCredentials(user: unknown) {
  if (!user || typeof user !== 'object' || !('ed25519_credentials' in user)) {
    return null;
  }

  return (user as { ed25519_credentials?: unknown }).ed25519_credentials ?? null;
}

export function Ed25519Route() {
  const { session, user } = useDemo();
  const lastResponses = null;
  const currentCredentials = readCurrentCredentials(user);

  return (
    <FlowCard
      title="ED25519"
      description="Generate a temporary Ed25519 keypair, register a credential for the current user, or sign in by signing the server challenge in the browser."
    >
      <div className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Register credential</h2>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Registration controls will appear here in the next task.
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Sign in with private key</h2>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Direct challenge signing controls will appear here in the next task.
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-3">
          <JsonPanel title="session" value={session} />
          <JsonPanel title="last responses" value={lastResponses} />
          <JsonPanel title="current credentials" value={currentCredentials} />
        </div>
      </div>
    </FlowCard>
  );
}
