'use client';

import { useState } from 'react';
import { GreenhouseProvider, useGreenhouse } from '@/lib/greenhouse/context';
import { ModalsProvider } from '@/lib/greenhouse/modals-context';
import { CurrentUserProvider } from '@/lib/auth/current-user-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { AppSidebar } from './app-sidebar';
import { Topbar } from './topbar';
import { SyncStatus } from './sync-status';
import { NamePromptDialog } from './name-prompt-dialog';
import type { TabId } from '@/lib/greenhouse/constants';
import { ResumenPage } from '@/components/pages/resumen-page';
import { TareasPage } from '@/components/pages/tareas-page';
import { RegistrarPage } from '@/components/pages/registrar-page';
import { MesaPage } from '@/components/pages/mesa-page';
import { BancalesPage } from '@/components/pages/bancales-page';
import { VentaPage } from '@/components/pages/venta-page';
import { PlanPage } from '@/components/pages/plan-page';
import { InventarioPage } from '@/components/pages/inventario-page';
import { VariedadesPage } from '@/components/pages/variedades-page';
import { CosechasPage } from '@/components/pages/cosechas-page';
import { HistorialPage } from '@/components/pages/historial-page';
import { LoteModal } from '@/components/modals/lote-modal';
import { MoverModal } from '@/components/modals/mover-modal';
import { CosecharModal } from '@/components/modals/cosechar-modal';
import { BancalModal } from '@/components/modals/bancal-modal';

const TABS: TabId[] = [
  'resumen',
  'tareas',
  'registrar',
  'mesa',
  'bancales',
  'venta',
  'plan',
  'inventario',
  'variedades',
  'cosechas',
  'historial',
];

function DashboardContent({ userEmail }: { userEmail?: string | null }) {
  const { loaded } = useGreenhouse();
  const [activeTab, setActiveTab] = useState<TabId>('resumen');

  if (!loaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-6">
        <div className="grid w-full max-w-md gap-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar active={activeTab} onSelect={setActiveTab} />
      <SidebarInset>
        <Topbar activeTab={activeTab} userEmail={userEmail} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {TABS.map((tab) => {
            // El gráfico de Venta (recharts) no mide bien su tamaño si se
            // monta oculto (display:none), así que esa pestaña se monta y
            // desmonta en vez de solo ocultarse como el resto.
            if (tab === 'venta') {
              return tab === activeTab ? (
                <div key={tab}>
                  <VentaPage />
                </div>
              ) : null;
            }
            return (
              <div key={tab} className={tab === activeTab ? '' : 'hidden'}>
                {tab === 'resumen' && <ResumenPage />}
                {tab === 'tareas' && <TareasPage />}
                {tab === 'registrar' && <RegistrarPage />}
                {tab === 'mesa' && <MesaPage />}
                {tab === 'bancales' && <BancalesPage />}
                {tab === 'plan' && <PlanPage />}
                {tab === 'inventario' && <InventarioPage />}
                {tab === 'variedades' && <VariedadesPage />}
                {tab === 'cosechas' && <CosechasPage />}
                {tab === 'historial' && <HistorialPage />}
              </div>
            );
          })}
        </main>
      </SidebarInset>
      <LoteModal />
      <MoverModal />
      <CosecharModal />
      <BancalModal />
      <SyncStatus />
      <NamePromptDialog />
    </SidebarProvider>
  );
}

export function DashboardShell({ userEmail }: { userEmail?: string | null }) {
  return (
    <CurrentUserProvider>
      <GreenhouseProvider>
        <ModalsProvider>
          <DashboardContent userEmail={userEmail} />
        </ModalsProvider>
      </GreenhouseProvider>
    </CurrentUserProvider>
  );
}
