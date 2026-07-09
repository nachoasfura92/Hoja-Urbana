'use client';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MiniProgress } from '@/components/dashboard/mini-progress';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useModals } from '@/lib/greenhouse/modals-context';
import { limpiarBancal } from '@/lib/greenhouse/actions';
import { COLORS_VAR } from '@/lib/greenhouse/constants';
import { capacidadTubos, dd, dr, fd, fracTubosStr, getBanc, maxPlantas, plantasEnBanc } from '@/lib/greenhouse/helpers';

export function BancalModal() {
  const { state, update } = useGreenhouse();
  const { bancal, closeBancal, openLote, openMover, openCosechar } = useModals();

  if (!bancal) {
    return <Dialog open={false} onOpenChange={() => closeBancal()} />;
  }

  const { tipo, num } = bancal;
  const k = `${tipo}_${num}`;
  const tL = tipo === 'eng' ? 'Engorda' : 'Adulto';
  const maxTub = capacidadTubos(k);
  const maxP = maxPlantas(k);
  const usP = plantasEnBanc(state.bancales, k);
  const libP = maxP - usP;
  const slots = getBanc(state.bancales, k);
  const lotes = state.lotes.filter((l) => l.bancalId === k && l.etapa !== 'cosechado');

  function irA(fn: (id: number) => void, id: number) {
    closeBancal();
    fn(id);
  }

  function handleLimpiar() {
    if (!confirm('¿Eliminar todos los registros de este bancal?')) return;
    update((draft) => limpiarBancal(draft, k));
    closeBancal();
  }

  return (
    <Dialog open={!!bancal} onOpenChange={(o) => !o && closeBancal()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Bancal {tL} {num}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 text-center">
          <MiniStat label="Plantas" value={usP} sub={`${fracTubosStr(usP)} tubos`} />
          <MiniStat label="Espacio libre" value={libP} sub={`${fracTubosStr(libP)} tubos`} valueClassName="text-success" />
          <MiniStat label="Capacidad" value={maxP} sub={`${maxTub} tubos`} valueClassName="text-muted-foreground" />
        </div>
        <MiniProgress
          value={Math.round((usP / maxP) * 100)}
          color={usP === maxP ? 'var(--warning)' : '#2A7D2E'}
        />

        {slots.length > 0 && (
          <div className="grid gap-1.5">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Por variedad</h4>
            {slots.map((s, i) => {
              const pct = Math.round((s.plantas / maxP) * 100);
              const color = COLORS_VAR[i % COLORS_VAR.length];
              return (
                <div key={s.varId} className="grid gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: color }} />
                      <span className="text-sm font-medium">{s.varNom}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {s.plantas} plantas · {fracTubosStr(s.plantas)} tubos ({pct}%)
                    </span>
                  </div>
                  <MiniProgress value={pct} color={color} />
                </div>
              );
            })}
          </div>
        )}

        {lotes.length > 0 ? (
          <div className="grid gap-1.5">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lotes</h4>
            {lotes.map((l) => {
              const dias = dd(l.fechaEtapa);
              const dObj = tipo === 'eng' ? l.de : l.da;
              const pct = Math.min(100, Math.round((dias / dObj) * 100));
              const drest = dr(l.fechaVenta);
              return (
                <div
                  key={l.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => irA(openLote, l.id)}
                  onKeyDown={(e) => e.key === 'Enter' && irA(openLote, l.id)}
                  className="cursor-pointer rounded-md border px-3 py-2 transition-colors hover:border-primary"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{l.varNom}</div>
                    <div className="flex gap-1">
                      {tipo === 'adu' && (
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            irA(openCosechar, l.id);
                          }}
                        >
                          Cosechar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          irA(openMover, l.id);
                        }}
                      >
                        Mover
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {l.plantasRestantes} plantas · {fracTubosStr(l.plantasRestantes)} tubos · día {dias}/{dObj}
                  </div>
                  <div className="text-xs text-muted-foreground">Cosecha est. {fd(l.fechaVenta)}</div>
                  <MiniProgress value={pct} color={pct >= 100 ? 'var(--success)' : '#2A7D2E'} className="mt-1" />
                  {drest <= 5 && (
                    <div className="mt-1 text-xs text-success">{drest <= 0 ? 'Lista para cosechar' : `Lista en ${drest} días`}</div>
                  )}
                  {l.notas && <div className="mt-1 text-xs italic text-muted-foreground">{l.notas}</div>}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Bancal libre.</p>
        )}

        <DialogFooter>
          {tipo === 'eng' && (
            <Button variant="destructive" onClick={handleLimpiar}>
              Limpiar bancal
            </Button>
          )}
          <Button variant="outline" onClick={closeBancal}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MiniStat({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: number;
  sub: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-md bg-muted/60 px-2.5 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-medium ${valueClassName ?? ''}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
