import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createApiSdk } from 'auth-mini/sdk/api';
import type { AdminSetupState } from 'auth-mini/sdk/api';
import { FlowCard } from '@/components/app/flow-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useDemo } from '@/app/providers/demo-provider';

const DEFAULT_SMTP_PORT = 587;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    return String(error.error);
  }

  return 'setup_failed';
}

export function SetupRoute() {
  const navigate = useNavigate();
  const { config, setAuthOrigin } = useDemo();
  const [draftAuthOrigin, setDraftAuthOrigin] = useState(config.authOrigin);
  const [origin, setOrigin] = useState(config.pageOrigin);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(DEFAULT_SMTP_PORT);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('Auth Mini');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpWeight, setSmtpWeight] = useState(1);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [message, setMessage] = useState('');
  const [setupState, setSetupState] = useState<AdminSetupState | null>(null);

  useEffect(() => {
    setDraftAuthOrigin(config.authOrigin);
  }, [config.authOrigin]);

  function handleOriginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextAuthOrigin = draftAuthOrigin.trim();
    setAuthOrigin(nextAuthOrigin);
    navigate({
      pathname: '/setup',
      search: nextAuthOrigin
        ? `?auth-origin=${encodeURIComponent(nextAuthOrigin)}`
        : '',
    });
  }

  async function handleSetupSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    try {
      const api = createApiSdk({ baseUrl: config.authOrigin });
      const result = await api.admin.setup.update({
        body: {
          origin,
          smtp: {
            host: smtpHost,
            port: smtpPort,
            username: smtpUsername,
            password: smtpPassword,
            from_email: fromEmail,
            from_name: fromName,
            secure: smtpSecure,
            weight: smtpWeight,
          },
        },
        throwOnError: true,
      });
      if (!result.data) {
        throw new Error('setup_failed');
      }

      setSetupState(result.data);
      setStatus('saved');
      setMessage('Setup saved');
    } catch (error) {
      setStatus('failed');
      setMessage(errorMessage(error));
    }
  }

  return (
    <FlowCard
      title="Setup"
      description="Configure a self-hosted auth-mini instance for this demo."
    >
      <div className="space-y-8">
        <form className="space-y-4" onSubmit={handleOriginSubmit}>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>Auth server origin</span>
            <Input
              aria-label="Auth server origin"
              value={draftAuthOrigin}
              onChange={(event) => {
                setDraftAuthOrigin(event.currentTarget.value);
              }}
              placeholder="https://auth.example.com"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit">Save origin</Button>
            <span className="text-sm text-slate-500">{config.authOrigin}</span>
          </div>
        </form>

        <Separator />

        <form className="space-y-5" onSubmit={handleSetupSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>Allowed page origin</span>
              <Input
                aria-label="Allowed page origin"
                value={origin}
                onChange={(event) => {
                  setOrigin(event.currentTarget.value);
                }}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>SMTP host</span>
              <Input
                aria-label="SMTP host"
                value={smtpHost}
                onChange={(event) => {
                  setSmtpHost(event.currentTarget.value);
                }}
                placeholder="smtp.example.com"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>SMTP port</span>
              <Input
                aria-label="SMTP port"
                min={1}
                type="number"
                value={smtpPort}
                onChange={(event) => {
                  setSmtpPort(event.currentTarget.valueAsNumber || DEFAULT_SMTP_PORT);
                }}
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>SMTP username</span>
              <Input
                aria-label="SMTP username"
                value={smtpUsername}
                onChange={(event) => {
                  setSmtpUsername(event.currentTarget.value);
                }}
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>SMTP password</span>
              <Input
                aria-label="SMTP password"
                type="password"
                value={smtpPassword}
                onChange={(event) => {
                  setSmtpPassword(event.currentTarget.value);
                }}
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>From email</span>
              <Input
                aria-label="From email"
                type="email"
                value={fromEmail}
                onChange={(event) => {
                  setFromEmail(event.currentTarget.value);
                }}
                placeholder="noreply@example.com"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>From name</span>
              <Input
                aria-label="From name"
                value={fromName}
                onChange={(event) => {
                  setFromName(event.currentTarget.value);
                }}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>SMTP weight</span>
              <Input
                aria-label="SMTP weight"
                min={1}
                type="number"
                value={smtpWeight}
                onChange={(event) => {
                  setSmtpWeight(event.currentTarget.valueAsNumber || 1);
                }}
                required
              />
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                checked={smtpSecure}
                className="h-4 w-4 rounded border-slate-300"
                onChange={(event) => {
                  setSmtpSecure(event.currentTarget.checked);
                }}
                type="checkbox"
              />
              <span>Use TLS</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={status === 'saving'} type="submit">
              {status === 'saving' ? 'Saving...' : 'Save setup'}
            </Button>
            {message ? (
              <span className="text-sm text-slate-500" role="status">
                {message}
              </span>
            ) : null}
          </div>
        </form>

        {setupState ? (
          <section className="space-y-3 text-sm text-slate-600">
            <div className="space-y-1">
              <strong className="block text-slate-950">Allowed origins</strong>
              <div>{setupState.origins.map((item) => item.origin).join(', ')}</div>
            </div>
            <div className="space-y-1">
              <strong className="block text-slate-950">SMTP</strong>
              <div>{setupState.smtp ? setupState.smtp.host : 'Not configured'}</div>
            </div>
          </section>
        ) : null}

        <Separator />

        <section className="space-y-3 text-sm text-slate-600">
          <div className="space-y-1">
            <strong className="block text-slate-950">Server</strong>
            <div>auth-mini --issuer {config.authOrigin}</div>
          </div>
          <div className="space-y-1">
            <strong className="block text-slate-950">Page origin</strong>
            <div>{config.pageOrigin}</div>
          </div>
        </section>
      </div>
    </FlowCard>
  );
}
