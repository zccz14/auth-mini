import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Ed25519Keypair } from '@/components/app/ed25519-keypair';
import { FlowCard } from '@/components/app/flow-card';
import { JsonPanel } from '@/components/app/json-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDemo } from '@/app/providers/demo-provider';
import type { DemoCurrentUser } from '@/lib/demo-sdk';
import {
  deriveEd25519PublicKey,
  generateDemoEd25519Keypair,
  signEd25519Challenge,
  validateEd25519PrivateKey,
  validateSolanaPublicKey,
} from '@/lib/demo-ed25519';

type DemoMe = DemoCurrentUser;

export function Ed25519Route() {
  const { adoptDemoSession, config, sdk, session } = useDemo();
  const [credentialName, setCredentialName] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [privateKeyPublicKey, setPrivateKeyPublicKey] = useState('');
  const [generatedPrivateKey, setGeneratedPrivateKey] = useState('');
  const [generatedPublicKey, setGeneratedPublicKey] = useState('');
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
    publicKey.trim() === '' ? '' : validateSolanaPublicKey(publicKey);
  const privateKeyValidationError = validateEd25519PrivateKey(privateKey);
  const privateKeyError =
    privateKey.trim() === '' ? '' : privateKeyValidationError;
  const canRegister =
    setupReady &&
    hasRegisterSession &&
    credentialName.trim() !== '' &&
    publicKey.trim() !== '' &&
    registerPublicKeyError === '' &&
    pendingAction === null;
  const canSignIn =
    setupReady && privateKeyValidationError === '' && pendingAction === null;

  const loadMe = useCallback(
    async (options?: { warningMessage?: string }) => {
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
        const nextMe = await sdk.currentUser.fetch();
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
    },
    [config.status, sdk, session.authenticated, session.sessionId],
  );

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
      setGeneratedPrivateKey(keypair.privateKey);
      setGeneratedPublicKey(keypair.publicKey);
      setPublicKey(keypair.publicKey);
      setPrivateKey(keypair.privateKey);
      setPrivateKeyPublicKey(keypair.publicKey);
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
      const normalizedPrivateKey = privateKey.trim();
      const derivedPublicKey =
        await deriveEd25519PublicKey(normalizedPrivateKey);
      setPrivateKeyPublicKey(derivedPublicKey);

      const challenge = await sdk.ed25519.start({
        public_key: derivedPublicKey,
      });
      const signature = await signEd25519Challenge(
        normalizedPrivateKey,
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
        warningMessage:
          'Credential registered, but current credential data could not be refreshed.',
      });

      setLastResponses((current) => ({ ...current, register: result }));
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
                onChange={(event) =>
                  setCredentialName(event.currentTarget.value)
                }
                placeholder="Laptop signer"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>Public key (base58, 32 bytes)</span>
              <Input
                aria-label="Public key (base58, 32 bytes)"
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

          {generatedPrivateKey ? (
            <Ed25519Keypair
              publicKey={generatedPublicKey}
              privateKey={generatedPrivateKey}
            />
          ) : null}

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
              <span>Private key (base58, 64 bytes, Solana-compatible)</span>
              <Input
                aria-label="Private key (base58, 64 bytes, Solana-compatible)"
                value={privateKey}
                onChange={(event) => setPrivateKey(event.currentTarget.value)}
                placeholder="Solana-compatible base58 private key"
              />
            </label>

            {privateKeyError ? (
              <p className="text-sm text-rose-600">{privateKeyError}</p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={generatedPrivateKey === '' || pendingAction !== null}
                onClick={() => {
                  setPrivateKey(generatedPrivateKey);
                  setPrivateKeyPublicKey(generatedPublicKey);
                }}
              >
                Use current generated private key
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
              {privateKeyPublicKey || 'No private-key-derived public key yet.'}
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
              <p className="text-sm text-slate-600">
                Loading current credentials…
              </p>
            ) : null}
            {meError ? (
              <p className="text-sm text-rose-600">{meError}</p>
            ) : null}
            {meWarning ? (
              <p className="text-sm text-amber-700">{meWarning}</p>
            ) : null}
            <JsonPanel
              title="current credentials"
              value={meError ? null : (me?.ed25519_credentials ?? [])}
            />
          </div>
        </div>
      </div>
    </FlowCard>
  );
}
