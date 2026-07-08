'use client';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ResumenRegistro {
  titulo: string;
  filas: { label: string; value: string }[];
  ejecutar: () => void;
}

// Ventana de confirmación con un resumen de lo que se va a registrar, usada
// antes de ejecutar una tarea que no es "hoy sin editar" (vencida, de mañana,
// o con valores editados manualmente).
export function ResumenRegistroDialog({ resumen, onClose }: { resumen: ResumenRegistro | null; onClose: () => void }) {
  return (
    <Dialog open={!!resumen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{resumen?.titulo}</DialogTitle>
        </DialogHeader>
        {resumen && (
          <div className="grid gap-1.5 rounded-md bg-muted/60 p-3 text-sm">
            {resumen.filas.map((f) => (
              <div key={f.label} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{f.label}</span>
                <span className="font-medium">{f.value}</span>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              resumen?.ejecutar();
              onClose();
            }}
          >
            Confirmar y registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
