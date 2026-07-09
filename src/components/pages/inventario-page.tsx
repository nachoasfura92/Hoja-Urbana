'use client';

import { useMemo, useState } from 'react';
import { Box, LeafyGreen, LineChart as LineChartIcon, Package, Sprout } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertRow } from '@/components/dashboard/alert-row';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { adjustCubos, adjustSemillas } from '@/lib/greenhouse/actions';
import { consumoRealPorDia, fd, fmas, gv, hoy, varLabel } from '@/lib/greenhouse/helpers';
import { cn } from '@/lib/utils';

export function InventarioPage() {
  const { state, update } = useGreenhouse();
  const [cuboQty, setCuboQty] = useState('');
  const [semVarId, setSemVarId] = useState('');
  const [semQty, setSemQty] = useState('');
  const [selectedVarId, setSelectedVarId] = useState<number | null>(null);

  const variedadItems = useMemo(
    () => Object.fromEntries((state.vars || []).map((v) => [String(v.id), varLabel(v)])),
    [state.vars]
  );

  function handleAdjC(dir: 1 | -1) {
    const n = parseInt(cuboQty, 10) || 0;
    if (!n) return;
    update((draft) => adjustCubos(draft, dir, n));
    setCuboQty('');
  }

  function handleAdjS(dir: 1 | -1) {
    const vIdNum = semVarId ? parseInt(semVarId, 10) : null;
    const n = parseInt(semQty, 10) || 0;
    if (!vIdNum || !n) return;
    const variedad = gv(state.vars, vIdNum);
    update((draft) => adjustSemillas(draft, dir, vIdNum, variedad.nombre, n));
    setSemQty('');
  }

  const plan = state.plan || [];
  const cStock = state.inventario.cubos || 0;
  // Consumo real (según siembras ya registradas), no el promedio teórico del plan.
  const cxd = consumoRealPorDia(state.lotes);

  const selectedPlan = selectedVarId != null ? plan.find((p) => p.varId === selectedVarId) || null : null;
  const chartData = useMemo(() => {
    if (!selectedPlan) return [];
    const sem = (state.inventario.semillas || {})[String(selectedPlan.varId)] || 0;
    const xd = consumoRealPorDia(state.lotes, selectedPlan.varId);
    const dias = xd > 0 ? Math.min(90, Math.ceil(sem / xd) + 2) : 14;
    return Array.from({ length: dias + 1 }, (_, i) => {
      const f = fmas(hoy(), i);
      const d = new Date(f);
      return { label: `${d.getDate()}/${d.getMonth() + 1}`, stock: Math.max(0, Math.round(sem - xd * i)) };
    });
  }, [selectedPlan, state.inventario.semillas, state.lotes]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
              <Package className="size-4 text-muted-foreground" />
              Cubos fenológicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium">{(state.inventario.cubos || 0).toLocaleString()}</div>
            <div className="mb-2 text-xs text-muted-foreground">en stock</div>
            <Label>Cantidad</Label>
            <div className="mt-1.5 flex gap-1.5">
              <Input type="number" placeholder="0" value={cuboQty} onChange={(e) => setCuboQty(e.target.value)} />
              <Button variant="outline" onClick={() => handleAdjC(1)}>
                +
              </Button>
              <Button variant="outline" onClick={() => handleAdjC(-1)}>
                −
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
              <Sprout className="size-4 text-muted-foreground" />
              Semillas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-0.5">
              {(state.vars || []).map((v) => {
                const s = (state.inventario.semillas || {})[String(v.id)] || 0;
                const bajo = s < 50;
                return (
                  <div key={v.id} className="flex items-center justify-between border-b py-1.5 text-sm last:border-b-0">
                    <div>
                      <div className={bajo ? 'font-medium text-destructive' : 'font-medium'}>
                        {varLabel(v)}
                        {bajo ? ' ⚠' : ''}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{v.marca || '—'}</div>
                    </div>
                    <div className={`text-sm font-medium ${bajo ? 'text-destructive' : ''}`}>{s}</div>
                  </div>
                );
              })}
            </div>
            <Separator className="my-3" />
            <Label>Variedad</Label>
            <Select value={semVarId} onValueChange={(v) => setSemVarId(v ?? '')} items={variedadItems}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {(state.vars || []).map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {varLabel(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label className="mt-2">Cantidad</Label>
            <Input
              className="mt-1.5"
              type="number"
              placeholder="Nº semillas"
              value={semQty}
              onChange={(e) => setSemQty(e.target.value)}
            />
            <div className="mt-2 flex justify-end gap-1.5">
              <Button variant="outline" onClick={() => handleAdjS(-1)}>
                − Descontar
              </Button>
              <Button onClick={() => handleAdjS(1)}>+ Añadir</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Proyección de agotamiento</h3>
        {!plan.length ? (
          <p className="text-sm text-muted-foreground">Define el plan para ver proyecciones.</p>
        ) : (
          <div className="grid gap-2">
            {cxd > 0 &&
              (() => {
                const dc = Math.floor(cStock / cxd);
                const fa = fmas(hoy(), dc);
                return (
                  <AlertRow kind={dc <= 14 ? 'warning' : 'success'} icon={Box}>
                    <strong>Cubos</strong> — {cStock} en stock · {cxd.toFixed(1)}/día (real)
                    <br />
                    {dc <= 0 ? (
                      <strong>Agotados</strong>
                    ) : (
                      <>
                        Se agotan en <strong>{dc} días</strong> ({fd(fa)})
                      </>
                    )}
                  </AlertRow>
                );
              })()}
            {plan.map((p) => {
              const sem = (state.inventario.semillas || {})[String(p.varId)] || 0;
              const xd = consumoRealPorDia(state.lotes, p.varId);
              const d = xd > 0 ? Math.floor(sem / xd) : null;
              const fa = d != null ? fmas(hoy(), d) : null;
              const seleccionado = selectedVarId === p.varId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedVarId(seleccionado ? null : p.varId)}
                  className={cn(
                    'rounded-md text-left transition-shadow',
                    seleccionado && 'ring-2 ring-primary'
                  )}
                >
                  <AlertRow kind={d == null ? 'info' : d <= 14 ? 'warning' : 'success'} icon={LeafyGreen}>
                    <strong>{p.varNom}</strong> — {sem} semillas · {xd.toFixed(1)}/día (real)
                    <br />
                    {d == null ? (
                      'Sin historial de siembra — no se puede proyectar'
                    ) : d <= 0 ? (
                      <strong>Agotadas</strong>
                    ) : (
                      <>
                        Se agotan en <strong>{d} días</strong> ({fd(fa!)})
                      </>
                    )}
                  </AlertRow>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
              <LineChartIcon className="size-4 text-muted-foreground" />
              Proyección de stock — {selectedPlan.varNom}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--popover)',
                      color: 'var(--popover-foreground)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${value} semillas`, 'Stock']}
                  />
                  <Line type="monotone" dataKey="stock" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
