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
import { buscarLotes, dd, dr, fracTubosStr, ubicacionLote, varLabel, varLabelPorId, type OrdenLotes } from '@/lib/greenhouse/helpers';
import { cn } from '@/lib/utils';
import type { Etapa } from '@/lib/greenhouse/types';

const ETAPAS: { etapa: Etapa; label: string }[] = [
  { etapa: 'plantines', label: 'Mesa de plantines' },
  { etapa: 'engorda', label: 'Bancales de engorda' },
  { etapa: 'adulto', label: 'Bancales de adulto' },
];

const ORDEN_ITEMS: Record<OrdenLotes, string> = {
  cosecha: 'Próxima cosecha',
  crecimiento_desc: 'Más días creciendo',
  crecimiento_asc: 'Menos días creciendo',
  variedad: 'Variedad',
  bandera: 'N° de bandera',
};

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  );
}

export function SearchLotes() {
  const { state } = useGreenhouse();
  const { openLote } = useModals();
  const [open, setOpen] = useState(false);
  const [bandera, setBandera] = useState('');
  const [varIds, setVarIds] = useState<number[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [diasMin, setDiasMin] = useState('');
  const [diasCosechaMax, setDiasCosechaMax] = useState('');
  const [orden, setOrden] = useState<OrdenLotes>('cosecha');

  function toggleVar(id: number) {
    setVarIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleEtapa(etapa: Etapa) {
    setEtapas((prev) => (prev.includes(etapa) ? prev.filter((x) => x !== etapa) : [...prev, etapa]));
  }

  const resultados = useMemo(
    () =>
      buscarLotes(
        state.lotes,
        {
          bandera: bandera ? parseInt(bandera, 10) : null,
          varIds,
          etapas,
          diasCrecimientoMin: diasMin ? parseInt(diasMin, 10) : null,
          diasCosechaMax: diasCosechaMax !== '' ? parseInt(diasCosechaMax, 10) : null,
        },
        orden
      ),
    [state.lotes, bandera, varIds, etapas, diasMin, diasCosechaMax, orden]
  );

  function limpiarFiltros() {
    setBandera('');
    setVarIds([]);
    setEtapas([]);
    setDiasMin('');
    setDiasCosechaMax('');
    setOrden('cosecha');
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
            <div className="grid grid-cols-2 gap-2">
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
              <div className="grid gap-1.5">
                <Label className="text-xs">Ordenar por</Label>
                <Select value={orden} onValueChange={(v) => setOrden((v as OrdenLotes) ?? 'cosecha')} items={ORDEN_ITEMS}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ORDEN_ITEMS) as OrdenLotes[]).map((o) => (
                      <SelectItem key={o} value={o}>
                        {ORDEN_ITEMS[o]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Variedad (elige una o varias — ninguna = todas)</Label>
              <div className="flex flex-wrap gap-1.5">
                {(state.vars || []).map((v) => (
                  <Chip key={v.id} active={varIds.includes(v.id)} onClick={() => toggleVar(v.id)}>
                    {varLabel(v)}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Ubicación (ninguna = todas)</Label>
              <div className="flex flex-wrap gap-1.5">
                {ETAPAS.map((e) => (
                  <Chip key={e.etapa} active={etapas.includes(e.etapa)} onClick={() => toggleEtapa(e.etapa)}>
                    {e.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
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
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{resultados.length} resultado{resultados.length === 1 ? '' : 's'}</p>
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
                        {varLabelPorId(state.vars, l.varId)}
                        <EtapaBadge etapa={l.etapa} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ubicacionLote(l)} · día {dias} de crecimiento · {l.plantasRestantes} plantas ·{' '}
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
