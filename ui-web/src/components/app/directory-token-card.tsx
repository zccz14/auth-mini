import { useEffect, useState } from 'react';
import { useApp } from '@/app/providers/app-provider';
import { useI18n } from '@/lib/i18n';
import type { DirectoryTokenStatus } from '@/lib/app-sdk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function DirectoryTokenCard() {
  const { sdk } = useApp();
  const { t } = useI18n();
  const [status, setStatus] = useState<DirectoryTokenStatus | null>(null);
  const [token, setToken] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sdk) return;
    let active = true;
    void sdk.admin.directoryToken.status().then(
      (value) => {
        if (active) setStatus(value);
      },
      () => {
        if (active) setError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [sdk]);

  async function rotate() {
    if (
      !sdk ||
      pending ||
      (status?.configured && !window.confirm(t('directory.confirmRotate')))
    )
      return;
    setPending(true);
    setError(false);
    setToken('');
    setCopied(false);
    setCopyError(false);
    try {
      const result = await sdk.admin.directoryToken.rotate();
      setToken(result.token);
      setStatus({ configured: true, created_at: null });
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  async function revoke() {
    if (!sdk || pending || !window.confirm(t('directory.confirmRevoke')))
      return;
    setPending(true);
    setError(false);
    try {
      await sdk.admin.directoryToken.revoke();
      setToken('');
      setStatus({ configured: false, created_at: null });
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('directory.title')}</CardTitle>
        <CardDescription>{t('directory.description')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error ? <p role="alert">{t('directory.error')}</p> : null}
        <p>
          {status
            ? t(
                status.configured
                  ? 'directory.configured'
                  : 'directory.unconfigured',
              )
            : t('common.loading')}
        </p>
        {token ? (
          <div className="grid gap-2">
            <p>{t('directory.once')}</p>
            <Label htmlFor="directory-token">{t('directory.token')}</Label>
            <Input
              id="directory-token"
              readOnly
              value={token}
              autoComplete="off"
              className="font-mono"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void copy()}>
                {t(copied ? 'common.copied' : 'directory.copy')}
              </Button>
              <Button
                className="border border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                onClick={() => setToken('')}
              >
                {t('directory.dismiss')}
              </Button>
            </div>
            {copyError ? <p role="alert">{t('directory.copyError')}</p> : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button disabled={pending || !status} onClick={() => void rotate()}>
            {t(status?.configured ? 'directory.rotate' : 'directory.generate')}
          </Button>
          <Button
            className="border border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
            disabled={pending || !status?.configured}
            onClick={() => void revoke()}
          >
            {t('directory.revoke')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
