'use client';

import { useMemo, useState } from 'react';
import { LineChart as LineChartIcon, Minus, Pencil, Plus, X } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { MiniProgress } from '@/components/dashboard/mini-progress';
import { BanderaBadge, BanderaBadges } from '@/components/dashboard/bandera-badge';
import { DatePicker } from '@/components/dashboard/date-picker';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useModals } from '@/lib/greenhouse/modals-context';
import { useCurrentUser } from '@/lib/auth/current-user-context';
import {
  agregarBandera,
  agregarPlantasAjuste,
  editarBandera,
  editarLote,
  editarPauta,
  eliminarBandera,
  eliminarPlantas,
} from '@/lib/greenhouse/actions';
import { banderasEnUso, dd, fd, fracTubosStr, gv, serieNutricionLote, ubicacionLote, varLabel, varLabelPorId } from '@/lib/greenhouse/helpers';
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
  const seriePh = useMemo(
    () => (lote ? serieNutricionLote(lote, state.nutricion.mediciones, 'ph') : []),
    [lote, state.nutricion.mediciones]
  );
  const serieEc = useMemo(
    () => (lote ? serieNutricionLote(lote, state.nutricion.mediciones, 'ec') : []),
    [lote, state.nutricion.mediciones]
  );
  const variedadItems = useMemo(
    () => Object.fromEntries((state.vars || []).map((v) => [String(v.id), varLabel(v)])),
    [state.vars]
  );

  const [eliminarOpen, setEliminarOpen] = useState(false);
  const [plantasEliminar, setPlantasEliminar] = useState<number | ''>(0);
  const [esMerma, setEsMerma] = useState(false);
  const [motivo, setMotivo] = useState('');

  const [agregarOpen, setAgregarOpen] = useState(false);
  const [plantasAgregar, setPlantasAgregar] = useState<number | ''>(0);
  const [notaAgregar, setNotaAgregar] = useState('');

  const [editandoLote, setEditandoLote] = useState(false);
  const [varIdEdit, setVarIdEdit] = useState('');
  const [plantasEdit, setPlantasEdit] = useState<number | ''>(0);
  const [fechaInicioEdit, setFechaInicioEdit] = useState('');

  const [editandoPauta, setEditandoPauta] = useState(false);
  const [dpEdit, setDpEdit] = useState(0);
  const [deEdit, setDeEdit] = useState(0);
  const [daEdit, setDaEdit] = useState(0);

  const [agregandoBandera, setAgregandoBandera] = useState(false);
  const [banderaNueva, setBanderaNueva] = useState<number | ''>('');
  const [editandoBanderaOriginal, setEditandoBanderaOriginal] = useState<number | null>(null);
  const [banderaEditNueva, setBanderaEditNueva] = useState<number | ''>('');

  // Cierra los sub-formularios (eliminar, agregar, editar pauta/bandera) al
  // cambiar de lote (patrón "ajustar estado durante el render" en vez de un
  // efecto).
  const [lastLoteId, setLastLoteId] = useState<number | null>(null);
  if (lote && lote.id !== lastLoteId) {
    setLastLoteId(lote.id);
    setEditandoLote(false);
    setEditandoPauta(false);
    setEliminarOpen(false);
    setAgregarOpen(false);
    setAgregandoBandera(false);
    setEditandoBanderaOriginal(null);
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
  const misBanderas = new Set(lote.banderas || []);
  const banderasDeOtros = new Set([...banderasEnUso(state.lotes)].filter((b) => !misBanderas.has(b)));
  const agregarDuplicada =
    banderaNueva !== '' && (misBanderas.has(banderaNueva) || banderasDeOtros.has(banderaNueva));
  const editarDuplicada =
    banderaEditNueva !== '' &&
    banderaEditNueva !== editandoBanderaOriginal &&
    (misBanderas.has(banderaEditNueva) || banderasDeOtros.has(banderaEditNueva));

  function abrirEditarLote() {
    setVarIdEdit(String(lote!.varId));
    setPlantasEdit(lote!.plantas);
    setFechaInicioEdit(lote!.fechaInicio);
    setEditandoLote(true);
  }

  function guardarLote() {
    const vIdNum = varIdEdit ? parseInt(varIdEdit, 10) : null;
    if (!vIdNum || !plantasEdit || !fechaInicioEdit) return;
    const variedad = gv(state.vars, vIdNum);
    update((draft) =>
      editarLote(draft, {
        loteId: lote!.id,
        varId: vIdNum,
        varNom: variedad.nombre,
        plantas: plantasEdit,
        fechaInicio: fechaInicioEdit,
        autor,
      })
    );
    setEditandoLote(false);
  }

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
      eliminarPlantas(draft, { loteId: lote!.id, plantas: plantasEliminar || 0, esMerma, nota: motivo.trim() })
    );
    setEliminarOpen(false);
    closeLote();
    closeBancal();
  }

  function abrirAgregarBandera() {
    setBanderaNueva('');
    setAgregandoBandera(true);
  }

  function confirmarAgregarBandera() {
    if (!banderaNueva || agregarDuplicada) return;
    update((draft) => agregarBandera(draft, { loteId: lote!.id, bandera: banderaNueva, autor }));
    setAgregandoBandera(false);
  }

  function abrirEditarBanderaNum(b: number) {
    setEditandoBanderaOriginal(b);
    setBanderaEditNueva(b);
  }

  function guardarEdicionBanderaNum() {
    if (!banderaEditNueva || editandoBanderaOriginal == null || editarDuplicada) return;
    update((draft) =>
      editarBandera(draft, {
        loteId: lote!.id,
        banderaAnterior: editandoBanderaOriginal!,
        banderaNueva: banderaEditNueva,
        autor,
      })
    );
    setEditandoBanderaOriginal(null);
  }

  function quitarBandera(b: number) {
    if (!confirm(`¿Quitar la bandera N°${b} de este lote?`)) return;
    update((draft) => eliminarBandera(draft, { loteId: lote!.id, bandera: b, autor }));
  }

  function abrirAgregar() {
    setPlantasAgregar(0);
    setNotaAgregar('');
    setAgregarOpen(true);
  }

  function confirmarAgregar() {
    update((draft) =>
      agregarPlantasAjuste(draft, { loteId: lote!.id, plantas: plantasAgregar || 0, nota: notaAgregar.trim(), autor })
    );
    setAgregarOpen(false);
  }

  function handleAvanzar() {
    closeLote();
    if (sig === 'cosechado') openCosechar(lote!.id);
    else openMover(lote!.id);
  }

  const motivoRequerido = !esMerma && !motivo.trim();

  return (
    <>
      <Dialog open={!!loteId && !eliminarOpen && !agregarOpen} onOpenChange={(o) => !o && closeLote()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {varLabelPorId(state.vars, lote.varId)} — {lote.etapa}
              <BanderaBadges numeros={lote.banderas} />
            </DialogTitle>
          </DialogHeader>

          <div className="rounded-md border px-3 py-2">
            <div className="mb-1.5 flex items-center justify-between">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Datos del lote</h4>
              {!editandoLote && (
                <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-xs" onClick={abrirEditarLote}>
                  <Pencil className="size-3" />
                  Editar
                </Button>
              )}
            </div>
            {editandoLote ? (
              <div className="grid gap-1.5">
                <div className="grid gap-1">
                  <Label className="text-xs">Especie</Label>
                  <Select value={varIdEdit} onValueChange={(v) => setVarIdEdit(v ?? '')} items={variedadItems}>
                    <SelectTrigger className="h-8 w-full">
                      <SelectValue />
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
                <div className="grid gap-1">
                  <Label className="text-xs">Cantidad sembrada</Label>
                  <Input
                    type="number"
                    min={1}
                    value={plantasEdit}
                    onChange={(e) => setPlantasEdit(e.target.value ? parseInt(e.target.value, 10) : '')}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Fecha de plantado</Label>
                  <DatePicker value={fechaInicioEdit} onChange={setFechaInicioEdit} />
                </div>
                <div className="mt-1 flex justify-end gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => setEditandoLote(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={guardarLote} disabled={!varIdEdit || !plantasEdit || !fechaInicioEdit}>
                    Guardar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {varLabelPorId(state.vars, lote.varId)} · {lote.plantas} plantas sembradas · {fd(lote.fechaInicio)}
              </div>
            )}
          </div>

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
            Cosecha est: {fd(lote.fechaVenta)} · Ubicación: {ubicacionLote(lote)}
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

          <div className="rounded-md border px-3 py-2">
            <div className="mb-1.5 flex items-center justify-between">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Banderas</h4>
              {!agregandoBandera && (
                <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-xs" onClick={abrirAgregarBandera}>
                  <Plus className="size-3" />
                  Agregar
                </Button>
              )}
            </div>

            {lote.banderas && lote.banderas.length > 0 ? (
              <div className="grid gap-1.5">
                {lote.banderas.map((b) =>
                  editandoBanderaOriginal === b ? (
                    <div key={b} className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        className="h-7"
                        value={banderaEditNueva}
                        onChange={(e) => setBanderaEditNueva(e.target.value ? parseInt(e.target.value, 10) : '')}
                      />
                      <Button size="sm" className="h-7 px-2 text-xs" onClick={guardarEdicionBanderaNum}>
                        Guardar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setEditandoBanderaOriginal(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div key={b} className="flex items-center justify-between">
                      <BanderaBadge numero={b} />
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-6"
                          onClick={() => abrirEditarBanderaNum(b)}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-6 text-destructive hover:text-destructive"
                          onClick={() => quitarBandera(b)}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    </div>
                  )
                )}
                {editandoBanderaOriginal !== null && editarDuplicada && (
                  <p className="text-xs text-warning">Esa bandera ya está en uso por otro lote activo.</p>
                )}
              </div>
            ) : (
              !agregandoBandera && <div className="text-sm text-muted-foreground">Sin banderas asociadas</div>
            )}

            {agregandoBandera && (
              <div className="mt-1.5 grid gap-1.5">
                <Input
                  type="number"
                  min={0}
                  placeholder="N° de bandera"
                  value={banderaNueva}
                  onChange={(e) => setBanderaNueva(e.target.value ? parseInt(e.target.value, 10) : '')}
                  autoFocus
                />
                {agregarDuplicada && (
                  <p className="text-xs text-warning">Esa bandera ya está en uso por otro lote activo.</p>
                )}
                <div className="flex justify-end gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => setAgregandoBandera(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={confirmarAgregarBandera} disabled={!banderaNueva || agregarDuplicada}>
                    Agregar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {lote.notas && (
            <div className="rounded-md border-l-2 border-primary bg-muted/40 px-3 py-2">
              <div className="mb-0.5 text-xs text-muted-foreground">Notas</div>
              <div className="text-sm">{lote.notas}</div>
            </div>
          )}

          {(seriePh.length > 0 || serieEc.length > 0) && (
            <div className="grid gap-2">
              <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <LineChartIcon className="size-3.5" />
                pH / EC durante el ciclo
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {seriePh.length > 0 && (
                  <div className="h-[110px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={seriePh}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                        <XAxis dataKey="fecha" tickFormatter={(v: string) => fd(v)} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                        <YAxis domain={['dataMin - 0.3', 'dataMax + 0.3']} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={26} />
                        <Tooltip
                          labelFormatter={(v) => fd(String(v))}
                          contentStyle={{ background: 'var(--popover)', color: 'var(--popover-foreground)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                          formatter={(value) => [Number(value).toFixed(1), 'pH']}
                        />
                        <Line type="linear" dataKey="valor" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {serieEc.length > 0 && (
                  <div className="h-[110px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={serieEc}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                        <XAxis dataKey="fecha" tickFormatter={(v: string) => fd(v)} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                        <YAxis domain={['dataMin - 0.2', 'dataMax + 0.2']} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={26} />
                        <Tooltip
                          labelFormatter={(v) => fd(String(v))}
                          contentStyle={{ background: 'var(--popover)', color: 'var(--popover-foreground)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                          formatter={(value) => [Number(value).toFixed(2), 'EC']}
                        />
                        <Line type="linear" dataKey="valor" stroke="#1D6FA4" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
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
            <Button variant="outline" className="gap-1" onClick={abrirAgregar}>
              <Plus className="size-3.5" />
              Agregar
            </Button>
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

      <Dialog open={agregarOpen} onOpenChange={setAgregarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar plantas (ajuste) — {varLabelPorId(state.vars, lote.varId)}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>¿Cuántas plantas deseas agregar?</Label>
              <Input
                type="number"
                min={1}
                value={plantasAgregar}
                onChange={(e) => setPlantasAgregar(e.target.value ? parseInt(e.target.value, 10) : '')}
              />
              <p className="text-xs text-muted-foreground">{fracTubosStr(plantasAgregar || 0)} tubos equivalentes</p>
            </div>
            <div className="grid gap-1.5">
              <Label>Motivo (opcional)</Label>
              <Textarea
                rows={2}
                placeholder="Ej: conteo inicial estaba bajo, se recuperaron plantas..."
                value={notaAgregar}
                onChange={(e) => setNotaAgregar(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgregarOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarAgregar} disabled={!plantasAgregar}>
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={eliminarOpen} onOpenChange={setEliminarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar plantas — {varLabelPorId(state.vars, lote.varId)}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>¿Cuántas plantas deseas eliminar? (máx. {lote.plantasRestantes})</Label>
              <Input
                type="number"
                min={1}
                max={lote.plantasRestantes}
                value={plantasEliminar}
                onChange={(e) => setPlantasEliminar(e.target.value ? parseInt(e.target.value, 10) : '')}
              />
              <p className="text-xs text-muted-foreground">{fracTubosStr(plantasEliminar || 0)} tubos equivalentes</p>
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
