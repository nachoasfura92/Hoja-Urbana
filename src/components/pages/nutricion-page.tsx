'use client';

import { useMemo, useState } from 'react';
import { Droplets, FlaskConical, LineChart as LineChartIcon, RefreshCw, Settings2 } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CalibracionModal } from '@/components/modals/calibracion-modal';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useCurrentUser } from '@/lib/auth/current-user-context';
import { actualizarConfigNutricion, registrarRecambioAgua } from '@/lib/greenhouse/actions';
import {
  dd,
  ecObjetivoActual,
  fd,
  hoy,
  medicionesDeEstanque,
  proximaFechaEstanque,
  recambiosDeEstanque,
} from '@/lib/greenhouse/helpers';
import { ESTANQUES } from '@/lib/greenhouse/constants';
import type { EstanqueId, NutricionConfig } from '@/lib/greenhouse/types';

function tooltipStyle() {
  return {
    background: 'var(--popover)',
    color: 'var(--popover-foreground)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
  };
}

export function NutricionPage() {
  const { state, update } = useGreenhouse();
  const { displayName, email } = useCurrentUser();
  const autor = displayName || email || undefined;
  const [config, setConfig] = useState<NutricionConfig>(state.nutricion.config);
  const [calibrando, setCalibrando] = useState<EstanqueId | null>(null);

  function guardarConfig() {
    update((draft) => actualizarConfigNutricion(draft, config));
  }

  function recambioHoy(estanqueId: EstanqueId) {
    update((draft) => registrarRecambioAgua(draft, { estanqueId, fecha: hoy(), autor }));
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <Settings2 className="size-4 text-muted-foreground" />
            Objetivos y periodicidad
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="grid gap-1.5">
              <Label>pH mínimo</Label>
              <Input
                type="number"
                step="0.1"
                value={config.phMin}
                onChange={(e) => setConfig((c) => ({ ...c, phMin: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>pH máximo</Label>
              <Input
                type="number"
                step="0.1"
                value={config.phMax}
                onChange={(e) => setConfig((c) => ({ ...c, phMax: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>EC verano (mS/cm)</Label>
              <Input
                type="number"
                step="0.1"
                value={config.ecVerano}
                onChange={(e) => setConfig((c) => ({ ...c, ecVerano: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>EC invierno (mS/cm)</Label>
              <Input
                type="number"
                step="0.1"
                value={config.ecInvierno}
                onChange={(e) => setConfig((c) => ({ ...c, ecInvierno: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Objetivo de hoy: pH {config.phMin}–{config.phMax} · EC {ecObjetivoActual(config)} mS/cm — valores sugeridos,
            editables en cualquier momento.
          </p>
          <Separator />
          <div className="grid gap-3 sm:grid-cols-2">
            {ESTANQUES.map((e) => (
              <div key={e.id} className="grid grid-cols-2 gap-3 rounded-md border p-3">
                <div className="col-span-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {e.nombre} ({e.litros} L)
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Medir pH/EC cada (días)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={config.periodicidadMedicionDias[e.id]}
                    onChange={(ev) =>
                      setConfig((c) => ({
                        ...c,
                        periodicidadMedicionDias: {
                          ...c.periodicidadMedicionDias,
                          [e.id]: parseInt(ev.target.value, 10) || 1,
                        },
                      }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Recambio de agua cada (días)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={config.periodicidadRecambioDias[e.id]}
                    onChange={(ev) =>
                      setConfig((c) => ({
                        ...c,
                        periodicidadRecambioDias: {
                          ...c.periodicidadRecambioDias,
                          [e.id]: parseInt(ev.target.value, 10) || 1,
                        },
                      }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={guardarConfig}>Guardar configuración</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {ESTANQUES.map((e) => (
          <EstanqueCard
            key={e.id}
            estanqueId={e.id}
            nombre={e.nombre}
            litros={e.litros}
            config={config}
            onCalibrar={() => setCalibrando(e.id)}
            onRecambio={() => recambioHoy(e.id)}
          />
        ))}
      </div>

      <CalibracionModal estanqueId={calibrando} onClose={() => setCalibrando(null)} />
    </div>
  );
}

function EstanqueCard({
  estanqueId,
  nombre,
  litros,
  config,
  onCalibrar,
  onRecambio,
}: {
  estanqueId: EstanqueId;
  nombre: string;
  litros: number;
  config: NutricionConfig;
  onCalibrar: () => void;
  onRecambio: () => void;
}) {
  const { state } = useGreenhouse();
  const mediciones = useMemo(
    () => medicionesDeEstanque(state.nutricion.mediciones, estanqueId),
    [state.nutricion.mediciones, estanqueId]
  );
  const recambios = useMemo(
    () => recambiosDeEstanque(state.nutricion.recambios, estanqueId),
    [state.nutricion.recambios, estanqueId]
  );
  const ultima = mediciones.length ? mediciones[mediciones.length - 1] : null;
  const ultimoR = recambios.length ? recambios[recambios.length - 1] : null;
  const proximaMed = proximaFechaEstanque(ultima?.fecha ?? null, config.periodicidadMedicionDias[estanqueId]);
  const proximoRec = proximaFechaEstanque(ultimoR?.fecha ?? null, config.periodicidadRecambioDias[estanqueId]);
  const ecObjetivo = ecObjetivoActual(config);
  const chartData = useMemo(() => mediciones.map((m) => ({ fecha: m.fecha, ph: m.ph, ec: m.ec })), [mediciones]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
          <Droplets className="size-4 text-muted-foreground" />
          {nombre}
          <span className="text-xs font-normal text-muted-foreground">({litros} L)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md bg-muted/60 px-2.5 py-2">
            <div className="text-[11px] text-muted-foreground">Última calibración</div>
            <div className="font-medium">{ultima ? `pH ${ultima.ph} · EC ${ultima.ec}` : 'Sin registros'}</div>
            <div className="text-[11px] text-muted-foreground">
              {ultima ? `${fd(ultima.fecha)} (hace ${dd(ultima.fecha)}d)` : `Próxima sugerida: ${fd(proximaMed)}`}
            </div>
          </div>
          <div className="rounded-md bg-muted/60 px-2.5 py-2">
            <div className="text-[11px] text-muted-foreground">Último recambio de agua</div>
            <div className="font-medium">{ultimoR ? fd(ultimoR.fecha) : 'Sin registros'}</div>
            <div className="text-[11px] text-muted-foreground">Próximo sugerido: {fd(proximoRec)}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Objetivo hoy: pH {config.phMin}–{config.phMax} · EC {ecObjetivo} mS/cm
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onCalibrar}>
            <FlaskConical className="size-3.5" />
            Registrar calibración
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={onRecambio}>
            <RefreshCw className="size-3.5" />
            Recambio de agua hoy
          </Button>
        </div>

        {chartData.length > 0 ? (
          <>
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <LineChartIcon className="size-3.5" />
                pH en el tiempo
              </div>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis
                      dataKey="fecha"
                      tickFormatter={(v: string) => fd(v)}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis domain={['dataMin - 0.3', 'dataMax + 0.3']} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={32} />
                    <Tooltip
                      labelFormatter={(v) => fd(String(v))}
                      contentStyle={tooltipStyle()}
                      formatter={(value) => [Number(value).toFixed(1), 'pH']}
                    />
                    <ReferenceArea y1={config.phMin} y2={config.phMax} fill="var(--success)" fillOpacity={0.08} />
                    {recambios.map((r) => (
                      <ReferenceLine key={r.id} x={r.fecha} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
                    ))}
                    <Line type="linear" dataKey="ph" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <LineChartIcon className="size-3.5" />
                EC en el tiempo (mS/cm)
              </div>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis
                      dataKey="fecha"
                      tickFormatter={(v: string) => fd(v)}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis domain={['dataMin - 0.2', 'dataMax + 0.2']} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={32} />
                    <Tooltip
                      labelFormatter={(v) => fd(String(v))}
                      contentStyle={tooltipStyle()}
                      formatter={(value) => [Number(value).toFixed(2), 'EC']}
                    />
                    <ReferenceLine y={ecObjetivo} stroke="var(--success)" strokeDasharray="3 3" />
                    {recambios.map((r) => (
                      <ReferenceLine key={r.id} x={r.fecha} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
                    ))}
                    <Line type="linear" dataKey="ec" stroke="#1D6FA4" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Aún no hay calibraciones registradas para este estanque.</p>
        )}
      </CardContent>
    </Card>
  );
}
