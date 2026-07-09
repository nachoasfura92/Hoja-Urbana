'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Flag, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useCurrentUser } from '@/lib/auth/current-user-context';
import { confirmarSiembra } from '@/lib/greenhouse/actions';
import { banderasEnUso, evaluarSiembra, fracTubosStr, gv, hoy, proximaBandera, varLabel } from '@/lib/greenhouse/helpers';
import { AlertRow } from '@/components/dashboard/alert-row';
import { DatePicker } from '@/components/dashboard/date-picker';
import { ValidarSiembraModal } from '@/components/modals/validar-siembra-modal';

export function RegistrarPage() {
  const { state, update } = useGreenhouse();
  const { displayName, email } = useCurrentUser();
  const [vId, setVId] = useState('');
  const [fecha, setFecha] = useState(hoy());
  const [plantas, setPlantas] = useState<number | ''>('');
  const [bandera, setBandera] = useState<number | ''>('');
  const [banderaTocada, setBanderaTocada] = useState(false);
  const [dp, setDp] = useState(14);
  const [de, setDe] = useState(21);
  const [da, setDa] = useState(21);
  const [notas, setNotas] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const variedadItems = useMemo(
    () => Object.fromEntries((state.vars || []).map((v) => [String(v.id), varLabel(v)])),
    [state.vars]
  );

  const vIdNum = vId ? parseInt(vId, 10) : null;
  const evaluacion = useMemo(
    () => (vIdNum ? evaluarSiembra(state, vIdNum, plantas || 0) : null),
    [state, vIdNum, plantas]
  );

  // Sugiere automáticamente la siguiente bandera libre (la más baja posible,
  // reciclando las que se liberan al salir de mesa de plantines) mientras el
  // operador no la haya editado a mano.
  const banderaSugerida = useMemo(() => proximaBandera(state.lotes), [state.lotes]);
  const [ultimaSugerida, setUltimaSugerida] = useState<number | null>(null);
  if (!banderaTocada && banderaSugerida !== ultimaSugerida) {
    setUltimaSugerida(banderaSugerida);
    setBandera(banderaSugerida);
  }
  const banderaDuplicada = bandera !== '' && banderasEnUso(state.lotes).has(bandera);

  function handleRegistrar() {
    if (!vIdNum || !plantas || !bandera || banderaDuplicada) return;
    setModalOpen(true);
  }

  function handleConfirmar() {
    if (!vIdNum || !bandera) return;
    update((draft) => {
      confirmarSiembra(draft, {
        vId: vIdNum,
        varNombre: gv(draft.vars, vIdNum).nombre,
        plantas: plantas || 0,
        fechaSiembra: fecha,
        dp,
        de,
        da,
        notas,
        bandera,
        autor: displayName || email || undefined,
      });
    });
    setModalOpen(false);
    setNotas('');
    setPlantas('');
    setBanderaTocada(false);
  }

  return (
    <div className="grid gap-4">
      <Card>
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
                    {varLabel(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Fecha de siembra</Label>
            <DatePicker value={fecha} onChange={setFecha} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Cantidad de plantas</Label>
              <Input
                type="number"
                min={1}
                placeholder="Ej: 500"
                value={plantas}
                onChange={(e) => setPlantas(e.target.value ? parseInt(e.target.value, 10) : '')}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="flex items-center gap-1">
                <Flag className="size-3" />
                N° de bandera
              </Label>
              <Input
                type="number"
                min={1}
                placeholder="Ej: 4"
                value={bandera}
                onChange={(e) => {
                  setBanderaTocada(true);
                  setBandera(e.target.value ? parseInt(e.target.value, 10) : '');
                }}
              />
              {banderaDuplicada && (
                <p className="text-xs text-destructive">Esa bandera ya está en uso en mesa de plantines.</p>
              )}
            </div>
          </div>

          {evaluacion && (plantas || 0) > 0 && evaluacion.plan && (
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
          {(plantas || 0) > 0 && (
            <p className="text-xs text-muted-foreground">{fracTubosStr(plantas || 0)} tubos equivalentes</p>
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
            <Button onClick={handleRegistrar} disabled={!vIdNum || !plantas || !bandera || banderaDuplicada}>
              Registrar siembra
            </Button>
          </div>
        </CardContent>
      </Card>

      <ValidarSiembraModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        evaluacion={evaluacion}
        plantas={plantas || 0}
        bandera={bandera || 0}
        fechaSiembra={fecha}
        onConfirm={handleConfirmar}
      />
    </div>
  );
}
