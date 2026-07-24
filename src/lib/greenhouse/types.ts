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
  id: number;
  fecha: string; // ISO date (yyyy-mm-dd)
  accion: string;
  detalle: string;
  autor?: string;
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
  // Número de la banderita física puesta en el invernadero al sembrar. Se
  // recicla entre lotes (no es único): sigue a la planta durante su vida y se
  // reutiliza en otra siembra una vez que este lote se cosecha.
  bandera: number;
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
  id: number;
  fecha: string;
  accion: string;
  detalle: string;
  autor?: string;
}

// Registro estructurado de cada cosecha (para el módulo de historial de
// cosechas, filtrable por variedad/semana/mes). Se agrega en confirmarCosecha,
// además del registro de texto que ya se guardaba en movimientos/historial.
export interface CosechaRecord {
  id: number;
  loteId: number;
  varId: number;
  varNom: string;
  fecha: string;
  plantas: number;
  nota?: string;
  autor?: string;
}

// ── Nutrición (pH / EC de los estanques) ──────────────────────────────────
// Dos sistemas de agua físicamente separados: la mesa de plantines tiene su
// propio estanque chico, y todos los bancales (engorda + adulto) comparten un
// solo estanque principal.
export type EstanqueId = 'mesa_plantines' | 'principal';

// Cada calibración registra la prueba en 1 L (ml de ácido / gramos de polvo A
// y B usados para llegar al objetivo) y el pH/EC final ya medidos en el
// estanque completo, luego de aplicar la dosis sugerida por regla de 3.
export interface MedicionNutricion {
  id: number;
  estanqueId: EstanqueId;
  fecha: string; // ISO date
  ph: number;
  ec: number; // mS/cm
  litros: number;
  mlAcidoPor1L?: number;
  gramosAPor1L?: number;
  gramosBPor1L?: number;
  mlAcidoSugerido?: number;
  gramosASugerido?: number;
  gramosBSugerido?: number;
  autor?: string;
}

export interface RecambioAgua {
  id: number;
  estanqueId: EstanqueId;
  fecha: string;
  autor?: string;
}

export interface NutricionConfig {
  phMin: number;
  phMax: number;
  ecVerano: number;
  ecInvierno: number;
  periodicidadMedicionDias: Record<EstanqueId, number>;
  periodicidadRecambioDias: Record<EstanqueId, number>;
}

export interface Nutricion {
  config: NutricionConfig;
  mediciones: MedicionNutricion[];
  recambios: RecambioAgua[];
}

export interface EstadoInvernadero {
  vars: Variedad[];
  lotes: Lote[];
  bancales: Bancales;
  plan: PlanItem[];
  inventario: Inventario;
  merma: Merma;
  historial: HistorialEntry[];
  cosechas: CosechaRecord[];
  nutricion: Nutricion;
  nextId: number;
}
