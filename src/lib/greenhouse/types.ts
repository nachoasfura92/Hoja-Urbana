// Estructura de datos idéntica a la app original (ver Recursos/html.txt, función defS()).
// No se agregan ni quitan campos: esto es lo que se guarda como JSON en Supabase.

export type Etapa = 'plantines' | 'engorda' | 'adulto' | 'cosechado';

export interface Variedad {
  id: number;
  nombre: string;
  marca?: string;
  tipo?: string;
}

export interface Movimiento {
  fecha: string; // ISO date (yyyy-mm-dd)
  accion: string;
  detalle: string;
}

export interface Lote {
  id: number;
  varId: number;
  varNom: string;
  plantas: number;
  plantasRestantes: number;
  etapa: Etapa;
  fechaInicio: string;
  fechaEtapa: string;
  dp: number;
  de: number;
  da: number;
  notas?: string;
  bancalId: string | null;
  fechaVenta: string;
  movimientos: Movimiento[];
}

export interface PlanItem {
  id: number;
  varId: number;
  varNom: string;
  freq: number;
  plantas: number;
  dp: number;
  de: number;
  da: number;
  ultimaSiembra: string | null;
}

export interface BancalSlot {
  varId: number;
  varNom: string;
  plantas: number;
}

// Clave: "eng_1".."eng_8" (engorda) o "adu_1".."adu_16" (adulto)
export type Bancales = Record<string, BancalSlot[]>;

export interface Inventario {
  cubos: number;
  // clave = varId como string (así se guardaba en el objeto JS original)
  semillas: Record<string, number>;
}

export interface Merma {
  plantines: number;
  engorda: number;
  adulto: number;
}

export interface HistorialEntry {
  fecha: string;
  accion: string;
  detalle: string;
}

export interface EstadoInvernadero {
  vars: Variedad[];
  lotes: Lote[];
  bancales: Bancales;
  plan: PlanItem[];
  inventario: Inventario;
  merma: Merma;
  historial: HistorialEntry[];
  nextId: number;
}
