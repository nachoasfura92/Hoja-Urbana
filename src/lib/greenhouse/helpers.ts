// Funciones puras portadas 1:1 desde la app original (Recursos/html.txt).
// No se cambia ningún cálculo: fechas, tubos/plantas, etc. se comportan igual.

import { PT, COLORS_VAR } from './constants';
import type { Bancales, BancalSlot, CosechaRecord, EstadoInvernadero, Lote, PlanItem, Variedad } from './types';

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

// ── Buscador de lotes (por bandera y filtros) ─────────────────────────────

export interface FiltrosLotes {
  bandera?: number | null;
  varId?: number | null;
  diasCrecimientoMin?: number | null;
  diasCosechaMax?: number | null;
}

// Solo busca entre lotes activos: una vez cosechado, el lote ya no está
// físicamente en el invernadero (su bandera ya se recicló en otra siembra).
export function buscarLotes(lotes: Lote[], filtros: FiltrosLotes): Lote[] {
  return (lotes || [])
    .filter((l) => l.etapa !== 'cosechado')
    .filter((l) => !filtros.bandera || l.bandera === filtros.bandera)
    .filter((l) => !filtros.varId || l.varId === filtros.varId)
    .filter((l) => filtros.diasCrecimientoMin == null || dd(l.fechaEtapa) >= filtros.diasCrecimientoMin)
    .filter((l) => filtros.diasCosechaMax == null || dr(l.fechaVenta) <= filtros.diasCosechaMax)
    .sort((a, b) => dr(a.fechaVenta) - dr(b.fechaVenta));
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
    cosechas: [],
    nextId: 1,
  };
}

// ── Historial de cosechas (filtros por variedad / semana / mes) ────────────

export type PeriodoCosecha = 'todo' | 'semana' | 'semana_pasada' | 'mes' | 'mes_pasado';

export const PERIODOS_COSECHA: { value: PeriodoCosecha; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'semana_pasada', label: 'Semana pasada' },
  { value: 'mes', label: 'Este mes' },
  { value: 'mes_pasado', label: 'Mes pasado' },
];

// Semana = domingo a sábado, igual que DIAS_L (domingo primero).
function rangoPeriodo(periodo: PeriodoCosecha): { desde: string; hasta: string } | null {
  if (periodo === 'todo') return null;
  const hoyD = new Date();
  const inicioSemanaActual = new Date(hoyD);
  inicioSemanaActual.setDate(hoyD.getDate() - hoyD.getDay());

  if (periodo === 'semana') {
    const fin = new Date(inicioSemanaActual);
    fin.setDate(fin.getDate() + 6);
    return { desde: iso(inicioSemanaActual), hasta: iso(fin) };
  }
  if (periodo === 'semana_pasada') {
    const inicio = new Date(inicioSemanaActual);
    inicio.setDate(inicio.getDate() - 7);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 6);
    return { desde: iso(inicio), hasta: iso(fin) };
  }
  if (periodo === 'mes') {
    const inicio = new Date(hoyD.getFullYear(), hoyD.getMonth(), 1);
    const fin = new Date(hoyD.getFullYear(), hoyD.getMonth() + 1, 0);
    return { desde: iso(inicio), hasta: iso(fin) };
  }
  // mes_pasado
  const inicio = new Date(hoyD.getFullYear(), hoyD.getMonth() - 1, 1);
  const fin = new Date(hoyD.getFullYear(), hoyD.getMonth(), 0);
  return { desde: iso(inicio), hasta: iso(fin) };
}

function iso(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function filtrarCosechas(
  cosechas: CosechaRecord[],
  filtros: { varId?: number | null; periodo?: PeriodoCosecha }
): CosechaRecord[] {
  const rango = rangoPeriodo(filtros.periodo || 'todo');
  return (cosechas || [])
    .filter((c) => !filtros.varId || c.varId === filtros.varId)
    .filter((c) => !rango || (c.fecha >= rango.desde && c.fecha <= rango.hasta))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function resumenCosechasPorVariedad(cosechas: CosechaRecord[]): { varId: number; varNom: string; plantas: number }[] {
  const map = new Map<number, { varId: number; varNom: string; plantas: number }>();
  (cosechas || []).forEach((c) => {
    const actual = map.get(c.varId);
    if (actual) actual.plantas += c.plantas;
    else map.set(c.varId, { varId: c.varId, varNom: c.varNom, plantas: c.plantas });
  });
  return [...map.values()].sort((a, b) => b.plantas - a.plantas);
}
