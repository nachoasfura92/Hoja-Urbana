import { cn } from '@/lib/utils';

// Barra de progreso simple (equivalente a .pb/.pf del original), con color
// arbitrario por instancia — el componente Progress de shadcn no expone el
// indicador para personalizar el color por caso de uso (variedad, estado, etc.).
export function MiniProgress({
  value,
  color,
  className,
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn('h-1 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color ?? 'var(--primary)' }}
      />
    </div>
  );
}
