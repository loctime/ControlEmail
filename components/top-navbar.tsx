"use client"

import { Bell, Search } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const sectionTitles: Record<string, string> = {
  dashboard: "Dashboard",
  eventos: "Eventos",
  vehiculos: "Vehiculos",
  alertas: "Alertas",
  configuracion: "Configuracion",
}

interface TopNavbarProps {
  activeSection: string
  searchQuery: string
  onSearchChange: (query: string) => void
  unreadAlerts: number
  onNavigate: (section: string) => void
}

export function TopNavbar({
  activeSection,
  searchQuery,
  onSearchChange,
  unreadAlerts,
  onNavigate,
}: TopNavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <h1 className="text-sm font-semibold">
        {sectionTitles[activeSection] || "Dashboard"}
      </h1>
      <div className="ml-auto flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar patente, evento..."
            className="h-8 w-48 pl-8 text-xs lg:w-64"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          onClick={() => onNavigate("alertas")}
        >
          <Bell className="h-4 w-4" />
          {unreadAlerts > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive p-0 text-[10px] text-destructive-foreground">
              {unreadAlerts}
            </Badge>
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </div>
    </header>
  )
}
