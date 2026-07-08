'use client';

import { useMemo, useState } from 'react';
import { Flag } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/dashboard/date-picker';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useCurrentUser } from '@/lib/auth/current-user-context';
import { confirmarSiembra, ejecutarMovimiento, type EjecutarMovimientoParams } from '@/lib/greenhouse/actions';
import { PT } from '@/lib/greenhouse/constants';
import { fracTubosStr, getBanc, hoy, plantasEnBanc } from '@/lib/greenhouse/helpers';
import { bancalLabel, type TareaHoy } from '@/lib/greenhouse/tareas';

export function TareaModal({ tarea, onClose }: { tarea: TareaHoy | null; onClose: () => void }) {
  const { state, update } = useGreenhouse();
  const { displayName, email } = useCurrentUser();
  const autor = displayName || email || undefined;

  const [fecha, setFecha] = useState(hoy());
  const [cantidad, setCantidad] = useState(0);
  const [bandera, setBandera] = useState(0);
  const [bancKey, setBancKey] = useState('');
  const [pending, setPending] = useState<EjecutarMovimientoParams | null>(null);

  // Reinicializa el formulario cuando se abre una tarea distinta (patrón
  // "ajustar estado durante el render" en vez de un efecto).
  const [lastTareaId, setLastTareaId] = useState<string | null>(null);
  if (tarea && tarea.id !== lastTareaId) {
    setLastTareaId(tarea.id);
    setFecha(hoy());
    setCantidad(tarea.cantidadSugerida);
    setBandera(tarea.banderaSugerida || 0);
    setBancKey(tarea.bancalSugerido || '');
  }

  const esSiembra = tarea?.tipo === 'sembrar';
  const tipoBancal = tarea?.tipo === 'traspaso_engorda' ? 'eng' : 'adu';
  const maxBanc = tipoBancal === 'eng' ? 8 : 16;
  const maxP = tipoBancal === 'eng' ? 20 * PT : 10 * PT;

  const opciones = useMemo(() => {
    if (!tarea || esSiembra) return [];
    return Array.from({ length: maxBanc }, (_, idx) => {
      const i = idx + 1;
      const k = `${tipoBancal}_${i}`;
      const usP = plantasEnBanc(state.bancales, k);
      const libP = maxP - usP;
      const slots = getBanc(state.bancales, k);
      const detalle = slots.length ? slots.map((s) => `${s.varNom}×${s.plantas}pl`).join(', ') : 'vacío';
      return {
        key: k,
        label: `${tipoBancal === 'eng' ? 'E' : 'A'}${i} — ${fracTubosStr(libP)} tubos libres (${detalle})`,
        libP,
        disabled: libP <= 0,
      };
    });
  }, [tarea, esSiembra, tipoBancal, maxBanc, maxP, state.bancales]);

  const bancalItems = useMemo(() => Object.fromEntries(opciones.map((o) => [o.key, o.label])), [opciones]);

  if (!tarea) {
    return <Dialog open={false} onOpenChange={() => onClose()} />;
  }

  const loteActual = tarea.loteId != null ? state.lotes.find((l) => l.id === tarea.loteId) : null;
  const maxCantidad = esSiembra ? undefined : loteActual?.plantasRestantes;

  function handleConfirmar() {
    if (esSiembra) {
      const cant = cantidad || tarea!.cantidadSugerida;
      update((draft) =>
        confirmarSiembra(draft, {
          vId: tarea!.varId,
          varNombre: tarea!.varNom,
          plantas: cant,
          fechaSiembra: fecha,
          dp: tarea!.dp!,
          de: tarea!.de!,
          da: tarea!.da!,
          notas: '',
          bandera: bandera || tarea!.banderaSugerida || 1,
          autor,
        })
      );
      onClose();
      return;
    }

    if (!loteActual) {
      onClose();
      return;
    }
    if (!bancKey) {
      alert('Selecciona un bancal destino.');
      return;
    }
    const plantasM = Math.min(cantidad || loteActual.plantasRestantes, loteActual.plantasRestantes);
    const libP = maxP - plantasEnBanc(state.bancales, bancKey);
    if (plantasM > libP) {
      alert(`Solo hay espacio para ${libP} plantas en ese bancal.`);
      return;
    }
    const restantes = loteActual.plantasRestantes - plantasM;
    const params: EjecutarMovimientoParams = {
      loteId: loteActual.id,
      sig: tarea!.etapaDestino!,
      fechaMov: fecha,
      bancKey,
      plantasM,
      nota: '',
      restantes,
      etapaAnt: loteActual.etapa,
      mermaRes: null,
      autor,
    };
    if (restantes > 0) {
      setPending(params);
    } else {
      update((draft) => ejecutarMovimiento(draft, params));
      onClose();
    }
  }

  function resolverMerma(tipoRes: 'merma' | 'pendiente') {
    if (!pending) return;
    update((draft) => ejecutarMovimiento(draft, { ...pending, mermaRes: tipoRes }));
    setPending(null);
    onClose();
  }

  const titulo = esSiembra
    ? `Sembrar ${tarea.varNom}`
    : tarea.tipo === 'traspaso_engorda'
      ? `Traspasar bandera N°${tarea.bandera} (${tarea.varNom}) a engorda`
      : `Traspasar ${tarea.varNom} a adulto`;

  return (
    <>
      <Dialog open={!!tarea && !pending} onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Fecha</Label>
              <DatePicker value={fecha} onChange={setFecha} />
            </div>
            <div className="grid gap-1.5">
              <Label>
                {esSiembra ? 'Cantidad real sembrada' : 'Cantidad real traspasada'}
                {maxCantidad != null ? ` (máx. ${maxCantidad})` : ''}
              </Label>
              <Input
                type="number"
                min={1}
                max={maxCantidad}
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value, 10) || 0)}
              />
              <p className="text-xs text-muted-foreground">{fracTubosStr(cantidad)} tubos equivalentes</p>
            </div>
            {esSiembra && (
              <div className="grid gap-1.5">
                <Label className="flex items-center gap-1">
                  <Flag className="size-3" />
                  N° de bandera
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={bandera}
                  onChange={(e) => setBandera(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            )}
            {!esSiembra && (
              <div className="grid gap-1.5">
                <Label>Bancal destino</Label>
                <Select value={bancKey} onValueChange={(v) => setBancKey(v ?? '')} items={bancalItems}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="-- Selecciona bancal --" />
                  </SelectTrigger>
                  <SelectContent>
                    {opciones.map((o) => (
                      <SelectItem key={o.key} value={o.key} disabled={o.disabled}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Sugerido: {bancalLabel(tarea.bancalSugerido ?? null)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmar}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Qué pasó con las plantas restantes?</DialogTitle>
          </DialogHeader>
          {pending && (
            <p className="text-sm">
              Se moverán <strong>{pending.plantasM} plantas ({fracTubosStr(pending.plantasM)} tubos)</strong>.
              <br />
              Quedan <strong>{pending.restantes} plantas ({fracTubosStr(pending.restantes)} tubos)</strong> sin mover.
            </p>
          )}
          <DialogFooter>
            <Button variant="destructive" onClick={() => resolverMerma('merma')}>
              Son merma
            </Button>
            <Button onClick={() => resolverMerma('pendiente')}>Quedan pendientes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
