'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutGrid } from 'lucide-react';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useModals } from '@/lib/greenhouse/modals-context';
import { fracTubosStr, getBanc, plantasEnBanc } from '@/lib/greenhouse/helpers';
import type { TipoBancal } from '@/lib/greenhouse/modals-context';

function BancalGrid({ tipo, count, capacidad }: { tipo: TipoBancal; count: number; capacidad: number }) {
  const { state } = useGreenhouse();
  const { openBancal } = useModals();
  const prefix = tipo === 'eng' ? 'E' : 'A';

  return (
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
      {Array.from({ length: count }, (_, idx) => {
        const i = idx + 1;
        const k = `${tipo}_${i}`;
        const uP = plantasEnBanc(state.bancales, k);
        const slots = getBanc(state.bancales, k);
        const vLabel = slots.length ? slots.map((s) => s.varNom).join('/') : '—';
        return (
          <button
            key={k}
            type="button"
            onClick={() => openBancal(tipo, i)}
            className={
              'rounded-md border px-1 py-1.5 text-center transition-colors hover:border-primary ' +
              (uP > 0 ? (tipo === 'eng' ? 'border-warning/50 bg-warning/5' : 'border-success/50 bg-success/5') : '')
            }
          >
            <div className="text-[10px] text-muted-foreground">
              {prefix}
              {i}
            </div>
            <div className="truncate text-[10px] font-medium">{vLabel}</div>
            <div className="text-[10px] text-muted-foreground">
              {fracTubosStr(uP)}/{capacidad}
            </div>
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
