// Tareas del día: siembras pendientes según el plan de siembra, y traspasos
// pendientes de mesa de plantines → engorda o de engorda → adulto. Todo se
// calcula a partir del estado existente (no se persiste nada nuevo): una
// tarea "desaparece" sola cuando la acción subyacente ya se ejecutó.

import { dr, fmas, hoy, primerBancalConEspacio, proximaBandera, sembradoEn } from './helpers';
import type { EstadoInvernadero, Etapa } from './types';

export type TareaTipo = 'sembrar' | 'traspaso_engorda' | 'traspaso_adulto';

export interface TareaHoy {
  id: string;
  tipo: TareaTipo;
  fechaObjetivo: string;
  diasRestantes: number;
  varId: number;
  varNom: string;
  cantidadSugerida: number;
  // sembrar
  planId?: number;
  dp?: number;
  de?: number;
  da?: number;
  banderaSugerida?: number;
  // traspasos
  loteId?: number;
  bandera?: number;
  bancalOrigen?: string | null;
  bancalSugerido?: string | null;
  etapaDestino?: Etapa;
}

export function bancalLabel(k: string | null): string {
  if (!k) return 'sin bancal con espacio libre';
  const [tipo, num] = k.split('_');
  return `${tipo === 'eng' ? 'Engorda' : 'Adulto'} ${num}`;
}

// Solo mira hoy y mañana: diasRestantes <= 1 (0 = hoy, negativo = vencida).
const VENTANA_DIAS = 1;

export function calcularTareasHoy(state: EstadoInvernadero): TareaHoy[] {
  const tareas: TareaHoy[] = [];
  const banderasReservadas = new Set<number>();

  (state.plan || []).forEach((p) => {
    const proxima = p.ultimaSiembra ? fmas(p.ultimaSiembra, p.freq) : hoy();
    const diasRestantes = dr(proxima);
    if (diasRestantes > VENTANA_DIAS) return;
    const ya = sembradoEn(state.lotes, p.varId, proxima);
    const falta = Math.max(0, p.plantas - ya);
    if (falta <= 0) return;
    const bandera = proximaBandera(state.lotes, banderasReservadas);
    banderasReservadas.add(bandera);
    tareas.push({
      id: `sembrar_${p.id}_${proxima}`,
      tipo: 'sembrar',
      fechaObjetivo: proxima,
      diasRestantes,
      varId: p.varId,
      varNom: p.varNom,
      cantidadSugerida: falta,
      planId: p.id,
      dp: p.dp,
      de: p.de,
      da: p.da,
      banderaSugerida: bandera,
    });
  });

  (state.lotes || [])
    .filter((l) => l.etapa === 'plantines')
    .forEach((l) => {
      const fechaObjetivo = fmas(l.fechaEtapa, l.dp);
      const diasRestantes = dr(fechaObjetivo);
      if (diasRestantes > VENTANA_DIAS) return;
      tareas.push({
        id: `traspaso_engorda_${l.id}`,
        tipo: 'traspaso_engorda',
        fechaObjetivo,
        diasRestantes,
        varId: l.varId,
        varNom: l.varNom,
        cantidadSugerida: l.plantasRestantes,
        loteId: l.id,
        bandera: l.bandera,
        bancalOrigen: l.bancalId,
        bancalSugerido: primerBancalConEspacio(state.bancales, 'eng', l.plantasRestantes),
        etapaDestino: 'engorda',
      });
    });

  (state.lotes || [])
    .filter((l) => l.etapa === 'engorda')
    .forEach((l) => {
      const fechaObjetivo = fmas(l.fechaEtapa, l.de);
      const diasRestantes = dr(fechaObjetivo);
      if (diasRestantes > VENTANA_DIAS) return;
      tareas.push({
        id: `traspaso_adulto_${l.id}`,
        tipo: 'traspaso_adulto',
        fechaObjetivo,
        diasRestantes,
        varId: l.varId,
        varNom: l.varNom,
        cantidadSugerida: l.plantasRestantes,
        loteId: l.id,
        bandera: l.bandera,
        bancalOrigen: l.bancalId,
        bancalSugerido: primerBancalConEspacio(state.bancales, 'adu', l.plantasRestantes),
        etapaDestino: 'adulto',
      });
    });

  return tareas.sort((a, b) => a.diasRestantes - b.diasRestantes);
}
