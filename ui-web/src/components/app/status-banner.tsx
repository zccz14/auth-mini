import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useDemo } from '@/app/providers/demo-provider';
import { useI18n } from '@/lib/i18n';

export function StatusBanner() {
  const { config, sdk } = useDemo();
  const { t } = useI18n();

  return (
    <Alert className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <AlertTitle>{t('status.backend')}</AlertTitle>
        <AlertDescription>
          {config.configError ||
            t('status.connected', { url: config.serverBaseUrl })}
        </AlertDescription>
      </div>
      <div className="flex items-center gap-2">
        <Badge>{config.status}</Badge>
        <Badge
          className={
            sdk
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }
        >
          {sdk ? t('status.sdkReady') : t('status.sdkIdle')}
        </Badge>
      </div>
    </Alert>
  );
}
