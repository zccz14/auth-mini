import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '@/app/providers/demo-provider';
import { LanguageSelect } from '@/components/app/language-select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

const LOGIN_PATH = '/login?return_to=%2Fpasskey%2Fregister';

export function PasskeyRegistrationRoute() {
  const navigate = useNavigate();
  const { config, sdk, session, setupError, setupLoading, setupState } =
    useDemo();
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState('');

  const passkeyConfigured = Boolean(setupState?.rp_id);
  const canRegister =
    config.status === 'ready' &&
    Boolean(sdk) &&
    session.authenticated &&
    passkeyConfigured &&
    !pending;
  const brandName = setupState?.brand_name ?? 'auth-mini';
  const logoSrc = `${import.meta.env.BASE_URL}auth-mini-logo.png`;
  const brandBackgroundImage = setupState?.brand_background_image ?? '';
  const backgroundStyle: CSSProperties | undefined = brandBackgroundImage
    ? { backgroundImage: `url("${brandBackgroundImage}")` }
    : undefined;

  async function registerPasskey() {
    if (!sdk || !canRegister) {
      return;
    }

    setPending(true);
    setRegistered(false);
    setError('');

    try {
      await sdk.passkey.register();
      setRegistered(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t('home.registerPasskeyError'),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main
      className="min-h-screen bg-slate-50 bg-cover bg-center px-4 py-6 text-slate-950 sm:px-6"
      style={backgroundStyle}
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
              {t('passkeyRegistration.title')}
            </h1>
            <p className="text-sm leading-6 text-slate-600">
              {t('passkeyRegistration.description')}
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {setupLoading || session.status === 'recovering' ? (
              <p className="text-sm text-slate-600">{t('common.loading')}</p>
            ) : null}

            {!setupLoading && !passkeyConfigured ? (
              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                <AlertTitle>{t('common.unavailable')}</AlertTitle>
                <AlertDescription>
                  {setupError || t('login.serverNotConfigured')}
                </AlertDescription>
              </Alert>
            ) : null}

            {!setupLoading &&
            session.status !== 'recovering' &&
            !session.authenticated ? (
              <Alert>
                <AlertTitle>
                  {t('passkeyRegistration.signInRequired')}
                </AlertTitle>
                <AlertDescription className="mt-3">
                  <Button onClick={() => navigate(LOGIN_PATH)}>
                    {t('login.title')}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            {session.authenticated && passkeyConfigured ? (
              <Button
                disabled={!canRegister}
                onClick={() => void registerPasskey()}
              >
                {pending ? t('home.registering') : t('home.registerPasskey')}
              </Button>
            ) : null}

            {registered ? (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                <AlertTitle>{t('passkeyRegistration.registered')}</AlertTitle>
              </Alert>
            ) : null}

            {error ? (
              <Alert className="border-rose-200 bg-rose-50 text-rose-900">
                <AlertTitle>{t('home.registerPasskeyError')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
