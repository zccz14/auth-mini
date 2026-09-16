import { useEffect, useState, type ReactNode } from 'react';
import { useApp } from '@/app/providers/app-provider';
import { useI18n } from '@/lib/i18n';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminConfigInput, AdminSetupState } from '@/lib/app-sdk';

type SmtpFormValue = NonNullable<AdminConfigInput['smtp']>[number];

function newSmtpConfig(): SmtpFormValue {
  return {
    id: null,
    host: '',
    port: 587,
    username: '',
    password: '',
    from_email: '',
    from_name: '',
    secure: false,
    weight: 1,
  };
}

function FormField({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <p className="text-xs leading-5 text-slate-500" id={`${id}-description`}>
        {description}
      </p>
      {children}
    </div>
  );
}

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
      smtp:
        nextSettings.smtp?.map((smtp) => ({
          id: smtp.id,
          host: smtp.host,
          port: smtp.port,
          username: smtp.username,
          password: '',
          from_email: smtp.from_email,
          from_name: smtp.from_name,
          secure: smtp.secure,
          weight: smtp.weight,
        })) ?? null,
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

  function updateSmtp(index: number, patch: Partial<SmtpFormValue>) {
    setForm((current) => ({
      ...current,
      smtp:
        current.smtp?.map((smtp, currentIndex) =>
          currentIndex === index ? { ...smtp, ...patch } : smtp,
        ) ?? null,
    }));
  }

  function addSmtp() {
    setForm((current) => ({
      ...current,
      smtp: [...(current.smtp ?? []), newSmtpConfig()],
    }));
  }

  function removeSmtp(index: number) {
    setForm((current) => ({
      ...current,
      smtp: (current.smtp ?? []).filter(
        (_, currentIndex) => currentIndex !== index,
      ),
    }));
  }

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{t('admin.configuration')}</CardTitle>
        <CardDescription>{t('admin.configurationDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {errorMessage ? (
          <Alert className="mb-6">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        {!settings && loadError === null ? (
          <p role="status">{t('common.loading')}</p>
        ) : null}
        {settings ? (
          <form className="grid max-w-3xl gap-8" onSubmit={saveConfig}>
            <section className="grid gap-5 border-b border-slate-200 pb-8">
              <div className="grid gap-1">
                <h3 className="text-base font-semibold text-slate-950">
                  {t('admin.identitySection')}
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  {t('admin.identitySectionDescription')}
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  description={t('admin.issuerDescription')}
                  id="issuer"
                  label={t('common.issuer')}
                >
                  <Input
                    aria-describedby="issuer-description"
                    id="issuer"
                    placeholder="https://auth.example.com"
                    required
                    value={form.issuer}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setForm((current) => ({ ...current, issuer: value }));
                    }}
                  />
                </FormField>
                <FormField
                  description={t('admin.rpIdDescription')}
                  id="rp-id"
                  label={t('common.rpId')}
                >
                  <Input
                    aria-describedby="rp-id-description"
                    id="rp-id"
                    placeholder="auth.example.com"
                    required
                    value={form.rp_id}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setForm((current) => ({ ...current, rp_id: value }));
                    }}
                  />
                </FormField>
                <FormField
                  description={t('admin.brandNameDescription')}
                  id="brand-name"
                  label={t('common.brandName')}
                >
                  <Input
                    aria-describedby="brand-name-description"
                    id="brand-name"
                    placeholder="auth-mini"
                    required
                    value={form.brand_name}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setForm((current) => ({ ...current, brand_name: value }));
                    }}
                  />
                </FormField>
                <FormField
                  description={t('admin.brandBackgroundDescription')}
                  id="brand-background-image"
                  label={t('common.brandBackgroundImage')}
                >
                  <Input
                    aria-describedby="brand-background-image-description"
                    id="brand-background-image"
                    placeholder="https://cdn.example.com/login-background.jpg"
                    type="url"
                    value={form.brand_background_image}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setForm((current) => ({
                        ...current,
                        brand_background_image: value,
                      }));
                    }}
                  />
                </FormField>
              </div>
            </section>

            <section className="grid gap-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid gap-1">
                  <h3 className="text-base font-semibold text-slate-950">
                    {t('admin.smtpSection')}
                  </h3>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600">
                    {t('admin.smtpSectionDescription')}
                  </p>
                </div>
                <Button
                  className="min-h-10 shrink-0 bg-white text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                  disabled={pending}
                  onClick={addSmtp}
                  type="button"
                >
                  {t('admin.addSmtp')}
                </Button>
              </div>

              {form.smtp === null || form.smtp.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                  {t('admin.smtpEmpty')}
                </div>
              ) : (
                <div className="grid gap-4">
                  {form.smtp.map((smtp, index) => {
                    const fieldId = (name: string) => `smtp-${index}-${name}`;
                    return (
                      <div
                        className="grid gap-5 rounded-md border border-slate-200 p-4 sm:p-5"
                        key={smtp.id ?? `new-${index}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <h4 className="text-sm font-semibold text-slate-950">
                            {t('admin.smtpNumber', {
                              number: String(index + 1),
                            })}
                          </h4>
                          <Button
                            aria-label={t('admin.removeSmtp')}
                            className="min-h-9 bg-white px-3 text-sm text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                            disabled={pending}
                            onClick={() => removeSmtp(index)}
                            type="button"
                          >
                            {t('common.remove')}
                          </Button>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                          <FormField
                            description={t('admin.smtpHostDescription')}
                            id={fieldId('host')}
                            label={t('common.smtpHost')}
                          >
                            <Input
                              aria-describedby={`${fieldId('host')}-description`}
                              id={fieldId('host')}
                              placeholder="smtp.example.com"
                              required
                              value={smtp.host}
                              onChange={(event) =>
                                updateSmtp(index, {
                                  host: event.currentTarget.value,
                                })
                              }
                            />
                          </FormField>
                          <FormField
                            description={t('admin.smtpPortDescription')}
                            id={fieldId('port')}
                            label={t('common.smtpPort')}
                          >
                            <Input
                              aria-describedby={`${fieldId('port')}-description`}
                              id={fieldId('port')}
                              max={65535}
                              min={1}
                              required
                              type="number"
                              value={smtp.port}
                              onChange={(event) =>
                                updateSmtp(index, {
                                  port: Number(event.currentTarget.value),
                                })
                              }
                            />
                          </FormField>
                          <FormField
                            description={t('admin.smtpUsernameDescription')}
                            id={fieldId('username')}
                            label={t('common.smtpUsername')}
                          >
                            <Input
                              aria-describedby={`${fieldId('username')}-description`}
                              id={fieldId('username')}
                              placeholder={t('common.username')}
                              required
                              value={smtp.username}
                              onChange={(event) =>
                                updateSmtp(index, {
                                  username: event.currentTarget.value,
                                })
                              }
                            />
                          </FormField>
                          <FormField
                            description={
                              smtp.id === null
                                ? t('admin.smtpPasswordDescription')
                                : t('admin.leavePassword')
                            }
                            id={fieldId('password')}
                            label={t('common.smtpPassword')}
                          >
                            <Input
                              aria-describedby={`${fieldId('password')}-description`}
                              id={fieldId('password')}
                              placeholder={t('common.password')}
                              required={smtp.id === null}
                              type="password"
                              value={smtp.password}
                              onChange={(event) =>
                                updateSmtp(index, {
                                  password: event.currentTarget.value,
                                })
                              }
                            />
                          </FormField>
                          <FormField
                            description={t('admin.fromEmailDescription')}
                            id={fieldId('from-email')}
                            label={t('common.fromEmail')}
                          >
                            <Input
                              aria-describedby={`${fieldId('from-email')}-description`}
                              id={fieldId('from-email')}
                              placeholder="noreply@example.com"
                              required
                              type="email"
                              value={smtp.from_email}
                              onChange={(event) =>
                                updateSmtp(index, {
                                  from_email: event.currentTarget.value,
                                })
                              }
                            />
                          </FormField>
                          <FormField
                            description={t('admin.fromNameDescription')}
                            id={fieldId('from-name')}
                            label={t('common.fromName')}
                          >
                            <Input
                              aria-describedby={`${fieldId('from-name')}-description`}
                              id={fieldId('from-name')}
                              placeholder={t('common.fromName')}
                              value={smtp.from_name}
                              onChange={(event) =>
                                updateSmtp(index, {
                                  from_name: event.currentTarget.value,
                                })
                              }
                            />
                          </FormField>
                          <FormField
                            description={t('admin.smtpWeightDescription')}
                            id={fieldId('weight')}
                            label={t('admin.smtpWeight')}
                          >
                            <Input
                              aria-describedby={`${fieldId('weight')}-description`}
                              id={fieldId('weight')}
                              min={1}
                              required
                              type="number"
                              value={smtp.weight}
                              onChange={(event) =>
                                updateSmtp(index, {
                                  weight: Number(event.currentTarget.value),
                                })
                              }
                            />
                          </FormField>
                        </div>
                        <div className="flex items-start gap-3 rounded-md bg-slate-50 p-3">
                          <Checkbox
                            checked={smtp.secure}
                            disabled={pending}
                            id={fieldId('secure')}
                            onCheckedChange={(checked) =>
                              updateSmtp(index, { secure: checked === true })
                            }
                          />
                          <div className="grid gap-1">
                            <Label htmlFor={fieldId('secure')}>
                              {t('admin.secureSmtp')}
                            </Label>
                            <p className="text-xs leading-5 text-slate-500">
                              {t('admin.smtpSecureDescription')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="flex justify-end border-t border-slate-200 pt-6">
              <Button disabled={pending} type="submit">
                {pending ? t('admin.saving') : t('admin.save')}
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
