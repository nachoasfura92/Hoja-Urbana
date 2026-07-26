'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  ShoppingCart,
  Sprout,
  Trash2,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MiniProgress } from '@/components/dashboard/mini-progress';
import { ClienteModal, type ClienteModalTarget } from '@/components/modals/cliente-modal';
import { PedidoModal, type PedidoModalTarget } from '@/components/modals/pedido-modal';
import { ResumenRegistroDialog, type ResumenRegistro } from '@/components/modals/resumen-registro-dialog';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { useCurrentUser } from '@/lib/auth/current-user-context';
import { addPlanItem, cumplirPedidoUnico, deleteCliente, deletePedido, editPlanItem } from '@/lib/greenhouse/actions';
import {
  calcularDemandaAgregada,
  dr,
  fd,
  fechaSiembraPedido,
  fracTubosStr,
  pedidosDeCliente,
  pedidosUnicosPendientes,
  proximaBandera,
  varLabelPorId,
  type DemandaVariedad,
} from '@/lib/greenhouse/helpers';
import type { Cliente, PedidoCliente } from '@/lib/greenhouse/types';
import { cn } from '@/lib/utils';

export function ClientesPage() {
  const { state, update } = useGreenhouse();
  const { displayName, email } = useCurrentUser();
  const autor = displayName || email || undefined;

  const [clienteModalTarget, setClienteModalTarget] = useState<ClienteModalTarget>(null);
  const [pedidoModalTarget, setPedidoModalTarget] = useState<PedidoModalTarget | null>(null);
  const [clienteDetalleId, setClienteDetalleId] = useState<number | null>(null);
  const [resumen, setResumen] = useState<ResumenRegistro | null>(null);

  const demanda = useMemo(
    () => calcularDemandaAgregada(state.pedidos, state.clientes, state.plan),
    [state.pedidos, state.clientes, state.plan]
  );
  const unicos = useMemo(() => pedidosUnicosPendientes(state.pedidos), [state.pedidos]);

  function crearOActualizarPlan(d: DemandaVariedad) {
    update((draft) => {
      if (d.planExistente) {
        editPlanItem(draft, {
          id: d.planExistente.id,
          varId: d.varId,
          varNom: d.varNom,
          freq: d.freq,
          plantas: d.plantas,
          dp: d.planExistente.dp,
          de: d.planExistente.de,
          da: d.planExistente.da,
        });
      } else {
        addPlanItem(draft, { varId: d.varId, varNom: d.varNom, freq: d.freq, plantas: d.plantas, dp: d.dp, de: d.de, da: d.da });
      }
    });
  }

  function sembrarPedidoUnico(p: PedidoCliente) {
    const fechaSiembra = fechaSiembraPedido(p);
    const bandera = proximaBandera(state.lotes);
    setResumen({
      titulo: `Sembrar pedido — ${p.varNom}`,
      filas: [
        { label: 'Cantidad', value: `${p.plantas} plantas (${fracTubosStr(p.plantas)} tubos)` },
        { label: 'Fecha de siembra', value: fd(fechaSiembra) },
        { label: 'N° de bandera', value: String(bandera) },
      ],
      ejecutar: () => update((draft) => cumplirPedidoUnico(draft, { pedidoId: p.id, fechaSiembra, bandera, autor })),
    });
  }

  function eliminarPedido(p: PedidoCliente) {
    if (!confirm(`¿Eliminar el pedido de ${p.varNom} (${p.plantas} plantas)?`)) return;
    update((draft) => deletePedido(draft, p.id));
  }

  function eliminarCliente(c: Cliente) {
    if (!confirm(`¿Eliminar a ${c.nombre}? También se eliminarán todos sus pedidos.`)) return;
    update((draft) => deleteCliente(draft, c.id));
    setClienteDetalleId(null);
  }

  return (
    <div className="grid gap-4">
      <Tabs defaultValue="demanda">
        <TabsList>
          <TabsTrigger value="demanda" className="gap-1.5">
            <ClipboardList className="size-3.5" />
            Demanda y plan
          </TabsTrigger>
          <TabsTrigger value="unicos" className="gap-1.5">
            <ShoppingCart className="size-3.5" />
            Pedidos únicos
            {unicos.length > 0 && <span className="ml-0.5 text-xs text-muted-foreground">({unicos.length})</span>}
          </TabsTrigger>
          <TabsTrigger value="clientes" className="gap-1.5">
            <Users className="size-3.5" />
            Clientes
            {state.clientes.length > 0 && <span className="ml-0.5 text-xs text-muted-foreground">({state.clientes.length})</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="demanda" className="mt-3">
          <p className="mb-3 text-sm text-muted-foreground">
            Suma de todos los pedidos recurrentes, agrupados por variedad y frecuencia — comparado con el plan de
            siembra actual, para saber qué plan falta crear o ajustar para cubrir a todos los clientes.
          </p>
          {demanda.length ? (
            <div className="grid gap-2">
              {demanda.map((d) => (
                <DemandaCard key={`${d.varId}_${d.freq}`} d={d} vars={state.vars} onCrearOActualizar={crearOActualizarPlan} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin pedidos recurrentes todavía.</p>
          )}
        </TabsContent>

        <TabsContent value="unicos" className="mt-3">
          <p className="mb-3 text-sm text-muted-foreground">
            Pedidos por una sola vez, ordenados por fecha de entrega — con la fecha de siembra sugerida ya calculada
            (entrega menos el ciclo completo, corrida a día hábil).
          </p>
          {unicos.length ? (
            <div className="grid gap-2">
              {unicos.map((p) => {
                const fechaSiembra = fechaSiembraPedido(p);
                const dias = dr(fechaSiembra);
                const cliente = state.clientes.find((c) => c.id === p.clienteId);
                return (
                  <Card key={p.id} className="py-0">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                          <Sprout className="size-4 shrink-0 text-success" />
                          {varLabelPorId(state.vars, p.varId)}
                          <Badge
                            variant="outline"
                            className={cn(
                              'border-transparent',
                              dias < 0
                                ? 'bg-destructive/10 text-destructive'
                                : dias <= 1
                                  ? 'bg-warning/10 text-warning'
                                  : 'bg-accent text-accent-foreground'
                            )}
                          >
                            {dias < 0 ? `Vencido hace ${Math.abs(dias)}d` : dias === 0 ? 'Sembrar hoy' : `Sembrar en ${dias}d`}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {cliente?.nombre ?? 'Cliente eliminado'} · {p.plantas} plantas · entrega {fd(p.fechaEntrega)} · siembra
                          sugerida {fd(fechaSiembra)}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => sembrarPedidoUnico(p)}>
                          <Sprout className="size-3.5" />
                          Sembrar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={() => setPedidoModalTarget({ clienteId: p.clienteId, pedido: p })}
                        >
                          <Pencil className="size-3.5" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => eliminarPedido(p)}
                        >
                          <Trash2 className="size-3.5" />
                          Eliminar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin pedidos únicos pendientes.</p>
          )}
        </TabsContent>

        <TabsContent value="clientes" className="mt-3">
          <div className="mb-3 flex justify-end">
            <Button onClick={() => setClienteModalTarget('nuevo')}>
              <Plus className="size-4" />
              Nuevo cliente
            </Button>
          </div>
          {state.clientes.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {state.clientes.map((c) => {
                const nPedidos = pedidosDeCliente(state.pedidos, c.id).length;
                return (
                  <Card
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setClienteDetalleId(c.id)}
                    onKeyDown={(e) => e.key === 'Enter' && setClienteDetalleId(c.id)}
                    className="cursor-pointer transition-colors hover:border-primary"
                  >
                    <CardContent className="grid gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <Building2 className="size-4 shrink-0 text-muted-foreground" />
                          {c.nombre}
                        </div>
                        <Badge variant="outline" className="shrink-0 border-transparent bg-accent text-accent-foreground">
                          {nPedidos} pedido{nPedidos === 1 ? '' : 's'}
                        </Badge>
                      </div>
                      <div className="grid gap-0.5 text-xs text-muted-foreground">
                        {c.correo && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="size-3 shrink-0" />
                            <span className="truncate">{c.correo}</span>
                          </div>
                        )}
                        {c.telefono && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="size-3 shrink-0" />
                            {c.telefono}
                          </div>
                        )}
                        {c.direccionEntrega && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{c.direccionEntrega}</span>
                          </div>
                        )}
                        {!c.correo && !c.telefono && !c.direccionEntrega && <span>Sin datos de contacto</span>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Todavía no hay clientes registrados.</p>
          )}
        </TabsContent>
      </Tabs>

      <ClienteModal target={clienteModalTarget} onClose={() => setClienteModalTarget(null)} />
      <PedidoModal target={pedidoModalTarget} onClose={() => setPedidoModalTarget(null)} />
      <ResumenRegistroDialog resumen={resumen} onClose={() => setResumen(null)} />

      <ClienteDetalleDialog
        clienteId={clienteDetalleId}
        onClose={() => setClienteDetalleId(null)}
        onEditarCliente={(c) => setClienteModalTarget(c)}
        onEliminarCliente={eliminarCliente}
        onNuevoPedido={(clienteId) => setPedidoModalTarget({ clienteId, pedido: 'nuevo' })}
        onEditarPedido={(p) => setPedidoModalTarget({ clienteId: p.clienteId, pedido: p })}
        onEliminarPedido={eliminarPedido}
      />
    </div>
  );
}

function DemandaCard({
  d,
  vars,
  onCrearOActualizar,
}: {
  d: DemandaVariedad;
  vars: { id: number; nombre: string; tipo?: string }[];
  onCrearOActualizar: (d: DemandaVariedad) => void;
}) {
  const cubierto = d.planExistente?.plantas ?? 0;
  const pct = d.plantas > 0 ? Math.round((cubierto / d.plantas) * 100) : 100;
  const estado = !d.planExistente ? 'sin_plan' : cubierto >= d.plantas ? 'cubierto' : 'falta';

  return (
    <Card className="py-0">
      <CardContent className="grid gap-2 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Package className="size-4 shrink-0 text-muted-foreground" />
            {varLabelPorId(vars, d.varId)}
            <Badge variant="outline" className="border-transparent bg-accent text-accent-foreground">
              cada {d.freq === 1 ? 'día' : `${d.freq} días`}
            </Badge>
          </div>
          {estado === 'cubierto' && (
            <Badge variant="outline" className="gap-1 border-transparent bg-success/10 text-success">
              <CheckCircle2 className="size-3" />
              Cubierto
            </Badge>
          )}
          {estado === 'falta' && (
            <Badge variant="outline" className="gap-1 border-transparent bg-warning/10 text-warning">
              <AlertTriangle className="size-3" />
              Falta {d.plantas - cubierto}
            </Badge>
          )}
          {estado === 'sin_plan' && (
            <Badge variant="outline" className="gap-1 border-transparent bg-destructive/10 text-destructive">
              <AlertTriangle className="size-3" />
              Sin plan de siembra
            </Badge>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Requerido: <strong className="text-foreground">{d.plantas}</strong> plantas
          {d.planExistente ? (
            <>
              {' '}
              · Plan actual: <strong className="text-foreground">{cubierto}</strong> plantas
            </>
          ) : null}
        </div>
        <MiniProgress
          value={Math.min(100, pct)}
          color={estado === 'cubierto' ? 'var(--success)' : estado === 'falta' ? 'var(--warning)' : 'var(--destructive)'}
        />

        <div className="text-xs text-muted-foreground">
          {d.pedidos.map((p) => `${p.clienteNombre} (${p.plantas})`).join(' + ')}
        </div>

        {estado !== 'cubierto' && (
          <div className="flex justify-end">
            <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => onCrearOActualizar(d)}>
              <Sprout className="size-3.5" />
              {d.planExistente ? `Ajustar plan a ${d.plantas} plantas` : 'Crear plan de siembra'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClienteDetalleDialog({
  clienteId,
  onClose,
  onEditarCliente,
  onEliminarCliente,
  onNuevoPedido,
  onEditarPedido,
  onEliminarPedido,
}: {
  clienteId: number | null;
  onClose: () => void;
  onEditarCliente: (c: Cliente) => void;
  onEliminarCliente: (c: Cliente) => void;
  onNuevoPedido: (clienteId: number) => void;
  onEditarPedido: (p: PedidoCliente) => void;
  onEliminarPedido: (p: PedidoCliente) => void;
}) {
  const { state } = useGreenhouse();
  const cliente = clienteId != null ? state.clientes.find((c) => c.id === clienteId) : null;

  if (!cliente) {
    return <Dialog open={false} onOpenChange={() => onClose()} />;
  }

  const pedidos = pedidosDeCliente(state.pedidos, cliente.id);

  return (
    <Dialog open={!!cliente} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            {cliente.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <InfoRow label="RUT" value={cliente.rut} />
          <InfoRow label="Correo" value={cliente.correo} />
          <InfoRow label="Teléfono" value={cliente.telefono} />
          <InfoRow label="Dirección facturación" value={cliente.direccionFacturacion} />
          <InfoRow label="Dirección entrega" value={cliente.direccionEntrega} className="col-span-2" />
        </div>
        {cliente.notas && (
          <div className="rounded-md border-l-2 border-primary bg-muted/40 px-3 py-2 text-sm">{cliente.notas}</div>
        )}

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pedidos</h4>
            <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => onNuevoPedido(cliente.id)}>
              <Plus className="size-3.5" />
              Nuevo pedido
            </Button>
          </div>
          <div className="grid max-h-64 gap-1.5 overflow-y-auto">
            {pedidos.length ? (
              pedidos.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {varLabelPorId(state.vars, p.varId)}
                      {p.periodicidad === 'unico' ? (
                        <Badge variant="outline" className="border-transparent bg-accent text-accent-foreground">
                          {p.cumplido ? 'Cumplido' : 'Único'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-transparent bg-accent text-accent-foreground">
                          cada {p.freq === 1 ? 'día' : `${p.freq} días`}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.plantas} plantas · {p.periodicidad === 'unico' ? 'entrega' : 'próxima entrega'} {fd(p.fechaEntrega)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => onEditarPedido(p)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => onEliminarPedido(p)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sin pedidos todavía.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="destructive" onClick={() => onEliminarCliente(cliente)}>
            Eliminar cliente
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={() => onEditarCliente(cliente)}>
            <Pencil className="size-3.5" />
            Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value, className }: { label: string; value?: string; className?: string }) {
  return (
    <div className={cn('rounded-md bg-muted/60 px-2.5 py-2', className)}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-medium">{value || '—'}</div>
    </div>
  );
}
