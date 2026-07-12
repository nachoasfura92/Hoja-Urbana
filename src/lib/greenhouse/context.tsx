'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { defS } from './helpers';
import { cargarEstadoDesdeTablas, guardarEstadoEnTablas } from './repository';
import type { EstadoInvernadero } from './types';

// Reemplaza la sincronización con Google Sheets (server.js) por Supabase,
// manteniendo el mismo patrón: estado en memoria + guardado debounced +
// respaldo en localStorage si falla la red. Misma clave de storage que el original.
// Los datos viven en tablas normalizadas (ver repository.ts); acá solo se
// arma/desarma el mismo objeto EstadoInvernadero que ya usa toda la UI.
const STORAGE_KEY = 'inv_v9';
const SAVE_DEBOUNCE_MS = 1500;

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
  // Solo true si la carga inicial vino realmente de Supabase. El guardado
  // automático queda bloqueado mientras esto sea false, para que un estado
  // de respaldo/vacío por una carga fallida nunca pueda sobreescribir datos
  // reales en el servidor (así se perdieron datos reales una vez).
  const [loadOk, setLoadOk] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  // Evita disparar un guardado espurio apenas termina la carga inicial.
  const skipNextSaveRef = useRef(true);

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
        // para que se pueda ver algo, pero nunca se guarda automáticamente
        // desde acá — podría ser información vieja o vacía y pisar datos
        // reales en el servidor. Hay que recargar la página para reintentar.
        const local = localStorage.getItem(STORAGE_KEY);
        setState(local ? (JSON.parse(local) as EstadoInvernadero) : defS());
        setSyncStatus('error');
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const guardarEnServidor = useCallback(
    async (payload: EstadoInvernadero) => {
      setSyncStatus('saving');
      try {
        await guardarEstadoEnTablas(supabase, payload);
        setSyncStatus('ok');
      } catch {
        setSyncStatus('error');
      }
    },
    [supabase]
  );

  // Sincroniza con Supabase (debounced) cada vez que el estado cambia, pero
  // solo si la carga inicial fue realmente exitosa (ver loadOk arriba).
  useEffect(() => {
    if (!loaded || !loadOk) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const timer = setTimeout(() => guardarEnServidor(state), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state, loaded, loadOk, guardarEnServidor]);

  const update = useCallback((mutator: (draft: EstadoInvernadero) => void) => {
    setState((prev) => {
      const next = structuredClone(prev);
      mutator(next);
      return next;
    });
  }, []);

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
