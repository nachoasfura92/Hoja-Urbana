// Mutaciones del estado, portadas 1:1 desde Recursos/html.txt.
// Cada función recibe el "draft" (una copia mutable del estado) y lo modifica
// directamente, igual que el original modificaba el objeto global `S`.

import { addSlot, fd, fmas, fracTubosStr, hoy, planHoy, remSlot } from './helpers';
import type { EstadoInvernadero, Etapa, Lote } from './types';

export function log(draft: EstadoInvernadero, accion: string, detalle: string) {
  if (!draft.historial) draft.historial = [];
  draft.historial.unshift({ fecha: hoy(), accion, detalle });
  if (draft.historial.length > 400) draft.historial.length = 400;
}

// ── Variedades ──────────────────────────────────────────────────────────

export function addVariedad(
  draft: EstadoInvernadero,
  { nombre, marca, tipo }: { nombre: string; marca: string; tipo: string }
) {
  draft.vars.push({ id: Date.now(), nombre, marca, tipo });
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
    id: Date.now(),
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
        fecha: p.fechaSiembra,
        accion: 'Siembra',
        detalle: `${p.plantas} plantas (${p.plantas} cubos · ${fracTubosStr(p.plantas)} tubos)${p.notas ? ' — ' + p.notas : ''}`,
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
    `${p.plantas} plantas (${p.plantas} cubos · ${fracTubosStr(p.plantas)} tubos) de ${p.varNombre} — ${fd(p.fechaSiembra)}`
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
}

export function ejecutarMovimiento(draft: EstadoInvernadero, params: EjecutarMovimientoParams) {
  const l = draft.lotes.find((x) => x.id === params.loteId);
  if (!l) return;
  const { sig, fechaMov, bancKey, plantasM, nota, restantes, etapaAnt, mermaRes } = params;
  if (bancKey) addSlot(draft.bancales, bancKey, l.varId, l.varNom, plantasM);
  if (!l.movimientos) l.movimientos = [];
  const bL = bancKey ? ` → Bancal ${bancKey}` : '';
  const mT = restantes > 0 && mermaRes === 'merma' ? ` | ${restantes} plantas merma` : '';
  const pT = restantes > 0 && mermaRes === 'pendiente' ? ` | ${restantes} plantas pendientes` : '';
  l.movimientos.push({
    fecha: fechaMov,
    accion: `→ ${sig}`,
    detalle: `${plantasM} plantas (${fracTubosStr(plantasM)} tubos)${bL}${nota ? ' · ' + nota : ''}${mT}${pT}`,
  });
  if (mermaRes === 'merma' && restantes > 0) {
    if (!draft.merma) draft.merma = { plantines: 0, engorda: 0, adulto: 0 };
    draft.merma[etapaAnt as 'plantines' | 'engorda' | 'adulto'] =
      (draft.merma[etapaAnt as 'plantines' | 'engorda' | 'adulto'] || 0) + restantes;
    l.movimientos.push({
      fecha: fechaMov,
      accion: 'Merma',
      detalle: `${restantes} plantas (${fracTubosStr(restantes)} tubos) en ${etapaAnt}`,
    });
    log(draft, 'Merma', `${l.varNom} en ${etapaAnt}: ${restantes} plantas`);
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
      movimientos: [{ fecha: fechaMov, accion: `→ ${sig}`, detalle: `${plantasM} plantas${bL} (separado)` }],
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
  log(draft, 'Movimiento', `${l.varNom}: ${etapaAnt}→${sig} | ${plantasM} plantas (${fracTubosStr(plantasM)} tubos)${bL}`);
}

export function cosechar(
  draft: EstadoInvernadero,
  params: { loteId: number; plantas: number; fecha: string; nota: string }
) {
  const l = draft.lotes.find((x) => x.id === params.loteId);
  if (!l) return;
  const p = Math.min(params.plantas || l.plantasRestantes, l.plantasRestantes);
  const rest = l.plantasRestantes - p;
  if (l.bancalId) remSlot(draft.bancales, l.bancalId, l.varId, p);
  if (!l.movimientos) l.movimientos = [];
  l.movimientos.push({
    fecha: params.fecha,
    accion: 'Cosecha',
    detalle: `${p} plantas (${fracTubosStr(p)} tubos)${params.nota ? ' · ' + params.nota : ''}${rest > 0 ? ' | ' + rest + ' restantes' : ''}`,
  });
  log(draft, 'Cosecha', `${l.varNom}: ${p} plantas (${fracTubosStr(p)} tubos)`);
  if (rest > 0) {
    l.plantasRestantes = rest;
  } else {
    l.etapa = 'cosechado';
    l.bancalId = null;
    l.plantasRestantes = 0;
  }
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
