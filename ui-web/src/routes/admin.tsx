import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useDemo } from '@/app/providers/demo-provider';
import type {
  AdminConfigInput,
  AdminJwkSlot,
  AdminSetupState,
} from '@/lib/demo-sdk';
import { useI18n } from '@/lib/i18n';
import { SystemResourcesCard } from '@/components/app/system-resources-card';

export function AdminRoute() {
  const { sdk, session } = useDemo();
  const { t } = useI18n();
  const [settings, setSettings] = useState<AdminSetupState | null>(null);
  const [jwkSlots, setJwkSlots] = useState<AdminJwkSlot[]>([]);
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState<AdminConfigInput>({
    issuer: '',
    rp_id: '',
    brand_name: 'auth-mini',
    brand_background_image: '',
    smtp: null,
  });
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadAdmin = useCallback(async () => {
    if (!sdk || !session.authenticated) return;
    const [nextSettings, nextJwks, nextUsers] = await Promise.all([
      sdk.admin.config.fetch(),
      sdk.admin.jwks.list(),
      sdk.admin.users(),
    ]);
    setSettings(nextSettings);
    setJwkSlots(nextJwks.keys);
    setUsers(nextUsers.users);
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
  }, [sdk, session.authenticated]);

  useEffect(() => {
    void loadAdmin().catch((cause) => {
      setError(cause instanceof Error ? cause.message : t('admin.loadError'));
    });
  }, [loadAdmin]);

  async function saveConfig(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdk) return;
    setPending('config');
    setError('');

    try {
      const saved = await sdk.admin.config.save(form);
      setSettings(saved);
      await loadAdmin();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('admin.saveError'));
    } finally {
      setPending(null);
    }
  }

  async function exportDatabase() {
    if (!sdk || !session.accessToken) return;
    setPending('database');
    setError('');

    try {
      const response = await fetch(sdk.admin.databaseUrl(), {
        headers: { authorization: 'Bearer ' + session.accessToken },
      });
      if (!response.ok) {
        throw new Error(t('admin.exportFailed'));
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'auth-mini.sqlite';
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('admin.exportError'));
    } finally {
      setPending(null);
    }
  }

  async function rotateJwks() {
    if (!sdk) return;
    setPending('jwks');
    setError('');

    try {
      const rotated = await sdk.admin.jwks.rotate();
      setJwkSlots(rotated.keys);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('admin.rotateError'));
    } finally {
      setPending(null);
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
    <div className="space-y-5">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{t('admin.title')}</CardTitle>
          <CardDescription>{t('admin.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm text-slate-700">
            <div>
              {t('admin.userId')}:{' '}
              <span className="font-mono">{settings?.admin_user_id}</span>
            </div>
            <div>
              {t('common.issuer')}:{' '}
              {settings?.issuer ?? t('admin.loadingSettings')}
            </div>
            <div>
              {t('common.rpId')}:{' '}
              {settings?.rp_id ?? t('admin.loadingSettings')}
            </div>
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </CardContent>
      </Card>

      {sdk ? <SystemResourcesCard sdk={sdk} /> : null}

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{t('admin.configuration')}</CardTitle>
          <CardDescription>
            {t('admin.configurationDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={saveConfig}>
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
            <Button type="submit" disabled={pending !== null}>
              {pending === 'config' ? t('admin.saving') : t('admin.save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{t('admin.jwks')}</CardTitle>
          <CardDescription>{t('admin.jwksDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {jwkSlots.map((slot) => (
              <div
                key={slot.slot}
                className="rounded-md border border-slate-200 p-3"
              >
                <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
                  {slot.slot}
                </div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-50 p-3 text-xs text-slate-700">
                  {JSON.stringify(slot.public_jwk, null, 2)}
                </pre>
              </div>
            ))}
          </div>
          <Button disabled={pending !== null} onClick={() => void rotateJwks()}>
            {pending === 'jwks' ? t('admin.rotating') : t('admin.rotate')}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{t('admin.users')}</CardTitle>
          <CardDescription>{t('admin.usersDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="p-2">{t('admin.user')}</th>
                  <th className="p-2">{t('common.email')}</th>
                  <th className="p-2">{t('admin.sessions')}</th>
                  <th className="p-2">{t('admin.passkeys')}</th>
                  <th className="p-2">ED25519</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={String(user.id)}
                    className="border-b border-slate-100"
                  >
                    <td className="p-2 font-mono">{String(user.id)}</td>
                    <td className="p-2">{String(user.email ?? '')}</td>
                    <td className="p-2">
                      {String(user.active_session_count ?? 0)}
                    </td>
                    <td className="p-2">{String(user.passkey_count ?? 0)}</td>
                    <td className="p-2">{String(user.ed25519_count ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            disabled={pending !== null}
            onClick={() => void exportDatabase()}
          >
            {pending === 'database'
              ? t('admin.exporting')
              : t('admin.exportDatabase')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
