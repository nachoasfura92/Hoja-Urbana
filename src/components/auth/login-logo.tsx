'use client';

import { useState } from 'react';
import { Sprout } from 'lucide-react';

// Logo grande con fondo blanco (para que contraste) en la pantalla de login.
export function LoginLogo() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex size-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sprout className="size-10" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Hoja Urbana" className="h-16 w-auto max-w-full object-contain" onError={() => setFailed(true)} />
    </div>
  );
}
