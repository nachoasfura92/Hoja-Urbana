'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/dashboard/date-picker';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { editarMedicionNutricion, eliminarMedicionNutricion } from '@/lib/greenhouse/actions';
import { estanqueNombre } from '@/lib/greenhouse/helpers';
import type { MedicionNutricion } from '@/lib/greenhouse/types';

// Editar o eliminar un registro de calibración ya guardado (pH o EC, según
// su propio tipo, que no cambia). Mismos campos que al registrarlo, pero sin
// el paso de "sugerencia" — acá solo se corrige lo que ya quedó guardado.
export function EditarMedicionModal({ medicion, onClose }: { medicion: MedicionNutricion | null; onClose: () => void }) {
  const { update } = useGreenhouse();

  const [fecha, setFecha] = useState('');
  const [litros, setLitros] = useState(0);
  const [mlAcido, setMlAcido] = useState('');
  const [gramosA, setGramosA] = useState('');
  const [gramosB, setGramosB] = useState('');
  const [valorFinal, setValorFinal] = useState('');
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

  // Reinicializa el formulario cuando se abre un registro distinto (patrón
  // "ajustar estado durante el render" en vez de un efecto).
  const [lastId, setLastId] = useState<number | null>(null);
  if (medicion && medicion.id !== lastId) {
    setLastId(medicion.id);
    setFecha(medicion.fecha);
    setLitros(medicion.litros);
    setMlAcido(medicion.mlAcidoPor1L != null ? String(medicion.mlAcidoPor1L) : '');
    setGramosA(medicion.gramosAPor1L != null ? String(medicion.gramosAPor1L) : '');
    setGramosB(medicion.gramosBPor1L != null ? String(medicion.gramosBPor1L) : '');
    setValorFinal(medicion.tipo === 'ph' ? String(medicion.ph ?? '') : String(medicion.ec ?? ''));
    setConfirmandoEliminar(false);
  }

  if (!medicion) {
    return <Dialog open={false} onOpenChange={() => onClose()} />;
  }

  const esPh = medicion.tipo === 'ph';
  const puedeGuardar = litros > 0 && valorFinal !== '';

  function handleGuardar() {
    if (!puedeGuardar || !medicion) return;
    update((draft) =>
      editarMedicionNutricion(draft, {
        id: medicion.id,
        fecha,
        litros,
        ph: esPh ? parseFloat(valorFinal) : undefined,
        ec: esPh ? undefined : parseFloat(valorFinal),
        mlAcidoPor1L: mlAcido ? parseFloat(mlAcido) : undefined,
        gramosAPor1L: gramosA ? parseFloat(gramosA) : undefined,
        gramosBPor1L: gramosB ? parseFloat(gramosB) : undefined,
      })
    );
    onClose();
  }

  function handleEliminar() {
    if (!medicion) return;
    update((draft) => eliminarMedicionNutricion(draft, medicion.id));
    onClose();
  }

  return (
    <>
      <Dialog open={!!medicion && !confirmandoEliminar} onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Editar {esPh ? 'pH' : 'EC'} — {estanqueNombre(medicion.estanqueId)}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Fecha</Label>
                <DatePicker value={fecha} onChange={setFecha} />
              </div>
              <div className="grid gap-1.5">
                <Label>Litros en el estanque</Label>
                <Input type="number" min={1} value={litros} onChange={(e) => setLitros(parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            {esPh ? (
              <div className="grid gap-1.5">
                <Label>Ác. fosfórico (ml/1L)</Label>
                <Input type="number" min={0} step="0.1" value={mlAcido} onChange={(e) => setMlAcido(e.target.value)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Polvo A — Blanca (g/1L)</Label>
                  <Input type="number" min={0} step="0.1" value={gramosA} onChange={(e) => setGramosA(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Polvo B — Café (g/1L)</Label>
                  <Input type="number" min={0} step="0.1" value={gramosB} onChange={(e) => setGramosB(e.target.value)} />
                </div>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label>{esPh ? 'pH final medido' : 'EC final medida (mS/cm)'}</Label>
              <Input type="number" min={0} step="0.1" value={valorFinal} onChange={(e) => setValorFinal(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button variant="destructive" onClick={() => setConfirmandoEliminar(true)}>
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleGuardar} disabled={!puedeGuardar}>
                Guardar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmandoEliminar} onOpenChange={(o) => !o && setConfirmandoEliminar(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar este registro?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se va a borrar esta medición de {esPh ? 'pH' : 'EC'} del historial de {estanqueNombre(medicion.estanqueId)}.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmandoEliminar(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleEliminar}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
