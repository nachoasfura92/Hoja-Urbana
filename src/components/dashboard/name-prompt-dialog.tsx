'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/lib/auth/current-user-context';

// Se muestra una única vez, la primera vez que un usuario entra sin nombre
// configurado. Ese nombre es el que aparece en la trazabilidad de siembras,
// traspasos de bancal y cosechas.
export function NamePromptDialog() {
  const { loading, email, displayName, setDisplayName } = useCurrentUser();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // Solo tiene sentido pedir el nombre si hay una sesión real confirmada.
  const open = !loading && !!email && !displayName;

  async function handleGuardar() {
    if (!name.trim()) return;
    setSaving(true);
    await setDisplayName(name.trim());
    setSaving(false);
  }

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>¿Cómo te llamás?</DialogTitle>
          <DialogDescription>
            Este nombre va a aparecer en el historial cada vez que registrés una siembra, un traspaso de bancal o una
            cosecha.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label>Nombre</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Juan"
            onKeyDown={(e) => e.key === 'Enter' && handleGuardar()}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleGuardar} disabled={!name.trim() || saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
