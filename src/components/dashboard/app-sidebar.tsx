'use client';

import {
  ClipboardList,
  History,
  LayoutDashboard,
  LayoutGrid,
  Leaf,
  LineChart,
  Package,
  Route,
  Sprout,
  type LucideIcon,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { TabId } from '@/lib/greenhouse/constants';

interface NavItem {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const NAV: { section: string; items: NavItem[] }[] = [
  { section: 'General', items: [{ id: 'resumen', label: 'Resumen', icon: LayoutDashboard }] },
  {
    section: 'Operación',
    items: [
      { id: 'registrar', label: 'Registrar siembra', icon: ClipboardList },
      { id: 'mesa', label: 'Mesa plantines', icon: Sprout },
      { id: 'bancales', label: 'Bancales', icon: LayoutGrid },
    ],
  },
  {
    section: 'Administración',
    items: [
      { id: 'venta', label: 'Calendario venta', icon: LineChart },
      { id: 'plan', label: 'Plan siembra', icon: Route },
      { id: 'inventario', label: 'Inventario', icon: Package },
      { id: 'variedades', label: 'Variedades', icon: Leaf },
      { id: 'historial', label: 'Historial', icon: History },
    ],
  },
];

export function AppSidebar({ active, onSelect }: { active: TabId; onSelect: (tab: TabId) => void }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Sprout className="size-4" />
          </div>
          <span className="truncate font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Hoja Urbana
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV.map((group) => (
          <SidebarGroup key={group.section}>
            <SidebarGroupLabel>{group.section}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={active === item.id}
                      onClick={() => onSelect(item.id)}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
