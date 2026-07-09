'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { addPlanItem, deletePlanItem, editPlanItem } from '@/lib/greenhouse/actions';
import { dd, fd, gv, planVence, varLabel } from '@/lib/greenhouse/helpers';
import type { PlanItem } from '@/lib/greenhouse/types';

const FRECUENCIAS = [
  { value: '1', label: 'Todos los días' },
  { value: '2', label: 'Día por medio' },
  { value: '3', label: 'Cada 3 días' },
  { value: '4', label: 'Cada 4 días' },
  { value: '5', label: 'Cada 5 días' },
  { value: '7', label: 'Cada semana' },
  { value: '10', label: 'Cada 10 días' },
  { value: '14', label: 'Cada 2 semanas' },
  { value: '21', label: 'Cada 3 semanas' },
  { value: '30', label: 'Mensual' },
];

const FRECUENCIA_ITEMS = Object.fromEntries(FRECUENCIAS.map((f) => [f.value, f.label]));

export function PlanPage() {
  const { state, update } = useGreenhouse();
  const [vId, setVId] = useState('');
  const [freq, setFreq] = useState('7');
  const [plantas, setPlantas] = useState(20);
  const [dp, setDp] = useState(14);
  const [de, setDe] = useState(21);
  const [da, setDa] = useState(21);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [evId, setEvId] = useState('');
  const [efreq, setEfreq] = useState('7');
  const [eplantas, setEplantas] = useState(20);
  const [edp, setEdp] = useState(14);
  const [ede, setEde] = useState(21);
  const [eda, setEda] = useState(21);

  const variedadItems = useMemo(
    () => Object.fromEntries((state.vars || []).map((v) => [String(v.id), varLabel(v)])),
    [state.vars]
  );

  function handleAgregar() {
    const vIdNum = vId ? parseInt(vId, 10) : null;
    if (!vIdNum) {
      alert('Selecciona variedad');
      return;
    }
    const variedad = gv(state.vars, vIdNum);
    update((draft) =>
      addPlanItem(draft, {
        varId: vIdNum,
        varNom: variedad.nombre,
        freq: parseInt(freq, 10),
        plantas: plantas || 20,
        dp: dp || 14,
        de: de || 21,
        da: da || 21,
      })
    );
  }

  function abrirEditar(p: PlanItem) {
    setEditingId(p.id);
    setEvId(String(p.varId));
    setEfreq(String(p.freq));
    setEplantas(p.plantas);
    setEdp(p.dp);
    setEde(p.de);
    setEda(p.da);
  }

  function guardarEdicion() {
    const vIdNum = evId ? parseInt(evId, 10) : null;
    if (!vIdNum || editingId == null) return;
    const variedad = gv(state.vars, vIdNum);
    update((draft) =>
      editPlanItem(draft, {
        id: editingId,
        varId: vIdNum,
        varNom: variedad.nombre,
        freq: parseInt(efreq, 10),
        plantas: eplantas || 20,
        dp: edp || 14,
        de: ede || 21,
        da: eda || 21,
      })
    );
    setEditingId(null);
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <Plus className="size-4 text-muted-foreground" />
            Agregar al plan
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
            <Label>Frecuencia</Label>
            <Select value={freq} onValueChange={(v) => setFreq(v ?? '7')} items={FRECUENCIA_ITEMS}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FRECUENCIAS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Plantas a sembrar</Label>
            <Input type="number" min={1} value={plantas} onChange={(e) => setPlantas(parseInt(e.target.value, 10) || 0)} />
          </div>
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
          <div className="flex justify-end">
            <Button onClick={handleAgregar}>Agregar</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2">
        {(state.plan || []).length ? (
          state.plan.map((p) => {
            const vence = planVence(p);
            const diasSig = p.ultimaSiembra ? Math.max(0, p.freq - dd(p.ultimaSiembra)) : 0;

            if (editingId === p.id) {
              return (
                <Card key={p.id}>
                  <CardContent className="grid gap-3 pt-4">
                    <div className="grid gap-1.5">
                      <Label>Variedad</Label>
                      <Select value={evId} onValueChange={(v) => setEvId(v ?? '')} items={variedadItems}>
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
                      <Label>Frecuencia</Label>
                      <Select value={efreq} onValueChange={(v) => setEfreq(v ?? '7')} items={FRECUENCIA_ITEMS}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FRECUENCIAS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Plantas a sembrar</Label>
                      <Input
                        type="number"
                        min={1}
                        value={eplantas}
                        onChange={(e) => setEplantas(parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="grid gap-1.5">
                        <Label>Días plantines</Label>
                        <Input type="number" min={1} value={edp} onChange={(e) => setEdp(parseInt(e.target.value, 10) || 1)} />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Días engorda</Label>
                        <Input type="number" min={1} value={ede} onChange={(e) => setEde(parseInt(e.target.value, 10) || 1)} />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Días adulto</Label>
                        <Input type="number" min={1} value={eda} onChange={(e) => setEda(parseInt(e.target.value, 10) || 1)} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                      <Button onClick={guardarEdicion}>Guardar</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card key={p.id} className="py-0">
                <CardContent className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {p.varNom}
                      <Badge
                        variant="outline"
                        className={
                          vence
                            ? 'border-transparent bg-warning/10 text-warning'
                            : 'border-transparent bg-success/10 text-success'
                        }
                      >
                        {vence ? 'Sembrar ya' : diasSig <= 1 ? 'Mañana' : `en ${diasSig} días`}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Cada {p.freq === 1 ? 'día' : `${p.freq} días`} · {p.plantas} plantas ·{' '}
                      {p.ultimaSiembra ? `Última: ${fd(p.ultimaSiembra)}` : 'Sin siembra'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Pauta: {p.dp}d + {p.de}d + {p.da}d = {p.dp + p.de + p.da} días
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => abrirEditar(p)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-destructive"
                      onClick={() => update((draft) => deletePlanItem(draft, p.id))}
                    >
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">Sin plan definido.</p>
        )}
      </div>
    </div>
  );
}
