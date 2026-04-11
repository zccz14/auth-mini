import { useEffect, useState, type FormEvent } from 'react';
import { FlowCard } from '@/components/app/flow-card';
import { JsonPanel } from '@/components/app/json-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDemo } from '@/app/providers/demo-provider';
import {
  generateDemoEd25519Keypair,
  validateBase64Url32,
} from '@/lib/demo-ed25519';

function readCurrentCredentials(user: unknown) {
  if (!user || typeof user !== 'object' || !('ed25519_credentials' in user)) {
    return null;
  }

  return (user as { ed25519_credentials?: unknown }).ed25519_credentials ?? null;
}

export function Ed25519Route() {
  const { config, sdk, session, user } = useDemo();
  const [credentialName, setCredentialName] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [generatedSeed, setGeneratedSeed] = useState('');
  const [generatedPublicKey, setGeneratedPublicKey] = useState('');
  const [currentCredentials, setCurrentCredentials] = useState<unknown>(
    readCurrentCredentials(user),
  );
  const [lastRegisteredCredentialId, setLastRegisteredCredentialId] =
    useState('');
  const [pendingAction, setPendingAction] = useState<
    'generate' | 'register' | 'signin' | null
  >(null);
  const [registerError, setRegisterError] = useState('');
  const [lastResponses, setLastResponses] = useState<{
    register: unknown;
    signIn: unknown;
  }>({
    register: null,
    signIn: null,
  });

  const setupReady = config.status === 'ready' && Boolean(sdk);
  const hasRegisterSession =
    session.authenticated && typeof session.accessToken === 'string';
  const registerPublicKeyError =
    publicKey.trim() === '' ? '' : validateBase64Url32(publicKey);
  const canRegister =
    setupReady &&
    hasRegisterSession &&
    credentialName.trim() !== '' &&
    publicKey.trim() !== '' &&
    registerPublicKeyError === '' &&
    pendingAction === null;

  useEffect(() => {
    setCurrentCredentials(readCurrentCredentials(session.me));
  }, [session.me]);

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
    } catch (cause) {
      setRegisterError(formatDemoError(cause));
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
      const me = (await sdk.me.reload()) as {
        ed25519_credentials?: Array<unknown>;
      } | null;

      setLastResponses((current) => ({ ...current, register: result }));
      setCurrentCredentials(me?.ed25519_credentials ?? []);
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
