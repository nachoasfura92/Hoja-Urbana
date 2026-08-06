'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DatePicker } from '@/components/dashboard/date-picker';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useCurrentUser } from '@/lib/auth/current-user-context';
import { registrarMedicionEc, registrarMedicionPh } from '@/lib/greenhouse/actions';
import {
  defaultNutricionConfig,
  ecObjetivoActual,
  esTemporadaVerano,
  estanqueLitrosBase,
  estanqueNombre,
  hoy,
} from '@/lib/greenhouse/helpers';
import type { EstanqueId, TipoMedicionNutricion } from '@/lib/greenhouse/types';

export interface CalibracionTarget {
  estanqueId: EstanqueId;
  tipo: TipoMedicionNutricion;
}

// Calculadora de calibración: pH y EC se calibran en instancias distintas
// (nunca en el mismo registro), cada una con su propia prueba en 1 L — ácido
// fosfórico para pH, polvo A/B para EC. El operador registra cuánto usó en
// esa prueba, y por regla de 3 esta calculadora sugiere cuánto agregar al
// estanque completo. Al final registra el valor ya medido en el estanque (ese
// es el punto que queda en el historial/gráfico).
export function CalibracionModal({ target, onClose }: { target: CalibracionTarget | null; onClose: () => void }) {
  const { state, update } = useGreenhouse();
  const { displayName, email } = useCurrentUser();
  const autor = displayName || email || undefined;
  const config = state.nutricion?.config ?? defaultNutricionConfig();

  const [fecha, setFecha] = useState(hoy());
  const [litros, setLitros] = useState<number | ''>(0);
  const [mlAcido, setMlAcido] = useState('');
  const [gramosA, setGramosA] = useState('');
  const [gramosB, setGramosB] = useState('');
  const [valorFinal, setValorFinal] = useState('');

  // Reinicializa el formulario cuando se abre un estanque/tipo distinto
  // (patrón "ajustar estado durante el render" en vez de un efecto).
  const [lastKey, setLastKey] = useState<string | null>(null);
  const key = target ? `${target.estanqueId}_${target.tipo}` : null;
  if (target && key !== lastKey) {
    setLastKey(key);
    setFecha(hoy());
    setLitros(estanqueLitrosBase(target.estanqueId));
    setMlAcido('');
    // Precarga la dosis estándar de fábrica (ver Nutrición > Objetivos) como
    // punto de partida sugerido para preparar la prueba de 1 L; el operador
    // puede ajustarla si terminó usando otra cantidad.
    setGramosA(target.tipo === 'ec' ? String(config.dosisAPorLitro) : '');
    setGramosB(target.tipo === 'ec' ? String(config.dosisBPorLitro) : '');
    setValorFinal('');
  }

  if (!target) {
    return <Dialog open={false} onOpenChange={() => onClose()} />;
  }

  const esPh = target.tipo === 'ph';
  const mlAcidoNum = mlAcido ? parseFloat(mlAcido) : null;
  const gramosANum = gramosA ? parseFloat(gramosA) : null;
  const gramosBNum = gramosB ? parseFloat(gramosB) : null;
  const mlSugerido = mlAcidoNum != null ? Math.round(mlAcidoNum * (litros || 0) * 100) / 100 : null;
  const gramosASugerido = gramosANum != null ? Math.round(gramosANum * (litros || 0) * 100) / 100 : null;
  const gramosBSugerido = gramosBNum != null ? Math.round(gramosBNum * (litros || 0) * 100) / 100 : null;

  const ecObjetivo = ecObjetivoActual(config, fecha);
  const puedeRegistrar = (litros || 0) > 0 && valorFinal !== '';

  function handleRegistrar() {
    if (!puedeRegistrar || !target) return;
    if (esPh) {
      update((draft) =>
        registrarMedicionPh(draft, {
          estanqueId: target.estanqueId,
          fecha,
          ph: parseFloat(valorFinal),
          litros: litros || 0,
          mlAcidoPor1L: mlAcidoNum ?? undefined,
          autor,
        })
      );
    } else {
      update((draft) =>
        registrarMedicionEc(draft, {
          estanqueId: target.estanqueId,
          fecha,
          ec: parseFloat(valorFinal),
          litros: litros || 0,
          gramosAPor1L: gramosANum ?? undefined,
          gramosBPor1L: gramosBNum ?? undefined,
          autor,
        })
      );
    }
    onClose();
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Calibración de {esPh ? 'pH' : 'EC'} — {estanqueNombre(target.estanqueId)}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            {esPh ? (
              <>Objetivo sugerido: pH {config.phMin}–{config.phMax}</>
            ) : (
              <>
                Objetivo sugerido: EC {ecObjetivo} mS/cm ({esTemporadaVerano(fecha) ? 'temporada verano' : 'temporada invierno'})
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Fecha</Label>
              <DatePicker value={fecha} onChange={setFecha} />
            </div>
            <div className="grid gap-1.5">
              <Label>Litros en el estanque</Label>
              <Input type="number" min={1} value={litros} onChange={(e) => setLitros(e.target.value ? parseFloat(e.target.value) : '')} />
            </div>
          </div>

          <Separator />
          {esPh ? (
            <p className="text-xs text-muted-foreground">
              1. Prueba: agrega ácido fosfórico a <strong>1 litro</strong> de solución hasta llegar al objetivo, y
              registra cuánto usaste.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              1. Prepara <strong>1 litro</strong> de solución de prueba con la dosis estándar sugerida abajo (polvo A —
              Blanca, polvo B — Café); ajusta los gramos si terminaste usando otra cantidad para llegar al objetivo.
            </p>
          )}

          {esPh ? (
            <div className="grid gap-1.5">
              <Label>Ác. fosfórico (ml/1L)</Label>
              <Input type="number" min={0} step="0.1" placeholder="0" value={mlAcido} onChange={(e) => setMlAcido(e.target.value)} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Polvo A — Blanca (g/1L)</Label>
                <Input type="number" min={0} step="0.1" placeholder="0" value={gramosA} onChange={(e) => setGramosA(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Polvo B — Café (g/1L)</Label>
                <Input type="number" min={0} step="0.1" placeholder="0" value={gramosB} onChange={(e) => setGramosB(e.target.value)} />
              </div>
            </div>
          )}

          {(mlSugerido != null || gramosASugerido != null || gramosBSugerido != null) && (
            <div className="grid gap-1 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Agregar al estanque completo ({litros} L)
              </div>
              {mlSugerido != null && (
                <div>
                  Ácido fosfórico: <strong>{mlSugerido} ml</strong>
                </div>
              )}
              {gramosASugerido != null && (
                <div>
                  Polvo A (Blanca): <strong>{gramosASugerido} g</strong>
                </div>
              )}
              {gramosBSugerido != null && (
                <div>
                  Polvo B (Café): <strong>{gramosBSugerido} g</strong>
                </div>
              )}
            </div>
          )}

          <Separator />
          <p className="text-xs text-muted-foreground">
            2. Luego de aplicar la dosis al estanque completo, mide y registra el {esPh ? 'pH' : 'EC'} final.
          </p>
          <div className="grid gap-1.5">
            <Label>{esPh ? 'pH final medido' : 'EC final medida (mS/cm)'}</Label>
            <Input
              type="number"
              min={0}
              step="0.1"
              placeholder={esPh ? 'Ej: 6.0' : 'Ej: 1.8'}
              value={valorFinal}
              onChange={(e) => setValorFinal(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleRegistrar} disabled={!puedeRegistrar}>
            Registrar calibración de {esPh ? 'pH' : 'EC'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
