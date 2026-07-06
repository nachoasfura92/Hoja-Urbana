// Traduce entre el esquema relacional (11 tablas en Supabase) y el mismo
// objeto EstadoInvernadero que ya usa toda la UI/lógica de la app. Así, el
// resto del código (actions.ts, componentes) no se entera de que los datos
// viven en tablas normalizadas en vez de un único JSON.
//
// Estrategia de guardado: "reemplazar todo" por tabla (upsert de las filas
// vigentes + borrado de las que ya no están), igual que el original hacía con
// clearSheet+appendSheet contra Google Sheets. Es más simple y segura que ir
// calculando diffs finos, y a esta escala (un invernadero) el costo es
// insignificante.

import type { SupabaseClient } from '@supabase/supabase-js';
import { defS } from './helpers';
import type {
  Bancales,
  CosechaRecord,
  EstadoInvernadero,
  HistorialEntry,
  Lote,
  Movimiento,
  PlanItem,
  Variedad,
} from './types';

type DB = SupabaseClient;

async function upsertYPodar(supabase: DB, tabla: string, filas: Record<string, unknown>[], columnaId: string) {
  if (filas.length > 0) {
    const { error } = await supabase.from(tabla).upsert(filas, { onConflict: columnaId });
    if (error) throw new Error(`${tabla}: ${error.message}`);
  }
  const ids = filas.map((f) => f[columnaId]);
  if (ids.length > 0) {
    const lista = ids.map((id) => (typeof id === 'string' ? `"${id}"` : String(id))).join(',');
    const { error } = await supabase.from(tabla).delete().not(columnaId, 'in', `(${lista})`);
    if (error) throw new Error(`${tabla}: ${error.message}`);
  } else {
    const { error } = await supabase.from(tabla).delete().not(columnaId, 'is', null);
    if (error) throw new Error(`${tabla}: ${error.message}`);
  }
}

export async function cargarEstadoDesdeTablas(supabase: DB): Promise<EstadoInvernadero> {
  const [
    variedadesRes,
    lotesRes,
    movimientosRes,
    slotsRes,
    planRes,
    cubosRes,
    semillasRes,
    mermaRes,
    historialRes,
    cosechasRes,
  ] = await Promise.all([
    supabase.from('variedades').select('id, nombre, marca, tipo').order('id'),
    supabase.from('lotes').select('*').order('id'),
    supabase.from('lote_movimientos').select('*').order('id'),
    supabase.from('bancal_slots').select('bancal_id, variedad_id, plantas'),
    supabase.from('plan_siembra').select('*').order('id'),
    supabase.from('inventario_cubos').select('cantidad').eq('id', 1).maybeSingle(),
    supabase.from('inventario_semillas').select('variedad_id, cantidad'),
    supabase.from('merma').select('etapa, cantidad'),
    supabase.from('historial').select('*').order('id', { ascending: false }),
    supabase.from('cosechas').select('*').order('fecha', { ascending: false }),
  ]);

  for (const res of [
    variedadesRes,
    lotesRes,
    movimientosRes,
    slotsRes,
    planRes,
    semillasRes,
    mermaRes,
    historialRes,
    cosechasRes,
  ]) {
    if (res.error) throw new Error(res.error.message);
  }
  if (cubosRes.error) throw new Error(cubosRes.error.message);

  const vars: Variedad[] = (variedadesRes.data || []).map((v) => ({
    id: v.id,
    nombre: v.nombre,
    marca: v.marca ?? undefined,
    tipo: v.tipo ?? undefined,
  }));
  const nombrePorVarId = new Map(vars.map((v) => [v.id, v.nombre]));
  const nombreVar = (id: number) => nombrePorVarId.get(id) ?? '?';

  const movimientosPorLote = new Map<number, Movimiento[]>();
  (movimientosRes.data || []).forEach((m) => {
    const arr = movimientosPorLote.get(m.lote_id) || [];
    arr.push({ id: m.id, fecha: m.fecha, accion: m.accion, detalle: m.detalle, autor: m.autor ?? undefined });
    movimientosPorLote.set(m.lote_id, arr);
  });

  const lotes: Lote[] = (lotesRes.data || []).map((l) => ({
    id: l.id,
    varId: l.variedad_id,
    varNom: nombreVar(l.variedad_id),
    plantas: l.plantas_iniciales,
    plantasRestantes: l.plantas_restantes,
    etapa: l.etapa,
    fechaInicio: l.fecha_inicio,
    fechaEtapa: l.fecha_etapa,
    dp: l.dias_plantines,
    de: l.dias_engorda,
    da: l.dias_adulto,
    notas: l.notas ?? undefined,
    bancalId: l.bancal_id,
    fechaVenta: l.fecha_venta,
    movimientos: movimientosPorLote.get(l.id) || [],
    bandera: l.bandera ?? 0,
  }));

  const bancales: Bancales = {};
  (slotsRes.data || []).forEach((s) => {
    if (!bancales[s.bancal_id]) bancales[s.bancal_id] = [];
    bancales[s.bancal_id].push({ varId: s.variedad_id, varNom: nombreVar(s.variedad_id), plantas: s.plantas });
  });

  const plan: PlanItem[] = (planRes.data || []).map((p) => ({
    id: p.id,
    varId: p.variedad_id,
    varNom: nombreVar(p.variedad_id),
    freq: p.frecuencia_dias,
    plantas: p.plantas,
    dp: p.dias_plantines,
    de: p.dias_engorda,
    da: p.dias_adulto,
    ultimaSiembra: p.ultima_siembra,
  }));

  const semillas: Record<string, number> = {};
  (semillasRes.data || []).forEach((s) => {
    semillas[String(s.variedad_id)] = s.cantidad;
  });

  const merma = { plantines: 0, engorda: 0, adulto: 0 };
  (mermaRes.data || []).forEach((m) => {
    merma[m.etapa as keyof typeof merma] = m.cantidad;
  });

  const historial: HistorialEntry[] = (historialRes.data || []).map((h) => ({
    id: h.id,
    fecha: h.fecha,
    accion: h.accion,
    detalle: h.detalle,
    autor: h.autor ?? undefined,
  }));

  const cosechas: CosechaRecord[] = (cosechasRes.data || []).map((c) => ({
    id: c.id,
    loteId: c.lote_id,
    varId: c.variedad_id,
    varNom: nombreVar(c.variedad_id),
    fecha: c.fecha,
    plantas: c.plantas,
    nota: c.nota ?? undefined,
    autor: c.autor ?? undefined,
  }));

  const todosLosIds: number[] = [
    ...vars.map((v) => v.id),
    ...lotes.map((l) => l.id),
    ...lotes.flatMap((l) => l.movimientos.map((m) => m.id)),
    ...plan.map((p) => p.id),
    ...historial.map((h) => h.id),
    ...cosechas.map((c) => c.id),
  ];
  const nextId = (todosLosIds.length ? Math.max(...todosLosIds) : 0) + 1;

  const base = defS();
  return {
    vars: vars.length ? vars : base.vars,
    lotes,
    bancales,
    plan,
    inventario: { cubos: cubosRes.data?.cantidad ?? base.inventario.cubos, semillas },
    merma,
    historial,
    cosechas,
    nextId: Math.max(nextId, base.nextId),
  };
}

export async function guardarEstadoEnTablas(supabase: DB, state: EstadoInvernadero) {
  const variedadRows = state.vars.map((v) => ({ id: v.id, nombre: v.nombre, marca: v.marca ?? null, tipo: v.tipo ?? null }));
  await upsertYPodar(supabase, 'variedades', variedadRows, 'id');

  const loteRows = state.lotes.map((l) => ({
    id: l.id,
    variedad_id: l.varId,
    plantas_iniciales: l.plantas,
    plantas_restantes: l.plantasRestantes,
    etapa: l.etapa,
    fecha_inicio: l.fechaInicio,
    fecha_etapa: l.fechaEtapa,
    dias_plantines: l.dp,
    dias_engorda: l.de,
    dias_adulto: l.da,
    notas: l.notas ?? null,
    bancal_id: l.bancalId,
    fecha_venta: l.fechaVenta,
    bandera: l.bandera,
  }));
  await upsertYPodar(supabase, 'lotes', loteRows, 'id');

  const movimientoRows = state.lotes.flatMap((l) =>
    l.movimientos.map((m) => ({
      id: m.id,
      lote_id: l.id,
      fecha: m.fecha,
      accion: m.accion,
      detalle: m.detalle,
      autor: m.autor ?? null,
    }))
  );
  await upsertYPodar(supabase, 'lote_movimientos', movimientoRows, 'id');

  const slotRows: Record<string, unknown>[] = [];
  let slotId = 1;
  Object.entries(state.bancales).forEach(([bancalId, slots]) => {
    slots.forEach((s) => {
      slotRows.push({ id: slotId++, bancal_id: bancalId, variedad_id: s.varId, plantas: s.plantas });
    });
  });
  await upsertYPodar(supabase, 'bancal_slots', slotRows, 'id');

  const planRows = state.plan.map((p) => ({
    id: p.id,
    variedad_id: p.varId,
    frecuencia_dias: p.freq,
    plantas: p.plantas,
    dias_plantines: p.dp,
    dias_engorda: p.de,
    dias_adulto: p.da,
    ultima_siembra: p.ultimaSiembra,
  }));
  await upsertYPodar(supabase, 'plan_siembra', planRows, 'id');

  const semillaRows = Object.entries(state.inventario.semillas || {}).map(([variedadId, cantidad]) => ({
    variedad_id: Number(variedadId),
    cantidad,
  }));
  await upsertYPodar(supabase, 'inventario_semillas', semillaRows, 'variedad_id');

  const historialRows = state.historial.map((h) => ({
    id: h.id,
    fecha: h.fecha,
    accion: h.accion,
    detalle: h.detalle,
    autor: h.autor ?? null,
  }));
  await upsertYPodar(supabase, 'historial', historialRows, 'id');

  const cosechaRows = state.cosechas.map((c) => ({
    id: c.id,
    lote_id: c.loteId,
    variedad_id: c.varId,
    fecha: c.fecha,
    plantas: c.plantas,
    nota: c.nota ?? null,
    autor: c.autor ?? null,
  }));
  await upsertYPodar(supabase, 'cosechas', cosechaRows, 'id');

  // Filas fijas (siempre existen, solo se actualizan): no necesitan poda.
  const { error: errorCubos } = await supabase
    .from('inventario_cubos')
    .upsert({ id: 1, cantidad: state.inventario.cubos }, { onConflict: 'id' });
  if (errorCubos) throw new Error(`inventario_cubos: ${errorCubos.message}`);

  const mermaRows = (['plantines', 'engorda', 'adulto'] as const).map((etapa) => ({
    etapa,
    cantidad: state.merma[etapa] || 0,
  }));
  const { error: errorMerma } = await supabase.from('merma').upsert(mermaRows, { onConflict: 'etapa' });
  if (errorMerma) throw new Error(`merma: ${errorMerma.message}`);
}
