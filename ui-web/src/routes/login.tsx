import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDemo } from '@/app/providers/demo-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  buildLoginCallbackUrl,
  parseLoginRequest,
  sendLoginCallback,
  toDemoSessionTokens,
  type LoginCallbackTokens,
} from '@/lib/login-callback';
import {
  deriveEd25519PublicKey,
  signEd25519Challenge,
  validateBase64Url32,
} from '@/lib/demo-ed25519';

type LoginMethod = 'email' | 'passkey' | 'ed25519';
type PendingAction = 'email-start' | 'email-verify' | 'passkey' | 'ed25519';

export function LoginRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const { adoptDemoSession, config, sdk } = useDemo();
  const request = parseLoginRequest(location.search, window.location.search);
  const [method, setMethod] = useState<LoginMethod>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [seed, setSeed] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const setupReady = config.status === 'ready' && Boolean(sdk);
  const seedError = seed.trim() === '' ? '' : validateBase64Url32(seed);
  const canStartEmail =
    setupReady &&
    request.status === 'ready' &&
    email.trim() !== '' &&
    pendingAction === null;
  const canVerifyEmail =
    setupReady &&
    request.status === 'ready' &&
    email.trim() !== '' &&
    code.trim() !== '' &&
    pendingAction === null;
  const canUseEd25519 =
    setupReady &&
    request.status === 'ready' &&
    seed.trim() !== '' &&
    seedError === '' &&
    pendingAction === null;

  async function handleEmailStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdk || !canStartEmail) {
      return;
    }

    setPendingAction('email-start');
    setError('');
    setMessage('');

    try {
      await sdk.email.start({ email: email.trim() });
      setMessage('Check your email for the one-time code.');
    } catch (cause) {
      setError(formatLoginError(cause, 'Unable to start email sign-in.'));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleEmailVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdk || !canVerifyEmail) {
      return;
    }

    await runLogin('email-verify', async () =>
      completeLogin(
        await sdk.email.verify({
          email: email.trim(),
          code: code.trim(),
        }),
      ),
    );
  }

  async function handlePasskey() {
    if (!sdk || request.status !== 'ready' || pendingAction !== null) {
      return;
    }

    await runLogin('passkey', async () =>
      completeLogin(await sdk.passkey.authenticate()),
    );
  }

  async function handleEd25519(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdk || !canUseEd25519) {
      return;
    }

    await runLogin('ed25519', async () => {
      const normalizedSeed = seed.trim();
      const publicKey = await deriveEd25519PublicKey(normalizedSeed);
      const challenge = await sdk.ed25519.start({
        public_key: publicKey,
      });
      const signature = await signEd25519Challenge(
        normalizedSeed,
        challenge.challenge,
      );
      const tokens = await sdk.ed25519.verify({
        request_id: challenge.request_id,
        signature,
      });
      await completeLogin(tokens);
    });
  }

  async function completeLogin(tokens: LoginCallbackTokens) {
    if (request.status !== 'ready') {
      setError(request.error);
      return;
    }

    if (!request.redirectUri) {
      await adoptDemoSession(toDemoSessionTokens(tokens));
      setMessage('Signed in.');
      navigate('/');
      return;
    }

    setMessage('Redirecting back to the application.');
    sendLoginCallback(
      buildLoginCallbackUrl({
        redirectUri: request.redirectUri,
        state: request.state,
        tokens,
      }),
    );
  }

  async function runLogin(action: PendingAction, task: () => Promise<void>) {
    setPendingAction(action);
    setError('');
    setMessage('');

    try {
      await task();
    } catch (cause) {
      setError(formatLoginError(cause, 'Sign-in failed.'));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col justify-center">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">auth-mini</p>
            <h1 className="text-2xl font-semibold text-slate-950">Sign in</h1>
            <p className="text-sm leading-6 text-slate-600">
              Continue to the application that opened this window.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {config.status !== 'ready' ? (
              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                <AlertTitle>Auth server is not configured</AlertTitle>
                <AlertDescription>{config.configError}</AlertDescription>
              </Alert>
            ) : null}

            {request.status === 'invalid' ? (
              <Alert className="border-rose-200 bg-rose-50 text-rose-900">
                <AlertTitle>Invalid login request</AlertTitle>
                <AlertDescription>{request.error}</AlertDescription>
              </Alert>
            ) : null}

            <Tabs
              value={method}
              onValueChange={(value) => setMethod(value as LoginMethod)}
            >
              <TabsList className="grid h-auto w-full grid-cols-3">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="passkey">Passkey</TabsTrigger>
                <TabsTrigger value="ed25519">ED25519</TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-4">
                <form className="space-y-3" onSubmit={handleEmailStart}>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    <span>Email address</span>
                    <Input
                      aria-label="Email address"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.currentTarget.value)}
                      placeholder="user@example.com"
                    />
                  </label>
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={!canStartEmail}
                  >
                    {pendingAction === 'email-start'
                      ? 'Sending code...'
                      : 'Send email code'}
                  </Button>
                </form>

                <form className="space-y-3" onSubmit={handleEmailVerify}>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    <span>One-time code</span>
                    <Input
                      aria-label="One-time code"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(event) => setCode(event.currentTarget.value)}
                      placeholder="123456"
                    />
                  </label>
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={!canVerifyEmail}
                  >
                    {pendingAction === 'email-verify'
                      ? 'Verifying...'
                      : 'Verify and continue'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="passkey" className="space-y-4">
                <p className="text-sm leading-6 text-slate-600">
                  Use a passkey already registered with this auth server.
                </p>
                <Button
                  className="w-full"
                  disabled={
                    !setupReady ||
                    request.status !== 'ready' ||
                    pendingAction !== null
                  }
                  onClick={() => void handlePasskey()}
                >
                  {pendingAction === 'passkey'
                    ? 'Signing in...'
                    : 'Sign in with passkey'}
                </Button>
              </TabsContent>

              <TabsContent value="ed25519" className="space-y-4">
                <form className="space-y-3" onSubmit={handleEd25519}>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    <span>Seed (base64url 32-byte)</span>
                    <Input
                      aria-label="Seed (base64url 32-byte)"
                      value={seed}
                      onChange={(event) => setSeed(event.currentTarget.value)}
                      placeholder="7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM"
                    />
                  </label>
                  {seedError ? (
                    <p className="text-sm text-rose-600">{seedError}</p>
                  ) : null}
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={!canUseEd25519}
                  >
                    {pendingAction === 'ed25519'
                      ? 'Signing in...'
                      : 'Sign in with ED25519'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {message ? (
              <p className="text-sm text-emerald-700">{message}</p>
            ) : null}
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function formatLoginError(cause: unknown, fallback: string) {
  if (cause instanceof Error) {
    return cause.message;
  }

  if (typeof cause === 'object' && cause !== null) {
    return JSON.stringify(cause);
  }

  return fallback;
}
