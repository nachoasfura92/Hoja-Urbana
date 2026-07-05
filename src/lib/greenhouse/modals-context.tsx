'use client';

import { createContext, useContext, useState } from 'react';

// Estado de los modales compartidos entre páginas (Mesa, Bancales, etc.),
// igual que las variables globales movCtx/cosCtx del original: cualquier
// componente puede abrir el modal de "lote", "mover etapa", "cosechar" o
// "detalle de bancal" sin necesidad de pasar callbacks por props.

export type TipoBancal = 'eng' | 'adu';

interface BancalRef {
  tipo: TipoBancal;
  num: number;
}

interface ModalsContextValue {
  loteId: number | null;
  moverId: number | null;
  cosecharId: number | null;
  bancal: BancalRef | null;
  openLote: (id: number) => void;
  closeLote: () => void;
  openMover: (id: number) => void;
  closeMover: () => void;
  openCosechar: (id: number) => void;
  closeCosechar: () => void;
  openBancal: (tipo: TipoBancal, num: number) => void;
  closeBancal: () => void;
}

const ModalsContext = createContext<ModalsContextValue | null>(null);

export function ModalsProvider({ children }: { children: React.ReactNode }) {
  const [loteId, setLoteId] = useState<number | null>(null);
  const [moverId, setMoverId] = useState<number | null>(null);
  const [cosecharId, setCosecharId] = useState<number | null>(null);
  const [bancal, setBancal] = useState<BancalRef | null>(null);

  const value: ModalsContextValue = {
    loteId,
    moverId,
    cosecharId,
    bancal,
    openLote: (id) => setLoteId(id),
    closeLote: () => setLoteId(null),
    openMover: (id) => setMoverId(id),
    closeMover: () => setMoverId(null),
    openCosechar: (id) => setCosecharId(id),
    closeCosechar: () => setCosecharId(null),
    openBancal: (tipo, num) => setBancal({ tipo, num }),
    closeBancal: () => setBancal(null),
  };

  return <ModalsContext.Provider value={value}>{children}</ModalsContext.Provider>;
}

export function useModals() {
  const ctx = useContext(ModalsContext);
  if (!ctx) throw new Error('useModals debe usarse dentro de <ModalsProvider>');
  return ctx;
}
