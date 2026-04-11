import { FlowCard } from '@/components/app/flow-card';
import { useDemo } from '@/app/providers/demo-provider';

export function HomeRoute() {
  const { config } = useDemo();

  return (
    <FlowCard
      title="A formal browser auth demo"
      description="Explore email OTP, passkey registration, passkey sign-in, and current session state through a compact product-style UI."
    >
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          auth-mini
        </p>
        <p className="max-w-2xl text-sm text-slate-600">
          Start with setup, confirm the auth server origin, then use the guided
          flows to inspect how the browser SDK behaves.
        </p>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
          {config.status === 'ready'
            ? 'Interactive flows enabled'
            : 'Complete setup to enable flows'}
        </div>
      </section>
    </FlowCard>
  );
}
