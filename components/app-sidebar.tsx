"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Car, Database, FileClock, LayoutDashboard, Settings } from "lucide-react"

const baseNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/historico", label: "Historico", icon: FileClock },
]

const CALIDAD_EMAIL = "diegobertosi@gmail.com"

interface AppSidebarProps {
  role?: string
  email?: string
}

export function AppSidebar({ role, email }: AppSidebarProps) {
  const pathname = usePathname()
  const isAdmin = role === "admin"
  const adminNavItems = [
    ...(email === CALIDAD_EMAIL ? [{ href: "/admin/calidad", label: "Calidad", icon: Database }] : []),
    { href: "/admin/email-config", label: "Destinatarios", icon: Settings },
    { href: "/admin/vehicle-alerts", label: "Responsables", icon: Car },
  ]
  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-background lg:block">
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <BarChart3 className="h-5 w-5" />
        <p className="font-semibold">FleetGuard</p>
      </div>
      <nav className="space-y-1 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                active ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t px-3 py-4 text-xs text-muted-foreground">
        <p>Panel legacy disponible en /panel</p>
      </div>
    </aside>
  )
}
