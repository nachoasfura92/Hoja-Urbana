// Mutaciones del estado, portadas 1:1 desde Recursos/html.txt.
// Cada función recibe el "draft" (una copia mutable del estado) y lo modifica
// directamente, igual que el original modificaba el objeto global `S`.

import { addSlot, defaultNutricion, diasEntreFechas, dr, estanqueNombre, fd, fmas, fracTubosStr, hoy, planHoy, proximoDiaHabil, remSlot } from './helpers';
import type { Bancales, EstadoInvernadero, EstanqueId, Etapa, Lote, NutricionConfig, PeriodicidadPedido } from './types';

export function log(draft: EstadoInvernadero, accion: string, detalle: string, autor?: string) {
  if (!draft.historial) draft.historial = [];
  draft.historial.unshift({ id: draft.nextId++, fecha: hoy(), accion, detalle, autor });
  if (draft.historial.length > 400) draft.historial.length = 400;
}

// ── Variedades ──────────────────────────────────────────────────────────

export function addVariedad(
  draft: EstadoInvernadero,
  { nombre, marca, tipo }: { nombre: string; marca: string; tipo: string }
) {
  draft.vars.push({ id: draft.nextId++, nombre, marca, tipo });
  log(draft, 'Nueva variedad', nombre);
}

export function deleteVariedad(draft: EstadoInvernadero, id: number) {
  draft.vars = draft.vars.filter((x) => x.id !== id);
}

export function editVariedad(
  draft: EstadoInvernadero,
  { id, nombre, marca, tipo }: { id: number; nombre: string; marca: string; tipo: string }
) {
  const v = draft.vars.find((x) => x.id === id);
  if (!v) return;
  v.nombre = nombre;
  v.marca = marca;
  v.tipo = tipo;
  log(draft, 'Variedad editada', nombre);
}

// ── Plan de siembra ─────────────────────────────────────────────────────

export function addPlanItem(
  draft: EstadoInvernadero,
  params: { varId: number; varNom: string; freq: number; plantas: number; dp: number; de: number; da: number }
) {
  draft.plan.push({
    id: draft.nextId++,
    varId: params.varId,
    varNom: params.varNom,
    freq: params.freq,
    plantas: params.plantas,
    dp: params.dp,
    de: params.de,
    da: params.da,
    ultimaSiembra: null,
  });
  log(draft, 'Plan', `${params.varNom} cada ${params.freq}d`);
}

export function deletePlanItem(draft: EstadoInvernadero, id: number) {
  draft.plan = draft.plan.filter((x) => x.id !== id);
}

// Reprograma la próxima siembra vencida de un ítem del plan a una fecha
// elegida por el operador (en vez de completarla u omitirla): se ajusta
// ultimaSiembra hacia atrás para que "ultimaSiembra + freq" caiga en esa fecha.
export interface PosponerSiembraParams {
  planId: number;
  nuevaFecha: string;
  autor?: string;
}

export function posponerSiembra(draft: EstadoInvernadero, params: PosponerSiembraParams) {
  const p = draft.plan.find((x) => x.id === params.planId);
  if (!p) return;
  p.ultimaSiembra = fmas(params.nuevaFecha, -p.freq);
  log(draft, 'Siembra reprogramada', `${p.varNom}: próxima el ${fd(params.nuevaFecha)}`, params.autor);
}

export function editPlanItem(
  draft: EstadoInvernadero,
  params: { id: number; varId: number; varNom: string; freq: number; plantas: number; dp: number; de: number; da: number }
) {
  const p = draft.plan.find((x) => x.id === params.id);
  if (!p) return;
  p.varId = params.varId;
  p.varNom = params.varNom;
  p.freq = params.freq;
  p.plantas = params.plantas;
  p.dp = params.dp;
  p.de = params.de;
  p.da = params.da;
  // Si el cambio (típicamente de frecuencia) deja la próxima siembra ya
  // vencida —calculada con la última siembra real bajo el ritmo ANTERIOR—
  // no arrastra ese atraso artificial: se reprograma para que la próxima
  // siembra caiga hoy, como si el nuevo ritmo recién arrancara ahora.
  const proxima = proximoDiaHabil(p.ultimaSiembra ? fmas(p.ultimaSiembra, p.freq) : hoy());
  if (dr(proxima) < 0) {
    p.ultimaSiembra = fmas(hoy(), -p.freq);
  }
  log(draft, 'Plan editado', `${params.varNom} cada ${params.freq}d`);
}

// ── Inventario ──────────────────────────────────────────────────────────

export function adjustCubos(draft: EstadoInvernadero, dir: 1 | -1, n: number) {
  draft.inventario.cubos = Math.max(0, (draft.inventario.cubos || 0) + dir * n);
  log(draft, 'Cubos', `${dir > 0 ? '+' : '-'}${n}`);
}

export function adjustSemillas(draft: EstadoInvernadero, dir: 1 | -1, vId: number, varNombre: string, n: number) {
  if (!draft.inventario.semillas) draft.inventario.semillas = {};
  const key = String(vId);
  draft.inventario.semillas[key] = Math.max(0, (draft.inventario.semillas[key] || 0) + dir * n);
  log(draft, 'Semillas', `${varNombre} ${dir > 0 ? '+' : '-'}${n}`);
}

// ── Registrar siembra ───────────────────────────────────────────────────

export interface ConfirmarSiembraParams {
  vId: number;
  varNombre: string;
  plantas: number;
  fechaSiembra: string;
  dp: number;
  de: number;
  da: number;
  notas: string;
  bandera: number;
  autor?: string;
}

export function confirmarSiembra(draft: EstadoInvernadero, p: ConfirmarSiembraParams) {
  const lote: Lote = {
    id: draft.nextId++,
    varId: p.vId,
    varNom: p.varNombre,
    plantas: p.plantas,
    plantasRestantes: p.plantas,
    etapa: 'plantines',
    fechaInicio: p.fechaSiembra,
    fechaEtapa: p.fechaSiembra,
    dp: p.dp,
    de: p.de,
    da: p.da,
    notas: p.notas,
    bancalId: null,
    banderas: p.bandera ? [p.bandera] : [],
    fechaVenta: fmas(p.fechaSiembra, p.dp + p.de + p.da),
    movimientos: [
      {
        id: draft.nextId++,
        fecha: p.fechaSiembra,
        accion: 'Siembra',
        // El N° de bandera queda registrado acá para siempre (a diferencia
        // del campo `bandera` en vivo, que se libera cuando el lote se
        // cosecha por completo) — así el lote se puede rastrear por su
        // bandera incluso después de esa liberación.
        detalle: `${p.plantas} plantas (${fracTubosStr(p.plantas)} tubos) · bandera N°${p.bandera}${p.notas ? ' — ' + p.notas : ''}`,
        autor: p.autor,
      },
    ],
  };
  draft.lotes.push(lote);
  if (!draft.inventario.semillas) draft.inventario.semillas = {};
  const key = String(p.vId);
  draft.inventario.semillas[key] = Math.max(0, (draft.inventario.semillas[key] || 0) - p.plantas);
  draft.inventario.cubos = Math.max(0, (draft.inventario.cubos || 0) - p.plantas);
  const plan = planHoy(draft.plan, p.vId);
  if (plan) plan.ultimaSiembra = hoy();
  log(
    draft,
    'Siembra',
    `${p.plantas} plantas (${fracTubosStr(p.plantas)} tubos) de ${p.varNombre} — ${fd(p.fechaSiembra)}`,
    p.autor
  );
}

// ── Lotes ───────────────────────────────────────────────────────────────

export function deleteLote(draft: EstadoInvernadero, id: number) {
  const l = draft.lotes.find((x) => x.id === id);
  if (l && l.bancalId) remSlot(draft.bancales, l.bancalId, l.varId, l.plantasRestantes);
  draft.lotes = draft.lotes.filter((x) => x.id !== id);
  log(draft, 'Eliminación', `Lote ${l ? l.varNom : '?'} eliminado`);
}

export interface EjecutarMovimientoParams {
  loteId: number;
  sig: Etapa;
  fechaMov: string;
  bancKey: string | null;
  plantasM: number;
  nota: string;
  restantes: number;
  etapaAnt: Etapa;
  mermaRes: 'merma' | 'pendiente' | null;
  autor?: string;
}

export function ejecutarMovimiento(draft: EstadoInvernadero, params: EjecutarMovimientoParams) {
  const l = draft.lotes.find((x) => x.id === params.loteId);
  if (!l) return;
  const { sig, fechaMov, bancKey, plantasM, nota, restantes, etapaAnt, mermaRes, autor } = params;
  // Libera lo que se mueve del bancal de origen (si venía de uno — mesa de
  // plantines no usa bancales, así que acá no hace nada al traspasar a
  // engorda) antes de ocuparlo en el destino; si no, el bancal de origen
  // quedaba mostrando plantas que ya no están ahí.
  if (l.bancalId) remSlot(draft.bancales, l.bancalId, l.varId, plantasM);
  if (bancKey) addSlot(draft.bancales, bancKey, l.varId, l.varNom, plantasM);
  if (!l.movimientos) l.movimientos = [];
  const bL = bancKey ? ` → Bancal ${bancKey}` : '';
  const mT = restantes > 0 && mermaRes === 'merma' ? ` | ${restantes} plantas merma` : '';
  const pT = restantes > 0 && mermaRes === 'pendiente' ? ` | ${restantes} plantas pendientes` : '';
  l.movimientos.push({
    id: draft.nextId++,
    fecha: fechaMov,
    accion: `→ ${sig}`,
    detalle: `${plantasM} plantas (${fracTubosStr(plantasM)} tubos)${bL}${nota ? ' · ' + nota : ''}${mT}${pT}`,
    autor,
  });
  if (mermaRes === 'merma' && restantes > 0) {
    if (!draft.merma) draft.merma = { plantines: 0, engorda: 0, adulto: 0 };
    draft.merma[etapaAnt as 'plantines' | 'engorda' | 'adulto'] =
      (draft.merma[etapaAnt as 'plantines' | 'engorda' | 'adulto'] || 0) + restantes;
    l.movimientos.push({
      id: draft.nextId++,
      fecha: fechaMov,
      accion: 'Merma',
      detalle: `${restantes} plantas (${fracTubosStr(restantes)} tubos) en ${etapaAnt}`,
      autor,
    });
    log(draft, 'Merma', `${l.varNom} en ${etapaAnt}: ${restantes} plantas`, autor);
  }
  if (mermaRes === 'pendiente' && restantes > 0) {
    const nl: Lote = {
      ...l,
      id: draft.nextId++,
      plantas: plantasM,
      plantasRestantes: plantasM,
      etapa: sig,
      fechaEtapa: fechaMov,
      bancalId: bancKey || null,
      // La bandera sigue al lote toda su vida (se hereda del spread `...l`
      // sin tocarla acá) — identifica el lote incluso en bancales; recién se
      // libera cuando el lote se cosecha por completo (ver cosechar()).
      movimientos: [
        { id: draft.nextId++, fecha: fechaMov, accion: `→ ${sig}`, detalle: `${plantasM} plantas${bL} (separado)`, autor },
      ],
    };
    if (sig === 'adulto') nl.fechaVenta = fmas(fechaMov, l.da);
    draft.lotes.push(nl);
    l.plantasRestantes = restantes;
  } else {
    l.etapa = sig;
    l.fechaEtapa = fechaMov;
    l.plantasRestantes = plantasM;
    l.bancalId = bancKey || l.bancalId;
    // La bandera ya no se libera acá: sigue al lote hasta que se coseche
    // por completo (ver cosechar()).
    if (sig === 'adulto') l.fechaVenta = fmas(fechaMov, l.da);
  }
  log(draft, 'Movimiento', `${l.varNom}: ${etapaAnt}→${sig} | ${plantasM} plantas (${fracTubosStr(plantasM)} tubos)${bL}`, autor);
}

export function cosechar(
  draft: EstadoInvernadero,
  params: { loteId: number; plantas: number; fecha: string; nota: string; autor?: string }
) {
  const l = draft.lotes.find((x) => x.id === params.loteId);
  if (!l) return;
  const p = Math.min(params.plantas || l.plantasRestantes, l.plantasRestantes);
  const rest = l.plantasRestantes - p;
  if (l.bancalId) remSlot(draft.bancales, l.bancalId, l.varId, p);
  if (!l.movimientos) l.movimientos = [];
  l.movimientos.push({
    id: draft.nextId++,
    fecha: params.fecha,
    accion: 'Cosecha',
    detalle: `${p} plantas (${fracTubosStr(p)} tubos)${params.nota ? ' · ' + params.nota : ''}${rest > 0 ? ' | ' + rest + ' restantes' : ''}`,
    autor: params.autor,
  });
  log(draft, 'Cosecha', `${l.varNom}: ${p} plantas (${fracTubosStr(p)} tubos)`, params.autor);
  if (!draft.cosechas) draft.cosechas = [];
  draft.cosechas.push({
    id: draft.nextId++,
    loteId: l.id,
    varId: l.varId,
    varNom: l.varNom,
    fecha: params.fecha,
    plantas: p,
    nota: params.nota || undefined,
    autor: params.autor,
  });
  if (rest > 0) {
    l.plantasRestantes = rest;
  } else {
    l.etapa = 'cosechado';
    l.bancalId = null;
    l.plantasRestantes = 0;
    // Recién acá se liberan las banderas (cosecha completa, no queda nada del
    // lote en pie) — antes de esto siguen identificando al lote en cualquier
    // etapa (mesa de plantines, engorda o adulto).
    l.banderas = [];
  }
}

// Reubica un lote adulto de un bancal a otro, sin cambiar de etapa (a
// diferencia de ejecutarMovimiento, que avanza plantines→engorda→adulto).
export interface MoverEntreBancalesParams {
  loteId: number;
  bancDestino: string;
  plantasM: number;
  fecha: string;
  nota: string;
  autor?: string;
}

export function moverEntreBancales(draft: EstadoInvernadero, params: MoverEntreBancalesParams) {
  const l = draft.lotes.find((x) => x.id === params.loteId);
  if (!l) return;
  const bancOrigen = l.bancalId;
  const plantasM = Math.min(params.plantasM, l.plantasRestantes);
  const restantes = l.plantasRestantes - plantasM;
  if (bancOrigen) remSlot(draft.bancales, bancOrigen, l.varId, plantasM);
  addSlot(draft.bancales, params.bancDestino, l.varId, l.varNom, plantasM);
  if (!l.movimientos) l.movimientos = [];
  const detalle = `${plantasM} plantas (${fracTubosStr(plantasM)} tubos) → Bancal ${params.bancDestino}${params.nota ? ' · ' + params.nota : ''}`;
  if (restantes > 0) {
    const nl: Lote = {
      ...l,
      id: draft.nextId++,
      plantas: plantasM,
      plantasRestantes: plantasM,
      bancalId: params.bancDestino,
      movimientos: [{ id: draft.nextId++, fecha: params.fecha, accion: 'Reubicación', detalle, autor: params.autor }],
    };
    draft.lotes.push(nl);
    l.plantasRestantes = restantes;
    l.movimientos.push({
      id: draft.nextId++,
      fecha: params.fecha,
      accion: 'Reubicación',
      detalle: `${detalle} | ${restantes} plantas permanecen en ${bancOrigen || 'sin bancal'}`,
      autor: params.autor,
    });
  } else {
    l.bancalId = params.bancDestino;
    l.movimientos.push({ id: draft.nextId++, fecha: params.fecha, accion: 'Reubicación', detalle, autor: params.autor });
  }
  log(
    draft,
    'Reubicación',
    `${l.varNom}: ${plantasM} plantas (${fracTubosStr(plantasM)} tubos) de ${bancOrigen || 'sin bancal'} → ${params.bancDestino}`,
    params.autor
  );
}

// Elimina N plantas de un lote (menos que el total deja el resto intacto).
// Si se marca como merma, se suma al recuento de merma de la etapa actual.
export interface EliminarPlantasParams {
  loteId: number;
  plantas: number;
  esMerma: boolean;
  nota: string;
}

export function eliminarPlantas(draft: EstadoInvernadero, params: EliminarPlantasParams) {
  const l = draft.lotes.find((x) => x.id === params.loteId);
  if (!l) return;
  const p = Math.min(params.plantas, l.plantasRestantes);
  const restantes = l.plantasRestantes - p;
  if (l.bancalId) remSlot(draft.bancales, l.bancalId, l.varId, p);
  if (params.esMerma && l.etapa !== 'cosechado') {
    if (!draft.merma) draft.merma = { plantines: 0, engorda: 0, adulto: 0 };
    draft.merma[l.etapa] = (draft.merma[l.etapa] || 0) + p;
  }
  const nota = params.nota.trim();
  const detalle = `${p} plantas (${fracTubosStr(p)} tubos)${params.esMerma ? ' · merma' : ''}${nota ? ' · ' + nota : ''}`;
  if (restantes > 0) {
    if (!l.movimientos) l.movimientos = [];
    l.movimientos.push({ id: draft.nextId++, fecha: hoy(), accion: 'Eliminación', detalle });
    l.plantasRestantes = restantes;
  } else {
    draft.lotes = draft.lotes.filter((x) => x.id !== params.loteId);
  }
  log(draft, params.esMerma ? 'Merma' : 'Eliminación', `${l.varNom}: ${detalle}`);
}

// Corrige la cantidad de un lote hacia arriba (ej. un conteo inicial mal
// hecho, o plantas recuperadas) — a diferencia de eliminarPlantas, acá solo se
// suma; no toca merma ni el total histórico sembrado (l.plantas), solo lo que
// hay actualmente en pie.
export interface AgregarPlantasAjusteParams {
  loteId: number;
  plantas: number;
  nota: string;
  autor?: string;
}

export function agregarPlantasAjuste(draft: EstadoInvernadero, params: AgregarPlantasAjusteParams) {
  const l = draft.lotes.find((x) => x.id === params.loteId);
  if (!l) return;
  const p = Math.max(0, params.plantas);
  if (p <= 0) return;
  l.plantasRestantes += p;
  if (l.bancalId) addSlot(draft.bancales, l.bancalId, l.varId, l.varNom, p);
  const nota = params.nota.trim();
  const detalle = `+${p} plantas (${fracTubosStr(p)} tubos) · ajuste${nota ? ' · ' + nota : ''}`;
  if (!l.movimientos) l.movimientos = [];
  l.movimientos.push({ id: draft.nextId++, fecha: hoy(), accion: 'Ajuste', detalle, autor: params.autor });
  log(draft, 'Ajuste', `${l.varNom}: ${detalle}`, params.autor);
}

// Un lote puede tener más de una banderita física asociada a la vez (ej.
// lotes fusionados). Estas tres acciones no validan duplicados acá: eso lo
// hace la UI contra banderasEnUso, igual que al sembrar.

export interface AgregarBanderaParams {
  loteId: number;
  bandera: number;
  autor?: string;
}

export function agregarBandera(draft: EstadoInvernadero, params: AgregarBanderaParams) {
  const l = draft.lotes.find((x) => x.id === params.loteId);
  if (!l) return;
  if (!l.banderas) l.banderas = [];
  if (l.banderas.includes(params.bandera)) return;
  l.banderas.push(params.bandera);
  l.banderas.sort((a, b) => a - b);
  const detalle = `+ Bandera N°${params.bandera}`;
  if (!l.movimientos) l.movimientos = [];
  l.movimientos.push({ id: draft.nextId++, fecha: hoy(), accion: 'Bandera agregada', detalle, autor: params.autor });
  log(draft, 'Bandera agregada', `${l.varNom}: ${detalle}`, params.autor);
}

// Corrige a mano el N° de una bandera ya asociada al lote (ej. para
// restaurar la asociación en lotes que la perdieron antes de que la bandera
// pasara a seguir al lote durante todo su ciclo).
export interface EditarBanderaParams {
  loteId: number;
  banderaAnterior: number;
  banderaNueva: number;
  autor?: string;
}

export function editarBandera(draft: EstadoInvernadero, params: EditarBanderaParams) {
  const l = draft.lotes.find((x) => x.id === params.loteId);
  if (!l) return;
  if (!l.banderas) l.banderas = [];
  const idx = l.banderas.indexOf(params.banderaAnterior);
  if (idx === -1) return;
  l.banderas[idx] = params.banderaNueva;
  l.banderas.sort((a, b) => a - b);
  const detalle = `Bandera N°${params.banderaAnterior} → N°${params.banderaNueva}`;
  if (!l.movimientos) l.movimientos = [];
  l.movimientos.push({ id: draft.nextId++, fecha: hoy(), accion: 'Bandera editada', detalle, autor: params.autor });
  log(draft, 'Bandera editada', `${l.varNom}: ${detalle}`, params.autor);
}

export interface EliminarBanderaParams {
  loteId: number;
  bandera: number;
  autor?: string;
}

export function eliminarBandera(draft: EstadoInvernadero, params: EliminarBanderaParams) {
  const l = draft.lotes.find((x) => x.id === params.loteId);
  if (!l || !l.banderas) return;
  if (!l.banderas.includes(params.bandera)) return;
  l.banderas = l.banderas.filter((b) => b !== params.bandera);
  const detalle = `- Bandera N°${params.bandera}`;
  if (!l.movimientos) l.movimientos = [];
  l.movimientos.push({ id: draft.nextId++, fecha: hoy(), accion: 'Bandera eliminada', detalle, autor: params.autor });
  log(draft, 'Bandera eliminada', `${l.varNom}: ${detalle}`, params.autor);
}

// Ajusta la pauta (días objetivo por etapa) de un lote puntual, sin afectar
// al plan de siembra ni a otros lotes. Si el lote ya está en adulto, recalcula
// fechaVenta desde la fecha real de entrada a esa etapa; si no, la recalcula
// como estimado total desde la fecha de siembra (igual que confirmarSiembra).
export interface EditarPautaParams {
  loteId: number;
  dp: number;
  de: number;
  da: number;
  autor?: string;
}

export function editarPauta(draft: EstadoInvernadero, params: EditarPautaParams) {
  const l = draft.lotes.find((x) => x.id === params.loteId);
  if (!l) return;
  const antes = `${l.dp}/${l.de}/${l.da}`;
  l.dp = params.dp;
  l.de = params.de;
  l.da = params.da;
  if (l.etapa === 'adulto') {
    l.fechaVenta = fmas(l.fechaEtapa, params.da);
  } else if (l.etapa !== 'cosechado') {
    l.fechaVenta = fmas(l.fechaInicio, params.dp + params.de + params.da);
  }
  const detalle = `${antes} → ${params.dp}/${params.de}/${params.da} días (plantines/engorda/adulto)`;
  if (!l.movimientos) l.movimientos = [];
  l.movimientos.push({ id: draft.nextId++, fecha: hoy(), accion: 'Pauta editada', detalle, autor: params.autor });
  log(draft, 'Pauta editada', `${l.varNom}: ${detalle}`, params.autor);
}

// Reprograma un traspaso vencido (mesa→engorda o engorda→adulto) a una fecha
// elegida por el operador: recalcula los días objetivo de esa etapa (dp o de)
// a partir de la diferencia entre fechaEtapa y la nueva fecha, reutilizando
// editarPauta para que fechaVenta quede consistente.
export interface PosponerTraspasoParams {
  loteId: number;
  campo: 'dp' | 'de';
  nuevaFecha: string;
  autor?: string;
}

export function posponerTraspaso(draft: EstadoInvernadero, params: PosponerTraspasoParams) {
  const l = draft.lotes.find((x) => x.id === params.loteId);
  if (!l) return;
  const dias = Math.max(1, diasEntreFechas(l.fechaEtapa, params.nuevaFecha));
  editarPauta(draft, {
    loteId: l.id,
    dp: params.campo === 'dp' ? dias : l.dp,
    de: params.campo === 'de' ? dias : l.de,
    da: l.da,
    autor: params.autor,
  });
}

// ── Nutrición (pH / EC de los estanques) ────────────────────────────────

// La calibración de pH y la de EC se hacen en instancias distintas (no en el
// mismo registro): dos acciones separadas, cada una con su propia prueba en
// 1 L (ácido para pH, polvo A/B para EC).
export interface RegistrarMedicionPhParams {
  estanqueId: EstanqueId;
  fecha: string;
  ph: number;
  litros: number;
  mlAcidoPor1L?: number;
  autor?: string;
}

export function registrarMedicionPh(draft: EstadoInvernadero, p: RegistrarMedicionPhParams) {
  if (!draft.nutricion) draft.nutricion = defaultNutricion();
  draft.nutricion.mediciones.push({
    id: draft.nextId++,
    estanqueId: p.estanqueId,
    tipo: 'ph',
    fecha: p.fecha,
    ph: p.ph,
    litros: p.litros,
    mlAcidoPor1L: p.mlAcidoPor1L,
    mlAcidoSugerido: p.mlAcidoPor1L != null ? Math.round(p.mlAcidoPor1L * p.litros * 100) / 100 : undefined,
    autor: p.autor,
  });
  log(draft, 'Calibración pH', `${estanqueNombre(p.estanqueId)}: pH ${p.ph}`, p.autor);
}

export interface RegistrarMedicionEcParams {
  estanqueId: EstanqueId;
  fecha: string;
  ec: number;
  litros: number;
  gramosAPor1L?: number;
  gramosBPor1L?: number;
  autor?: string;
}

export function registrarMedicionEc(draft: EstadoInvernadero, p: RegistrarMedicionEcParams) {
  if (!draft.nutricion) draft.nutricion = defaultNutricion();
  draft.nutricion.mediciones.push({
    id: draft.nextId++,
    estanqueId: p.estanqueId,
    tipo: 'ec',
    fecha: p.fecha,
    ec: p.ec,
    litros: p.litros,
    gramosAPor1L: p.gramosAPor1L,
    gramosBPor1L: p.gramosBPor1L,
    gramosASugerido: p.gramosAPor1L != null ? Math.round(p.gramosAPor1L * p.litros * 100) / 100 : undefined,
    gramosBSugerido: p.gramosBPor1L != null ? Math.round(p.gramosBPor1L * p.litros * 100) / 100 : undefined,
    autor: p.autor,
  });
  log(draft, 'Calibración EC', `${estanqueNombre(p.estanqueId)}: EC ${p.ec} mS/cm`, p.autor);
}

// Edita un registro de calibración existente (pH o EC, según su propio
// `tipo` — no se cambia). Recalcula las cantidades sugeridas por regla de 3
// si se editaron los datos de la prueba en 1 L.
export interface EditarMedicionNutricionParams {
  id: number;
  fecha: string;
  ph?: number;
  ec?: number;
  litros: number;
  mlAcidoPor1L?: number;
  gramosAPor1L?: number;
  gramosBPor1L?: number;
}

export function editarMedicionNutricion(draft: EstadoInvernadero, p: EditarMedicionNutricionParams) {
  const m = draft.nutricion?.mediciones.find((x) => x.id === p.id);
  if (!m) return;
  m.fecha = p.fecha;
  m.litros = p.litros;
  if (m.tipo === 'ph') {
    m.ph = p.ph;
    m.mlAcidoPor1L = p.mlAcidoPor1L;
    m.mlAcidoSugerido = p.mlAcidoPor1L != null ? Math.round(p.mlAcidoPor1L * p.litros * 100) / 100 : undefined;
  } else {
    m.ec = p.ec;
    m.gramosAPor1L = p.gramosAPor1L;
    m.gramosBPor1L = p.gramosBPor1L;
    m.gramosASugerido = p.gramosAPor1L != null ? Math.round(p.gramosAPor1L * p.litros * 100) / 100 : undefined;
    m.gramosBSugerido = p.gramosBPor1L != null ? Math.round(p.gramosBPor1L * p.litros * 100) / 100 : undefined;
  }
  log(
    draft,
    'Medición editada',
    `${estanqueNombre(m.estanqueId)} (${m.tipo === 'ph' ? 'pH' : 'EC'}): ${fd(p.fecha)}`
  );
}

export function eliminarMedicionNutricion(draft: EstadoInvernadero, id: number) {
  if (!draft.nutricion) return;
  const m = draft.nutricion.mediciones.find((x) => x.id === id);
  draft.nutricion.mediciones = draft.nutricion.mediciones.filter((x) => x.id !== id);
  if (m) log(draft, 'Medición eliminada', `${estanqueNombre(m.estanqueId)} (${m.tipo === 'ph' ? 'pH' : 'EC'}): ${fd(m.fecha)}`);
}

export interface RegistrarRecambioAguaParams {
  estanqueId: EstanqueId;
  fecha: string;
  autor?: string;
}

export function registrarRecambioAgua(draft: EstadoInvernadero, p: RegistrarRecambioAguaParams) {
  if (!draft.nutricion) draft.nutricion = defaultNutricion();
  draft.nutricion.recambios.push({ id: draft.nextId++, estanqueId: p.estanqueId, fecha: p.fecha, autor: p.autor });
  log(draft, 'Recambio de agua', `${estanqueNombre(p.estanqueId)} — ${fd(p.fecha)}`, p.autor);
}

export function actualizarConfigNutricion(draft: EstadoInvernadero, config: NutricionConfig) {
  if (!draft.nutricion) draft.nutricion = defaultNutricion();
  draft.nutricion.config = { ...config };
  log(draft, 'Config nutrición', 'Objetivos de pH/EC y periodicidad actualizados');
}

export function limpiarBancal(draft: EstadoInvernadero, k: string) {
  draft.lotes
    .filter((l) => l.bancalId === k && l.etapa !== 'cosechado')
    .forEach((l) => {
      l.bancalId = null;
      log(draft, 'Baja', `${l.varNom} removido de ${k}`);
    });
  if (draft.bancales) draft.bancales[k] = [];
}

// Reconstruye la ocupación de todos los bancales desde cero, a partir de los
// lotes realmente activos (bancalId + plantasRestantes). Corrige cualquier
// desfase acumulado (ej. el bug donde un traspaso dejaba plantas "fantasma"
// en el bancal de origen) sin depender de arreglar bancal por bancal.
export function reconciliarBancales(draft: EstadoInvernadero) {
  const nuevo: Bancales = {};
  draft.lotes
    .filter((l) => l.bancalId && l.etapa !== 'cosechado' && l.plantasRestantes > 0)
    .forEach((l) => {
      addSlot(nuevo, l.bancalId as string, l.varId, l.varNom, l.plantasRestantes);
    });
  draft.bancales = nuevo;
  log(draft, 'Bancales recalculados', 'Se reconstruyó la ocupación de todos los bancales desde los lotes activos');
}

// ── Clientes ──────────────────────────────────────────────────────────

export interface ClienteParams {
  nombre: string;
  rut?: string;
  direccionFacturacion?: string;
  direccionEntrega?: string;
  correo?: string;
  telefono?: string;
  notas?: string;
}

export function addCliente(draft: EstadoInvernadero, p: ClienteParams) {
  if (!draft.clientes) draft.clientes = [];
  draft.clientes.push({ id: draft.nextId++, ...p });
  log(draft, 'Nuevo cliente', p.nombre);
}

export function editCliente(draft: EstadoInvernadero, params: { id: number } & ClienteParams) {
  const c = draft.clientes.find((x) => x.id === params.id);
  if (!c) return;
  Object.assign(c, params);
  log(draft, 'Cliente editado', c.nombre);
}

// Al eliminar un cliente se eliminan también sus pedidos: ya no representan
// demanda real de nadie.
export function deleteCliente(draft: EstadoInvernadero, id: number) {
  const c = draft.clientes.find((x) => x.id === id);
  draft.clientes = draft.clientes.filter((x) => x.id !== id);
  if (draft.pedidos) draft.pedidos = draft.pedidos.filter((p) => p.clienteId !== id);
  log(draft, 'Cliente eliminado', c ? c.nombre : '?');
}

// ── Pedidos de clientes ──────────────────────────────────────────────────

export interface PedidoParams {
  clienteId: number;
  varId: number;
  varNom: string;
  plantas: number;
  periodicidad: PeriodicidadPedido;
  freq?: number;
  dp: number;
  de: number;
  da: number;
  fechaEntrega: string;
  notas?: string;
}

export function addPedido(draft: EstadoInvernadero, p: PedidoParams) {
  if (!draft.pedidos) draft.pedidos = [];
  draft.pedidos.push({ id: draft.nextId++, cumplido: false, ...p });
  log(draft, 'Nuevo pedido', `${p.varNom} × ${p.plantas} (${p.periodicidad === 'unico' ? 'único' : `cada ${p.freq}d`})`);
}

export function editPedido(draft: EstadoInvernadero, params: { id: number } & PedidoParams) {
  const pe = draft.pedidos.find((x) => x.id === params.id);
  if (!pe) return;
  Object.assign(pe, params);
  log(draft, 'Pedido editado', `${pe.varNom} × ${pe.plantas}`);
}

export function deletePedido(draft: EstadoInvernadero, id: number) {
  const p = draft.pedidos.find((x) => x.id === id);
  draft.pedidos = draft.pedidos.filter((x) => x.id !== id);
  if (p) log(draft, 'Pedido eliminado', `${p.varNom} × ${p.plantas}`);
}

// Siembra un pedido único (crea el lote, igual que confirmarSiembra) y lo
// marca como cumplido para que deje de aparecer en pendientes.
export interface CumplirPedidoUnicoParams {
  pedidoId: number;
  fechaSiembra: string;
  bandera: number;
  autor?: string;
}

export function cumplirPedidoUnico(draft: EstadoInvernadero, params: CumplirPedidoUnicoParams) {
  const p = draft.pedidos.find((x) => x.id === params.pedidoId);
  if (!p) return;
  confirmarSiembra(draft, {
    vId: p.varId,
    varNombre: p.varNom,
    plantas: p.plantas,
    fechaSiembra: params.fechaSiembra,
    dp: p.dp,
    de: p.de,
    da: p.da,
    notas: `Pedido de cliente${p.notas ? ' — ' + p.notas : ''}`,
    bandera: params.bandera,
    autor: params.autor,
  });
  p.cumplido = true;
}
