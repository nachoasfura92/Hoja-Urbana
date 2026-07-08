import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

// Identificador de la banderita física puesta en el invernadero al sembrar
// (se recicla entre siembras, no es único). Sirve para conectar lo que se ve
// físicamente en el invernadero con el lote correspondiente en la app.
export function BanderaBadge({ numero, className }: { numero: number; className?: string }) {
  // La bandera solo es válida mientras el lote está en mesa de plantines; una
  // vez traspasado a engorda se libera (numero pasa a 0) y ya no se muestra.
  if (!numero) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[11px] font-medium text-warning',
        className
      )}
      title={`Bandera N° ${numero}`}
    >
      <Flag className="size-3" fill="currentColor" />
      {numero}
    </span>
  );
}
