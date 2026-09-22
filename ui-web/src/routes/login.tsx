import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/app/providers/app-provider';
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
  authorizeLoginPath,
  authenticationTarget,
  buildLoginCallbackUrl,
  issuerAudience,
  parseLoginRequest,
  resolveReturnTo,
  selfSignInPath,
  sendLoginCallback,
  toAppSessionTokens,
  type LoginCallbackTokens,
  type LoginRequest,
} from '@/lib/login-callback';
import {
  deriveEd25519PublicKey,
  signEd25519Challenge,
  validateEd25519PrivateKey,
} from '@/lib/ed25519';

type LoginMethod = 'email' | 'ed25519';
type PendingAction =
  | 'email-start'
  | 'email-verify'
  | 'passkey'
  | 'ed25519'
  | 'remote-login';

const SSO_UNAVAILABLE_NOTICE = 'sso-unavailable';

export function LoginRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sdk, session, setupState } = useApp();
  const { t } = useI18n();
  const request = useMemo(
    () => parseLoginRequest(location.search, window.location.search),
    [location.search],
  );
  const routeParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const signInFirstStage = routeParams.has('return_to');
  const returnTo = resolveReturnTo(routeParams.get('return_to'));
  const ssoUnavailableNotice =
    location.state?.notice === SSO_UNAVAILABLE_NOTICE;
  const [method, setMethod] = useState<LoginMethod>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [remoteLogin, setRemoteLogin] = useState<{
    requestId: string;
    exchangeCode: string;
    confirmationCode: string;
    expiresAt: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [ssoPhase, setSsoPhase] = useState<'idle' | 'redirecting'>('idle');
  const ssoAttemptRef = useRef(false);

  const sdkReady = Boolean(sdk);
  const passkeyConfigured = Boolean(setupState?.rp_id);
  const privateKeyError =
    privateKey.trim() === '' ? '' : validateEd25519PrivateKey(privateKey);
  const canStartEmail =
    sdkReady && email.trim() !== '' && pendingAction === null;
  const canVerifyEmail =
    sdkReady &&
    email.trim() !== '' &&
    code.trim() !== '' &&
    pendingAction === null;
  const canUseEd25519 =
    sdkReady &&
    privateKey.trim() !== '' &&
    privateKeyError === '' &&
    pendingAction === null;
  const canUsePasskey = sdkReady && passkeyConfigured && pendingAction === null;
  const canStartRemoteLogin = sdkReady && pendingAction === null;
  const brandName = setupState?.brand_name ?? 'auth-mini';
  const logoSrc = `${import.meta.env.BASE_URL}auth-mini-logo.png`;
  const issuerHostname = setupState ? issuerAudience(setupState.issuer) : null;
  const brandBackgroundImage = setupState?.brand_background_image ?? '';
  const loginBackgroundStyle: CSSProperties | undefined = brandBackgroundImage
    ? { backgroundImage: `url("${brandBackgroundImage}")` }
    : undefined;
  const delegationTarget = useMemo(
    () =>
      request.status === 'ready' && request.target.kind !== 'self'
        ? {
            params: authenticationTarget(request),
            authorizePath: authorizeLoginPath(request),
            redirectUri: request.target.redirectUri,
            state: request.state,
          }
        : null,
    [request],
  );
  const persistedSession = Boolean(session.sessionId && session.refreshToken);
  const ssoPending =
    delegationTarget !== null &&
    !signInFirstStage &&
    (ssoPhase === 'redirecting' || !sdkReady || persistedSession);
  const signInFirstTarget =
    delegationTarget !== null &&
    !signInFirstStage &&
    sdkReady &&
    !persistedSession
      ? selfSignInPath(delegationTarget.authorizePath)
      : null;
  const resumeTarget =
    signInFirstStage && sdkReady && persistedSession && !ssoUnavailableNotice
      ? returnTo
      : null;
  const delegationDestination =
    request.status === 'ready' && request.target.kind !== 'self' ? (
      <DelegationDestination target={request.target} />
    ) : null;

  useEffect(() => {
    if (
      !sdk ||
      !delegationTarget ||
      !persistedSession ||
      signInFirstStage ||
      ssoAttemptRef.current
    ) {
      return;
    }

    ssoAttemptRef.current = true;
    setSsoPhase('redirecting');
    void sdk
      .authorizeSession(delegationTarget.params)
      .then((tokens) => {
        sendLoginCallback(
          buildLoginCallbackUrl({
            redirectUri: delegationTarget.redirectUri,
            state: delegationTarget.state,
            tokens,
          }),
        );
      })
      .catch(() => {
        ssoAttemptRef.current = false;
        navigate(selfSignInPath(delegationTarget.authorizePath), {
          replace: true,
          state: { notice: SSO_UNAVAILABLE_NOTICE },
        });
      });
  }, [delegationTarget, navigate, persistedSession, sdk, signInFirstStage]);

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
        }),
      ),
    );
  }

  async function handlePasskey() {
    if (!sdk || !canUsePasskey) {
      return;
    }

    await runLogin('passkey', async () =>
      completeLogin(await sdk.passkey.authenticate()),
    );
  }

  async function startRemoteLogin() {
    if (!sdk || !canStartRemoteLogin || remoteLogin) {
      return;
    }

    await runLogin('remote-login', async () => {
      const started = await sdk.remoteLogin.start({});
      setRemoteLogin({
        requestId: started.request_id,
        exchangeCode: started.exchange_code,
        confirmationCode: started.confirmation_code,
        expiresAt: started.expires_at,
      });
    });
  }

  useEffect(() => {
    if (!sdk || !remoteLogin) {
      return;
    }

    let active = true;
    const poll = async () => {
      try {
        const tokens = await sdk.remoteLogin.exchange({
          request_id: remoteLogin.requestId,
          exchange_code: remoteLogin.exchangeCode,
        });
        if (active) {
          await completeLogin(tokens);
        }
      } catch (cause) {
        if (!active || !isAuthorizationPending(cause)) {
          setRemoteLogin(null);
          setError(formatLoginError(cause, t('login.signInError')));
        }
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 2000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [remoteLogin, sdk, t]);

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
      });
      await completeLogin(tokens);
    });
  }

  async function completeLogin(tokens: LoginCallbackTokens) {
    if (!sdk) return;

    await sdk.session.acceptRedirectCallback(toAppSessionTokens(tokens));
    // INVARIANT: the authorize step re-runs after this navigation, so its
    // attempt guard must be cleared for the freshly issued session.
    ssoAttemptRef.current = false;
    setSsoPhase('idle');
    navigate(returnTo);
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

  if (signInFirstTarget !== null) {
    return <Navigate replace to={signInFirstTarget} />;
  }

  if (resumeTarget !== null) {
    return <Navigate replace to={resumeTarget} />;
  }

  if (ssoPending) {
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
                {ssoPhase === 'redirecting'
                  ? t('login.ssoRedirecting')
                  : t('login.ssoChecking')}
              </h1>
            </div>
            {delegationDestination ? (
              <div className="mt-5 space-y-4">{delegationDestination}</div>
            ) : null}
          </div>
        </section>
      </main>
    );
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
            {ssoUnavailableNotice ? (
              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                <AlertDescription>{t('login.ssoUnavailable')}</AlertDescription>
              </Alert>
            ) : null}

            <SelfDestination issuerHostname={issuerHostname} />

            {request.status === 'invalid' ? (
              <Alert className="border-rose-200 bg-rose-50 text-rose-900">
                <AlertTitle>{t('login.invalidRequest')}</AlertTitle>
                <AlertDescription>{request.error}</AlertDescription>
              </Alert>
            ) : null}

            {remoteLogin ? (
              <Alert className="border-sky-200 bg-sky-50 text-sky-950">
                <AlertTitle>{t('login.remote.waitingTitle')}</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p>{t('login.remote.waitingDescription')}</p>
                  <p className="text-xs text-sky-800">
                    {t('login.remote.code')}
                  </p>
                  <code className="block w-fit rounded bg-white px-2 py-1 font-mono text-base font-semibold tracking-widest text-sky-950">
                    {remoteLogin.confirmationCode}
                  </code>
                  <p className="text-xs text-sky-800">
                    {t('login.remote.expiresAt').replace(
                      '{time}',
                      new Intl.DateTimeFormat(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(remoteLogin.expiresAt)),
                    )}
                  </p>
                </AlertDescription>
              </Alert>
            ) : (
              <Button
                className="w-full bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-100"
                disabled={!canStartRemoteLogin}
                onClick={() => void startRemoteLogin()}
              >
                {pendingAction === 'remote-login'
                  ? t('login.remote.starting')
                  : t('login.remote.start')}
              </Button>
            )}

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

type LoginRequestTarget = Extract<LoginRequest, { status: 'ready' }>['target'];

function SelfDestination({
  issuerHostname,
}: {
  issuerHostname: string | null;
}) {
  const { t } = useI18n();

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

function DelegationDestination({
  target,
}: {
  target: Exclude<LoginRequestTarget, { kind: 'self' }>;
}) {
  const { t } = useI18n();

  if (target.kind === 'loopback') {
    return (
      <Alert>
        <AlertTitle>{t('login.destination.local')}</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col items-start gap-2">
          <Badge className="max-w-full break-all text-sm">
            {target.displayHost}
          </Badge>
          <span>
            {t('login.destination.requestingAudience')}{' '}
            <strong className="break-all font-semibold">
              {(target.audiences ?? [target.audience]).join(', ')}
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
          {(target.audiences ?? [target.audience]).join(', ')}
        </Badge>
      </AlertDescription>
    </Alert>
  );
}

function isAuthorizationPending(cause: unknown) {
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'error' in cause &&
    (cause.error === 'authorization_pending' ||
      cause.error === 'remote_login_unavailable')
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
