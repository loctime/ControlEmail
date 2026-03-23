"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Car, ChevronLeft, ChevronRight, Database, FileClock, LayoutDashboard, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const baseNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/historico", label: "Historico", icon: FileClock },
]

const CALIDAD_EMAIL = "diegobertosi@gmail.com"

interface AppSidebarProps {
  role?: string
  email?: string
  collapsed?: boolean
  onToggle?: () => void
}

export function AppSidebar({ role, email, collapsed = false, onToggle }: AppSidebarProps) {
  const pathname = usePathname()
  const isAdmin = role === "admin"
  const adminNavItems = [
    ...(email === CALIDAD_EMAIL ? [{ href: "/admin/calidad", label: "Calidad", icon: Database }] : []),
    { href: "/admin/email-config", label: "Destinatarios", icon: Settings },
    { href: "/admin/vehicle-alerts", label: "Responsables", icon: Car },
  ]
  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems

  return (
    <aside
      style={{ width: collapsed ? "3.5rem" : "16rem", transition: "width 300ms ease-in-out" }}
      className="hidden shrink-0 border-r bg-background lg:flex lg:flex-col overflow-hidden"
    >
      {/* Logo + toggle */}
      <div className="flex h-16 shrink-0 items-stretch border-b">
        {collapsed ? (
          /* Colapsado: botón ocupa todo el header */
          <button
            type="button"
            onClick={onToggle}
            title="Expandir"
            className="flex w-full items-center justify-center text-muted-foreground hover:bg-muted/60"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          /* Expandido: logo + botón al costado */
          <>
            <div className="flex flex-1 items-center gap-2 px-4">
              <BarChart3 className="h-5 w-5 shrink-0" />
              <p className="truncate font-semibold">FleetGuard</p>
            </div>
            <button
              type="button"
              onClick={onToggle}
              title="Colapsar"
              className="flex h-full items-center justify-center border-l px-3 text-muted-foreground hover:bg-muted/60"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className={cn("flex-1", collapsed ? "" : "space-y-1 p-3")}>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center text-sm",
                collapsed ? "w-full justify-center rounded-none py-4" : "gap-2 rounded-md px-3 py-2",
                active ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="shrink-0 border-t px-3 py-4">
          <p className="px-3 text-xs text-muted-foreground">Panel legacy en /panel</p>
        </div>
      )}
    </aside>
  )
}
