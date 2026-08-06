'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { defS } from './helpers';
import { cargarEstadoDesdeTablas, guardarEstadoEnTablas } from './repository';
import type { EstadoInvernadero } from './types';

// Reemplaza la sincronización con Google Sheets (server.js) por Supabase. Los
// datos viven en tablas normalizadas (ver repository.ts); acá solo se
// arma/desarma el mismo objeto EstadoInvernadero que ya usa toda la UI.
//
// Varias personas usan la app al mismo tiempo desde pestañas/dispositivos
// distintos. Antes, cada update() guardaba la copia del estado que esa
// pestaña tenía en memoria desde que cargó la página — si otra persona había
// hecho cambios mientras tanto (a veces horas antes), esa pestaña los pisaba
// sin avisar al guardar los suyos: así se perdían banderas, siembras, etc.
// Ahora cada update() vuelve a leer el estado más reciente del servidor,
// aplica el cambio sobre ESE, y recién ahí guarda — nunca sobre una copia
// vieja en memoria.
const STORAGE_KEY = 'inv_v9';

export type SyncStatus = 'idle' | 'ok' | 'saving' | 'error';

interface GreenhouseContextValue {
  state: EstadoInvernadero;
  loaded: boolean;
  loadOk: boolean;
  syncStatus: SyncStatus;
  update: (mutator: (draft: EstadoInvernadero) => void) => void;
}

const GreenhouseContext = createContext<GreenhouseContextValue | null>(null);

export function GreenhouseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [state, setState] = useState<EstadoInvernadero>(() => defS());
  const [loaded, setLoaded] = useState(false);
  // Solo true si la carga inicial vino realmente de Supabase. Si vino de un
  // respaldo local o vacío por una carga fallida, dashboard-shell bloquea
  // toda la UI (ver ahí) en vez de arriesgar guardar ese respaldo por
  // encima de datos reales.
  const [loadOk, setLoadOk] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Encadena los update() entre sí: cada uno espera a que el anterior
  // termine de leer+guardar antes de empezar el suyo. Si no, dos acciones
  // seguidas en la misma pestaña podrían leer "lo más reciente" al mismo
  // tiempo (antes de que la primera guardara) y la segunda en terminar
  // pisaría a la primera.
  const updateQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const estado = await cargarEstadoDesdeTablas(supabase);
        if (cancelled) return;
        setState(estado);
        setLoadOk(true);
        setSyncStatus('ok');
      } catch {
        if (cancelled) return;
        // La carga real falló: se muestra un respaldo local (o vacío) solo
        // para que se pueda ver algo. dashboard-shell bloquea la UI mientras
        // loadOk sea false, así que esto nunca se guarda por encima de datos
        // reales. Se combina con defS() como base para que un respaldo local
        // viejo, guardado antes de agregar un campo nuevo al estado, no
        // rompa el render por faltarle esa propiedad.
        const local = localStorage.getItem(STORAGE_KEY);
        setState(local ? { ...defS(), ...(JSON.parse(local) as EstadoInvernadero) } : defS());
        setSyncStatus('error');
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const update = useCallback(
    (mutator: (draft: EstadoInvernadero) => void) => {
      // Respuesta visual inmediata: aplica el cambio sobre lo último que
      // esta pestaña tiene en memoria, sin esperar la red.
      setState((prev) => {
        const optimista = structuredClone(prev);
        mutator(optimista);
        return optimista;
      });

      const run = async () => {
        setSyncStatus('saving');
        let base: EstadoInvernadero;
        try {
          base = await cargarEstadoDesdeTablas(supabase);
        } catch {
          // No se pudo confirmar el estado más reciente del servidor: para
          // no perder la acción de la persona, se aplica igual sobre el
          // último estado conocido en esta pestaña, pero queda marcado como
          // error — hay riesgo de pisar un cambio hecho en otra pestaña
          // mientras no hubo red.
          base = stateRef.current;
        }
        const next = structuredClone(base);
        mutator(next);
        setState(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        try {
          await guardarEstadoEnTablas(supabase, next);
          setSyncStatus('ok');
        } catch {
          setSyncStatus('error');
        }
      };
      updateQueueRef.current = updateQueueRef.current.then(run, run);
    },
    [supabase]
  );

  return (
    <GreenhouseContext.Provider value={{ state, loaded, loadOk, syncStatus, update }}>
      {children}
    </GreenhouseContext.Provider>
  );
}

export function useGreenhouse() {
  const ctx = useContext(GreenhouseContext);
  if (!ctx) throw new Error('useGreenhouse debe usarse dentro de <GreenhouseProvider>');
  return ctx;
}
