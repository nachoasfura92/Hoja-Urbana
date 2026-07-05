'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useModals } from '@/lib/greenhouse/modals-context';
import { cosechar } from '@/lib/greenhouse/actions';
import { fracTubosStr, hoy } from '@/lib/greenhouse/helpers';

export function CosecharModal() {
  const { state, update } = useGreenhouse();
  const { cosecharId, closeCosechar } = useModals();
  const lote = cosecharId != null ? state.lotes.find((l) => l.id === cosecharId) : null;

  const [plantas, setPlantas] = useState(0);
  const [fecha, setFecha] = useState(hoy());
  const [nota, setNota] = useState('');

  // Reinicializa el formulario cuando se abre un lote distinto (patrón
  // "ajustar estado durante el render" recomendado por React en vez de un
  // efecto, ya que evita un ciclo extra de render).
  const [lastLoteId, setLastLoteId] = useState<number | null>(null);
  if (lote && lote.id !== lastLoteId) {
    setLastLoteId(lote.id);
    setPlantas(lote.plantasRestantes);
    setFecha(hoy());
    setNota('');
  }

  if (!lote) {
    return <Dialog open={false} onOpenChange={() => closeCosechar()} />;
  }

  function handleConfirmar() {
    update((draft) =>
      cosechar(draft, { loteId: lote!.id, plantas, fecha: fecha || hoy(), nota })
    );
    closeCosechar();
  }

  return (
    <Dialog open={cosecharId != null} onOpenChange={(o) => !o && closeCosechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cosechar — {lote.varNom}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="rounded-md bg-muted/60 px-3 py-2 text-sm">
            Plantas disponibles: <strong>{lote.plantasRestantes}</strong> ({fracTubosStr(lote.plantasRestantes)} tubos)
          </div>
          <div className="grid gap-1.5">
            <Label>Plantas a cosechar (máx. {lote.plantasRestantes})</Label>
            <Input
              type="number"
              min={1}
              max={lote.plantasRestantes}
              value={plantas}
              onChange={(e) => setPlantas(parseInt(e.target.value, 10) || 0)}
            />
            <p className="text-xs text-muted-foreground">= {fracTubosStr(plantas)} tubos</p>
          </div>
          <div className="grid gap-1.5">
            <Label>Fecha cosecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Notas</Label>
            <Input placeholder="Calidad, destino..." value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeCosechar}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar}>Cosechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
