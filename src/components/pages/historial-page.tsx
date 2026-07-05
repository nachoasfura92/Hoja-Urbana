'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { fd } from '@/lib/greenhouse/helpers';

export function HistorialPage() {
  const { state } = useGreenhouse();
  const historial = state.historial || [];

  return (
    <Card>
      <CardContent>
        <div className="grid grid-cols-[68px_85px_1fr_100px] gap-2 border-b pb-1.5 text-xs font-medium text-muted-foreground">
          <span>Fecha</span>
          <span>Acción</span>
          <span>Detalle</span>
          <span>Por</span>
        </div>
        {historial.length ? (
          historial.map((h) => (
            <div key={h.id} className="grid grid-cols-[68px_85px_1fr_100px] gap-2 border-b py-1.5 text-sm last:border-b-0">
              <span className="font-medium text-muted-foreground">{fd(h.fecha)}</span>
              <span className="font-medium">{h.accion}</span>
              <span>{h.detalle}</span>
              <span className="truncate text-muted-foreground">{h.autor || '—'}</span>
            </div>
          ))
        ) : (
          <p className="pt-2 text-sm text-muted-foreground">Sin registros.</p>
        )}
      </CardContent>
    </Card>
  );
}
