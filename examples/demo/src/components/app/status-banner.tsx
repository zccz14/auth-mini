import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useDemo } from '@/app/providers/demo-provider';

export function StatusBanner() {
  const { config, sdk } = useDemo();

  return (
    <Alert className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <AlertTitle>Demo status</AlertTitle>
        <AlertDescription>
          {config.configError || `Connected to ${config.authOrigin}`}
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
          {sdk ? 'sdk ready' : 'sdk idle'}
        </Badge>
      </div>
    </Alert>
  );
}
