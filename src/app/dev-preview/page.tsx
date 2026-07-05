import { DashboardShell } from '@/components/dashboard/dashboard-shell';

// Ruta temporal solo para QA visual local sin necesitar credenciales reales de
// Supabase todavía. Se borra antes del despliegue a producción.
export default function DevPreview() {
  return <DashboardShell userEmail="dev@local.test" />;
}
