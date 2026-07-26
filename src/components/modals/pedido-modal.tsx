'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/dashboard/date-picker';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { addPedido, editPedido } from '@/lib/greenhouse/actions';
import { gv, hoy, varLabel } from '@/lib/greenhouse/helpers';
import type { PedidoCliente, PeriodicidadPedido } from '@/lib/greenhouse/types';
import { cn } from '@/lib/utils';

export interface PedidoModalTarget {
  clienteId: number;
  pedido: 'nuevo' | PedidoCliente;
}

const FRECUENCIAS = [
  { value: '1', label: 'Todos los días' },
  { value: '2', label: 'Día por medio' },
  { value: '3', label: 'Cada 3 días' },
  { value: '4', label: 'Cada 4 días' },
  { value: '7', label: 'Cada semana' },
  { value: '14', label: 'Cada 2 semanas' },
  { value: '30', label: 'Mensual' },
];
const FRECUENCIA_ITEMS = Object.fromEntries(FRECUENCIAS.map((f) => [f.value, f.label]));

export function PedidoModal({ target, onClose }: { target: PedidoModalTarget | null; onClose: () => void }) {
  const { state, update } = useGreenhouse();

  const [vId, setVId] = useState('');
  const [plantas, setPlantas] = useState(0);
  const [periodicidad, setPeriodicidad] = useState<PeriodicidadPedido>('recurrente');
  const [freq, setFreq] = useState('7');
  const [dp, setDp] = useState(14);
  const [de, setDe] = useState(21);
  const [da, setDa] = useState(21);
  const [fechaEntrega, setFechaEntrega] = useState(hoy());
  const [notas, setNotas] = useState('');

  // Reinicializa el formulario cuando se abre un target distinto (patrón
  // "ajustar estado durante el render" en vez de un efecto).
  const [lastKey, setLastKey] = useState<string | null>(null);
  const key = target ? (target.pedido === 'nuevo' ? `nuevo_${target.clienteId}` : `editar_${target.pedido.id}`) : null;
  if (target && key !== lastKey) {
    setLastKey(key);
    const p = target.pedido === 'nuevo' ? null : target.pedido;
    setVId(p ? String(p.varId) : '');
    setPlantas(p?.plantas ?? 0);
    setPeriodicidad(p?.periodicidad ?? 'recurrente');
    setFreq(p?.freq ? String(p.freq) : '7');
    setDp(p?.dp ?? 14);
    setDe(p?.de ?? 21);
    setDa(p?.da ?? 21);
    setFechaEntrega(p?.fechaEntrega ?? hoy());
    setNotas(p?.notas ?? '');
  }

  const variedadItems = useMemo(
    () => Object.fromEntries((state.vars || []).map((v) => [String(v.id), varLabel(v)])),
    [state.vars]
  );

  if (!target) {
    return <Dialog open={false} onOpenChange={() => onClose()} />;
  }

  const vIdNum = vId ? parseInt(vId, 10) : null;
  const puedeGuardar = !!vIdNum && plantas > 0 && !!fechaEntrega;

  function handleGuardar() {
    if (!puedeGuardar || !vIdNum || !target) return;
    const variedad = gv(state.vars, vIdNum);
    const params = {
      clienteId: target.clienteId,
      varId: vIdNum,
      varNom: variedad.nombre,
      plantas,
      periodicidad,
      freq: periodicidad === 'recurrente' ? parseInt(freq, 10) : undefined,
      dp: dp || 1,
      de: de || 1,
      da: da || 1,
      fechaEntrega,
      notas: notas.trim() || undefined,
    };
    update((draft) => {
      if (target.pedido === 'nuevo') addPedido(draft, params);
      else editPedido(draft, { id: target.pedido.id, ...params });
    });
    onClose();
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{target.pedido === 'nuevo' ? 'Nuevo pedido' : 'Editar pedido'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Variedad</Label>
            <Select value={vId} onValueChange={(v) => setVId(v ?? '')} items={variedadItems}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {(state.vars || []).map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {varLabel(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Cantidad de plantas</Label>
            <Input
              type="number"
              min={1}
              value={plantas || ''}
              onChange={(e) => setPlantas(parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Periodicidad</Label>
            <div className="flex gap-1.5">
              <PeriodicidadButton active={periodicidad === 'unico'} onClick={() => setPeriodicidad('unico')}>
                Pedido único
              </PeriodicidadButton>
              <PeriodicidadButton active={periodicidad === 'recurrente'} onClick={() => setPeriodicidad('recurrente')}>
                Recurrente
              </PeriodicidadButton>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{periodicidad === 'unico' ? 'Fecha de entrega' : 'Próxima entrega'}</Label>
              <DatePicker value={fechaEntrega} onChange={setFechaEntrega} />
            </div>
            {periodicidad === 'recurrente' && (
              <div className="grid gap-1.5">
                <Label>Cada cuánto</Label>
                <Select value={freq} onValueChange={(v) => setFreq(v ?? '7')} items={FRECUENCIA_ITEMS}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FRECUENCIAS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Días plantines</Label>
              <Input type="number" min={1} value={dp} onChange={(e) => setDp(parseInt(e.target.value, 10) || 1)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Días engorda</Label>
              <Input type="number" min={1} value={de} onChange={(e) => setDe(parseInt(e.target.value, 10) || 1)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Días adulto</Label>
              <Input type="number" min={1} value={da} onChange={(e) => setDa(parseInt(e.target.value, 10) || 1)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Notas</Label>
            <Textarea rows={2} placeholder="Observaciones..." value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={!puedeGuardar}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PeriodicidadButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  );
}
