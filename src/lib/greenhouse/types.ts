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

// La calibración de pH y la de EC se hacen en instancias distintas (el
// operador no las mide ni ajusta al mismo tiempo): cada registro es de un
// solo tipo, con la prueba en 1 L correspondiente (ml de ácido para pH,
// gramos de polvo A/B para EC) y el valor final ya medido en el estanque
// completo, luego de aplicar la dosis sugerida por regla de 3.
export type TipoMedicionNutricion = 'ph' | 'ec';

export interface MedicionNutricion {
  id: number;
  estanqueId: EstanqueId;
  tipo: TipoMedicionNutricion;
  fecha: string; // ISO date
  ph?: number; // presente solo si tipo === 'ph'
  ec?: number; // mS/cm, presente solo si tipo === 'ec'
  litros: number;
  mlAcidoPor1L?: number; // solo tipo 'ph'
  mlAcidoSugerido?: number;
  gramosAPor1L?: number; // solo tipo 'ec'
  gramosBPor1L?: number;
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
  // Dosis estándar de fábrica (gramos por litro) de cada polvo, para preparar
  // la solución de prueba de 1 L antes de medir EC — polvo A ("Blanca") y
  // polvo B ("Café"). Sugerida, editable por el operador.
  dosisAPorLitro: number;
  dosisBPorLitro: number;
  periodicidadPhDias: Record<EstanqueId, number>;
  periodicidadEcDias: Record<EstanqueId, number>;
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
