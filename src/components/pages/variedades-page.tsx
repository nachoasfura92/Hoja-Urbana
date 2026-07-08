'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { addVariedad, deleteVariedad } from '@/lib/greenhouse/actions';

export function VariedadesPage() {
  const { state, update } = useGreenhouse();
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [tipo, setTipo] = useState('');

  function handleAgregar() {
    const n = nombre.trim();
    if (!n) {
      alert('Nombre requerido');
      return;
    }
    update((draft) => addVariedad(draft, { nombre: n, marca: marca.trim(), tipo: tipo.trim() }));
    setNombre('');
    setMarca('');
    setTipo('');
  }

  function handleEliminar(id: number, nombreVar: string) {
    if (!confirm(`Eliminar "${nombreVar}"?`)) return;
    update((draft) => deleteVariedad(draft, id));
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <Plus className="size-4 text-muted-foreground" />
            Nueva variedad
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Variedad</Label>
              <Input placeholder="Española" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Marca</Label>
              <Input placeholder="Hazera" value={marca} onChange={(e) => setMarca(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Nombre</Label>
              <Input placeholder="Verde" value={tipo} onChange={(e) => setTipo(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAgregar}>Agregar</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2">
        {(state.vars || []).length ? (
          state.vars.map((v) => (
            <Card key={v.id} className="py-0">
              <CardContent className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                <div>
                  <div className="text-sm font-medium">{v.nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    {v.marca || '—'}
                    {v.tipo ? ` · ${v.tipo}` : ''}
                  </div>
                </div>
                <Button variant="link" className="h-auto p-0 text-destructive" onClick={() => handleEliminar(v.id, v.nombre)}>
                  Eliminar
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Sin variedades.</p>
        )}
      </div>
    </div>
  );
}
