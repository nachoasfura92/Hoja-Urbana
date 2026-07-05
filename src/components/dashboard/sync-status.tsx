'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useGreenhouse, type SyncStatus as SyncStatusValue } from '@/lib/greenhouse/context';

const LABEL: Record<string, string> = {
  ok: '✓ Guardado',
  saving: '⏳ Guardando...',
  error: '⚠ Sin conexión — guardado local',
};

export function SyncStatus() {
  const { syncStatus } = useGreenhouse();
  const [hideOk, setHideOk] = useState(false);

  // Cada vez que cambia el status, se vuelve a mostrar el indicador (patrón
  // "ajustar estado durante el render" en vez de un efecto).
  const [lastStatus, setLastStatus] = useState<SyncStatusValue>(syncStatus);
  if (syncStatus !== lastStatus) {
    setLastStatus(syncStatus);
    if (hideOk) setHideOk(false);
  }

  // El auto-ocultamiento tras 2s (solo para 'ok') sí es un efecto legítimo:
  // sincroniza con un temporizador externo.
  useEffect(() => {
    if (syncStatus !== 'ok') return;
    const t = setTimeout(() => setHideOk(true), 2000);
    return () => clearTimeout(t);
  }, [syncStatus]);

  if (syncStatus === 'idle') return null;
  const visible = !(syncStatus === 'ok' && hideOk);

  return (
    <div
      className={cn(
        'fixed bottom-3 right-3 z-50 rounded-full px-3 py-1 text-xs font-medium shadow-sm transition-opacity duration-300',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
        syncStatus === 'ok' && 'bg-success/15 text-success',
        syncStatus === 'saving' && 'bg-warning/15 text-warning',
        syncStatus === 'error' && 'bg-destructive/15 text-destructive'
      )}
    >
      {LABEL[syncStatus]}
    </div>
  );
}
