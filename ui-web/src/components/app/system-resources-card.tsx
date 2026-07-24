import { useCallback, useEffect, useState } from 'react';
import type { DemoSdk, AdminSystemResourcesSnapshot } from '@/lib/demo-sdk';
import { useI18n } from '@/lib/i18n';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type SystemResourcesCardProps = {
  sdk: DemoSdk;
};

export function SystemResourcesCard({ sdk }: SystemResourcesCardProps) {
  const { locale, t } = useI18n();
  const [snapshot, setSnapshot] = useState<AdminSystemResourcesSnapshot | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setSnapshot(await sdk.admin.resources.fetch());
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('admin.resourcesUnavailable'));
    } finally {
      setLoading(false);
    }
  }, [sdk, t]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  if (loading) return <SystemResourcesLoading />;

  if (!snapshot) {
    return (
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{t('admin.resourcesTitle')}</CardTitle>
          <CardDescription>{t('admin.resourcesDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>{t('admin.resourcesUnavailable')}</AlertTitle>
            <AlertDescription>
              {error || t('admin.resourcesUnavailableDescription')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { cpu, disk, memory, network, sqlite } = snapshot;
  const sampledAt = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(snapshot.sampled_at * 1_000));

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{t('admin.resourcesTitle')}</CardTitle>
        <CardDescription>{t('admin.resourcesDescription')}</CardDescription>
        <p className="pt-1 text-xs text-slate-500">
          {t('admin.sampledAt', { time: sampledAt })} · {t('admin.refreshEvery5s')}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <Alert>
            <AlertTitle>{t('admin.resourcesUnavailable')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <dl className="divide-y divide-slate-200 rounded-md border border-slate-200">
          <MetricRow
            label={t('admin.cpu')}
            value={formatPercent(cpu.usage_percent, locale)}
            detail={`${t('admin.load1m')}: ${cpu.load_1m.toFixed(2)} · ${t('admin.logicalCpus')}: ${cpu.logical_cpus}`}
            percent={cpu.usage_percent}
          />
          <MetricRow
            label={t('admin.memory')}
            value={`${formatBytes(memory.used_bytes, locale)} / ${formatBytes(memory.total_bytes, locale)}`}
            detail={`${t('admin.authMiniRss')}: ${formatBytes(memory.process_used_bytes, locale)} · ${t('admin.otherSystemMemory')}: ${formatBytes(memory.other_used_bytes, locale)} · ${t('admin.systemAvailableMemory')}: ${formatBytes(memory.available_bytes, locale)}`}
            secondaryDetail={`${t('admin.swap')}: ${formatBytes(memory.swap_used_bytes, locale)} / ${formatBytes(memory.swap_total_bytes, locale)}`}
            percent={memory.usage_percent}
          />
          <MetricRow
            label={t('admin.network')}
            value={`${t('admin.received')}: ${formatRate(network.receive_bytes_per_second, locale)} · ${t('admin.transmitted')}: ${formatRate(network.transmit_bytes_per_second, locale)}`}
            detail={`${t('admin.networkInterfaces')}: ${network.interfaces}`}
          />
          <MetricRow
            label={t('admin.disk')}
            value={
              disk
                ? `${formatBytes(disk.used_bytes, locale)} / ${formatBytes(disk.total_bytes, locale)}`
                : t('common.unavailable')
            }
            detail={
              disk
                ? `${t('admin.available')}: ${formatBytes(disk.available_bytes, locale)} · ${t('admin.mountPoint')}: ${disk.mount_point}`
                : t('admin.resourcesUnavailableDescription')
            }
            percent={disk?.usage_percent}
          />
          <MetricRow
            label={t('admin.sqlite')}
            value={formatBytes(sqlite.total_bytes, locale)}
            detail={`${t('admin.mainFile')}: ${formatBytes(sqlite.main_bytes, locale)} · ${t('admin.walFile')}: ${formatBytes(sqlite.wal_bytes, locale)} · ${t('admin.shmFile')}: ${formatBytes(sqlite.shm_bytes, locale)}`}
            secondaryDetail={`${t('admin.reclaimableSpace')}: ${formatBytes(sqlite.freelist_bytes, locale)} · ${formatPercent(sqlite.freelist_percent, locale)}`}
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function SystemResourcesLoading() {
  const { t } = useI18n();

  return (
    <Card className="rounded-lg" aria-busy="true">
      <CardHeader>
        <CardTitle>{t('admin.resourcesTitle')}</CardTitle>
        <CardDescription>{t('admin.resourcesDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3" aria-label={t('common.loading')}>
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-16 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type MetricRowProps = {
  label: string;
  value: string;
  detail: string;
  secondaryDetail?: string;
  percent?: number;
};

function MetricRow({
  label,
  value,
  detail,
  secondaryDetail,
  percent,
}: MetricRowProps) {
  return (
    <div className="grid gap-2 p-4 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-4">
      <dt className="font-medium text-slate-900">{label}</dt>
      <dd className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="font-mono text-sm font-medium text-slate-900">{value}</span>
          {percent !== undefined ? (
            <span className="text-xs tabular-nums text-slate-500">
              {percent.toFixed(1)}%
            </span>
          ) : null}
        </div>
        {percent !== undefined ? (
          <progress
            className="h-1.5 w-full accent-slate-700"
            aria-label={label}
            max="100"
            value={Math.min(Math.max(percent, 0), 100)}
          />
        ) : null}
        <p className="break-words text-xs leading-5 text-slate-600">{detail}</p>
        {secondaryDetail ? (
          <p className="break-words text-xs leading-5 text-slate-500">
            {secondaryDetail}
          </p>
        ) : null}
      </dd>
    </div>
  );
}

function formatBytes(bytes: number, locale: string) {
  if (bytes < 1_024) return `${bytes} B`;
  const units = ['KiB', 'MiB', 'GiB', 'TiB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1_024)),
    units.length,
  );
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1_024 ** exponent)} ${units[exponent - 1]}`;
}

function formatRate(bytesPerSecond: number, locale: string) {
  return `${formatBytes(bytesPerSecond, locale)}/s`;
}

function formatPercent(percent: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    style: 'percent',
  }).format(percent / 100);
}
