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
import type { AdminJwkSlot } from '@/lib/app-sdk';

export function AdminJwksRoute() {
  const { sdk } = useApp();
  const { t } = useI18n();
  const [jwkSlots, setJwkSlots] = useState<AdminJwkSlot[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const errorMessage =
    error || (loadError === null ? '' : loadError || t('admin.loadError'));

  useEffect(() => {
    if (!sdk) return;
    let active = true;
    void sdk.admin.jwks.list().then(
      (result) => {
        if (active) {
          setJwkSlots(result.keys);
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

  async function rotateJwks() {
    if (!sdk || !jwkSlots || pending) return;
    setPending(true);
    setError('');

    try {
      const rotated = await sdk.admin.jwks.rotate();
      setJwkSlots(rotated.keys);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('admin.rotateError'));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{t('admin.jwks')}</CardTitle>
        <CardDescription>{t('admin.jwksDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {errorMessage ? (
          <Alert>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        {!jwkSlots && loadError === null ? (
          <p role="status">{t('common.loading')}</p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          {jwkSlots?.map((slot) => (
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
        <Button
          className="w-full sm:w-fit"
          disabled={!jwkSlots || pending}
          onClick={() => void rotateJwks()}
        >
          {pending ? t('admin.rotating') : t('admin.rotate')}
        </Button>
      </CardContent>
    </Card>
  );
}
