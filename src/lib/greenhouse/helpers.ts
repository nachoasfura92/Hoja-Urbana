// Funciones puras portadas 1:1 desde la app original (Recursos/html.txt).
// No se cambia ningún cálculo: fechas, tubos/plantas, etc. se comportan igual.

import { PT, COLORS_VAR } from './constants';
import type { Bancales, BancalSlot, EstadoInvernadero, Lote, PlanItem, Variedad } from './types';

export function hoy(): string {
  return new Date().toISOString().split('T')[0];
}

export function man(): string {
  return fmas(hoy(), 1);
}

export function fmas(iso: string, n: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export function fd(iso?: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Días transcurridos desde `iso` hasta hoy.
export function dd(iso: string): number {
  return Math.floor((new Date().getTime() - new Date(iso).getTime()) / 86400000);
}

// Días restantes desde hoy hasta la fecha `f`.
export function dr(f: string): number {
  return Math.ceil((new Date(f).getTime() - new Date().getTime()) / 86400000);
}

export function gv(vars: Variedad[], id: number): Variedad {
  return (vars || []).find((v) => v.id === id) || { id: 0, nombre: '?', marca: '', tipo: '' };
}

export function gvColor(vars: Variedad[], id: number): string {
  const i = (vars || []).findIndex((v) => v.id === id);
  return COLORS_VAR[i % COLORS_VAR.length];
}

export function fracTubosStr(p: number): string {
  const t = p / PT;
  return t === Math.floor(t) ? t.toString() : (Math.round(t * 100) / 100).toString();
}

// ── Bancales (usan plantas, no tubos, para soportar fracciones) ────────────

export function getBanc(bancales: Bancales, k: string): BancalSlot[] {
  if (!bancales[k]) bancales[k] = [];
  return bancales[k];
}

export function plantasEnBanc(bancales: Bancales, k: string): number {
  return getBanc(bancales, k).reduce((a, s) => a + s.plantas, 0);
}

export function maxPlantas(k: string): number {
  return k.startsWith('eng') ? 20 * PT : 10 * PT;
}

export function addSlot(bancales: Bancales, k: string, vId: number, vNom: string, p: number) {
  const b = getBanc(bancales, k);
  const e = b.find((s) => s.varId === vId);
  if (e) e.plantas += p;
  else b.push({ varId: vId, varNom: vNom, plantas: p });
}

export function remSlot(bancales: Bancales, k: string, vId: number, p: number) {
  const b = getBanc(bancales, k);
  const e = b.find((s) => s.varId === vId);
  if (e) {
    e.plantas = Math.max(0, e.plantas - p);
    if (e.plantas === 0) bancales[k] = b.filter((s) => s.varId !== vId);
  }
}

// ── Plan / siembra ───────────────────────────────────────────────────────

export function sembradoEn(lotes: Lote[], vId: number, f: string): number {
  return (lotes || [])
    .filter((l) => l.varId === vId && l.fechaInicio === f)
    .reduce((t, l) => t + l.plantas, 0);
}

export function planHoy(plan: PlanItem[], vId: number): PlanItem | null {
  const p = (plan || []).find((x) => x.varId === vId);
  if (!p) return null;
  return !p.ultimaSiembra || dd(p.ultimaSiembra) >= p.freq ? p : null;
}

export function planVence(p: PlanItem): boolean {
  return !p.ultimaSiembra || dd(p.ultimaSiembra) >= p.freq;
}

// ── Evaluación previa a registrar una siembra (usada por el formulario y el modal de validación) ──
// Nota: igual que en el original, "ya sembrado hoy" siempre se compara contra hoy(),
// aunque la fecha de siembra elegida sea otra.
export interface EvaluacionSiembra {
  variedad: Variedad;
  sem: number;
  cub: number;
  plan: PlanItem | null;
  ya: number;
  total: number;
  bloqueante: boolean;
}

export function evaluarSiembra(
  state: EstadoInvernadero,
  vId: number,
  plantas: number
): EvaluacionSiembra {
  const variedad = gv(state.vars, vId);
  const sem = (state.inventario.semillas || {})[String(vId)] || 0;
  const cub = state.inventario.cubos || 0;
  const plan = planHoy(state.plan, vId);
  const ya = sembradoEn(state.lotes, vId, hoy());
  const total = ya + plantas;
  const bloqueante = sem < plantas || cub < plantas;
  return { variedad, sem, cub, plan, ya, total, bloqueante };
}

// ── Calendario de venta ──────────────────────────────────────────────────

export interface VentaDato {
  fecha: string;
  var: string;
  plantas: number;
}

export function getVentaData(
  lotes: Lote[],
  plan: PlanItem[],
  vars: Variedad[]
): { REAL: VentaDato[]; PROY: VentaDato[]; vars: string[] } {
  const nombresVars = (vars || []).map((v) => v.nombre);
  const REAL: VentaDato[] = [];
  const PROY: VentaDato[] = [];
  (lotes || [])
    .filter((l) => l.etapa !== 'cosechado' && l.plantasRestantes > 0)
    .forEach((l) => REAL.push({ fecha: l.fechaVenta, var: l.varNom, plantas: l.plantasRestantes }));
  const hoyD = new Date();
  (plan || []).forEach((p) => {
    let ultima = p.ultimaSiembra ? new Date(p.ultimaSiembra) : new Date(hoyD.getTime() - p.freq * 86400000);
    for (let i = 0; i < 8; i++) {
      ultima = new Date(ultima.getTime() + p.freq * 86400000);
      if (ultima.getTime() > hoyD.getTime() + 150 * 86400000) break;
      PROY.push({
        fecha: new Date(ultima.getTime() + (p.dp + p.de + p.da) * 86400000).toISOString().split('T')[0],
        var: p.varNom,
        plantas: p.plantas,
      });
    }
  });
  return { REAL, PROY, vars: nombresVars };
}

// ── Indicadores de la barra superior (alertas / listas para venta) ─────────

export function computeTopPills(state: EstadoInvernadero): { nAlertas: number; listasVenta: number } {
  const lotes = state.lotes || [];
  const listos2 = lotes.filter((l) => l.etapa === 'adulto' && dr(l.fechaVenta) <= 0);
  const nAl =
    lotes.filter((l) => {
      if (l.etapa === 'plantines') return dr(fmas(l.fechaInicio, l.dp)) <= 0;
      if (l.etapa === 'engorda') return dr(fmas(l.fechaEtapa, l.de)) <= 0;
      return false;
    }).length + (state.plan || []).filter((p) => planVence(p)).length;
  return { nAlertas: nAl, listasVenta: listos2.reduce((t, l) => t + l.plantasRestantes, 0) };
}

export function defS(): EstadoInvernadero {
  return {
    vars: [
      { id: 1, nombre: 'Española', marca: 'Hazera', tipo: 'Verde' },
      { id: 2, nombre: 'Lolo Bionda', marca: 'Rijk Zwaan', tipo: 'Bionda' },
      { id: 3, nombre: 'Hoja Roble', marca: 'Clause', tipo: 'Verde' },
    ],
    lotes: [],
    bancales: {},
    plan: [],
    inventario: { cubos: 500, semillas: {} },
    merma: { plantines: 0, engorda: 0, adulto: 0 },
    historial: [],
    nextId: 1,
  };
}
