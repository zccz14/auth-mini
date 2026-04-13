import { useCallback, useEffect, useRef, useState } from 'react';
import { FlowCard } from '@/components/app/flow-card';
import { JsonPanel } from '@/components/app/json-panel';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/app/providers/demo-provider';

type DemoMe = Awaited<
  ReturnType<NonNullable<ReturnType<typeof useDemo>['sdk']>['me']['fetch']>
>;

export function PasskeyRoute() {
  const { config, sdk, session } = useDemo();
  const [pendingAction, setPendingAction] = useState<
    'register' | 'authenticate' | null
  >(null);
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [error, setError] = useState('');
  const [me, setMe] = useState<DemoMe | null>(null);
  const [loadingMe, setLoadingMe] = useState(false);
  const [meError, setMeError] = useState('');
  const loadMeRequestIdRef = useRef(0);

  const setupReady = config.status === 'ready' && Boolean(sdk);
  const canRegister = setupReady && session.authenticated && me !== null;

  const loadMe = useCallback(async () => {
    const requestId = loadMeRequestIdRef.current + 1;
    loadMeRequestIdRef.current = requestId;

    if (!sdk || config.status !== 'ready' || !session.authenticated) {
      setMe(null);
      setMeError('');
      setLoadingMe(false);
      return;
    }

    setLoadingMe(true);
    setMeError('');

    try {
      const nextMe = await sdk.me.fetch();
      if (loadMeRequestIdRef.current !== requestId) {
        return;
      }

      setMe(nextMe);
    } catch (cause) {
      if (loadMeRequestIdRef.current !== requestId) {
        return;
      }

      setMe(null);
      setMeError(
        cause instanceof Error ? cause.message : 'Unable to load current user.',
      );
    } finally {
      if (loadMeRequestIdRef.current === requestId) {
        setLoadingMe(false);
      }
    }
  }, [config.status, sdk, session.authenticated, session.sessionId]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  async function runAction(action: 'register' | 'authenticate') {
    if (!sdk || (action === 'register' && !canRegister)) return;

    setPendingAction(action);
    setError('');
    setLastResult(null);

    try {
      const result =
        action === 'register'
          ? await sdk.passkey.register()
          : await sdk.passkey.authenticate();
      if (action === 'register') {
        await loadMe();
      }
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
            disabled={!canRegister || pendingAction !== null}
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

        {!canRegister ? (
          <p className="text-sm text-slate-600">
            Register a passkey after signing in with an existing session.
          </p>
        ) : null}

        {loadingMe ? (
          <p className="text-sm text-slate-600">Loading current user…</p>
        ) : null}
        {meError ? <p className="text-sm text-rose-600">{meError}</p> : null}

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <JsonPanel title="session" value={session} />
        <JsonPanel title="current user" value={me} />
        <JsonPanel title="last response" value={lastResult} />
      </div>
    </FlowCard>
  );
}
