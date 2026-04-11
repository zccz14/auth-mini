import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlowCard } from '@/components/app/flow-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useDemo } from '@/app/providers/demo-provider';

const DEFAULT_AUTH_ORIGIN = 'https://auth.zccz14.com';
const INSTANCE_PATH = './auth-mini.sqlite';
const SMTP_SETUP_COMMAND =
  "npx auth-mini smtp add ./auth-mini.sqlite  --from-email 'sample@your-domain.com' --from-name 'sample-name' --host 'smtp.sample.com' --port 465 --secure --username 'sample@your-domain.com' --password '<smtp-password>'";

function getStartupCommands(pageOrigin: string, authOriginCandidate: string) {
  const pageUrl = new URL(pageOrigin);
  let authUrl: URL;

  try {
    authUrl = new URL(authOriginCandidate.trim() || DEFAULT_AUTH_ORIGIN);
  } catch {
    authUrl = new URL(DEFAULT_AUTH_ORIGIN);
  }

  return [
    `npx auth-mini init ${INSTANCE_PATH}`,
    SMTP_SETUP_COMMAND,
    `npx auth-mini origin add ${INSTANCE_PATH} --value ${pageUrl.origin}`,
    `npx auth-mini start ${INSTANCE_PATH} --issuer ${authUrl.origin}`,
  ];
}

export function SetupRoute() {
  const navigate = useNavigate();
  const { config, setAuthOrigin } = useDemo();
  const [draftAuthOrigin, setDraftAuthOrigin] = useState(config.authOrigin);

  useEffect(() => {
    setDraftAuthOrigin(config.authOrigin);
  }, [config.authOrigin]);

  const startupCommands = getStartupCommands(
    config.pageOrigin,
    draftAuthOrigin || config.authOrigin,
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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

  return (
    <FlowCard
      title="Setup"
      description="Only need this page when you want to self-host auth-mini for this demo."
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
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

        <div className="flex items-center gap-3">
          <Button type="submit">Save origin</Button>
          <p className="text-sm text-slate-500">
            Save an override if you want this demo to target your own auth
            server.
          </p>
        </div>

        <div className="space-y-3 text-sm text-slate-600">
          <p>
            The official demo backend already works by default. Only change the
            auth origin here when you want to point the browser demo at your own
            self-hosted deployment.
          </p>

          <div className="space-y-1">
            <strong className="block text-slate-950">Page origin</strong>
            <div>{config.pageOrigin}</div>
          </div>

          <div className="space-y-1">
            <strong className="block text-slate-950">Current auth origin</strong>
            <div>{config.authOrigin}</div>
          </div>
        </div>

        <Separator />

        <section className="space-y-3 text-sm text-slate-600">
          <div className="space-y-1">
            <strong className="block text-slate-950">Startup commands</strong>
            <p>
              Use these commands only for the self-hosted path. The browser demo
              already points at the official backend unless you save a different
              auth origin above.
            </p>
            <p>
              Keep the origin allowlist aligned with the current page origin,
              and configure SMTP before trying the email flow from your own
              server.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
            <pre className="space-y-2 whitespace-pre-wrap break-all font-mono">
              {startupCommands.map((command) => (
                <code className="block" key={command}>
                  {command}
                </code>
              ))}
            </pre>
          </div>
        </section>
      </form>
    </FlowCard>
  );
}
