"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Car, ChevronLeft, ChevronRight, FileClock, LayoutDashboard, Settings, Truck } from "lucide-react"
import { cn } from "@/lib/utils"

const baseNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/historico", label: "Historico", icon: FileClock },
  { href: "/vehiculos", label: "Vehículos", icon: Truck },
]

interface AppSidebarProps {
  role?: string
  collapsed?: boolean
  onToggle?: () => void
}

export function AppSidebar({ role, collapsed = false, onToggle }: AppSidebarProps) {
  const pathname = usePathname()
  const isAdmin = role === "admin"
  const adminNavItems = [
    { href: "/admin/email-config", label: "Destinatarios", icon: Settings },
    { href: "/admin/vehicle-alerts", label: "Responsables", icon: Car },
  ]
  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems

  return (
    <aside
      className={cn(
        "hidden shrink-0 border-r bg-background transition-[width] duration-300 ease-in-out lg:flex lg:flex-col overflow-hidden sticky top-0 h-screen",
        collapsed ? "w-12" : "w-max min-w-[9.5rem] max-w-[13.5rem]",
      )}
    >
      {/* Logo + toggle */}
      <div className="flex h-14 shrink-0 items-stretch border-b">
        {collapsed ? (
          /* Colapsado: botón ocupa todo el header */
          <button
            type="button"
            onClick={onToggle}
            title="Expandir"
            className="flex w-full items-center justify-center text-muted-foreground hover:bg-muted/60"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          /* Expandido: ancho natural (sin flex-1 que forzaba todo el ancho del sidebar) */
          <>
            <div className="flex min-w-0 items-center gap-1.5 px-2">
              <BarChart3 className="h-4 w-4 shrink-0" />
              <p className="whitespace-nowrap text-sm font-semibold leading-tight">FleetGuard</p>
            </div>
            <button
              type="button"
              onClick={onToggle}
              title="Colapsar"
              className="flex h-full shrink-0 items-center justify-center border-l px-2 text-muted-foreground hover:bg-muted/60"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Nav: items-start evita que los links se estiren a todo el ancho (fondo del ítem activo solo envuelve texto+icono) */}
      <nav
        className={cn(
          "flex flex-1 flex-col items-start gap-0.5",
          collapsed ? "w-full" : "p-1.5",
        )}
      >
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex items-center text-xs",
                collapsed
                  ? "w-full justify-center rounded-none py-3"
                  : "w-fit max-w-full gap-1.5 rounded-md px-2 py-1.5",
                active ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && (
                <span className="min-w-0 whitespace-nowrap leading-tight">{item.label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="shrink-0 border-t px-1.5 py-2">
          <p className="px-1.5 text-[10px] leading-snug text-muted-foreground">Panel legacy en /panel</p>
        </div>
      )}
    </aside>
  )
}
