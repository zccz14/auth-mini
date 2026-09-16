import { useApp } from '@/app/providers/app-provider';
import { useI18n } from '@/lib/i18n';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function AdminRoute() {
  const { setupError, setupState } = useApp();
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.overview')}</CardTitle>
        <CardDescription>{t('admin.overviewDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {setupError ? (
          <Alert>
            <AlertDescription>{setupError}</AlertDescription>
          </Alert>
        ) : null}
        <dl className="grid gap-4 text-sm text-slate-700">
          <div className="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <dt>{t('admin.userId')}</dt>
            <dd className="break-all font-mono">
              {setupState?.admin_user_id ?? t('common.unavailable')}
            </dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <dt>{t('common.issuer')}</dt>
            <dd className="break-all">
              {setupState?.issuer ?? t('common.unavailable')}
            </dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <dt>{t('common.rpId')}</dt>
            <dd className="break-all">
              {setupState?.rp_id ?? t('common.unavailable')}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
