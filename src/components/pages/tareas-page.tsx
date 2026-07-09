'use client';

import { useMemo, useState } from 'react';
import { ArrowRightLeft, CheckCircle2, ClipboardCheck, Flag, Pencil, Sprout } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TareaModal } from '@/components/modals/tarea-modal';
import { ResumenRegistroDialog, type ResumenRegistro } from '@/components/modals/resumen-registro-dialog';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useModals } from '@/lib/greenhouse/modals-context';
import { useCurrentUser } from '@/lib/auth/current-user-context';
import { confirmarSiembra, ejecutarMovimiento } from '@/lib/greenhouse/actions';
import { fd, fracTubosStr, hoy } from '@/lib/greenhouse/helpers';
import { bancalLabel, calcularTareasHoy, type TareaHoy } from '@/lib/greenhouse/tareas';

type FiltroTipo = 'todas' | 'siembra' | 'trasplante';

const FILTRO_ITEMS: Record<FiltroTipo, string> = { todas: 'Todas', siembra: 'Siembra', trasplante: 'Trasplantes' };

function filtrarPorTipo(lista: TareaHoy[], filtro: FiltroTipo): TareaHoy[] {
  if (filtro === 'todas') return lista;
  if (filtro === 'siembra') return lista.filter((t) => t.tipo === 'sembrar');
  return lista.filter((t) => t.tipo !== 'sembrar');
}

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
  const { openLote } = useModals();
  const { displayName, email } = useCurrentUser();
  const autor = displayName || email || undefined;
  const [editando, setEditando] = useState<TareaHoy | null>(null);
  const [resumen, setResumen] = useState<ResumenRegistro | null>(null);
  const [filtroPendientes, setFiltroPendientes] = useState<FiltroTipo>('todas');
  const [filtroHoy, setFiltroHoy] = useState<FiltroTipo>('todas');
  const [filtroManana, setFiltroManana] = useState<FiltroTipo>('todas');

  const tareas = useMemo(() => calcularTareasHoy(state), [state]);
  const tareasPendientes = tareas.filter((t) => t.diasRestantes < 0);
  const tareasHoy = tareas.filter((t) => t.diasRestantes === 0);
  const tareasManana = tareas.filter((t) => t.diasRestantes === 1);

  function ejecutarSembrar(t: TareaHoy) {
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
  }

  function ejecutarTraspaso(t: TareaHoy) {
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

  // "Completar" con los valores sugeridos ejecuta directo solo si la tarea es
  // de hoy; si es de otro día (vencida o de mañana) pide confirmación con un
  // resumen antes de registrar (igual que cuando se edita la tarea).
  function completar(t: TareaHoy) {
    if (t.diasRestantes === 0) {
      if (t.tipo === 'sembrar') ejecutarSembrar(t);
      else ejecutarTraspaso(t);
      return;
    }
    if (t.tipo === 'sembrar') {
      setResumen({
        titulo: `Confirmar siembra — ${t.varNom}`,
        filas: [
          { label: 'Cantidad', value: `${t.cantidadSugerida} plantas (${fracTubosStr(t.cantidadSugerida)} tubos)` },
          { label: 'Fecha', value: fd(hoy()) },
          { label: 'N° de bandera', value: String(t.banderaSugerida) },
        ],
        ejecutar: () => ejecutarSembrar(t),
      });
      return;
    }
    if (!t.bancalSugerido) return;
    setResumen({
      titulo:
        t.tipo === 'traspaso_engorda'
          ? `Confirmar traspaso a engorda — bandera N°${t.bandera}`
          : `Confirmar traspaso a adulto — ${t.varNom}`,
      filas: [
        { label: 'Variedad', value: t.varNom },
        { label: 'Cantidad', value: `${t.cantidadSugerida} plantas (${fracTubosStr(t.cantidadSugerida)} tubos)` },
        { label: 'Fecha', value: fd(hoy()) },
        { label: 'Bancal destino', value: bancalLabel(t.bancalSugerido) },
      ],
      ejecutar: () => ejecutarTraspaso(t),
    });
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        <TareasBox
          titulo="Tareas pendientes"
          tareas={filtrarPorTipo(tareasPendientes, filtroPendientes)}
          total={tareasPendientes.length}
          filtro={filtroPendientes}
          onFiltro={setFiltroPendientes}
          onCompletar={completar}
          onEditar={setEditando}
          onVerLote={openLote}
        />
        <TareasBox
          titulo="Tareas de hoy"
          tareas={filtrarPorTipo(tareasHoy, filtroHoy)}
          total={tareasHoy.length}
          filtro={filtroHoy}
          onFiltro={setFiltroHoy}
          onCompletar={completar}
          onEditar={setEditando}
          onVerLote={openLote}
        />
        <TareasBox
          titulo="Tareas de mañana"
          tareas={filtrarPorTipo(tareasManana, filtroManana)}
          total={tareasManana.length}
          filtro={filtroManana}
          onFiltro={setFiltroManana}
          onCompletar={completar}
          onEditar={setEditando}
          onVerLote={openLote}
        />
      </div>
      <TareaModal tarea={editando} onClose={() => setEditando(null)} />
      <ResumenRegistroDialog resumen={resumen} onClose={() => setResumen(null)} />
    </>
  );
}

function TareasBox({
  titulo,
  tareas,
  total,
  filtro,
  onFiltro,
  onCompletar,
  onEditar,
  onVerLote,
}: {
  titulo: string;
  tareas: TareaHoy[];
  total: number;
  filtro: FiltroTipo;
  onFiltro: (f: FiltroTipo) => void;
  onCompletar: (t: TareaHoy) => void;
  onEditar: (t: TareaHoy) => void;
  onVerLote: (id: number) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm font-medium">
          {titulo}
          {total > 0 && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({total})</span>}
        </CardTitle>
        <Select value={filtro} onValueChange={(v) => onFiltro((v as FiltroTipo) ?? 'todas')} items={FILTRO_ITEMS}>
          <SelectTrigger className="h-7 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="siembra">Siembra</SelectItem>
            <SelectItem value="trasplante">Trasplantes</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="grid gap-2">
        {tareas.length ? (
          tareas.map((t) => (
            <TareaCard key={t.id} tarea={t} onCompletar={onCompletar} onEditar={onEditar} onVerLote={onVerLote} />
          ))
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-8 text-center">
            <CheckCircle2 className="size-6 text-success" />
            <p className="text-sm text-muted-foreground">Sin tareas.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TareaCard({
  tarea: t,
  onCompletar,
  onEditar,
  onVerLote,
}: {
  tarea: TareaHoy;
  onCompletar: (t: TareaHoy) => void;
  onEditar: (t: TareaHoy) => void;
  onVerLote: (id: number) => void;
}) {
  const sinEspacio = t.tipo !== 'sembrar' && !t.bancalSugerido;

  const contenido = (
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
          {t.tipo === 'sembrar' && <> · bandera sugerida N° {t.banderaSugerida}</>}
          {t.tipo !== 'sembrar' && (
            <> · destino sugerido: {sinEspacio ? 'sin bancal con espacio libre' : bancalLabel(t.bancalSugerido ?? null)}</>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Card className="py-0">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        {t.loteId != null ? (
          <button
            type="button"
            onClick={() => onVerLote(t.loteId!)}
            title="Ver historia del lote"
            className="min-w-0 flex-1 rounded-sm text-left transition-opacity hover:opacity-70"
          >
            {contenido}
          </button>
        ) : (
          <div className="min-w-0 flex-1">{contenido}</div>
        )}
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={sinEspacio}
            title={sinEspacio ? 'No hay bancales con espacio — edita para elegir uno con capacidad parcial' : undefined}
            onClick={() => onCompletar(t)}
          >
            <ClipboardCheck className="size-3.5" />
            Completar
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => onEditar(t)}>
            <Pencil className="size-3.5" />
            Editar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
