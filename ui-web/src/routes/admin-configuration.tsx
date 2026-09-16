import { useEffect, useState } from 'react';
import { useApp } from '@/app/providers/app-provider';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { AdminConfigInput, AdminSetupState } from '@/lib/app-sdk';

export function AdminConfigurationRoute() {
  const { reloadSetupState, sdk } = useApp();
  const { t } = useI18n();
  const [settings, setSettings] = useState<AdminSetupState | null>(null);
  const [form, setForm] = useState<AdminConfigInput>({
    issuer: '',
    rp_id: '',
    brand_name: 'auth-mini',
    brand_background_image: '',
    smtp: null,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const errorMessage =
    error || (loadError === null ? '' : loadError || t('admin.loadError'));

  function applySettings(nextSettings: AdminSetupState) {
    setSettings(nextSettings);
    setForm({
      issuer: nextSettings.issuer,
      rp_id: nextSettings.rp_id,
      brand_name: nextSettings.brand_name,
      brand_background_image: nextSettings.brand_background_image,
      smtp: nextSettings.smtp
        ? {
            host: nextSettings.smtp.host,
            port: nextSettings.smtp.port,
            username: nextSettings.smtp.username,
            password: '',
            from_email: nextSettings.smtp.from_email,
            from_name: nextSettings.smtp.from_name,
            secure: nextSettings.smtp.secure,
            weight: nextSettings.smtp.weight,
          }
        : null,
    });
  }

  useEffect(() => {
    if (!sdk) return;
    let active = true;
    void sdk.admin.config.fetch().then(
      (nextSettings) => {
        if (active) {
          applySettings(nextSettings);
          setLoadError(null);
        }
      },
      (cause) => {
        if (active) setLoadError(cause instanceof Error ? cause.message : '');
      },
    );
    return () => {
      active = false;
    };
  }, [sdk]);

  async function saveConfig(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdk || !settings || pending) return;
    setPending(true);
    setError('');

    try {
      const saved = await sdk.admin.config.save(form);
      applySettings(saved);
      await reloadSetupState();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('admin.saveError'));
    } finally {
      setPending(false);
    }
  }

  function updateSmtp<K extends keyof NonNullable<AdminConfigInput['smtp']>>(
    key: K,
    value: NonNullable<AdminConfigInput['smtp']>[K],
  ) {
    setForm((current) => ({
      ...current,
      smtp: {
        host: '',
        port: 587,
        username: '',
        password: '',
        from_email: '',
        from_name: '',
        secure: false,
        weight: 1,
        ...current.smtp,
        [key]: value,
      },
    }));
  }

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{t('admin.configuration')}</CardTitle>
        <CardDescription>{t('admin.configurationDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {errorMessage ? (
          <Alert>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        {!settings && loadError === null ? (
          <p role="status">{t('common.loading')}</p>
        ) : null}
        {settings ? (
          <form className="grid gap-4 max-w-2xl" onSubmit={saveConfig}>
            <Input
              aria-label={t('common.issuer')}
              placeholder="https://auth.example.com"
              value={form.issuer}
              onChange={(event) =>
                setForm({ ...form, issuer: event.currentTarget.value })
              }
            />
            <Input
              aria-label={t('common.rpId')}
              placeholder="auth.example.com"
              value={form.rp_id}
              onChange={(event) =>
                setForm({ ...form, rp_id: event.currentTarget.value })
              }
            />
            <Input
              aria-label={t('common.brandName')}
              placeholder="auth-mini"
              value={form.brand_name}
              onChange={(event) =>
                setForm({ ...form, brand_name: event.currentTarget.value })
              }
            />
            <Input
              aria-label={t('common.brandBackgroundImage')}
              placeholder="https://cdn.example.com/login-background.jpg"
              value={form.brand_background_image}
              onChange={(event) =>
                setForm({
                  ...form,
                  brand_background_image: event.currentTarget.value,
                })
              }
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.smtp !== null}
                onChange={(event) =>
                  setForm({
                    ...form,
                    smtp: event.currentTarget.checked
                      ? {
                          host: '',
                          port: 587,
                          username: '',
                          password: '',
                          from_email: '',
                          from_name: '',
                          secure: false,
                          weight: 1,
                        }
                      : null,
                  })
                }
              />
              {t('admin.configureSmtp')}
            </label>
            {form.smtp ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  aria-label={t('common.smtpHost')}
                  placeholder={t('common.smtpHost')}
                  value={form.smtp.host}
                  onChange={(event) =>
                    updateSmtp('host', event.currentTarget.value)
                  }
                />
                <Input
                  aria-label={t('common.smtpPort')}
                  type="number"
                  value={form.smtp.port}
                  onChange={(event) =>
                    updateSmtp('port', Number(event.currentTarget.value))
                  }
                />
                <Input
                  aria-label={t('common.smtpUsername')}
                  placeholder={t('common.username')}
                  value={form.smtp.username}
                  onChange={(event) =>
                    updateSmtp('username', event.currentTarget.value)
                  }
                />
                <Input
                  aria-label={t('common.smtpPassword')}
                  placeholder={
                    settings?.smtp
                      ? t('admin.leavePassword')
                      : t('common.password')
                  }
                  type="password"
                  value={form.smtp.password}
                  onChange={(event) =>
                    updateSmtp('password', event.currentTarget.value)
                  }
                />
                <Input
                  aria-label={t('common.fromEmail')}
                  placeholder={t('common.fromEmail')}
                  value={form.smtp.from_email}
                  onChange={(event) =>
                    updateSmtp('from_email', event.currentTarget.value)
                  }
                />
                <Input
                  aria-label={t('common.fromName')}
                  placeholder={t('common.fromName')}
                  value={form.smtp.from_name}
                  onChange={(event) =>
                    updateSmtp('from_name', event.currentTarget.value)
                  }
                />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.smtp.secure}
                    onChange={(event) =>
                      updateSmtp('secure', event.currentTarget.checked)
                    }
                  />
                  {t('admin.secureSmtp')}
                </label>
              </div>
            ) : null}
            <Button
              className="w-full sm:w-fit"
              type="submit"
              disabled={pending}
            >
              {pending ? t('admin.saving') : t('admin.save')}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
