import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDemo } from '@/app/providers/demo-provider';

type Me = Awaited<ReturnType<NonNullable<ReturnType<typeof useDemo>['sdk']>['me']['fetch']>>;

export function HomeRoute() {
  const { sdk, session } = useDemo();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sdk || !session.authenticated) return;

    void sdk.me
      .fetch()
      .then(setMe)
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'Unable to load account.');
      });
  }, [sdk, session.authenticated, session.sessionId]);

  return (
    <div className="grid gap-5 md:grid-cols-3">
      <Card className="rounded-lg md:col-span-3">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your current authentication state.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-slate-700">
          <div>User ID: <span className="font-mono">{me?.user_id ?? 'Loading...'}</span></div>
          <div>Email: {me?.email ?? 'No verified email'}</div>
          <div>Session ID: <span className="font-mono">{session.sessionId}</span></div>
          {error ? <p className="text-rose-600">{error}</p> : null}
        </CardContent>
      </Card>
      <MetricCard title="Sessions" value={String(me?.active_sessions?.length ?? 0)} />
      <MetricCard title="Passkeys" value={String(me?.webauthn_credentials?.length ?? 0)} />
      <MetricCard title="ED25519" value={String(me?.ed25519_credentials?.length ?? 0)} />
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-3xl font-semibold text-slate-950">{value}</CardContent>
    </Card>
  );
}
