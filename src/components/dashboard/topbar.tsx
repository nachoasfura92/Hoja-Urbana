'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Download, LogOut, User } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SearchLotes } from '@/components/dashboard/search-lotes';
import { createClient } from '@/lib/supabase/client';
import { useGreenhouse } from '@/lib/greenhouse/context';
import { computeTopPills, hoy } from '@/lib/greenhouse/helpers';
import { DIAS_L, MESES_L, TITLES, type TabId } from '@/lib/greenhouse/constants';

function fechaHoyLarga() {
  const now = new Date();
  return `${DIAS_L[now.getDay()]}, ${now.getDate()} de ${MESES_L[now.getMonth()]} ${now.getFullYear()}`;
}

export function Topbar({ activeTab, userEmail }: { activeTab: TabId; userEmail?: string | null }) {
  const router = useRouter();
  const { state } = useGreenhouse();
  const { nAlertas, listasVenta } = computeTopPills(state);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  // Respaldo manual descargable: una copia independiente que el operador
  // controla, sin depender de que sobreviva el localStorage de algún navegador.
  function descargarRespaldo() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hoja-urbana-respaldo-${hoy()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-card px-4 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger className="-ml-1" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{TITLES[activeTab]}</div>
          <div className="truncate text-xs text-muted-foreground">{fechaHoyLarga()}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {nAlertas > 0 && (
          <Badge variant="outline" className="gap-1 border-warning/40 bg-warning/10 text-warning">
            <AlertTriangle className="size-3" />
            {nAlertas} alerta{nAlertas > 1 ? 's' : ''}
          </Badge>
        )}
        {listasVenta > 0 && (
          <Badge variant="outline" className="gap-1 border-success/40 bg-success/10 text-success">
            <CheckCircle2 className="size-3" />
            {listasVenta.toLocaleString()} listas venta
          </Badge>
        )}
        <SearchLotes />
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" />}>
            <Avatar className="size-8">
              <AvatarFallback>
                <User className="size-4" />
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {userEmail && (
              <DropdownMenuGroup>
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{userEmail}</DropdownMenuLabel>
              </DropdownMenuGroup>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={descargarRespaldo}>
              <Download />
              Descargar respaldo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
