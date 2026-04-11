import { FlowCard } from '@/components/app/flow-card';
import { Input } from '@/components/ui/input';
import { useDemo } from '@/app/providers/demo-provider';

export function SetupRoute() {
  const { config } = useDemo();

  return (
    <FlowCard
      title="Setup"
      description="Configure the auth origin before running browser flows."
    >
      <section className="space-y-6">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          <span>Auth server origin</span>
          <Input
            aria-label="Auth server origin"
            defaultValue={config.authOrigin}
            placeholder="https://auth.example.com"
          />
        </label>

        <div className="space-y-1 text-sm text-slate-600">
          <strong className="block text-slate-950">Page origin</strong>
          <div>{config.pageOrigin}</div>
        </div>
      </section>
    </FlowCard>
  );
}
