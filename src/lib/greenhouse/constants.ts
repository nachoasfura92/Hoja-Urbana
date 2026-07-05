// Constantes idénticas a la app original.

export const PT = 30; // plantas por tubo

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
  | 'registrar'
  | 'mesa'
  | 'bancales'
  | 'venta'
  | 'plan'
  | 'inventario'
  | 'variedades'
  | 'historial';

export const TITLES: Record<TabId, string> = {
  resumen: 'Resumen del invernadero',
  registrar: 'Registrar siembra',
  mesa: 'Mesa de plantines',
  bancales: 'Bancales',
  venta: 'Calendario de venta',
  plan: 'Plan de siembra',
  inventario: 'Inventario',
  variedades: 'Variedades',
  historial: 'Historial',
};
