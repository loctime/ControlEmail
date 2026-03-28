"use client"

import { useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useNav } from "@/components/layout/nav-context"
import { cn } from "@/lib/utils"

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/vehiculos": "Vehiculos",
  "/historico": "Historico",
  "/admin/calidad": "Calidad de datos",
}

interface TopNavbarProps {
  subtitle?: string
  onLogout: () => Promise<void>
}

export function TopNavbar({ subtitle, onLogout }: TopNavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { collapsed, toggle } = useNav()

  const title = useMemo(() => {
    const matched = Object.keys(titles).find((path) => pathname === path || pathname.startsWith(`${path}/`))
    return matched ? titles[matched] : "ControlDoc Vehicular"
  }, [pathname])

  return (
    <header className="sticky top-0 z-20 flex items-stretch border-b border-[#E5E7EB] bg-background/95 backdrop-blur">
      <button
        type="button"
        className={cn(
          "hidden w-14 shrink-0 border-r border-[#E5E7EB] text-muted-foreground transition-colors hover:bg-muted/60",
          "lg:flex lg:items-center lg:justify-center lg:bg-[#FFFFFF]",
        )}
        onClick={() => toggle()}
        title={collapsed ? "Mostrar menú lateral" : "Ocultar menú lateral"}
        aria-expanded={!collapsed}
        aria-controls="app-sidebar"
      >
        {collapsed ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
      </button>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/operations")}>Admin</Button>
          <Button variant="ghost" size="sm" onClick={() => void onLogout()}>
            <LogOut className="mr-2 h-4 w-4" />
            Salir
          </Button>
        </div>
      </div>
    </header>
  )
}
