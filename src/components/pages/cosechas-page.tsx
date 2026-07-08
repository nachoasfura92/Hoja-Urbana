'use client';

import { useMemo, useState } from 'react';
import { Wheat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGreenhouse } from '@/lib/greenhouse/context';
import {
  fd,
  filtrarCosechas,
  fracTubosStr,
  resumenCosechasPorVariedad,
  varLabel,
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

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <Wheat className="size-4 text-muted-foreground" />
            Filtros
          </CardTitle>
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
                <span className="font-medium">{r.varNom}</span>
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
                <span className="font-medium">{c.varNom}</span>
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
