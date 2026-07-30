'use client';

import { useMemo, useState } from 'react';
import { Download, Wheat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGreenhouse } from '@/lib/greenhouse/context';
import {
  fd,
  filtrarCosechas,
  fracTubosStr,
  gv,
  hoy,
  resumenCosechasPorVariedad,
  varLabel,
  varLabelPorId,
  PERIODOS_COSECHA,
  type PeriodoCosecha,
} from '@/lib/greenhouse/helpers';

const PERIODO_ITEMS = Object.fromEntries(PERIODOS_COSECHA.map((p) => [p.value, p.label]));

export function CosechasPage() {
  const { state } = useGreenhouse();
  const [varId, setVarId] = useState('todas');
  const [periodo, setPeriodo] = useState<PeriodoCosecha>('todo');

  const variedadItems = useMemo(
    () => ({ todas: 'Todas', ...Object.fromEntries((state.vars || []).map((v) => [String(v.id), varLabel(v)])) }),
    [state.vars]
  );

  const filtradas = useMemo(
    () => filtrarCosechas(state.cosechas || [], { varId: varId === 'todas' ? null : parseInt(varId, 10), periodo }),
    [state.cosechas, varId, periodo]
  );

  const resumen = useMemo(() => resumenCosechasPorVariedad(filtradas), [filtradas]);
  const totalPlantas = filtradas.reduce((t, c) => t + c.plantas, 0);

  // Exporta exactamente lo que está filtrado en pantalla (variedad/período).
  // CSV con BOM UTF-8 para que Excel muestre bien las tildes/ñ, sin depender
  // de ninguna librería nueva.
  function exportarExcel() {
    const encabezados = ['Fecha', 'Variedad', 'Nombre', 'Plantas', 'Tubos', 'Registrado por', 'Notas'];
    const escapar = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const filas = filtradas.map((c) => {
      const v = gv(state.vars, c.varId);
      return [fd(c.fecha), v.nombre, v.tipo || '', String(c.plantas), fracTubosStr(c.plantas), c.autor || '', c.nota || ''];
    });
    const csv = [encabezados, ...filas].map((fila) => fila.map(escapar).join(',')).join('\r\n');
    const bom = String.fromCharCode(0xfeff);
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hoja-urbana-cosechas-${hoy()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <Wheat className="size-4 text-muted-foreground" />
            Filtros
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={exportarExcel}
            disabled={!filtradas.length}
          >
            <Download className="size-3.5" />
            Exportar a Excel
          </Button>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="grid gap-1.5">
            <Select value={varId} onValueChange={(v) => setVarId(v ?? 'todas')} items={variedadItems}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {(state.vars || []).map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {varLabel(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Select value={periodo} onValueChange={(v) => setPeriodo((v as PeriodoCosecha) ?? 'todo')} items={PERIODO_ITEMS}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS_COSECHA.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="border-l-4 border-l-success py-0">
          <CardContent className="px-3.5 py-3">
            <div className="text-xs text-muted-foreground">Total cosechado</div>
            <div className="text-xl font-medium">{totalPlantas.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">{fracTubosStr(totalPlantas)} tubos</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary py-0">
          <CardContent className="px-3.5 py-3">
            <div className="text-xs text-muted-foreground">Cosechas registradas</div>
            <div className="text-xl font-medium">{filtradas.length}</div>
          </CardContent>
        </Card>
      </div>

      {resumen.length > 1 && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Por variedad</h3>
          <div className="grid gap-1.5">
            {resumen.map((r) => (
              <div key={r.varId} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="font-medium">{varLabelPorId(state.vars, r.varId)}</span>
                <span className="text-muted-foreground">
                  {r.plantas.toLocaleString()} plantas · {fracTubosStr(r.plantas)} tubos
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardContent>
          <div className="grid grid-cols-[80px_1fr_80px_1fr_1fr] gap-2 border-b pb-1.5 text-xs font-medium text-muted-foreground">
            <span>Fecha</span>
            <span>Variedad</span>
            <span className="text-right">Plantas</span>
            <span>Registrado por</span>
            <span>Notas</span>
          </div>
          {filtradas.length ? (
            filtradas.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-[80px_1fr_80px_1fr_1fr] gap-2 border-b py-1.5 text-sm last:border-b-0"
              >
                <span className="text-muted-foreground">{fd(c.fecha)}</span>
                <span className="font-medium">{varLabelPorId(state.vars, c.varId)}</span>
                <span className="text-right">{c.plantas.toLocaleString()}</span>
                <span className="text-muted-foreground">{c.autor || '—'}</span>
                <span className="truncate text-muted-foreground">{c.nota || '—'}</span>
              </div>
            ))
          ) : (
            <p className="pt-2 text-sm text-muted-foreground">Sin cosechas registradas en este período.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
