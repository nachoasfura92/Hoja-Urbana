'use client';

import { ArrowRightLeft, Sprout, Wheat, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useModals } from '@/lib/greenhouse/modals-context';
import { dr, fd, fracTubosStr } from '@/lib/greenhouse/helpers';
import { calcularTareasHoy } from '@/lib/greenhouse/tareas';
import { EtapaBadge } from '@/components/dashboard/etapa-badge';
import type { Lote } from '@/lib/greenhouse/types';

export function ResumenPage() {
  const { state } = useGreenhouse();
  const { openLote } = useModals();
  const lotes = state.lotes || [];
  const merma = state.merma || { plantines: 0, engorda: 0, adulto: 0 };

  const enP = lotes.filter((l) => l.etapa === 'plantines');
  const enE = lotes.filter((l) => l.etapa === 'engorda');
  const enA = lotes.filter((l) => l.etapa === 'adulto');
  const listos = enA.filter((l) => dr(l.fechaVenta) <= 0);
  const sum = (arr: Lote[]) => arr.reduce((t, l) => t + (l.plantasRestantes || 0), 0);

  // Resumen de tareas de hoy y mañana (sin notificaciones detalladas): la
  // misma ventana y lógica que el módulo "Tareas de hoy" para siembra y
  // traspasos; cosecha se cuenta aparte porque ese módulo no la incluye.
  const tareas = calcularTareasHoy(state);
  const tareasSiembra = tareas.filter((t) => t.tipo === 'sembrar').length;
  const tareasTraspaso = tareas.filter((t) => t.tipo !== 'sembrar').length;
  const tareasCosecha = enA.filter((l) => dr(l.fechaVenta) <= 1).length;

  const proximas = [...lotes]
    .filter((l) => l.etapa !== 'cosechado')
    .sort((a, b) => new Date(a.fechaVenta).getTime() - new Date(b.fechaVenta).getTime())
    .slice(0, 5);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Plantas plantines" value={sum(enP)} border="border-l-primary" />
        <StatCard label="Plantas engorda" value={sum(enE)} border="border-l-warning" />
        <StatCard label="Plantas adulto" value={sum(enA)} border="border-l-success" valueClassName="text-foreground" />
        <StatCard label="Listas venta" value={sum(listos)} border="border-l-destructive" valueClassName="text-success" />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Merma acumulada (plantas)
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <MermaCard label="Merma plantines" value={merma.plantines} />
          <MermaCard label="Merma engorda" value={merma.engorda} />
          <MermaCard label="Merma adulto" value={merma.adulto} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tareas — hoy y mañana</h3>
        <div className="grid grid-cols-3 gap-3">
          <TareaCountCard label="Siembra" value={tareasSiembra} icon={Sprout} />
          <TareaCountCard label="Traspasos" value={tareasTraspaso} icon={ArrowRightLeft} />
          <TareaCountCard label="Cosecha" value={tareasCosecha} icon={Wheat} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Próximas cosechas</h3>
        <div className="grid gap-2">
          {proximas.length ? (
            proximas.map((l) => {
              const d = dr(l.fechaVenta);
              return (
                <Card
                  key={l.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openLote(l.id)}
                  onKeyDown={(e) => e.key === 'Enter' && openLote(l.id)}
                  className="cursor-pointer py-0 transition-colors hover:border-primary"
                >
                  <CardContent className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        {l.varNom} <EtapaBadge etapa={l.etapa} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {l.plantasRestantes} plantas · {fracTubosStr(l.plantasRestantes)} tubos · est. {fd(l.fechaVenta)}
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${d <= 5 ? 'text-success' : 'text-muted-foreground'}`}>
                      {d <= 0 ? 'Hoy' : `${d} días`}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">Sin lotes activos.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  border,
  valueClassName,
}: {
  label: string;
  value: number;
  border: string;
  valueClassName?: string;
}) {
  return (
    <Card className={`border-l-4 py-0 ${border}`}>
      <CardContent className="px-3.5 py-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-xl font-medium ${valueClassName ?? ''}`}>{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

function MermaCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="py-0">
      <CardContent className="px-3 py-2.5">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-sm font-medium ${value > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function TareaCountCard({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-2.5 px-3.5 py-3">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <div>
          <div className={`text-lg font-medium ${value > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
