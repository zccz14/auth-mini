import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useDemo } from '@/app/providers/demo-provider';
import type { AdminConfigInput, AdminSetupState } from '@/lib/demo-sdk';

export function AdminRoute() {
  const { config, sdk, session } = useDemo();
  const [settings, setSettings] = useState<AdminSetupState | null>(null);
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState<AdminConfigInput>({
    issuer: '',
    origin: '',
    smtp: null,
  });
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadAdmin = useCallback(async () => {
    if (!sdk || !session.authenticated) return;
    const [nextSettings, nextUsers] = await Promise.all([
      sdk.admin.config.fetch(),
      sdk.admin.users(),
    ]);
    setSettings(nextSettings);
    setUsers(nextUsers.users);
    setForm({
      issuer: nextSettings.issuer,
      origin: nextSettings.origins[0]?.origin ?? new URL(config.resolvedServerBaseUrl).origin,
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
  }, [config.resolvedServerBaseUrl, sdk, session.authenticated]);

  useEffect(() => {
    void loadAdmin().catch((cause) => {
      setError(cause instanceof Error ? cause.message : 'Unable to load admin data.');
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
      setError(cause instanceof Error ? cause.message : 'Unable to save configuration.');
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
        throw new Error('Database export failed.');
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'auth-mini.sqlite';
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to export database.');
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
          <CardTitle>Admin</CardTitle>
          <CardDescription>Configure this auth-mini instance and inspect users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm text-slate-700">
            <div>Admin user ID: <span className="font-mono">{settings?.admin_user_id}</span></div>
            <div>Issuer: {settings?.issuer ?? 'Loading...'}</div>
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Issuer, allowed browser origin, and SMTP delivery.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={saveConfig}>
            <Input
              aria-label="Issuer"
              placeholder="https://auth.example.com"
              value={form.issuer}
              onChange={(event) => setForm({ ...form, issuer: event.currentTarget.value })}
            />
            <Input
              aria-label="Allowed origin"
              placeholder="https://app.example.com"
              value={form.origin}
              onChange={(event) => setForm({ ...form, origin: event.currentTarget.value })}
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
              Configure SMTP
            </label>
            {form.smtp ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Input aria-label="SMTP host" placeholder="SMTP host" value={form.smtp.host} onChange={(event) => updateSmtp('host', event.currentTarget.value)} />
                <Input aria-label="SMTP port" type="number" value={form.smtp.port} onChange={(event) => updateSmtp('port', Number(event.currentTarget.value))} />
                <Input aria-label="SMTP username" placeholder="Username" value={form.smtp.username} onChange={(event) => updateSmtp('username', event.currentTarget.value)} />
                <Input
                  aria-label="SMTP password"
                  placeholder={settings?.smtp ? 'Leave blank to keep current password' : 'Password'}
                  type="password"
                  value={form.smtp.password}
                  onChange={(event) => updateSmtp('password', event.currentTarget.value)}
                />
                <Input aria-label="From email" placeholder="From email" value={form.smtp.from_email} onChange={(event) => updateSmtp('from_email', event.currentTarget.value)} />
                <Input aria-label="From name" placeholder="From name" value={form.smtp.from_name} onChange={(event) => updateSmtp('from_name', event.currentTarget.value)} />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.smtp.secure} onChange={(event) => updateSmtp('secure', event.currentTarget.checked)} />
                  Secure SMTP
                </label>
              </div>
            ) : null}
            <Button type="submit" disabled={pending !== null}>
              {pending === 'config' ? 'Saving...' : 'Save configuration'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Current users and credential counts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="p-2">User</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Sessions</th>
                  <th className="p-2">Passkeys</th>
                  <th className="p-2">ED25519</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={String(user.id)} className="border-b border-slate-100">
                    <td className="p-2 font-mono">{String(user.id)}</td>
                    <td className="p-2">{String(user.email ?? '')}</td>
                    <td className="p-2">{String(user.active_session_count ?? 0)}</td>
                    <td className="p-2">{String(user.passkey_count ?? 0)}</td>
                    <td className="p-2">{String(user.ed25519_count ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button disabled={pending !== null} onClick={() => void exportDatabase()}>
            {pending === 'database' ? 'Exporting...' : 'Export SQLite database'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
