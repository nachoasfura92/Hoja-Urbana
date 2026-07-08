'use client';

import { useMemo, useState } from 'react';
import { ArrowRightLeft, CheckCircle2, ClipboardCheck, Flag, Pencil, Sprout } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TareaModal } from '@/components/modals/tarea-modal';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useCurrentUser } from '@/lib/auth/current-user-context';
import { confirmarSiembra, ejecutarMovimiento } from '@/lib/greenhouse/actions';
import { fracTubosStr, hoy } from '@/lib/greenhouse/helpers';
import { bancalLabel, calcularTareasHoy, type TareaHoy } from '@/lib/greenhouse/tareas';

function EstadoBadge({ dias }: { dias: number }) {
  if (dias < 0) {
    return (
      <Badge variant="outline" className="border-transparent bg-destructive/10 text-destructive">
        Vencida hace {Math.abs(dias)}d
      </Badge>
    );
  }
  if (dias === 0) {
    return (
      <Badge variant="outline" className="border-transparent bg-warning/10 text-warning">
        Hoy
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-transparent bg-accent text-accent-foreground">
      Mañana
    </Badge>
  );
}

export function TareasPage() {
  const { state, update } = useGreenhouse();
  const { displayName, email } = useCurrentUser();
  const autor = displayName || email || undefined;
  const [editando, setEditando] = useState<TareaHoy | null>(null);

  const tareas = useMemo(() => calcularTareasHoy(state), [state]);

  function completar(t: TareaHoy) {
    if (t.tipo === 'sembrar') {
      update((draft) =>
        confirmarSiembra(draft, {
          vId: t.varId,
          varNombre: t.varNom,
          plantas: t.cantidadSugerida,
          fechaSiembra: hoy(),
          dp: t.dp!,
          de: t.de!,
          da: t.da!,
          notas: '',
          bandera: t.banderaSugerida!,
          autor,
        })
      );
      return;
    }
    const lote = state.lotes.find((l) => l.id === t.loteId);
    if (!lote || !t.bancalSugerido) return;
    update((draft) =>
      ejecutarMovimiento(draft, {
        loteId: lote.id,
        sig: t.etapaDestino!,
        fechaMov: hoy(),
        bancKey: t.bancalSugerido!,
        plantasM: lote.plantasRestantes,
        nota: '',
        restantes: 0,
        etapaAnt: lote.etapa,
        mermaRes: null,
        autor,
      })
    );
  }

  if (!tareas.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <CheckCircle2 className="size-8 text-success" />
          <p className="text-sm text-muted-foreground">Sin tareas pendientes para hoy o mañana.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-2">
        {tareas.map((t) => {
          const sinEspacio = t.tipo !== 'sembrar' && !t.bancalSugerido;
          return (
            <Card key={t.id} className="py-0">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-start gap-2.5">
                  {t.tipo === 'sembrar' ? (
                    <Sprout className="mt-0.5 size-4 shrink-0 text-success" />
                  ) : (
                    <ArrowRightLeft className="mt-0.5 size-4 shrink-0 text-primary" />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                      {t.tipo === 'sembrar' && `Sembrar ${t.varNom}`}
                      {t.tipo === 'traspaso_engorda' && (
                        <>
                          Traspasar lote
                          <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[11px] font-medium text-warning">
                            <Flag className="size-3" fill="currentColor" />
                            {t.bandera}
                          </span>
                          ({t.varNom}) a engorda
                        </>
                      )}
                      {t.tipo === 'traspaso_adulto' && `Traspasar ${t.varNom} (${bancalLabel(t.bancalOrigen ?? null)}) a adulto`}
                      <EstadoBadge dias={t.diasRestantes} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t.cantidadSugerida} plantas · {fracTubosStr(t.cantidadSugerida)} tubos
                      {t.tipo === 'sembrar' && (
                        <>
                          {' '}
                          · bandera sugerida N° {t.banderaSugerida}
                        </>
                      )}
                      {t.tipo !== 'sembrar' && (
                        <>
                          {' '}
                          · destino sugerido: {sinEspacio ? 'sin bancal con espacio libre' : bancalLabel(t.bancalSugerido ?? null)}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={sinEspacio}
                    title={sinEspacio ? 'No hay bancales con espacio — edita para elegir uno con capacidad parcial' : undefined}
                    onClick={() => completar(t)}
                  >
                    <ClipboardCheck className="size-3.5" />
                    Completar
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => setEditando(t)}>
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <TareaModal tarea={editando} onClose={() => setEditando(null)} />
    </>
  );
}
