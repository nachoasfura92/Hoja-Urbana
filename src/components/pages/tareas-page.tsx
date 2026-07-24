'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Droplets,
  Flag,
  Pencil,
  RefreshCw,
  Sprout,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/dashboard/date-picker';
import { TareaModal } from '@/components/modals/tarea-modal';
import { CalibracionModal, type CalibracionTarget } from '@/components/modals/calibracion-modal';
import { ResumenRegistroDialog, type ResumenRegistro } from '@/components/modals/resumen-registro-dialog';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useModals } from '@/lib/greenhouse/modals-context';
import { useCurrentUser } from '@/lib/auth/current-user-context';
import {
  confirmarSiembra,
  deleteLote,
  deletePlanItem,
  ejecutarMovimiento,
  posponerSiembra,
  posponerTraspaso,
  registrarRecambioAgua,
} from '@/lib/greenhouse/actions';
import { estanqueNombre, fd, fracTubosStr, hoy, varLabelPorId } from '@/lib/greenhouse/helpers';
import { bancalLabel, calcularTareasHoy, type TareaHoy } from '@/lib/greenhouse/tareas';
import { cn } from '@/lib/utils';

type FiltroTipo = 'todas' | 'siembra' | 'trasplante' | 'nutricion';

const FILTRO_ITEMS: Record<FiltroTipo, string> = {
  todas: 'Todas',
  siembra: 'Siembra',
  trasplante: 'Trasplantes',
  nutricion: 'Nutrición',
};

function filtrarPorTipo(lista: TareaHoy[], filtro: FiltroTipo): TareaHoy[] {
  if (filtro === 'todas') return lista;
  if (filtro === 'siembra') return lista.filter((t) => t.tipo === 'sembrar');
  if (filtro === 'nutricion')
    return lista.filter((t) => t.tipo === 'medicion_ph' || t.tipo === 'medicion_ec' || t.tipo === 'recambio_agua');
  return lista.filter((t) => t.tipo === 'traspaso_engorda' || t.tipo === 'traspaso_adulto');
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
  const [posponiendo, setPosponiendo] = useState<TareaHoy | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState(hoy());
  const [eliminando, setEliminando] = useState<TareaHoy | null>(null);
  const [calibrando, setCalibrando] = useState<CalibracionTarget | null>(null);
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

  function ejecutarRecambio(t: TareaHoy) {
    update((draft) => registrarRecambioAgua(draft, { estanqueId: t.estanqueId!, fecha: hoy(), autor }));
  }

  // "Completar" con los valores sugeridos ejecuta directo solo si la tarea es
  // de hoy; si es de otro día (vencida o de mañana) pide confirmación con un
  // resumen antes de registrar (igual que cuando se edita la tarea).
  function completar(t: TareaHoy) {
    if (t.tipo === 'medicion_ph' || t.tipo === 'medicion_ec') {
      setCalibrando({ estanqueId: t.estanqueId!, tipo: t.tipo === 'medicion_ph' ? 'ph' : 'ec' });
      return;
    }
    if (t.tipo === 'recambio_agua') {
      if (t.diasRestantes === 0) {
        ejecutarRecambio(t);
        return;
      }
      setResumen({
        titulo: `Confirmar recambio de agua — ${estanqueNombre(t.estanqueId!)}`,
        filas: [
          { label: 'Estanque', value: estanqueNombre(t.estanqueId!) },
          { label: 'Fecha', value: fd(hoy()) },
        ],
        ejecutar: () => ejecutarRecambio(t),
      });
      return;
    }
    if (t.diasRestantes === 0) {
      if (t.tipo === 'sembrar') ejecutarSembrar(t);
      else ejecutarTraspaso(t);
      return;
    }
    if (t.tipo === 'sembrar') {
      setResumen({
        titulo: `Confirmar siembra — ${varLabelPorId(state.vars, t.varId)}`,
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
          : `Confirmar traspaso a adulto — ${varLabelPorId(state.vars, t.varId)}`,
      filas: [
        { label: 'Variedad', value: varLabelPorId(state.vars, t.varId) },
        { label: 'Cantidad', value: `${t.cantidadSugerida} plantas (${fracTubosStr(t.cantidadSugerida)} tubos)` },
        { label: 'Fecha', value: fd(hoy()) },
        { label: 'Bancal destino', value: bancalLabel(t.bancalSugerido) },
      ],
      ejecutar: () => ejecutarTraspaso(t),
    });
  }

  function abrirPosponer(t: TareaHoy) {
    setNuevaFecha(hoy());
    setPosponiendo(t);
  }

  function confirmarPosponer() {
    if (!posponiendo) return;
    update((draft) => {
      if (posponiendo.tipo === 'sembrar') {
        posponerSiembra(draft, { planId: posponiendo.planId!, nuevaFecha, autor });
      } else {
        posponerTraspaso(draft, {
          loteId: posponiendo.loteId!,
          campo: posponiendo.tipo === 'traspaso_engorda' ? 'dp' : 'de',
          nuevaFecha,
          autor,
        });
      }
    });
    setPosponiendo(null);
  }

  function confirmarEliminar() {
    if (!eliminando) return;
    update((draft) => {
      if (eliminando.tipo === 'sembrar') deletePlanItem(draft, eliminando.planId!);
      else deleteLote(draft, eliminando.loteId!);
    });
    setEliminando(null);
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
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
          titulo="Tareas pendientes"
          tareas={filtrarPorTipo(tareasPendientes, filtroPendientes)}
          total={tareasPendientes.length}
          filtro={filtroPendientes}
          onFiltro={setFiltroPendientes}
          onCompletar={completar}
          onEditar={setEditando}
          onVerLote={openLote}
          onPosponer={abrirPosponer}
          onEliminar={setEliminando}
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
      <CalibracionModal target={calibrando} onClose={() => setCalibrando(null)} />
      <ResumenRegistroDialog resumen={resumen} onClose={() => setResumen(null)} />

      <Dialog open={!!posponiendo} onOpenChange={(o) => !o && setPosponiendo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modificar fecha de la tarea</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label>Nueva fecha objetivo</Label>
            <DatePicker value={nuevaFecha} onChange={setNuevaFecha} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPosponiendo(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarPosponer}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!eliminando} onOpenChange={(o) => !o && setEliminando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar tarea vencida</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {eliminando?.tipo === 'sembrar'
              ? 'Se eliminará por completo este ítem del plan de siembra (no solo la tarea de hoy): dejará de generar nuevas tareas de siembra.'
              : 'Se eliminará el lote asociado a esta tarea de traspaso, junto con su historial.'}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEliminando(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarEliminar}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  onPosponer,
  onEliminar,
}: {
  titulo: string;
  tareas: TareaHoy[];
  total: number;
  filtro: FiltroTipo;
  onFiltro: (f: FiltroTipo) => void;
  onCompletar: (t: TareaHoy) => void;
  onEditar: (t: TareaHoy) => void;
  onVerLote: (id: number) => void;
  onPosponer?: (t: TareaHoy) => void;
  onEliminar?: (t: TareaHoy) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', !open && '-rotate-90')} />
          {titulo}
          {total > 0 && <span className="text-xs font-normal text-muted-foreground">({total})</span>}
        </button>
        <Select value={filtro} onValueChange={(v) => onFiltro((v as FiltroTipo) ?? 'todas')} items={FILTRO_ITEMS}>
          <SelectTrigger className="h-7 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="siembra">Siembra</SelectItem>
            <SelectItem value="trasplante">Trasplantes</SelectItem>
            <SelectItem value="nutricion">Nutrición</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      {open && (
        <CardContent className="grid gap-2">
          {tareas.length ? (
            tareas.map((t) => (
              <TareaCard
                key={t.id}
                tarea={t}
                onCompletar={onCompletar}
                onEditar={onEditar}
                onVerLote={onVerLote}
                onPosponer={onPosponer}
                onEliminar={onEliminar}
              />
            ))
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-8 text-center">
              <CheckCircle2 className="size-6 text-success" />
              <p className="text-sm text-muted-foreground">Sin tareas.</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function TareaCard({
  tarea: t,
  onCompletar,
  onEditar,
  onVerLote,
  onPosponer,
  onEliminar,
}: {
  tarea: TareaHoy;
  onCompletar: (t: TareaHoy) => void;
  onEditar: (t: TareaHoy) => void;
  onVerLote: (id: number) => void;
  onPosponer?: (t: TareaHoy) => void;
  onEliminar?: (t: TareaHoy) => void;
}) {
  const { state } = useGreenhouse();
  const varLabelTarea = varLabelPorId(state.vars, t.varId);
  const esNutricion = t.tipo === 'medicion_ph' || t.tipo === 'medicion_ec' || t.tipo === 'recambio_agua';
  const sinEspacio = (t.tipo === 'traspaso_engorda' || t.tipo === 'traspaso_adulto') && !t.bancalSugerido;

  const contenido = (
    <div className="flex items-start gap-2.5">
      {t.tipo === 'sembrar' && <Sprout className="mt-0.5 size-4 shrink-0 text-success" />}
      {(t.tipo === 'traspaso_engorda' || t.tipo === 'traspaso_adulto') && (
        <ArrowRightLeft className="mt-0.5 size-4 shrink-0 text-primary" />
      )}
      {(t.tipo === 'medicion_ph' || t.tipo === 'medicion_ec') && <Droplets className="mt-0.5 size-4 shrink-0 text-primary" />}
      {t.tipo === 'recambio_agua' && <RefreshCw className="mt-0.5 size-4 shrink-0 text-primary" />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
          {t.tipo === 'sembrar' && `Sembrar ${varLabelTarea}`}
          {t.tipo === 'traspaso_engorda' && (
            <>
              Traspasar lote
              <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[11px] font-medium text-warning">
                <Flag className="size-3" fill="currentColor" />
                {t.bandera}
              </span>
              ({varLabelTarea}) a engorda
            </>
          )}
          {t.tipo === 'traspaso_adulto' && `Traspasar ${varLabelTarea} (${bancalLabel(t.bancalOrigen ?? null)}) a adulto`}
          {t.tipo === 'medicion_ph' && `Medir pH — ${estanqueNombre(t.estanqueId!)}`}
          {t.tipo === 'medicion_ec' && `Medir EC — ${estanqueNombre(t.estanqueId!)}`}
          {t.tipo === 'recambio_agua' && `Recambio de agua — ${estanqueNombre(t.estanqueId!)}`}
          <EstadoBadge dias={t.diasRestantes} />
        </div>
        {!esNutricion && (
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tabular-nums leading-none">{t.cantidadSugerida.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">plantas · {fracTubosStr(t.cantidadSugerida)} tubos</span>
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          {t.tipo === 'sembrar' && <>Bandera sugerida N° {t.banderaSugerida}</>}
          {(t.tipo === 'traspaso_engorda' || t.tipo === 'traspaso_adulto') && (
            <>Destino sugerido: {sinEspacio ? 'sin bancal con espacio libre' : bancalLabel(t.bancalSugerido ?? null)}</>
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
            {t.tipo === 'medicion_ph' || t.tipo === 'medicion_ec' ? 'Registrar' : 'Completar'}
          </Button>
          {!esNutricion && (
            <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => onEditar(t)}>
              <Pencil className="size-3.5" />
              Editar
            </Button>
          )}
          {!esNutricion && t.diasRestantes < 0 && onPosponer && (
            <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => onPosponer(t)}>
              <CalendarClock className="size-3.5" />
              Modificar fecha
            </Button>
          )}
          {!esNutricion && t.diasRestantes < 0 && onEliminar && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => onEliminar(t)}
            >
              <Trash2 className="size-3.5" />
              Eliminar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
