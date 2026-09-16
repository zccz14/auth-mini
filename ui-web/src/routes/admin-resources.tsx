import { useApp } from '@/app/providers/app-provider';
import { SystemResourcesCard } from '@/components/app/system-resources-card';

export function AdminResourcesRoute() {
  const { sdk } = useApp();
  return sdk ? <SystemResourcesCard sdk={sdk} /> : null;
}
