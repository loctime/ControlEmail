"use client"

import {
  LayoutDashboard,
  AlertTriangle,
  Car,
  Bell,
  Settings,
  Shield,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const navItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    id: "dashboard",
  },
  {
    label: "Eventos",
    icon: AlertTriangle,
    id: "eventos",
    badge: 5,
  },
  {
    label: "Vehiculos",
    icon: Car,
    id: "vehiculos",
  },
  {
    label: "Alertas",
    icon: Bell,
    id: "alertas",
    badge: 3,
  },
  {
    label: "Configuracion",
    icon: Settings,
    id: "configuracion",
  },
]

interface AppSidebarProps {
  activeSection: string
  onNavigate: (section: string) => void
}

export function AppSidebar({ activeSection, onNavigate }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-sidebar-accent-foreground">
              FleetGuard
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              Control Vehicular
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegacion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeSection === item.id}
                    onClick={() => onNavigate(item.id)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
            OC
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-sidebar-accent-foreground">
              Operador Central
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              admin@fleetguard.com
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
