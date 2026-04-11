import { useState } from 'react';
import { FlowCard } from '@/components/app/flow-card';
import { JsonPanel } from '@/components/app/json-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDemo } from '@/app/providers/demo-provider';

export function EmailRoute() {
  const { config, sdk, session } = useDemo();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pendingAction, setPendingAction] = useState<'start' | 'verify' | null>(
    null,
  );
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [error, setError] = useState('');

  const setupReady = config.status === 'ready' && Boolean(sdk);

  async function handleStart(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdk) return;

    setPendingAction('start');
    setError('');

    try {
      const result = await sdk.email.start({ email: email.trim() });
      setLastResult(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Email start failed');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdk) return;

    setPendingAction('verify');
    setError('');

    try {
      const result = await sdk.email.verify({
        email: email.trim(),
        code: code.trim(),
      });
      setLastResult(result);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'OTP verification failed',
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <FlowCard
      title="Email"
      description="Start an email OTP challenge, then verify it against the shared browser SDK state."
    >
      <div className="space-y-6">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          <span>Email address</span>
          <Input
            aria-label="Email address"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            placeholder="user@example.com"
          />
        </label>

        <form className="space-y-3" onSubmit={handleStart}>
          <div className="text-sm text-slate-600">
            Request an OTP email using the configured auth origin.
          </div>
          <Button
            type="submit"
            disabled={
              !setupReady || pendingAction !== null || email.trim() === ''
            }
          >
            {pendingAction === 'start' ? 'Starting…' : 'Start email sign-in'}
          </Button>
        </form>

        <form className="space-y-3" onSubmit={handleVerify}>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>One-time code</span>
            <Input
              aria-label="One-time code"
              value={code}
              onChange={(event) => setCode(event.currentTarget.value)}
              placeholder="123456"
            />
          </label>
          <Button
            type="submit"
            disabled={
              !setupReady ||
              pendingAction !== null ||
              email.trim() === '' ||
              code.trim() === ''
            }
          >
            {pendingAction === 'verify' ? 'Verifying…' : 'Verify OTP'}
          </Button>
        </form>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <JsonPanel title="session" value={session} />
        <JsonPanel title="last response" value={lastResult} />
      </div>
    </FlowCard>
  );
}
