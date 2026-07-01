import * as React from 'react';
import { cn } from '@/lib/cn';

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700',
        className,
      )}
      {...props}
    />
  );
}
