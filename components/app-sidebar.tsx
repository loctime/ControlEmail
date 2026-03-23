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
      className={cn(
        "hidden shrink-0 border-r bg-background lg:flex lg:flex-col overflow-hidden",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-14" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <BarChart3 className="h-5 w-5 shrink-0" />
        {!collapsed && <p className="truncate font-semibold">FleetGuard</p>}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm",
                collapsed ? "justify-center" : "gap-2",
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
      <div className="shrink-0 border-t p-3">
        {!collapsed && (
          <p className="mb-2 px-3 text-xs text-muted-foreground">Panel legacy en /panel</p>
        )}
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? "Expandir" : "Colapsar"}
          className={cn(
            "flex w-full items-center rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60",
            collapsed ? "justify-center" : "gap-2",
          )}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4 shrink-0" />
            : (
              <>
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span>Colapsar</span>
              </>
            )}
        </button>
      </div>
    </aside>
  )
}
