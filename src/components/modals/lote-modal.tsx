'use client';

import { useState } from 'react';
import { Minus, Pencil, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MiniProgress } from '@/components/dashboard/mini-progress';
import { BanderaBadge } from '@/components/dashboard/bandera-badge';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useModals } from '@/lib/greenhouse/modals-context';
import { useCurrentUser } from '@/lib/auth/current-user-context';
import { editarPauta, eliminarPlantas } from '@/lib/greenhouse/actions';
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
  const { displayName, email } = useCurrentUser();
  const autor = displayName || email || undefined;
  const lote = loteId != null ? state.lotes.find((l) => l.id === loteId) : null;

  const [eliminarOpen, setEliminarOpen] = useState(false);
  const [plantasEliminar, setPlantasEliminar] = useState(0);
  const [esMerma, setEsMerma] = useState(false);
  const [motivo, setMotivo] = useState('');

  const [editandoPauta, setEditandoPauta] = useState(false);
  const [dpEdit, setDpEdit] = useState(0);
  const [deEdit, setDeEdit] = useState(0);
  const [daEdit, setDaEdit] = useState(0);

  // Cierra los sub-formularios (eliminar, editar pauta) al cambiar de lote
  // (patrón "ajustar estado durante el render" en vez de un efecto).
  const [lastLoteId, setLastLoteId] = useState<number | null>(null);
  if (lote && lote.id !== lastLoteId) {
    setLastLoteId(lote.id);
    setEditandoPauta(false);
    setEliminarOpen(false);
  }

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

  function abrirEditarPauta() {
    setDpEdit(lote!.dp);
    setDeEdit(lote!.de);
    setDaEdit(lote!.da);
    setEditandoPauta(true);
  }

  function guardarPauta() {
    update((draft) => editarPauta(draft, { loteId: lote!.id, dp: dpEdit, de: deEdit, da: daEdit, autor }));
    setEditandoPauta(false);
  }

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
            <DialogTitle className="flex items-center gap-2">
              {lote.varNom} — {lote.etapa}
              <BanderaBadge numero={lote.bandera} />
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

          <div className="rounded-md border px-3 py-2">
            <div className="mb-1.5 flex items-center justify-between">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pauta (días objetivo)</h4>
              {!editandoPauta && (
                <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-xs" onClick={abrirEditarPauta}>
                  <Pencil className="size-3" />
                  Editar pauta
                </Button>
              )}
            </div>
            {editandoPauta ? (
              <div className="grid gap-1.5">
                <PautaStepper label="Días plantines" value={dpEdit} onChange={setDpEdit} />
                <PautaStepper label="Días engorda" value={deEdit} onChange={setDeEdit} />
                <PautaStepper label="Días adulto" value={daEdit} onChange={setDaEdit} />
                <div className="mt-1 flex justify-end gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => setEditandoPauta(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={guardarPauta}>
                    Guardar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Plantines {lote.dp}d · Engorda {lote.de}d · Adulto {lote.da}d
              </div>
            )}
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
              {(lote.movimientos || []).map((m) => (
                <div key={m.id} className="flex gap-2 border-b py-1 text-xs last:border-b-0">
                  <span className="min-w-[62px] shrink-0 font-medium text-muted-foreground">{fd(m.fecha)}</span>
                  <span>
                    {m.accion} — {m.detalle}
                    {m.autor && <span className="text-muted-foreground"> · por {m.autor}</span>}
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

function PautaStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-1.5">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-6"
          onClick={() => onChange(Math.max(1, value - 1))}
        >
          <Minus className="size-3" />
        </Button>
        <span className="w-9 text-center text-sm font-medium">{value}d</span>
        <Button type="button" variant="outline" size="icon" className="size-6" onClick={() => onChange(value + 1)}>
          <Plus className="size-3" />
        </Button>
      </div>
    </div>
  );
}
