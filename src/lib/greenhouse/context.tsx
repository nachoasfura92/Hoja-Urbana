'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { defS } from './helpers';
import type { EstadoInvernadero } from './types';

// Reemplaza la sincronización con Google Sheets (server.js) por Supabase,
// manteniendo el mismo patrón: estado en memoria + guardado debounced +
// respaldo en localStorage si falla la red. Misma clave de storage que el original.
const STORAGE_KEY = 'inv_v9';
const ROW_ID = 'default';
const SAVE_DEBOUNCE_MS = 1500;

export type SyncStatus = 'idle' | 'ok' | 'saving' | 'error';

interface GreenhouseContextValue {
  state: EstadoInvernadero;
  loaded: boolean;
  syncStatus: SyncStatus;
  update: (mutator: (draft: EstadoInvernadero) => void) => void;
}

const GreenhouseContext = createContext<GreenhouseContextValue | null>(null);

export function GreenhouseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [state, setState] = useState<EstadoInvernadero>(() => defS());
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  // Evita disparar un guardado espurio apenas termina la carga inicial.
  const skipNextSaveRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('greenhouse_state')
          .select('data')
          .eq('id', ROW_ID)
          .single();
        if (cancelled) return;
        if (!error && data?.data) {
          setState(data.data as EstadoInvernadero);
          setSyncStatus('ok');
        } else {
          setState(defS());
        }
      } catch {
        if (cancelled) return;
        // Igual que el original: si falla la carga, se usa el respaldo local en
        // silencio (sin mostrar el indicador de error) y recién se avisa si
        // también falla un guardado posterior.
        const local = localStorage.getItem(STORAGE_KEY);
        setState(local ? (JSON.parse(local) as EstadoInvernadero) : defS());
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
        const { error } = await supabase
          .from('greenhouse_state')
          .update({ data: payload, updated_at: new Date().toISOString() })
          .eq('id', ROW_ID);
        setSyncStatus(error ? 'error' : 'ok');
      } catch {
        setSyncStatus('error');
      }
    },
    [supabase]
  );

  // Sincroniza con Supabase (debounced) cada vez que el estado cambia.
  useEffect(() => {
    if (!loaded) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const timer = setTimeout(() => guardarEnServidor(state), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state, loaded, guardarEnServidor]);

  const update = useCallback((mutator: (draft: EstadoInvernadero) => void) => {
    setState((prev) => {
      const next = structuredClone(prev);
      mutator(next);
      return next;
    });
  }, []);

  return (
    <GreenhouseContext.Provider value={{ state, loaded, syncStatus, update }}>{children}</GreenhouseContext.Provider>
  );
}

export function useGreenhouse() {
  const ctx = useContext(GreenhouseContext);
  if (!ctx) throw new Error('useGreenhouse debe usarse dentro de <GreenhouseProvider>');
  return ctx;
}
