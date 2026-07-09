'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertRow } from '@/components/dashboard/alert-row';
import { DatePicker } from '@/components/dashboard/date-picker';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useModals } from '@/lib/greenhouse/modals-context';
import { useCurrentUser } from '@/lib/auth/current-user-context';
import { ejecutarMovimiento, moverEntreBancales, type EjecutarMovimientoParams } from '@/lib/greenhouse/actions';
import { fracTubosStr, getBanc, hoy, maxPlantas, plantasEnBanc } from '@/lib/greenhouse/helpers';
import type { Etapa } from '@/lib/greenhouse/types';

const SIGUIENTE: Partial<Record<Etapa, Etapa>> = { plantines: 'engorda', engorda: 'adulto' };

export function MoverModal() {
  const { state, update } = useGreenhouse();
  const { moverId, closeMover } = useModals();
  const { displayName, email } = useCurrentUser();
  const autor = displayName || email || undefined;
  const lote = moverId != null ? state.lotes.find((l) => l.id === moverId) : null;

  const [fecha, setFecha] = useState(hoy());
  const [bancKey, setBancKey] = useState('');
  const [plantas, setPlantas] = useState(0);
  const [nota, setNota] = useState('');
  const [errorBancal, setErrorBancal] = useState(false);
  const [pending, setPending] = useState<EjecutarMovimientoParams | null>(null);

  // Reinicializa el formulario cuando se abre un lote distinto (patrón
  // "ajustar estado durante el render" recomendado por React en vez de un
  // efecto, ya que evita un ciclo extra de render).
  const [lastLoteId, setLastLoteId] = useState<number | null>(null);
  if (lote && lote.id !== lastLoteId) {
    setLastLoteId(lote.id);
    setFecha(hoy());
    setBancKey('');
    setPlantas(lote.plantasRestantes);
    setNota('');
    setErrorBancal(false);
  }

  // Lotes adultos ya no cambian de etapa: "Mover" pasa a significar
  // "reubicar a otro bancal de adulto" en vez de avanzar de etapa.
  const modoReubicar = lote?.etapa === 'adulto';
  const sig = lote ? SIGUIENTE[lote.etapa] : undefined;

  const opciones = useMemo(() => {
    if (!lote) return [];
    const tipo = modoReubicar ? 'adu' : sig === 'engorda' ? 'eng' : 'adu';
    const maxBanc = modoReubicar ? 16 : sig === 'engorda' ? 9 : 16;
    return Array.from({ length: maxBanc }, (_, idx) => {
      const i = idx + 1;
      const k = `${tipo}_${i}`;
      if (modoReubicar && k === lote.bancalId) return null;
      const usP = plantasEnBanc(state.bancales, k);
      const libP = maxPlantas(k) - usP;
      const slots = getBanc(state.bancales, k);
      const detalle = slots.length ? slots.map((s) => `${s.varNom}×${s.plantas}pl`).join(', ') : 'vacío';
      return {
        key: k,
        label: `${tipo === 'eng' ? 'E' : 'A'}${i} — ${fracTubosStr(libP)} tubos libres (${detalle})`,
        libP,
        disabled: libP <= 0,
      };
    }).filter((o): o is NonNullable<typeof o> => o !== null);
  }, [lote, modoReubicar, sig, state.bancales]);

  const bancalItems = useMemo(() => Object.fromEntries(opciones.map((o) => [o.key, o.label])), [opciones]);

  if (!lote) {
    return <Dialog open={false} onOpenChange={() => closeMover()} />;
  }
  if (!modoReubicar && !sig) return null;

  const obligatorio = modoReubicar || lote.etapa === 'plantines';

  const libreSeleccionado = bancKey ? opciones.find((o) => o.key === bancKey)?.libP ?? null : null;
  const excedeCapacidad = bancKey && libreSeleccionado !== null && plantas > libreSeleccionado;

  function handleConfirmar() {
    if (obligatorio && !bancKey) {
      setErrorBancal(true);
      return;
    }
    const fechaMov = fecha || hoy();
    const plantasM = Math.min(plantas || lote!.plantasRestantes, lote!.plantasRestantes);
    if (bancKey) {
      const libP = maxPlantas(bancKey) - plantasEnBanc(state.bancales, bancKey);
      if (plantasM > libP) {
        alert(`Solo hay espacio para ${libP} plantas en ese bancal.`);
        return;
      }
    }

    if (modoReubicar) {
      update((draft) =>
        moverEntreBancales(draft, { loteId: lote!.id, bancDestino: bancKey, plantasM, fecha: fechaMov, nota, autor })
      );
      closeMover();
      return;
    }

    const restantes = lote!.plantasRestantes - plantasM;
    const params: EjecutarMovimientoParams = {
      loteId: lote!.id,
      sig: sig!,
      fechaMov,
      bancKey: bancKey || null,
      plantasM,
      nota,
      restantes,
      etapaAnt: lote!.etapa,
      mermaRes: null,
      autor,
    };
    if (restantes > 0) {
      setPending(params);
    } else {
      update((draft) => ejecutarMovimiento(draft, params));
      closeMover();
    }
  }

  function resolverMerma(tipoRes: 'merma' | 'pendiente') {
    if (!pending) return;
    update((draft) => ejecutarMovimiento(draft, { ...pending, mermaRes: tipoRes }));
    setPending(null);
    closeMover();
  }

  return (
    <>
      <Dialog open={!pending && moverId != null} onOpenChange={(o) => !o && closeMover()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modoReubicar ? `${lote.varNom}: mover a otro bancal` : `${lote.varNom}: ${lote.etapa} → ${sig}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="rounded-md bg-muted/60 px-3 py-2 text-sm">
              Plantas disponibles: <strong>{lote.plantasRestantes}</strong> ({fracTubosStr(lote.plantasRestantes)} tubos)
              {modoReubicar && (
                <>
                  <br />
                  Bancal actual: <strong>{lote.bancalId || 'sin asignar'}</strong>
                </>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Fecha del movimiento</Label>
              <DatePicker value={fecha} onChange={setFecha} />
            </div>
            <div className="grid gap-1.5">
              <Label>
                Bancal destino {obligatorio && <span className="text-destructive">* obligatorio</span>}
              </Label>
              <Select
                value={bancKey}
                onValueChange={(v) => {
                  setBancKey(v ?? '');
                  setErrorBancal(false);
                }}
                items={bancalItems}
              >
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
              {errorBancal && <p className="text-xs text-destructive">Debes seleccionar un bancal.</p>}
            </div>
            <div className="grid gap-1.5">
              <Label>Plantas a mover (máx. {lote.plantasRestantes})</Label>
              <Input
                type="number"
                min={1}
                max={lote.plantasRestantes}
                value={plantas}
                onChange={(e) => setPlantas(parseInt(e.target.value, 10) || 0)}
              />
              <p className="text-xs text-muted-foreground">{fracTubosStr(plantas)} tubos equivalentes</p>
            </div>
            {excedeCapacidad && (
              <AlertRow kind="danger" icon={AlertTriangle}>
                Solo {libreSeleccionado} plantas caben en ese bancal ({fracTubosStr(libreSeleccionado!)} tubos).
              </AlertRow>
            )}
            <div className="grid gap-1.5">
              <Label>Notas</Label>
              <Input placeholder="Ej: adelantado por buen crecimiento" value={nota} onChange={(e) => setNota(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeMover}>
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
