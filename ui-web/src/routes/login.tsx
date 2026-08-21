import { useState, type CSSProperties, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDemo } from '@/app/providers/demo-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LanguageSelect } from '@/components/app/language-select';
import { useI18n } from '@/lib/i18n';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import {
  buildLoginCallbackUrl,
  authenticationTarget,
  issuerAudience,
  parseLoginRequest,
  sendLoginCallback,
  toDemoSessionTokens,
  type LoginCallbackTokens,
  type LoginRequest,
} from '@/lib/login-callback';
import {
  deriveEd25519PublicKey,
  signEd25519Challenge,
  validateEd25519PrivateKey,
} from '@/lib/demo-ed25519';

type LoginMethod = 'email' | 'ed25519';
type PendingAction = 'email-start' | 'email-verify' | 'passkey' | 'ed25519';

const PASSKEY_REGISTRATION_PATH = '/passkey/register';

export function LoginRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const { adoptDemoSession, config, sdk, setupState } = useDemo();
  const { t } = useI18n();
  const request = parseLoginRequest(location.search, window.location.search);
  const selfLoginReturnPath =
    new URLSearchParams(location.search).get('return_to') ===
    PASSKEY_REGISTRATION_PATH
      ? PASSKEY_REGISTRATION_PATH
      : '/';
  const [method, setMethod] = useState<LoginMethod>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const setupReady = config.status === 'ready' && Boolean(sdk);
  const passkeyConfigured = Boolean(setupState?.rp_id);
  const privateKeyError =
    privateKey.trim() === '' ? '' : validateEd25519PrivateKey(privateKey);
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
    privateKey.trim() !== '' &&
    privateKeyError === '' &&
    pendingAction === null;
  const canUsePasskey =
    setupReady &&
    request.status === 'ready' &&
    passkeyConfigured &&
    pendingAction === null;
  const brandName = setupState?.brand_name ?? 'auth-mini';
  const logoSrc = `${import.meta.env.BASE_URL}auth-mini-logo.png`;
  const issuerHostname = setupState ? issuerAudience(setupState.issuer) : null;
  const brandBackgroundImage = setupState?.brand_background_image ?? '';
  const loginBackgroundStyle: CSSProperties | undefined = brandBackgroundImage
    ? { backgroundImage: `url("${brandBackgroundImage}")` }
    : undefined;
  const target =
    request.status === 'ready' ? authenticationTarget(request) : null;

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
      setMessage(t('login.email.sent'));
    } catch (cause) {
      setError(formatLoginError(cause, t('login.startError')));
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
          ...(target ?? {}),
        }),
      ),
    );
  }

  async function handlePasskey() {
    if (!sdk || !canUsePasskey) {
      return;
    }

    await runLogin('passkey', async () =>
      completeLogin(await sdk.passkey.authenticate(target ?? {})),
    );
  }

  async function handleEd25519(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdk || !canUseEd25519) {
      return;
    }

    await runLogin('ed25519', async () => {
      const normalizedPrivateKey = privateKey.trim();
      const publicKey = await deriveEd25519PublicKey(normalizedPrivateKey);
      const challenge = await sdk.ed25519.start({
        public_key: publicKey,
      });
      const signature = await signEd25519Challenge(
        normalizedPrivateKey,
        challenge.challenge,
      );
      const tokens = await sdk.ed25519.verify({
        request_id: challenge.request_id,
        signature,
        ...(target ?? {}),
      });
      await completeLogin(tokens);
    });
  }

  async function completeLogin(tokens: LoginCallbackTokens) {
    if (request.status !== 'ready') {
      setError(request.error);
      return;
    }

    if (request.target.kind === 'self') {
      await adoptDemoSession(toDemoSessionTokens(tokens));
      setMessage(t('login.signedIn'));
      navigate(selfLoginReturnPath);
      return;
    }

    sdk?.session.clearLocal();
    setMessage(t('login.redirecting'));
    sendLoginCallback(
      buildLoginCallbackUrl({
        redirectUri: request.target.redirectUri,
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
      setError(formatLoginError(cause, t('login.signInError')));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <main
      className="min-h-screen bg-slate-50 bg-cover bg-center px-4 py-6 text-slate-950 sm:px-6"
      style={loginBackgroundStyle}
    >
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col justify-center">
        <div className="mb-4 flex justify-end">
          <LanguageSelect />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="space-y-3">
            <img
              src={logoSrc}
              alt={`${brandName} logo`}
              className="h-10 w-auto max-w-48 object-contain"
            />
            <p className="text-sm font-medium text-slate-500">{brandName}</p>
            <h1 className="text-2xl font-semibold text-slate-950">
              {t('login.title')}
            </h1>
            <p className="text-sm leading-6 text-slate-600">
              {t('login.continueDescription')}
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {request.status === 'ready' ? (
              <LoginDestination
                issuerHostname={issuerHostname}
                request={request}
              />
            ) : null}

            {config.status !== 'ready' ? (
              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                <AlertTitle>{t('login.serverNotConfigured')}</AlertTitle>
                <AlertDescription>{config.configError}</AlertDescription>
              </Alert>
            ) : null}

            {request.status === 'invalid' ? (
              <Alert className="border-rose-200 bg-rose-50 text-rose-900">
                <AlertTitle>{t('login.invalidRequest')}</AlertTitle>
                <AlertDescription>{request.error}</AlertDescription>
              </Alert>
            ) : null}

            {passkeyConfigured ? (
              <Button
                className="w-full"
                disabled={!canUsePasskey}
                onClick={() => void handlePasskey()}
              >
                {t('login.passkeySignIn')}
              </Button>
            ) : null}

            <Tabs
              value={method}
              onValueChange={(value) => setMethod(value as LoginMethod)}
            >
              <TabsList className="grid h-auto w-full grid-cols-2">
                <TabsTrigger value="email">{t('common.email')}</TabsTrigger>
                <TabsTrigger value="ed25519">ED25519</TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-4">
                <form className="space-y-3" onSubmit={handleEmailStart}>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    <span>{t('common.emailAddress')}</span>
                    <Input
                      aria-label={t('common.emailAddress')}
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
                      ? t('login.email.sending')
                      : t('login.email.send')}
                  </Button>
                </form>

                <form className="space-y-3" onSubmit={handleEmailVerify}>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    <span>{t('common.oneTimeCode')}</span>
                    <InputOTP
                      aria-label={t('common.oneTimeCode')}
                      autoComplete="one-time-code"
                      maxLength={6}
                      pattern={REGEXP_ONLY_DIGITS}
                      pushPasswordManagerStrategy="none"
                      value={code}
                      onChange={setCode}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </label>
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={!canVerifyEmail}
                  >
                    {pendingAction === 'email-verify'
                      ? t('login.email.verifying')
                      : t('login.email.verify')}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="ed25519" className="space-y-4">
                <form className="space-y-3" onSubmit={handleEd25519}>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    <span>{t('common.privateKey')}</span>
                    <Input
                      aria-label={t('common.privateKey')}
                      value={privateKey}
                      onChange={(event) =>
                        setPrivateKey(event.currentTarget.value)
                      }
                      placeholder="Solana-compatible base58 private key"
                    />
                  </label>
                  {privateKeyError ? (
                    <p className="text-sm text-rose-600">{privateKeyError}</p>
                  ) : null}
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={!canUseEd25519}
                  >
                    {pendingAction === 'ed25519'
                      ? t('login.ed25519.signingIn')
                      : t('login.ed25519.signIn')}
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

function LoginDestination({
  issuerHostname,
  request,
}: {
  issuerHostname: string | null;
  request: Extract<LoginRequest, { status: 'ready' }>;
}) {
  const { t } = useI18n();

  if (request.target.kind === 'self') {
    return (
      <Alert>
        <AlertTitle>{t('login.destination.self')}</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col items-start gap-2">
          {issuerHostname ? (
            <Badge className="max-w-full break-all text-sm">
              {issuerHostname}
            </Badge>
          ) : null}
          <span>{t('login.destination.selfDescription')}</span>
        </AlertDescription>
      </Alert>
    );
  }

  if (request.target.kind === 'loopback') {
    return (
      <Alert>
        <AlertTitle>{t('login.destination.local')}</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col items-start gap-2">
          <Badge className="max-w-full break-all text-sm">
            {request.target.displayHost}
          </Badge>
          <span>
            {t('login.destination.requestingAudience')}{' '}
            <strong className="break-all font-semibold">
              {request.target.audience}
            </strong>
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <AlertTitle>{t('login.destination.remote')}</AlertTitle>
      <AlertDescription className="mt-2">
        <Badge className="max-w-full break-all text-sm">
          {request.target.audience}
        </Badge>
      </AlertDescription>
    </Alert>
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
