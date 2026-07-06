'use client';

import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertRow } from '@/components/dashboard/alert-row';
import { fd, fracTubosStr, type EvaluacionSiembra } from '@/lib/greenhouse/helpers';

export function ValidarSiembraModal({
  open,
  onOpenChange,
  evaluacion,
  plantas,
  bandera,
  fechaSiembra,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluacion: EvaluacionSiembra | null;
  plantas: number;
  bandera: number;
  fechaSiembra: string;
  onConfirm: () => void;
}) {
  if (!evaluacion) return null;
  const { variedad, sem, cub, plan, total, bloqueante } = evaluacion;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Validar siembra</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5 rounded-md bg-muted/60 p-3 text-sm">
            <Row label="Variedad" value={variedad.nombre} />
            <Row label="Fecha de siembra" value={fd(fechaSiembra)} />
            <Row label="Plantas" value={String(plantas)} />
            <Row label="Tubos equivalentes" value={`${fracTubosStr(plantas)} tubos`} />
            <Row label="N° de bandera" value={String(bandera)} />
          </div>

          {sem < plantas && (
            <AlertRow kind="danger" icon={AlertTriangle}>
              Semillas insuficientes: {sem} disponibles, necesitas {plantas}.
            </AlertRow>
          )}
          {cub < plantas && (
            <AlertRow kind="danger" icon={AlertTriangle}>
              Cubos insuficientes: {cub} disponibles, necesitas {plantas}.
            </AlertRow>
          )}
          {plan && total < plan.plantas && (
            <AlertRow kind="warning" icon={AlertTriangle}>
              Siembra incompleta: quedarán {plan.plantas - total} plantas sin sembrar.
            </AlertRow>
          )}
          {plan && total > plan.plantas && (
            <AlertRow kind="danger" icon={AlertTriangle}>
              Excede el plan en {total - plan.plantas} plantas.
            </AlertRow>
          )}
          {plan && total === plan.plantas && (
            <AlertRow kind="success" icon={CheckCircle2}>
              Completa exactamente el plan de hoy ✓
            </AlertRow>
          )}
          {!plan && (
            <AlertRow kind="info" icon={Info}>
              No corresponde a ningún plan programado para hoy.
            </AlertRow>
          )}

          {!bloqueante && (
            <p className="text-xs text-muted-foreground">¿Confirmar y agregar a mesa de plantines?</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {!bloqueante && <Button onClick={onConfirm}>Confirmar siembra</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <strong className="font-medium">{value}</strong>
    </div>
  );
}
