'use client';

import { useMemo, useState } from 'react';
import { BarChart3, List } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { COLORS_VAR, MESES } from '@/lib/greenhouse/constants';
import { dr, getVentaData } from '@/lib/greenhouse/helpers';
import { cn } from '@/lib/utils';

type Vista = 'ambos' | 'real' | 'proy';

export function VentaPage() {
  const { state } = useGreenhouse();
  const [filtroV, setFiltroV] = useState('todas');
  const [vistaV, setVistaV] = useState<Vista>('ambos');

  const { REAL, PROY, vars } = useMemo(
    () => getVentaData(state.lotes, state.plan, state.vars),
    [state.lotes, state.plan, state.vars]
  );

  const activeVars = useMemo(() => (filtroV === 'todas' ? vars : [filtroV]), [filtroV, vars]);

  // Solo entran las fechas que realmente tienen datos para lo que está
  // filtrado (tipo real/proyectado y variedad) — si no, quedaban fechas
  // "vacías" en el eje cuando, por ejemplo, un día solo tenía proyección y
  // se estaba filtrando "Solo real".
  const allDates = useMemo(() => {
    const fuentes: { fecha: string; var: string }[] = [];
    if (vistaV === 'ambos' || vistaV === 'real') fuentes.push(...REAL.filter((d) => activeVars.includes(d.var)));
    if (vistaV === 'ambos' || vistaV === 'proy') fuentes.push(...PROY.filter((d) => activeVars.includes(d.var)));
    return [...new Set(fuentes.map((d) => d.fecha))].sort().slice(0, 16);
  }, [REAL, PROY, vistaV, activeVars]);

  const series = useMemo(() => {
    const s: { key: string; varName: string; tipo: 'real' | 'proy'; label: string; color: string }[] = [];
    activeVars.forEach((v) => {
      const vi = vars.indexOf(v);
      const color = COLORS_VAR[vi % COLORS_VAR.length];
      if (vistaV === 'ambos' || vistaV === 'real') s.push({ key: `${v}__real`, varName: v, tipo: 'real', label: `${v} (real)`, color });
      if (vistaV === 'ambos' || vistaV === 'proy') s.push({ key: `${v}__proy`, varName: v, tipo: 'proy', label: `${v} (proy.)`, color });
    });
    return s;
  }, [activeVars, vars, vistaV]);

  const chartRows = useMemo(
    () =>
      allDates.map((f) => {
        const d = new Date(f);
        const row: Record<string, string | number> = { fecha: f, label: `${d.getDate()} ${MESES[d.getMonth()]}` };
        series.forEach((s) => {
          const fuente = s.tipo === 'real' ? REAL : PROY;
          const match = fuente.find((x) => x.fecha === f && x.var === s.varName);
          row[s.key] = match ? match.plantas : 0;
        });
        return row;
      }),
    [allDates, series, REAL, PROY]
  );

  let rows: { fecha: string; var: string; plantas: number; tipo: 'Real' | 'Proyectado' }[] = [];
  if (vistaV === 'ambos' || vistaV === 'real') rows.push(...REAL.filter((d) => activeVars.includes(d.var)).map((d) => ({ ...d, tipo: 'Real' as const })));
  if (vistaV === 'ambos' || vistaV === 'proy') rows.push(...PROY.filter((d) => activeVars.includes(d.var)).map((d) => ({ ...d, tipo: 'Proyectado' as const })));
  rows = rows.sort((a, b) => a.fecha.localeCompare(b.fecha));

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <BarChart3 className="size-4 text-muted-foreground" />
            Plantas disponibles en el tiempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <FilterButton active={filtroV === 'todas'} onClick={() => setFiltroV('todas')}>
              Todas
            </FilterButton>
            <div className="ml-auto flex gap-1">
              <ViewButton active={vistaV === 'ambos'} onClick={() => setVistaV('ambos')}>
                Real + Proy.
              </ViewButton>
              <ViewButton active={vistaV === 'real'} onClick={() => setVistaV('real')}>
                Solo real
              </ViewButton>
              <ViewButton active={vistaV === 'proy'} onClick={() => setVistaV('proy')}>
                Solo proyectado
              </ViewButton>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap gap-1">
            {vars.map((v) => (
              <FilterButton key={v} active={filtroV === v} onClick={() => setFiltroV(v)}>
                {v}
              </FilterButton>
            ))}
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
                <Tooltip
                  cursor={{ fill: 'var(--muted)' }}
                  contentStyle={{
                    background: 'var(--popover)',
                    color: 'var(--popover-foreground)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value, name) => {
                    const num = typeof value === 'number' ? value : Number(value);
                    return num > 0 ? [num.toLocaleString(), String(name)] : ['', ''];
                  }}
                />
                {series.map((s) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    stackId={`s_${s.varName}`}
                    fill={s.color}
                    fillOpacity={s.tipo === 'real' ? 0.85 : 0.35}
                    stroke={s.tipo === 'proy' ? s.color : undefined}
                    strokeDasharray={s.tipo === 'proy' ? '3 2' : undefined}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <List className="size-4 text-muted-foreground" />
            Detalle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[70px_1fr_90px_70px_70px] gap-2 border-b pb-1.5 text-xs font-medium text-muted-foreground">
            <span>Fecha</span>
            <span>Variedad</span>
            <span>Tipo</span>
            <span>Etapa</span>
            <span className="text-right">Plantas</span>
          </div>
          {rows.length ? (
            rows.map((r, i) => {
              const f = new Date(r.fecha);
              const drest = dr(r.fecha);
              const vi = vars.indexOf(r.var);
              const color = COLORS_VAR[vi % COLORS_VAR.length];
              return (
                <div key={i} className="grid grid-cols-[70px_1fr_90px_70px_70px] items-center gap-2 border-b py-1.5 text-sm last:border-b-0">
                  <span className={cn(drest <= 0 ? 'font-medium text-success' : 'text-muted-foreground')}>
                    {f.getDate()} {MESES[f.getMonth()]}
                    {drest <= 0 ? ' · Hoy' : drest === 1 ? ' · Mañana' : ''}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
                    {r.var}
                  </span>
                  <span>
                    <Badge
                      variant="outline"
                      className={
                        r.tipo === 'Real'
                          ? 'border-transparent bg-success/10 text-success'
                          : 'border-transparent bg-accent text-accent-foreground'
                      }
                    >
                      {r.tipo}
                    </Badge>
                  </span>
                  <span className="text-xs text-muted-foreground">adulto</span>
                  <span className="text-right font-medium">{r.plantas.toLocaleString()}</span>
                </div>
              );
            })
          ) : (
            <p className="pt-2 text-sm text-muted-foreground">Sin datos.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-xs',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  );
}

function ViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2 py-0.5 text-xs',
        active ? 'border-border bg-card font-medium' : 'border-border text-muted-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  );
}
