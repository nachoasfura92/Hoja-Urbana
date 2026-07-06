'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MiniProgress } from '@/components/dashboard/mini-progress';
import { BanderaBadge } from '@/components/dashboard/bandera-badge';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useModals } from '@/lib/greenhouse/modals-context';
import { dd, fd, fracTubosStr, gv, gvColor } from '@/lib/greenhouse/helpers';
import { cn } from '@/lib/utils';
import type { Lote } from '@/lib/greenhouse/types';

function colorPauta(pct: number) {
  if (pct >= 100) return 'var(--success)';
  if (pct >= 70) return 'var(--warning)';
  return '#2A7D2E';
}

export function MesaPage() {
  const { state } = useGreenhouse();
  const { openLote, openMover } = useModals();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const enPlantines = state.lotes.filter((l) => l.etapa === 'plantines');

  if (!enPlantines.length) {
    return <p className="text-sm text-muted-foreground">Sin lotes en mesa.</p>;
  }

  const grupos = new Map<number, Lote[]>();
  enPlantines.forEach((l) => {
    if (!grupos.has(l.varId)) grupos.set(l.varId, []);
    grupos.get(l.varId)!.push(l);
  });

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">Agrupado por variedad. Clic en encabezado para expandir.</p>
      {[...grupos.entries()].map(([vId, lotes]) => {
        const v = gv(state.vars, vId);
        const color = gvColor(state.vars, vId);
        const totalP = lotes.reduce((a, l) => a + l.plantasRestantes, 0);
        const vencidos = lotes.some((l) => dd(l.fechaInicio) >= l.dp);
        const isOpen = !!expanded[vId];

        return (
          <div key={vId} className="overflow-hidden rounded-lg border">
            <button
              type="button"
              onClick={() => setExpanded((e) => ({ ...e, [vId]: !e[vId] }))}
              className="flex w-full items-center justify-between gap-2 bg-card px-3.5 py-2.5 text-left hover:bg-muted/40"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="size-1.5 rounded-full" style={{ background: color }} />
                {v.nombre}
                {vencidos ? (
                  <Badge variant="outline" className="border-transparent bg-warning/10 text-warning">
                    mover a engorda
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-transparent bg-accent text-accent-foreground">
                    {lotes.length} lote{lotes.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{fracTubosStr(totalP)} tubos</span>
                <span className="font-medium text-foreground">{totalP.toLocaleString()} plantas</span>
                <ChevronDown className={cn('size-4 transition-transform', isOpen && 'rotate-180')} />
              </div>
            </button>
            {isOpen && (
              <div className="grid gap-2 bg-muted/20 p-3">
                {lotes.map((l) => {
                  const dias = dd(l.fechaInicio);
                  const pct = Math.min(100, Math.round((dias / l.dp) * 100));
                  const bc = colorPauta(pct);
                  return (
                    <div
                      key={l.id}
                      className="rounded-md border bg-card px-3 py-2"
                      style={{ borderLeft: `2px solid ${color}` }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          Lote #{l.id} · {fd(l.fechaInicio)}
                          <BanderaBadge numero={l.bandera} />
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="border-transparent bg-accent text-accent-foreground">
                            día {dias}
                          </Badge>
                          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => openMover(l.id)}>
                            → Engorda
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openLote(l.id)}>
                            Ver
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {l.plantasRestantes} plantas · {fracTubosStr(l.plantasRestantes)} tubos
                      </div>
                      <MiniProgress value={pct} color={bc} className="mt-1" />
                      <div
                        className="mt-0.5 text-[11px]"
                        style={{ color: pct >= 100 ? 'var(--warning)' : 'var(--muted-foreground)' }}
                      >
                        {pct}% de pauta ({l.dp}d){pct >= 100 ? ' — ¡mover a engorda!' : ''}
                      </div>
                      {l.notas && <div className="mt-1 text-sm italic">📝 {l.notas}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
