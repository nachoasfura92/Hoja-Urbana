// Constantes idénticas a la app original.

import type { EstanqueId } from './types';

export const PT = 30; // plantas por tubo

// Los dos sistemas de agua físicos del invernadero (ver types.ts EstanqueId).
export const ESTANQUES: { id: EstanqueId; nombre: string; litros: number }[] = [
  { id: 'mesa_plantines', nombre: 'Mesa de plantines', litros: 650 },
  { id: 'principal', nombre: 'Estanque principal (bancales)', litros: 2400 },
];

export const COLORS_VAR = [
  '#2A7D2E',
  '#1D6FA4',
  '#BA7517',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#14B8A6',
];

export const MESES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

export const MESES_L = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export const DIAS_L = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
];

export type TabId =
  | 'resumen'
  | 'tareas'
  | 'registrar'
  | 'mesa'
  | 'bancales'
  | 'venta'
  | 'plan'
  | 'inventario'
  | 'nutricion'
  | 'clientes'
  | 'variedades'
  | 'cosechas'
  | 'historial';

export const TITLES: Record<TabId, string> = {
  resumen: 'Resumen del invernadero',
  tareas: 'Tareas de hoy',
  registrar: 'Registrar siembra',
  mesa: 'Mesa de plantines',
  bancales: 'Bancales',
  venta: 'Calendario de venta',
  plan: 'Plan de siembra',
  inventario: 'Inventario',
  nutricion: 'Nutrición',
  clientes: 'Clientes',
  variedades: 'Variedades',
  cosechas: 'Historial de cosechas',
  historial: 'Historial',
};
