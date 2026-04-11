import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlowCard } from '@/components/app/flow-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDemo } from '@/app/providers/demo-provider';

export function SetupRoute() {
  const navigate = useNavigate();
  const { config, setAuthOrigin } = useDemo();
  const [draftAuthOrigin, setDraftAuthOrigin] = useState(config.authOrigin);

  useEffect(() => {
    setDraftAuthOrigin(config.authOrigin);
  }, [config.authOrigin]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextAuthOrigin = draftAuthOrigin.trim();
    setAuthOrigin(nextAuthOrigin);
    navigate({
      pathname: '/setup',
      search: nextAuthOrigin
        ? `?auth-origin=${encodeURIComponent(nextAuthOrigin)}`
        : '',
    });
  }

  return (
    <FlowCard
      title="Setup"
      description="Configure the auth origin before running browser flows."
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          <span>Auth server origin</span>
          <Input
            aria-label="Auth server origin"
            value={draftAuthOrigin}
            onChange={(event) => {
              setDraftAuthOrigin(event.currentTarget.value);
            }}
            placeholder="https://auth.example.com"
          />
        </label>

        <div className="flex items-center gap-3">
          <Button type="submit">Save origin</Button>
          <p className="text-sm text-slate-500">
            Save to enable the shared demo SDK configuration.
          </p>
        </div>

        <div className="space-y-1 text-sm text-slate-600">
          <strong className="block text-slate-950">Page origin</strong>
          <div>{config.pageOrigin}</div>
        </div>
      </form>
    </FlowCard>
  );
}
