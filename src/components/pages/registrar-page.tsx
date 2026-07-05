'use client';

import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Moon, Plus, Sun } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { confirmarSiembra } from '@/lib/greenhouse/actions';
import { evaluarSiembra, fd, fmas, fracTubosStr, gv, hoy, man, sembradoEn } from '@/lib/greenhouse/helpers';
import { AlertRow } from '@/components/dashboard/alert-row';
import { DatePicker } from '@/components/dashboard/date-picker';
import { ValidarSiembraModal } from '@/components/modals/validar-siembra-modal';

export function RegistrarPage() {
  const { state, update } = useGreenhouse();
  const [vId, setVId] = useState('');
  const [fecha, setFecha] = useState(hoy());
  const [plantas, setPlantas] = useState(20);
  const [dp, setDp] = useState(14);
  const [de, setDe] = useState(21);
  const [da, setDa] = useState(21);
  const [notas, setNotas] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const variedadItems = useMemo(
    () =>
      Object.fromEntries(
        (state.vars || []).map((v) => [String(v.id), v.marca ? `${v.nombre} — ${v.marca}` : v.nombre])
      ),
    [state.vars]
  );

  const vIdNum = vId ? parseInt(vId, 10) : null;
  const evaluacion = useMemo(
    () => (vIdNum ? evaluarSiembra(state, vIdNum, plantas) : null),
    [state, vIdNum, plantas]
  );

  function precargar(varId: number, cantidad: number, dpv: number, dev: number, dav: number) {
    setVId(String(varId));
    setPlantas(cantidad);
    setDp(dpv);
    setDe(dev);
    setDa(dav);
    setFecha(hoy());
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleRegistrar() {
    if (!vIdNum || !plantas) return;
    setModalOpen(true);
  }

  function handleConfirmar() {
    if (!vIdNum) return;
    update((draft) => {
      confirmarSiembra(draft, {
        vId: vIdNum,
        varNombre: gv(draft.vars, vIdNum).nombre,
        plantas,
        fechaSiembra: fecha,
        dp,
        de,
        da,
        notas,
      });
    });
    setModalOpen(false);
    setNotas('');
  }

  const bloques = [
    { f: hoy(), label: 'Hoy', icon: Sun, tone: 'sp' as const },
    { f: man(), label: 'Mañana', icon: Moon, tone: 'man' as const },
  ];

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Siembras programadas — hoy y mañana
        </h3>
        <div className="grid gap-3">
          {bloques.map(({ f, label, icon: Icon, tone }) => {
            const items = (state.plan || []).filter((p) => {
              const proxima = p.ultimaSiembra ? fmas(p.ultimaSiembra, p.freq) : hoy();
              return proxima === f;
            });
            if (!items.length) return null;
            return (
              <Card
                key={f}
                className={tone === 'man' ? 'border-accent bg-accent/40 py-0' : 'border-warning/40 bg-warning/10 py-0'}
              >
                <CardContent className="grid gap-2 px-4 py-3.5">
                  <div
                    className={`flex items-center gap-1.5 text-sm font-medium ${tone === 'man' ? 'text-accent-foreground' : 'text-warning'}`}
                  >
                    <Icon className="size-3.5" />
                    Siembras de {label} — {fd(f)}
                  </div>
                  {items.map((p) => {
                    const sem = (state.inventario.semillas || {})[String(p.varId)] || 0;
                    const cub = state.inventario.cubos || 0;
                    const ok = sem >= p.plantas && cub >= p.plantas;
                    const ya = sembradoEn(state.lotes, p.varId, f);
                    const falta = Math.max(0, p.plantas - ya);
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-2 rounded-md bg-card px-3 py-2">
                        {falta <= 0 ? (
                          <div className="text-sm font-medium">
                            {p.varNom}{' '}
                            <Badge variant="outline" className="border-transparent bg-success/10 text-success">
                              Completa ✓
                            </Badge>
                          </div>
                        ) : (
                          <>
                            <div>
                              <div className="text-sm font-medium">
                                {p.varNom}{' '}
                                {ya > 0 && (
                                  <Badge variant="outline" className="border-transparent bg-warning/10 text-warning">
                                    {ya}/{p.plantas}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {falta} plantas · {fracTubosStr(falta)} tubos
                              </div>
                              <div className={`text-xs ${ok ? 'text-success' : 'text-destructive'}`}>
                                Sem: {sem} | Cubos: {cub} {ok ? '✓' : '— REVISAR'}
                              </div>
                            </div>
                            {f === hoy() ? (
                              <Button
                                size="sm"
                                className="shrink-0"
                                onClick={() => precargar(p.varId, falta, p.dp, p.de, p.da)}
                              >
                                Registrar
                              </Button>
                            ) : (
                              <Badge variant="outline" className="shrink-0 border-transparent bg-accent text-accent-foreground">
                                Mañana
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
          {bloques.every(({ f }) => {
            const items = (state.plan || []).filter((p) => {
              const proxima = p.ultimaSiembra ? fmas(p.ultimaSiembra, p.freq) : hoy();
              return proxima === f;
            });
            return !items.length;
          }) && <p className="text-sm text-muted-foreground">Sin siembras programadas para hoy o mañana.</p>}
        </div>
      </div>

      <Card ref={formRef}>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <Plus className="size-4 text-muted-foreground" />
            Registrar siembra manual
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Variedad</Label>
            <Select value={vId} onValueChange={(v) => setVId(v ?? '')} items={variedadItems}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {(state.vars || []).map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.nombre}
                    {v.marca ? ` — ${v.marca}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Fecha de siembra</Label>
            <DatePicker value={fecha} onChange={setFecha} />
          </div>
          <div className="grid gap-1.5">
            <Label>Cantidad de plantas</Label>
            <Input
              type="number"
              min={1}
              value={plantas}
              onChange={(e) => setPlantas(parseInt(e.target.value, 10) || 0)}
            />
          </div>

          {evaluacion && plantas > 0 && evaluacion.plan && (
            <>
              {evaluacion.total < evaluacion.plan.plantas && (
                <AlertRow kind="warning" icon={AlertTriangle}>
                  Quedarán {evaluacion.plan.plantas - evaluacion.total} plantas sin sembrar del plan de hoy.
                </AlertRow>
              )}
              {evaluacion.total > evaluacion.plan.plantas && (
                <AlertRow kind="danger" icon={AlertTriangle}>
                  {evaluacion.total - evaluacion.plan.plantas} plantas por encima del plan ({evaluacion.plan.plantas} total).
                </AlertRow>
              )}
              {evaluacion.total === evaluacion.plan.plantas && (
                <AlertRow kind="success" icon={CheckCircle2}>
                  Completa exactamente el plan de hoy ✓
                </AlertRow>
              )}
            </>
          )}
          {plantas > 0 && (
            <p className="text-xs text-muted-foreground">{fracTubosStr(plantas)} tubos equivalentes</p>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Días plantines</Label>
              <Input type="number" min={1} value={dp} onChange={(e) => setDp(parseInt(e.target.value, 10) || 1)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Días engorda</Label>
              <Input type="number" min={1} value={de} onChange={(e) => setDe(parseInt(e.target.value, 10) || 1)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Días adulto</Label>
              <Input type="number" min={1} value={da} onChange={(e) => setDa(parseInt(e.target.value, 10) || 1)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Notas</Label>
            <Textarea rows={2} placeholder="Observaciones..." value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleRegistrar} disabled={!vIdNum || !plantas}>
              Registrar siembra
            </Button>
          </div>
        </CardContent>
      </Card>

      <ValidarSiembraModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        evaluacion={evaluacion}
        plantas={plantas}
        fechaSiembra={fecha}
        onConfirm={handleConfirmar}
      />
    </div>
  );
}
