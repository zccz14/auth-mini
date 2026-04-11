import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlowCard } from '@/components/app/flow-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useDemo } from '@/app/providers/demo-provider';

const LOCAL_AUTH_ORIGIN_FALLBACK = 'http://127.0.0.1:7777';
const INSTANCE_PATH = './auth-mini.sqlite';

function getStartupCommands(pageOrigin: string, authOriginCandidate: string) {
  const pageUrl = new URL(pageOrigin);
  let authUrl: URL;

  try {
    authUrl = new URL(authOriginCandidate.trim() || LOCAL_AUTH_ORIGIN_FALLBACK);
  } catch {
    authUrl = new URL(LOCAL_AUTH_ORIGIN_FALLBACK);
  }

  return [
    `npx auth-mini init ${INSTANCE_PATH}`,
    `npx auth-mini origin add ${INSTANCE_PATH} --value ${pageUrl.origin}`,
    `npx auth-mini start ${INSTANCE_PATH} --host ${authUrl.hostname} --port ${
      authUrl.port || (authUrl.protocol === 'https:' ? '443' : '80')
    } --issuer ${authUrl.origin}`,
    `npm --prefix examples/demo run dev -- --host 127.0.0.1 --port ${
      pageUrl.port || (pageUrl.protocol === 'https:' ? '443' : '80')
    }`,
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
      description="Configure the auth origin before running browser flows."
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
            Save to enable the shared demo SDK configuration.
          </p>
        </div>

        <div className="space-y-1 text-sm text-slate-600">
          <strong className="block text-slate-950">Page origin</strong>
          <div>{config.pageOrigin}</div>
        </div>

        <Separator />

        <section className="space-y-3 text-sm text-slate-600">
          <div className="space-y-1">
            <strong className="block text-slate-950">Startup commands</strong>
            <p>
              Launch the auth server and this demo from separate terminals, then
              keep the auth server origin in sync with the value saved above.
            </p>
            <p>
              Configure SMTP and real email delivery before using email
              start/verify, otherwise the email flow cannot deliver one-time
              codes to the address you enter.
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
