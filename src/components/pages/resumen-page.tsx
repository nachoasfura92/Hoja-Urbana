'use client';

import { AlertTriangle, Info, ShoppingCart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { dr, fd, fmas, fracTubosStr, planVence } from '@/lib/greenhouse/helpers';
import { AlertRow, type AlertKind } from '@/components/dashboard/alert-row';
import { EtapaBadge } from '@/components/dashboard/etapa-badge';
import type { Lote } from '@/lib/greenhouse/types';

interface AlertaItem {
  kind: AlertKind;
  icon: typeof AlertTriangle;
  node: React.ReactNode;
  key: string;
}

export function ResumenPage() {
  const { state } = useGreenhouse();
  const lotes = state.lotes || [];
  const plan = state.plan || [];
  const merma = state.merma || { plantines: 0, engorda: 0, adulto: 0 };

  const enP = lotes.filter((l) => l.etapa === 'plantines');
  const enE = lotes.filter((l) => l.etapa === 'engorda');
  const enA = lotes.filter((l) => l.etapa === 'adulto');
  const listos = enA.filter((l) => dr(l.fechaVenta) <= 0);
  const sum = (arr: Lote[]) => arr.reduce((t, l) => t + (l.plantasRestantes || 0), 0);

  const alertas: AlertaItem[] = [];
  lotes
    .filter((l) => l.etapa !== 'cosechado')
    .forEach((l) => {
      if (l.etapa === 'plantines') {
        const d = dr(fmas(l.fechaInicio, l.dp));
        if (d <= 2) {
          alertas.push({
            kind: 'warning',
            icon: AlertTriangle,
            key: `p-${l.id}`,
            node: (
              <>
                Mover a engorda: <strong>{l.varNom}</strong> {l.plantasRestantes} plantas{' '}
                {d <= 0 ? '(pauta vencida)' : `en ${d} días`}
              </>
            ),
          });
        }
      }
      if (l.etapa === 'engorda') {
        const d = dr(fmas(l.fechaEtapa, l.de));
        if (d <= 2) {
          alertas.push({
            kind: 'warning',
            icon: AlertTriangle,
            key: `e-${l.id}`,
            node: (
              <>
                Pasar a adulto: <strong>{l.varNom}</strong> {l.plantasRestantes} plantas{' '}
                {d <= 0 ? '(pauta vencida)' : `en ${d} días`}
              </>
            ),
          });
        }
      }
      if (l.etapa === 'adulto') {
        const d = dr(l.fechaVenta);
        if (d <= 5) {
          alertas.push({
            kind: 'success',
            icon: ShoppingCart,
            key: `a-${l.id}`,
            node: (
              <>
                Lista para venta: <strong>{l.varNom}</strong> — {l.plantasRestantes} plantas {d <= 0 ? 'HOY' : `en ${d} días`}
              </>
            ),
          });
        }
      }
    });
  plan.forEach((p) => {
    if (planVence(p)) {
      alertas.push({
        kind: 'info',
        icon: Info,
        key: `plan-${p.id}`,
        node: (
          <>
            Plan: sembrar <strong>{p.varNom}</strong> ({p.plantas} plantas)
          </>
        ),
      });
    }
  });

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

      <div className="grid gap-1.5">
        {alertas.length ? (
          alertas.map((a) => (
            <AlertRow key={a.key} kind={a.kind} icon={a.icon}>
              {a.node}
            </AlertRow>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Sin alertas pendientes.</p>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Próximas cosechas</h3>
        <div className="grid gap-2">
          {proximas.length ? (
            proximas.map((l) => {
              const d = dr(l.fechaVenta);
              return (
                <Card key={l.id} className="py-0">
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
