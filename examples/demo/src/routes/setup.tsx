import { useState } from 'react';
import { createApiSdk } from 'auth-mini/sdk/api';
import type { AdminSetupState } from 'auth-mini/sdk/api';
import { FlowCard } from '@/components/app/flow-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useDemo } from '@/app/providers/demo-provider';
import { generateDemoEd25519Keypair } from '@/lib/demo-ed25519';

const DEFAULT_SMTP_PORT = 587;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    return String(error.error);
  }

  return 'setup_failed';
}

export function SetupRoute() {
  const { config } = useDemo();
  const [issuer, setIssuer] = useState(config.resolvedServerBaseUrl);
  const [origin, setOrigin] = useState(config.pageOrigin);
  const [adminKeyName, setAdminKeyName] = useState('Admin key');
  const [adminPublicKey, setAdminPublicKey] = useState('');
  const [adminSeed, setAdminSeed] = useState('');
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

  async function handleSetupSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    try {
      const api = createApiSdk({ baseUrl: config.resolvedServerBaseUrl });
      const smtp =
        smtpHost.trim() === ''
          ? undefined
          : {
              host: smtpHost,
              port: smtpPort,
              username: smtpUsername,
              password: smtpPassword,
              from_email: fromEmail,
              from_name: fromName,
              secure: smtpSecure,
              weight: smtpWeight,
            };
      const admin_ed25519 =
        adminPublicKey.trim() === ''
          ? undefined
          : {
              name: adminKeyName.trim(),
              public_key: adminPublicKey.trim(),
            };
      const result = await api.admin.setup.update({
        body: {
          issuer,
          origin,
          admin_ed25519,
          smtp,
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

  async function handleGenerateAdminKey() {
    setStatus('saving');
    setMessage('');

    try {
      const keypair = await generateDemoEd25519Keypair();
      setAdminPublicKey(keypair.publicKey);
      setAdminSeed(keypair.seed);
      setMessage('Admin key generated');
    } catch (error) {
      setStatus('failed');
      setMessage(errorMessage(error));
      return;
    }

    setStatus('idle');
  }

  return (
    <FlowCard
      title="Setup"
      description="Configure app metadata, admin access, allowed page origin, and SMTP for this auth-mini instance."
    >
      <div className="space-y-8">
        <form className="space-y-5" onSubmit={handleSetupSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>Issuer</span>
              <Input
                aria-label="Issuer"
                value={issuer}
                onChange={(event) => {
                  setIssuer(event.currentTarget.value);
                }}
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>Allowed page origin</span>
              <Input
                aria-label="Allowed page origin"
                value={origin}
                onChange={(event) => {
                  setOrigin(event.currentTarget.value);
                }}
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>Admin key name</span>
              <Input
                aria-label="Admin key name"
                value={adminKeyName}
                onChange={(event) => {
                  setAdminKeyName(event.currentTarget.value);
                }}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>Admin Ed25519 public key</span>
              <Input
                aria-label="Admin Ed25519 public key"
                value={adminPublicKey}
                onChange={(event) => {
                  setAdminPublicKey(event.currentTarget.value);
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
                  setSmtpPort(
                    event.currentTarget.valueAsNumber || DEFAULT_SMTP_PORT,
                  );
                }}
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
            <Button
              disabled={status === 'saving'}
              onClick={() => {
                void handleGenerateAdminKey();
              }}
              type="button"
            >
              Generate admin key
            </Button>
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
              <strong className="block text-slate-950">Issuer</strong>
              <div>{setupState.issuer}</div>
            </div>
            <div className="space-y-1">
              <strong className="block text-slate-950">Admin</strong>
              <div>
                {setupState.admin_ed25519
                  ? setupState.admin_ed25519.name
                  : 'Not configured'}
              </div>
            </div>
            {adminSeed ? (
              <div className="space-y-1">
                <strong className="block text-slate-950">
                  Generated admin seed
                </strong>
                <div className="break-all">{adminSeed}</div>
              </div>
            ) : null}
            <div className="space-y-1">
              <strong className="block text-slate-950">Allowed origins</strong>
              <div>
                {setupState.origins.map((item) => item.origin).join(', ')}
              </div>
            </div>
            <div className="space-y-1">
              <strong className="block text-slate-950">SMTP</strong>
              <div>
                {setupState.smtp ? setupState.smtp.host : 'Not configured'}
              </div>
            </div>
          </section>
        ) : null}

        <Separator />

        <section className="space-y-3 text-sm text-slate-600">
          <div className="space-y-1">
            <strong className="block text-slate-950">API base</strong>
            <div>{config.serverBaseUrl}</div>
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
