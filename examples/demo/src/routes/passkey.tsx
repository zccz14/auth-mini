import { useState } from 'react';
import { FlowCard } from '@/components/app/flow-card';
import { JsonPanel } from '@/components/app/json-panel';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/app/providers/demo-provider';

export function PasskeyRoute() {
  const { config, sdk, session } = useDemo();
  const [pendingAction, setPendingAction] = useState<
    'register' | 'authenticate' | null
  >(null);
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [error, setError] = useState('');

  const setupReady = config.status === 'ready' && Boolean(sdk);

  async function runAction(action: 'register' | 'authenticate') {
    if (!sdk) return;

    setPendingAction(action);
    setError('');

    try {
      const result =
        action === 'register'
          ? await sdk.passkey.register()
          : await sdk.passkey.authenticate();
      setLastResult(result);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : `Passkey ${action} failed`,
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <FlowCard
      title="Passkey"
      description="Trigger passkey registration or sign-in while reusing the shared SDK and session state."
    >
      <div className="space-y-6">
        <p className="text-sm text-slate-600">
          Use these controls once setup is connected to exercise the current SDK
          wiring.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button
            disabled={!setupReady || pendingAction !== null}
            onClick={() => void runAction('register')}
          >
            {pendingAction === 'register' ? 'Registering…' : 'Register passkey'}
          </Button>
          <Button
            disabled={!setupReady || pendingAction !== null}
            onClick={() => void runAction('authenticate')}
          >
            {pendingAction === 'authenticate'
              ? 'Signing in…'
              : 'Sign in with passkey'}
          </Button>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <JsonPanel title="session" value={session} />
        <JsonPanel title="last response" value={lastResult} />
      </div>
    </FlowCard>
  );
}
