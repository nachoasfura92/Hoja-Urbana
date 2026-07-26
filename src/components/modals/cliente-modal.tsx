'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { addCliente, editCliente } from '@/lib/greenhouse/actions';
import type { Cliente } from '@/lib/greenhouse/types';

// null = cerrado; 'nuevo' = crear; un Cliente = editar ese cliente.
export type ClienteModalTarget = 'nuevo' | Cliente | null;

export function ClienteModal({ target, onClose }: { target: ClienteModalTarget; onClose: () => void }) {
  const { update } = useGreenhouse();

  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [direccionFacturacion, setDireccionFacturacion] = useState('');
  const [direccionEntrega, setDireccionEntrega] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [notas, setNotas] = useState('');

  // Reinicializa el formulario cuando se abre un target distinto (patrón
  // "ajustar estado durante el render" en vez de un efecto).
  const [lastKey, setLastKey] = useState<string | null>(null);
  const key = target === 'nuevo' ? 'nuevo' : target ? `editar_${target.id}` : null;
  if (target && key !== lastKey) {
    setLastKey(key);
    const c = target === 'nuevo' ? null : target;
    setNombre(c?.nombre ?? '');
    setRut(c?.rut ?? '');
    setDireccionFacturacion(c?.direccionFacturacion ?? '');
    setDireccionEntrega(c?.direccionEntrega ?? '');
    setCorreo(c?.correo ?? '');
    setTelefono(c?.telefono ?? '');
    setNotas(c?.notas ?? '');
  }

  if (!target) {
    return <Dialog open={false} onOpenChange={() => onClose()} />;
  }

  const puedeGuardar = nombre.trim().length > 0;

  function handleGuardar() {
    if (!puedeGuardar || !target) return;
    const params = {
      nombre: nombre.trim(),
      rut: rut.trim() || undefined,
      direccionFacturacion: direccionFacturacion.trim() || undefined,
      direccionEntrega: direccionEntrega.trim() || undefined,
      correo: correo.trim() || undefined,
      telefono: telefono.trim() || undefined,
      notas: notas.trim() || undefined,
    };
    if (target === 'nuevo') {
      update((draft) => addCliente(draft, params));
    } else {
      const id = target.id;
      update((draft) => editCliente(draft, { id, ...params }));
    }
    onClose();
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{target === 'nuevo' ? 'Nuevo cliente' : 'Editar cliente'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Nombre / razón social</Label>
              <Input placeholder="Ej: Restaurante El Huerto" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>RUT</Label>
              <Input placeholder="Ej: 76.123.456-7" value={rut} onChange={(e) => setRut(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Dirección de facturación</Label>
            <Input value={direccionFacturacion} onChange={(e) => setDireccionFacturacion(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Dirección de entrega</Label>
            <Input value={direccionEntrega} onChange={(e) => setDireccionEntrega(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Correo</Label>
              <Input type="email" placeholder="contacto@cliente.cl" value={correo} onChange={(e) => setCorreo(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Teléfono</Label>
              <Input placeholder="+56 9 1234 5678" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Notas</Label>
            <Textarea rows={2} placeholder="Observaciones..." value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={!puedeGuardar}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
