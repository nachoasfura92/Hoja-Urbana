'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutGrid } from 'lucide-react';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useModals } from '@/lib/greenhouse/modals-context';
import { capacidadTubos, dr, fmas, fracTubosStr, getBanc, plantasEnBanc } from '@/lib/greenhouse/helpers';
import { cn } from '@/lib/utils';
import type { TipoBancal } from '@/lib/greenhouse/modals-context';

interface BancalRef {
  tipo: TipoBancal;
  num: number;
}

// Distribución física real del invernadero (dos naves):
// Nave 1: engorda 1-4 + adulto 1-8. Nave 2: engorda 5-9 + adulto 9-16.
const NAVE_1: BancalRef[] = [
  ...[1, 2, 3, 4].map((num) => ({ tipo: 'eng' as const, num })),
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((num) => ({ tipo: 'adu' as const, num })),
];
const NAVE_2: BancalRef[] = [
  ...[5, 6, 7, 8, 9].map((num) => ({ tipo: 'eng' as const, num })),
  ...[9, 10, 11, 12, 13, 14, 15, 16].map((num) => ({ tipo: 'adu' as const, num })),
];

// > 5 días: verde. Entre 2 y 5: amarillo. Menos de 2: rojo.
function colorUrgencia(dias: number): 'success' | 'warning' | 'destructive' {
  if (dias > 5) return 'success';
  if (dias >= 2) return 'warning';
  return 'destructive';
}

function BancalCell({ tipo, num }: BancalRef) {
  const { state } = useGreenhouse();
  const { openBancal } = useModals();
  const k = `${tipo}_${num}`;
  const prefix = tipo === 'eng' ? 'E' : 'A';
  const capacidad = capacidadTubos(k);
  const etapaBuscada = tipo === 'eng' ? 'engorda' : 'adulto';

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
      type="button"
      onClick={() => openBancal(tipo, num)}
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
        {num}
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
}

function NaveGrid({ bancales }: { bancales: BancalRef[] }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-9 xl:grid-cols-[repeat(13,minmax(0,1fr))]">
      {bancales.map((b) => (
        <BancalCell key={`${b.tipo}_${b.num}`} tipo={b.tipo} num={b.num} />
      ))}
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
            Nave 1 — Engorda 1-4 · Adulto 1-8
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NaveGrid bancales={NAVE_1} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <LayoutGrid className="size-4 text-muted-foreground" />
            Nave 2 — Engorda 5-9 · Adulto 9-16
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NaveGrid bancales={NAVE_2} />
        </CardContent>
      </Card>
    </div>
  );
}
