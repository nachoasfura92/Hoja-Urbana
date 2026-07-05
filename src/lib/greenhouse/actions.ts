// Mutaciones del estado, portadas 1:1 desde Recursos/html.txt.
// Cada función recibe el "draft" (una copia mutable del estado) y lo modifica
// directamente, igual que el original modificaba el objeto global `S`.

import { addSlot, fd, fmas, fracTubosStr, hoy, planHoy, remSlot } from './helpers';
import type { EstadoInvernadero, Etapa, Lote } from './types';

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
    fechaVenta: fmas(p.fechaSiembra, p.dp + p.de + p.da),
    movimientos: [
      {
        id: draft.nextId++,
        fecha: p.fechaSiembra,
        accion: 'Siembra',
        detalle: `${p.plantas} plantas (${fracTubosStr(p.plantas)} tubos)${p.notas ? ' — ' + p.notas : ''}`,
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

export function limpiarBancal(draft: EstadoInvernadero, k: string) {
  draft.lotes
    .filter((l) => l.bancalId === k && l.etapa !== 'cosechado')
    .forEach((l) => {
      l.bancalId = null;
      log(draft, 'Baja', `${l.varNom} removido de ${k}`);
    });
  if (draft.bancales) draft.bancales[k] = [];
}
