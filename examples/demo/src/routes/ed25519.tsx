import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { FlowCard } from '@/components/app/flow-card';
import { JsonPanel } from '@/components/app/json-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDemo } from '@/app/providers/demo-provider';
import {
  deriveEd25519PublicKey,
  generateDemoEd25519Keypair,
  signEd25519Challenge,
  validateBase64Url32,
} from '@/lib/demo-ed25519';

type DemoMe = Awaited<
  ReturnType<NonNullable<ReturnType<typeof useDemo>['sdk']>['me']['fetch']>
>;

export function Ed25519Route() {
  const { adoptDemoSession, config, sdk, session } = useDemo();
  const [credentialName, setCredentialName] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [credentialId, setCredentialId] = useState('');
  const [seed, setSeed] = useState('');
  const [seedPublicKey, setSeedPublicKey] = useState('');
  const [generatedSeed, setGeneratedSeed] = useState('');
  const [generatedPublicKey, setGeneratedPublicKey] = useState('');
  const [lastRegisteredCredentialId, setLastRegisteredCredentialId] =
    useState('');
  const [pendingAction, setPendingAction] = useState<
    'generate' | 'register' | 'signin' | null
  >(null);
  const [registerError, setRegisterError] = useState('');
  const [signInError, setSignInError] = useState('');
  const [lastResponses, setLastResponses] = useState<{
    register: unknown;
    signIn: unknown;
  }>({
    register: null,
    signIn: null,
  });
  const [me, setMe] = useState<DemoMe | null>(null);
  const [loadingMe, setLoadingMe] = useState(false);
  const [meError, setMeError] = useState('');
  const [meWarning, setMeWarning] = useState('');
  const loadMeRequestIdRef = useRef(0);

  const setupReady = config.status === 'ready' && Boolean(sdk);
  const hasRegisterSession =
    session.authenticated && typeof session.accessToken === 'string';
  const registerPublicKeyError =
    publicKey.trim() === '' ? '' : validateBase64Url32(publicKey);
  const seedValidationError = validateBase64Url32(seed);
  const seedError = seed.trim() === '' ? '' : seedValidationError;
  const canRegister =
    setupReady &&
    hasRegisterSession &&
    credentialName.trim() !== '' &&
    publicKey.trim() !== '' &&
    registerPublicKeyError === '' &&
    pendingAction === null;
  const canSignIn =
    setupReady &&
    credentialId.trim() !== '' &&
    seedValidationError === '' &&
    pendingAction === null;

  const loadMe = useCallback(async (options?: { warningMessage?: string }) => {
    const requestId = loadMeRequestIdRef.current + 1;
    loadMeRequestIdRef.current = requestId;

    if (!sdk || config.status !== 'ready' || !session.authenticated) {
      setMe(null);
      setMeError('');
      setMeWarning('');
      setLoadingMe(false);
      return;
    }

    setLoadingMe(true);
    setMeError('');
    if (!options?.warningMessage) {
      setMeWarning('');
    }

    try {
      const nextMe = await sdk.me.fetch();
      if (loadMeRequestIdRef.current !== requestId) {
        return;
      }

      setMe(nextMe);
      setMeWarning('');
    } catch (cause) {
      if (loadMeRequestIdRef.current !== requestId) {
        return;
      }

      if (options?.warningMessage) {
        setMeWarning(options.warningMessage);
        return;
      }

      setMe(null);
      setMeError(
        cause instanceof Error
          ? cause.message
          : 'Unable to load current credentials.',
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

  function formatDemoError(cause: unknown): string {
    if (cause instanceof Error) {
      return cause.message;
    }

    if (typeof cause === 'object' && cause !== null) {
      return JSON.stringify(cause);
    }

    return String(cause);
  }

  async function handleGenerate() {
    setPendingAction('generate');
    setRegisterError('');

    try {
      const keypair = await generateDemoEd25519Keypair();
      setGeneratedSeed(keypair.seed);
      setGeneratedPublicKey(keypair.publicKey);
      setPublicKey(keypair.publicKey);
      setSeed(keypair.seed);
      setSeedPublicKey(keypair.publicKey);
    } catch (cause) {
      setRegisterError(formatDemoError(cause));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdk || !canSignIn) {
      return;
    }

    setPendingAction('signin');
    setSignInError('');

    try {
      const normalizedSeed = seed.trim();
      const derivedPublicKey = await deriveEd25519PublicKey(normalizedSeed);
      setSeedPublicKey(derivedPublicKey);

      const challenge = await sdk.ed25519.start({
        credential_id: credentialId.trim(),
      });
      const signature = await signEd25519Challenge(
        normalizedSeed,
        challenge.challenge,
      );
      const result = await sdk.ed25519.verify({
        request_id: challenge.request_id,
        signature,
      });

      setLastResponses((current) => ({ ...current, signIn: result }));
      await adoptDemoSession(result);
    } catch (cause) {
      setSignInError(formatDemoError(cause));
      setLastResponses((current) => ({ ...current, signIn: cause }));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdk || !canRegister) {
      return;
    }

    setPendingAction('register');
    setRegisterError('');

    try {
      const result = await sdk.ed25519.register({
        name: credentialName.trim(),
        public_key: publicKey.trim(),
      });
      await loadMe({
        warningMessage: 'Credential registered, but current credential data could not be refreshed.',
      });

      setLastResponses((current) => ({ ...current, register: result }));
      setLastRegisteredCredentialId(
        typeof (result as { id?: unknown }).id === 'string'
          ? (result as { id: string }).id
          : '',
      );
    } catch (cause) {
      setRegisterError(formatDemoError(cause));
      setLastResponses((current) => ({ ...current, register: cause }));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <FlowCard
      title="ED25519"
      description="Generate a temporary Ed25519 keypair, register a credential for the current user, or sign in by signing the server challenge in the browser."
    >
      <div className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Register a credential</h2>

          <form className="space-y-4" onSubmit={handleRegister}>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>Credential name</span>
              <Input
                aria-label="Credential name"
                value={credentialName}
                onChange={(event) => setCredentialName(event.currentTarget.value)}
                placeholder="Laptop signer"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>Public key (base64url 32-byte)</span>
              <Input
                aria-label="Public key (base64url 32-byte)"
                value={publicKey}
                onChange={(event) => setPublicKey(event.currentTarget.value)}
                placeholder="jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg"
              />
            </label>

            {registerPublicKeyError ? (
              <p className="text-sm text-rose-600">{registerPublicKeyError}</p>
            ) : null}

            {!hasRegisterSession ? (
              <p className="text-sm text-slate-600">
                Registering an ED25519 credential requires an existing session.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={pendingAction !== null}
                onClick={handleGenerate}
              >
                {pendingAction === 'generate'
                  ? 'Generating…'
                  : 'Generate temporary keypair'}
              </Button>
              <Button type="submit" disabled={!canRegister}>
                {pendingAction === 'register'
                  ? 'Registering…'
                  : 'Register credential'}
              </Button>
            </div>
          </form>

          <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-2">
            <div className="space-y-1">
              <div className="font-medium text-slate-950">Generated seed</div>
              <div className="break-all font-mono text-xs">
                {generatedSeed || 'None generated yet.'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-medium text-slate-950">Generated public key</div>
              <div className="break-all font-mono text-xs">
                {generatedPublicKey || 'None generated yet.'}
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="font-medium text-slate-950">
                Last registered credential id
              </div>
              <div className="break-all font-mono text-xs">
                {lastRegisteredCredentialId || 'No credential registered yet.'}
              </div>
            </div>
          </div>

          {registerError ? (
            <p className="text-sm text-rose-600">{registerError}</p>
          ) : null}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Sign in with private key</h2>

          {!setupReady ? (
            <p className="text-sm text-slate-600">
              Complete setup before using ED25519 actions.
            </p>
          ) : null}

          <form className="space-y-4" onSubmit={handleSignIn}>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>Credential id</span>
              <Input
                aria-label="Credential id"
                value={credentialId}
                onChange={(event) => setCredentialId(event.currentTarget.value)}
                placeholder="cred_123"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>Seed (base64url 32-byte)</span>
              <Input
                aria-label="Seed (base64url 32-byte)"
                value={seed}
                onChange={(event) => setSeed(event.currentTarget.value)}
                placeholder="7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM"
              />
            </label>

            {seedError ? <p className="text-sm text-rose-600">{seedError}</p> : null}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={generatedSeed === '' || pendingAction !== null}
                onClick={() => {
                  setSeed(generatedSeed);
                  setSeedPublicKey(generatedPublicKey);
                }}
              >
                Use current generated seed
              </Button>
              <Button
                type="button"
                disabled={lastRegisteredCredentialId === '' || pendingAction !== null}
                onClick={() => setCredentialId(lastRegisteredCredentialId)}
              >
                Use last registered credential id
              </Button>
              <Button type="submit" disabled={!canSignIn}>
                {pendingAction === 'signin'
                  ? 'Signing in…'
                  : 'Sign in with private key'}
              </Button>
            </div>
          </form>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="font-medium text-slate-950">Derived public key</div>
            <div className="mt-1 break-all font-mono text-xs">
              {seedPublicKey || 'No seed-derived public key yet.'}
            </div>
          </div>

          {signInError ? (
            <p className="text-sm text-rose-600">{signInError}</p>
          ) : null}
        </section>

        <div className="grid gap-4 xl:grid-cols-3">
          <JsonPanel title="session" value={session} />
          <JsonPanel title="last responses" value={lastResponses} />
          <div className="space-y-3">
            {loadingMe ? (
              <p className="text-sm text-slate-600">Loading current credentials…</p>
            ) : null}
            {meError ? <p className="text-sm text-rose-600">{meError}</p> : null}
            {meWarning ? <p className="text-sm text-amber-700">{meWarning}</p> : null}
            <JsonPanel title="current credentials" value={me?.ed25519_credentials ?? []} />
          </div>
        </div>
      </div>
    </FlowCard>
  );
}
