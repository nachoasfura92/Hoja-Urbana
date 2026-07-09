'use client';

import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { addVariedad, deleteVariedad, editVariedad } from '@/lib/greenhouse/actions';
import type { Variedad } from '@/lib/greenhouse/types';

export function VariedadesPage() {
  const { state, update } = useGreenhouse();
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [tipo, setTipo] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [enombre, setEnombre] = useState('');
  const [emarca, setEmarca] = useState('');
  const [etipo, setEtipo] = useState('');

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

  function abrirEditar(v: Variedad) {
    setEditingId(v.id);
    setEnombre(v.nombre);
    setEmarca(v.marca || '');
    setEtipo(v.tipo || '');
  }

  function guardarEdicion() {
    const n = enombre.trim();
    if (!n || editingId == null) return;
    update((draft) => editVariedad(draft, { id: editingId, nombre: n, marca: emarca.trim(), tipo: etipo.trim() }));
    setEditingId(null);
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
          state.vars.map((v) => {
            if (editingId === v.id) {
              return (
                <Card key={v.id}>
                  <CardContent className="grid gap-3 pt-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="grid gap-1.5">
                        <Label>Variedad</Label>
                        <Input value={enombre} onChange={(e) => setEnombre(e.target.value)} />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Marca</Label>
                        <Input value={emarca} onChange={(e) => setEmarca(e.target.value)} />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Nombre</Label>
                        <Input value={etipo} onChange={(e) => setEtipo(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                      <Button onClick={guardarEdicion}>Guardar</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }
            return (
              <Card key={v.id} className="py-0">
                <CardContent className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                  <div>
                    <div className="text-sm font-medium">{v.nombre}</div>
                    <div className="text-xs text-muted-foreground">
                      {v.marca || '—'}
                      {v.tipo ? ` · ${v.tipo}` : ''}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => abrirEditar(v)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-destructive"
                      onClick={() => handleEliminar(v.id, v.nombre)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">Sin variedades.</p>
        )}
      </div>
    </div>
  );
}
