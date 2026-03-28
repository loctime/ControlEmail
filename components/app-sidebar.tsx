"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Briefcase, Car, ChevronRight, FileClock, LayoutDashboard, Settings, Truck } from "lucide-react"
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
    { href: "/admin/operations", label: "Operaciones", icon: Briefcase },
  ]
  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems

  return (
    <aside
      id="app-sidebar"
      className={cn(
        "hidden shrink-0 border-r bg-background transition-[width] duration-300 ease-in-out lg:flex lg:flex-col overflow-hidden sticky top-0 h-screen",
        collapsed ? "w-12" : "w-max min-w-[9.5rem] max-w-[13.5rem]",
      )}
    >
      {/* Header blanco: logo a ancho completo; colapsar vive en el TopNavbar (lg+) */}
      <div className="shrink-0 border-b border-[#E5E7EB] bg-[#FFFFFF] px-1.5 py-0.5">
        {collapsed ? (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={onToggle}
              title="Expandir menú lateral"
              className="flex w-full items-center justify-center rounded-md py-2 text-muted-foreground hover:bg-muted/60"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex min-h-[5.75rem] items-center justify-center overflow-hidden px-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/logo-sidebar.png"
              alt="ControlDoc Vehicular"
              className="h-[5.75rem] w-auto max-w-full object-contain object-center"
              width={340}
              height={92}
            />
          </div>
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
