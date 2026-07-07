'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutGrid } from 'lucide-react';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useModals } from '@/lib/greenhouse/modals-context';
import { dr, fmas, fracTubosStr, getBanc, plantasEnBanc } from '@/lib/greenhouse/helpers';
import { cn } from '@/lib/utils';
import type { TipoBancal } from '@/lib/greenhouse/modals-context';

// > 5 días: verde. Entre 2 y 5: amarillo. Menos de 2: rojo.
function colorUrgencia(dias: number): 'success' | 'warning' | 'destructive' {
  if (dias > 5) return 'success';
  if (dias >= 2) return 'warning';
  return 'destructive';
}

function BancalGrid({ tipo, count, capacidad }: { tipo: TipoBancal; count: number; capacidad: number }) {
  const { state } = useGreenhouse();
  const { openBancal } = useModals();
  const prefix = tipo === 'eng' ? 'E' : 'A';
  const etapaBuscada = tipo === 'eng' ? 'engorda' : 'adulto';

  return (
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
      {Array.from({ length: count }, (_, idx) => {
        const i = idx + 1;
        const k = `${tipo}_${i}`;
        const uP = plantasEnBanc(state.bancales, k);
        const slots = getBanc(state.bancales, k);
        const vLabel = slots.length ? slots.map((s) => s.varNom).join('/') : '—';

        const lotesBancal = state.lotes.filter((l) => l.bancalId === k && l.etapa === etapaBuscada);
        const dias = lotesBancal.length
          ? Math.min(...lotesBancal.map((l) => (tipo === 'eng' ? dr(fmas(l.fechaEtapa, l.de)) : dr(l.fechaVenta))))
          : null;
        const color = dias == null ? null : colorUrgencia(dias);
        const titulo =
          dias == null
            ? undefined
            : `${dias <= 0 ? 'Listo ahora' : `Faltan ${dias} día${dias === 1 ? '' : 's'}`} para ${tipo === 'eng' ? 'el traspaso a adulto' : 'la cosecha'}`;

        return (
          <button
            key={k}
            type="button"
            onClick={() => openBancal(tipo, i)}
            title={titulo}
            className={cn(
              'rounded-md border px-1 py-1.5 text-center transition-colors hover:border-primary',
              color === 'success' && 'border-success/50 bg-success/5',
              color === 'warning' && 'border-warning/60 bg-warning/10',
              color === 'destructive' && 'border-destructive/60 bg-destructive/10'
            )}
          >
            <div className="text-[10px] text-muted-foreground">
              {prefix}
              {i}
            </div>
            <div className="truncate text-[10px] font-medium">{vLabel}</div>
            <div className="text-[10px] text-muted-foreground">
              {fracTubosStr(uP)}/{capacidad}
            </div>
            {dias != null && (
              <div
                className={cn(
                  'text-[10px] font-semibold',
                  color === 'success' && 'text-success',
                  color === 'warning' && 'text-warning',
                  color === 'destructive' && 'text-destructive'
                )}
              >
                {dias <= 0 ? 'Listo' : `${dias}d`}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function BancalesPage() {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <LayoutGrid className="size-4 text-muted-foreground" />
            Engorda — 8 bancales × 20 tubos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BancalGrid tipo="eng" count={8} capacidad={20} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <LayoutGrid className="size-4 text-muted-foreground" />
            Adulto — 16 bancales × 10 tubos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BancalGrid tipo="adu" count={16} capacidad={10} />
        </CardContent>
      </Card>
    </div>
  );
}
