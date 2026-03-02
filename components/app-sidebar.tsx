"use client"

import {
  LayoutDashboard,
  AlertTriangle,
  Car,
  Bell,
  Settings,
  Shield,
  BarChart3,
  Send,
  FileCheck,
} from "lucide-react"
import Link from "next/link"
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

const inPageSections = [
  { label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { label: "Eventos", icon: AlertTriangle, id: "eventos" },
  { label: "Vehículos", icon: Car, id: "vehiculos" },
  { label: "Alertas", icon: Bell, id: "alertas" },
  { label: "Configuración", icon: Settings, id: "configuracion" },
] as const

interface AppSidebarProps {
  activeSection: string
  onNavigate: (section: string) => void
  /** Número de alertas pendientes de envío (badge en Alertas). */
  pendingAlertsCount?: number
}

export function AppSidebar({ activeSection, onNavigate, pendingAlertsCount = 0 }: AppSidebarProps) {
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
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {inPageSections.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeSection === item.id}
                    onClick={() => onNavigate(item.id)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {item.id === "alertas" && pendingAlertsCount > 0 && (
                    <SidebarMenuBadge>{pendingAlertsCount}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Métricas y rutas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard" title="Dashboard de alertas">
                    <BarChart3 className="h-4 w-4" />
                    <span>Dashboard alertas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/pendientes" title="Alertas pendientes de envío">
                    <Send className="h-4 w-4" />
                    <span>Pendientes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/vehiculos" title="Vehículos con eventos hoy">
                    <Car className="h-4 w-4" />
                    <span>Vehículos (hoy)</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/historico" title="Histórico de alertas">
                    <BarChart3 className="h-4 w-4" />
                    <span>Histórico</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/calidad" title="Calidad de datos">
                    <FileCheck className="h-4 w-4" />
                    <span>Calidad</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
