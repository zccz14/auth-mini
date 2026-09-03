import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import type { DemoSdk, RemoteLoginRequest } from '@/lib/demo-sdk';

export function RemoteLoginApprovals({
  authenticated,
  sdk,
}: {
  authenticated: boolean;
  sdk: DemoSdk | null;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [requests, setRequests] = useState<RemoteLoginRequest[]>([]);
  const [pending, setPending] = useState<'claim' | 'approve' | 'deny' | null>(null);
  const [error, setError] = useState('');

  async function load() {
    if (!sdk || !authenticated) {
      setRequests([]);
      return;
    }
    try {
      const response = await sdk.remoteLogin.pending();
      setRequests(response.requests);
      setError('');
    } catch {
      setError(t('home.remoteLogin.loadError'));
    }
  }

  useEffect(() => {
    void load();
  }, [authenticated, sdk]);

  async function claim(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdk || pending || code.trim().length !== 8) return;

    setPending('claim');
    setError('');
    try {
      await sdk.remoteLogin.claim({
        confirmation_code: code.trim().toUpperCase(),
      });
      setCode('');
      await load();
    } catch {
      setError(t('home.remoteLogin.claimError'));
    } finally {
      setPending(null);
    }
  }

  async function decide(requestId: string, action: 'approve' | 'deny') {
    if (!sdk || pending) return;

    setPending(action);
    setError('');
    try {
      if (action === 'approve') {
        await sdk.remoteLogin.approve(requestId);
      } else {
        await sdk.remoteLogin.deny(requestId);
      }
      await load();
    } catch {
      setError(t('home.remoteLogin.decisionError'));
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('home.remoteLogin.title')}</CardTitle>
        <CardDescription>{t('home.remoteLogin.description')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form className="grid gap-3" onSubmit={claim}>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>{t('home.remoteLogin.code')}</span>
            <Input
              aria-label={t('home.remoteLogin.code')}
              autoCapitalize="characters"
              maxLength={8}
              value={code}
              onChange={(event) => setCode(event.currentTarget.value.toUpperCase())}
            />
          </label>
          <Button
            className="w-full sm:w-fit"
            disabled={code.trim().length !== 8 || pending !== null}
            type="submit"
          >
            {pending === 'claim'
              ? t('home.remoteLogin.claiming')
              : t('home.remoteLogin.claim')}
          </Button>
        </form>

        {error ? (
          <p className="text-sm text-rose-600" role="alert">
            {error}
          </p>
        ) : null}

        {requests.length === 0 ? (
          <p className="text-sm text-slate-600">
            {t('home.remoteLogin.noRequests')}
          </p>
        ) : (
          <div className="grid gap-3">
            {requests.map((request) => (
              <div
                className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center"
                key={request.request_id}
              >
                <div className="min-w-0 flex-1 text-sm text-slate-700">
                  <p className="break-all font-medium text-slate-950">
                    {request.audiences.join(', ')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('home.remoteLogin.expiresAt').replace(
                      '{time}',
                      new Intl.DateTimeFormat(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(request.expires_at)),
                    )}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    disabled={pending !== null}
                    onClick={() => void decide(request.request_id, 'approve')}
                    type="button"
                  >
                    {pending === 'approve'
                      ? t('home.remoteLogin.approving')
                      : t('home.remoteLogin.approve')}
                  </Button>
                  <Button
                    className="bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-100"
                    disabled={pending !== null}
                    onClick={() => void decide(request.request_id, 'deny')}
                    type="button"
                  >
                    {t('home.remoteLogin.deny')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
