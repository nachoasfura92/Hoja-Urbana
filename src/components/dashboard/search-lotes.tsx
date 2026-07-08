'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BanderaBadge } from '@/components/dashboard/bandera-badge';
import { EtapaBadge } from '@/components/dashboard/etapa-badge';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useModals } from '@/lib/greenhouse/modals-context';
import { buscarLotes, dd, dr, fracTubosStr, varLabel } from '@/lib/greenhouse/helpers';

function formatBancal(bancalId: string | null): string {
  if (!bancalId) return 'Sin bancal asignado';
  const [tipo, num] = bancalId.split('_');
  return `${tipo === 'eng' ? 'Engorda' : 'Adulto'} ${num}`;
}

export function SearchLotes() {
  const { state } = useGreenhouse();
  const { openLote } = useModals();
  const [open, setOpen] = useState(false);
  const [bandera, setBandera] = useState('');
  const [varId, setVarId] = useState('todas');
  const [diasMin, setDiasMin] = useState('');
  const [diasCosechaMax, setDiasCosechaMax] = useState('');

  const variedadItems = useMemo(
    () => ({ todas: 'Todas', ...Object.fromEntries((state.vars || []).map((v) => [String(v.id), varLabel(v)])) }),
    [state.vars]
  );

  const resultados = useMemo(
    () =>
      buscarLotes(state.lotes, {
        bandera: bandera ? parseInt(bandera, 10) : null,
        varId: varId === 'todas' ? null : parseInt(varId, 10),
        diasCrecimientoMin: diasMin ? parseInt(diasMin, 10) : null,
        diasCosechaMax: diasCosechaMax !== '' ? parseInt(diasCosechaMax, 10) : null,
      }),
    [state.lotes, bandera, varId, diasMin, diasCosechaMax]
  );

  function limpiarFiltros() {
    setBandera('');
    setVarId('todas');
    setDiasMin('');
    setDiasCosechaMax('');
  }

  function verLote(id: number) {
    setOpen(false);
    openLote(id);
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Buscar lote">
        <Search className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Search className="size-4" />
              Buscar lote
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>N° de bandera</Label>
              <Input
                type="number"
                min={1}
                placeholder="Ej: 4"
                value={bandera}
                onChange={(e) => setBandera(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Variedad</Label>
                <Select value={varId} onValueChange={(v) => setVarId(v ?? 'todas')} items={variedadItems}>
                  <SelectTrigger className="w-full">
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
                <Label className="text-xs">Días crec. mín.</Label>
                <Input type="number" min={0} placeholder="0" value={diasMin} onChange={(e) => setDiasMin(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Cosecha en ≤ días</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Ej: 5"
                  value={diasCosechaMax}
                  onChange={(e) => setDiasCosechaMax(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="link" className="h-auto p-0 text-xs" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            </div>
          </div>

          <div className="grid max-h-80 gap-2 overflow-y-auto">
            {resultados.length ? (
              resultados.map((l) => {
                const dias = dd(l.fechaEtapa);
                const drest = dr(l.fechaVenta);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => verLote(l.id)}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left hover:bg-muted/40"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <BanderaBadge numero={l.bandera} />
                        {l.varNom}
                        <EtapaBadge etapa={l.etapa} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatBancal(l.bancalId)} · día {dias} · {l.plantasRestantes} plantas ·{' '}
                        {fracTubosStr(l.plantasRestantes)} tubos
                      </div>
                    </div>
                    <div className={`shrink-0 text-xs font-medium ${drest <= 5 ? 'text-success' : 'text-muted-foreground'}`}>
                      {drest <= 0 ? 'Lista' : `${drest}d p/cosecha`}
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">Sin resultados.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
