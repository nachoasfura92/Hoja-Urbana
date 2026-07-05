'use client';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MiniProgress } from '@/components/dashboard/mini-progress';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useModals } from '@/lib/greenhouse/modals-context';
import { deleteLote } from '@/lib/greenhouse/actions';
import { dd, fd, fracTubosStr } from '@/lib/greenhouse/helpers';
import type { Etapa } from '@/lib/greenhouse/types';

const SIGUIENTE: Partial<Record<Etapa, Etapa>> = {
  plantines: 'engorda',
  engorda: 'adulto',
  adulto: 'cosechado',
};

export function LoteModal() {
  const { state, update } = useGreenhouse();
  const { loteId, closeLote, openMover, openCosechar, closeBancal } = useModals();
  const lote = loteId != null ? state.lotes.find((l) => l.id === loteId) : null;

  if (!lote) {
    return (
      <Dialog open={!!loteId} onOpenChange={(o) => !o && closeLote()}>
        <DialogContent />
      </Dialog>
    );
  }

  const dias = dd(lote.fechaEtapa);
  const dObj = lote.etapa === 'plantines' ? lote.dp : lote.etapa === 'engorda' ? lote.de : lote.da;
  const pct = Math.min(100, Math.round((dias / dObj) * 100));
  const sig = SIGUIENTE[lote.etapa];

  function handleDelete() {
    if (!confirm(`¿Eliminar lote de ${lote!.varNom}?`)) return;
    update((draft) => deleteLote(draft, lote!.id));
    closeLote();
    closeBancal();
  }

  function handleAvanzar() {
    closeLote();
    if (sig === 'cosechado') openCosechar(lote!.id);
    else openMover(lote!.id);
  }

  return (
    <Dialog open={!!loteId} onOpenChange={(o) => !o && closeLote()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {lote.varNom} — {lote.etapa}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Plantas" value={lote.plantasRestantes} />
          <MiniStat label="Cubos" value={lote.plantasRestantes} />
          <MiniStat label="Tubos equiv." value={fracTubosStr(lote.plantasRestantes)} />
        </div>

        <div className="rounded-md bg-muted/60 p-3">
          <div className="mb-1 text-xs text-muted-foreground">
            Día en etapa: {dias}/{dObj}
          </div>
          <MiniProgress value={pct} color={pct >= 100 ? 'var(--success)' : '#2A7D2E'} />
        </div>

        <div className="text-xs text-muted-foreground">
          Cosecha est: {fd(lote.fechaVenta)}
          {lote.bancalId ? ` · Bancal: ${lote.bancalId}` : ''}
        </div>

        {lote.notas && (
          <div className="rounded-md border-l-2 border-primary bg-muted/40 px-3 py-2">
            <div className="mb-0.5 text-xs text-muted-foreground">Notas</div>
            <div className="text-sm">{lote.notas}</div>
          </div>
        )}

        <div className="grid gap-1">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Historial</h4>
          <div className="max-h-48 overflow-y-auto">
            {(lote.movimientos || []).map((m, i) => (
              <div key={i} className="flex gap-2 border-b py-1 text-xs last:border-b-0">
                <span className="min-w-[62px] shrink-0 font-medium text-muted-foreground">{fd(m.fecha)}</span>
                <span>
                  {m.accion} — {m.detalle}
                </span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="destructive" onClick={handleDelete}>
            Eliminar
          </Button>
          <Button variant="outline" onClick={closeLote}>
            Cerrar
          </Button>
          {sig && (
            <Button onClick={handleAvanzar}>{sig === 'cosechado' ? 'Cosechar' : `→ ${sig}`}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-muted/60 px-2.5 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
