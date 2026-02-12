"use client"

import { Bell, Search } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"

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
    <header className="sticky top-0 z-30 flex min-h-[56px] items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <h1 className="text-base font-semibold">
        {sectionTitles[activeSection] || "Dashboard"}
      </h1>
      <div className="ml-auto flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar patente, evento..."
            className="h-11 min-h-[44px] w-48 pl-10 text-sm lg:w-64"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="relative h-11 w-11 min-h-[44px] min-w-[44px]"
          onClick={() => onNavigate("alertas")}
        >
          <Bell className="h-5 w-5" />
          {unreadAlerts > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-5 w-5 min-w-[20px] items-center justify-center rounded-full bg-destructive p-0 text-xs text-destructive-foreground">
              {unreadAlerts}
            </Badge>
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </div>
    </header>
  )
}
