'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Nombre para mostrar del usuario logueado, usado para la trazabilidad
// (quién registró cada siembra, traspaso de bancal o cosecha). Se guarda en
// el user_metadata de Supabase Auth, no requiere una tabla aparte.
interface CurrentUserContextValue {
  loading: boolean;
  email: string | null;
  displayName: string | null;
  setDisplayName: (name: string) => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayNameState] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setEmail(data.user?.email ?? null);
      const name = data.user?.user_metadata?.display_name;
      setDisplayNameState(typeof name === 'string' && name.trim() ? name : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const setDisplayName = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const { data, error } = await supabase.auth.updateUser({ data: { display_name: trimmed } });
      if (!error) {
        setDisplayNameState((data.user?.user_metadata?.display_name as string) ?? trimmed);
      }
    },
    [supabase]
  );

  return (
    <CurrentUserContext.Provider value={{ loading, email, displayName, setDisplayName }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error('useCurrentUser debe usarse dentro de <CurrentUserProvider>');
  return ctx;
}
