'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MiniProgress } from '@/components/dashboard/mini-progress';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useModals } from '@/lib/greenhouse/modals-context';
import { eliminarPlantas } from '@/lib/greenhouse/actions';
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

  const [eliminarOpen, setEliminarOpen] = useState(false);
  const [plantasEliminar, setPlantasEliminar] = useState(0);
  const [esMerma, setEsMerma] = useState(false);
  const [motivo, setMotivo] = useState('');

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

  function abrirEliminar() {
    setPlantasEliminar(lote!.plantasRestantes);
    setEsMerma(false);
    setMotivo('');
    setEliminarOpen(true);
  }

  function confirmarEliminar() {
    update((draft) =>
      eliminarPlantas(draft, { loteId: lote!.id, plantas: plantasEliminar, esMerma, nota: motivo.trim() })
    );
    setEliminarOpen(false);
    closeLote();
    closeBancal();
  }

  function handleAvanzar() {
    closeLote();
    if (sig === 'cosechado') openCosechar(lote!.id);
    else openMover(lote!.id);
  }

  const motivoRequerido = !esMerma && !motivo.trim();

  return (
    <>
      <Dialog open={!!loteId && !eliminarOpen} onOpenChange={(o) => !o && closeLote()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lote.varNom} — {lote.etapa}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Plantas" value={lote.plantasRestantes} />
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
            <Button variant="destructive" onClick={abrirEliminar}>
              Eliminar
            </Button>
            <Button variant="outline" onClick={closeLote}>
              Cerrar
            </Button>
            {sig && <Button onClick={handleAvanzar}>{sig === 'cosechado' ? 'Cosechar' : `→ ${sig}`}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={eliminarOpen} onOpenChange={setEliminarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar plantas — {lote.varNom}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>¿Cuántas plantas deseas eliminar? (máx. {lote.plantasRestantes})</Label>
              <Input
                type="number"
                min={1}
                max={lote.plantasRestantes}
                value={plantasEliminar}
                onChange={(e) => setPlantasEliminar(parseInt(e.target.value, 10) || 0)}
              />
              <p className="text-xs text-muted-foreground">{fracTubosStr(plantasEliminar)} tubos equivalentes</p>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <div className="text-sm font-medium">Son merma</div>
                <div className="text-xs text-muted-foreground">Se suman al recuento de merma de {lote.etapa}</div>
              </div>
              <Switch checked={esMerma} onCheckedChange={setEsMerma} />
            </div>
            <div className="grid gap-1.5">
              <Label>{esMerma ? 'Detalle (opcional)' : 'Motivo (requerido)'}</Label>
              <Input
                placeholder={esMerma ? 'Ej: quemadas por sol' : 'Ej: se regalaron, se rompió el bancal...'}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEliminarOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarEliminar} disabled={!plantasEliminar || motivoRequerido}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
