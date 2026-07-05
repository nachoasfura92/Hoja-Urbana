import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Cliente de Supabase para Server Components / Route Handlers.
// Se crea uno nuevo por request (recomendado por Supabase para Next.js App Router).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Ignorable: setAll fue llamado desde un Server Component, donde
            // no se pueden escribir cookies directamente (solo lectura).
          }
        },
      },
    }
  );
}
