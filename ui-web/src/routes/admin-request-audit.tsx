import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/app/providers/app-provider';
import type { AdminRequestAuditSnapshot } from '@/lib/app-sdk';
import { useI18n } from '@/lib/i18n';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function AdminRequestAuditRoute() {
  const { sdk } = useApp();
  const { locale, t } = useI18n();
  const [snapshot, setSnapshot] = useState<AdminRequestAuditSnapshot | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!sdk) return;
    try {
      setSnapshot(await sdk.admin.requestAudit.fetch());
      setError('');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t('admin.requestAuditUnavailableDescription'),
      );
    } finally {
      setLoading(false);
    }
  }, [sdk, t]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  if (loading) return <RequestAuditLoading />;

  if (!snapshot) {
    return (
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{t('admin.requestAudit')}</CardTitle>
          <CardDescription>
            {t('admin.requestAuditDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>{t('admin.requestAuditUnavailable')}</AlertTitle>
            <AlertDescription>
              {error || t('admin.requestAuditUnavailableDescription')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{t('admin.requestAudit')}</CardTitle>
          <CardDescription>
            {t('admin.requestAuditDescription')}
          </CardDescription>
          <p className="pt-1 text-xs text-slate-500">
            {t('admin.requestAuditSince', {
              time: formatTimestamp(snapshot.started_at, locale),
            })}{' '}
            · {t('admin.refreshEvery5s')}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <Alert>
              <AlertTitle>{t('admin.requestAuditUnavailable')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {snapshot.endpoints.length === 0 ? (
            <p className="text-sm text-slate-600">{t('admin.noRequests')}</p>
          ) : (
            <div
              className="overflow-x-auto"
              role="region"
              aria-label={t('admin.requestAudit')}
              tabIndex={0}
            >
              <table className="min-w-full whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="p-2">{t('admin.method')}</th>
                    <th className="p-2">{t('admin.endpoint')}</th>
                    <th className="p-2 text-right">
                      {t('admin.requestCount')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.endpoints.map((entry) => (
                    <tr
                      key={`${entry.method} ${entry.endpoint}`}
                      className="border-b border-slate-100"
                    >
                      <td className="p-2 font-mono">{entry.method}</td>
                      <td className="p-2 font-mono">{entry.endpoint}</td>
                      <td className="p-2 text-right tabular-nums">
                        {entry.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{t('admin.unknownEndpoints')}</CardTitle>
          <CardDescription>
            {t('admin.unknownEndpointsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {snapshot.unmatched.length === 0 ? (
            <p className="text-sm text-slate-600">
              {t('admin.noUnknownEndpoints')}
            </p>
          ) : (
            <div
              className="overflow-x-auto"
              role="region"
              aria-label={t('admin.unknownEndpoints')}
              tabIndex={0}
            >
              <table className="min-w-full whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="p-2">{t('admin.method')}</th>
                    <th className="p-2">{t('admin.path')}</th>
                    <th className="p-2 text-right">
                      {t('admin.requestCount')}
                    </th>
                    <th className="p-2">{t('admin.lastSeen')}</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.unmatched.map((entry) => (
                    <tr
                      key={`${entry.method} ${entry.path}`}
                      className="border-b border-slate-100"
                    >
                      <td className="p-2 font-mono">{entry.method}</td>
                      <td className="p-2 font-mono">{entry.path}</td>
                      <td className="p-2 text-right tabular-nums">
                        {entry.count}
                      </td>
                      <td className="p-2 text-xs text-slate-600">
                        {formatTimestamp(entry.last_seen, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function formatTimestamp(seconds: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(seconds * 1_000));
}

function RequestAuditLoading() {
  const { t } = useI18n();

  return (
    <Card className="rounded-lg" aria-busy="true">
      <CardHeader>
        <CardTitle>{t('admin.requestAudit')}</CardTitle>
        <CardDescription>{t('admin.requestAuditDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3" aria-label={t('common.loading')}>
          {[0, 1, 2, 3].map((row) => (
            <div
              key={row}
              className="h-9 animate-pulse rounded-md bg-slate-100"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
