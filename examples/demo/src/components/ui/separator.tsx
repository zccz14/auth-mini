import * as React from 'react';
import { cn } from '@/lib/cn';

export function Separator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('h-px w-full bg-slate-200', className)}
      {...props}
    />
  );
}
