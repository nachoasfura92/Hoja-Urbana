import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertKind = 'warning' | 'success' | 'info' | 'danger';

const STYLES: Record<AlertKind, string> = {
  warning: 'bg-warning/10 text-warning',
  success: 'bg-success/10 text-success',
  info: 'bg-accent text-accent-foreground',
  danger: 'bg-destructive/10 text-destructive',
};

export function AlertRow({
  kind,
  icon: Icon,
  children,
  className,
}: {
  kind: AlertKind;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-2 rounded-md px-3 py-2 text-sm', STYLES[kind], className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 leading-snug">{children}</div>
    </div>
  );
}
