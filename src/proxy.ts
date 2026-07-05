import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// En Next.js 16 el archivo "middleware.ts" pasó a llamarse "proxy.ts"
// (misma funcionalidad, distinto nombre).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
