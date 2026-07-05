'use client';

import { useMemo, useState } from 'react';
import { Box, LeafyGreen, Package, Sprout } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertRow } from '@/components/dashboard/alert-row';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { adjustCubos, adjustSemillas } from '@/lib/greenhouse/actions';
import { fd, fmas, gv, hoy } from '@/lib/greenhouse/helpers';

export function InventarioPage() {
  const { state, update } = useGreenhouse();
  const [cuboQty, setCuboQty] = useState('');
  const [semVarId, setSemVarId] = useState('');
  const [semQty, setSemQty] = useState('');

  const variedadItems = useMemo(
    () => Object.fromEntries((state.vars || []).map((v) => [String(v.id), v.nombre])),
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
  const cxd = plan.reduce((t, p) => t + p.plantas / p.freq, 0);

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
                        {v.nombre}
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
                    {v.nombre}
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
                    <strong>Cubos</strong> — {cStock} en stock · {cxd.toFixed(1)}/día
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
              const xd = p.plantas / p.freq;
              const d = Math.floor(sem / xd);
              const fa = fmas(hoy(), d);
              return (
                <AlertRow key={p.id} kind={d <= 14 ? 'warning' : 'success'} icon={LeafyGreen}>
                  <strong>{p.varNom}</strong> — {sem} semillas · {xd.toFixed(1)}/día
                  <br />
                  {d <= 0 ? (
                    <strong>Agotadas</strong>
                  ) : (
                    <>
                      Se agotan en <strong>{d} días</strong> ({fd(fa)})
                    </>
                  )}
                </AlertRow>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
