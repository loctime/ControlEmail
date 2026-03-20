"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Bell, Car, Database, FileClock, Gauge, ListChecks, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface AppSidebarProps {
  pendingAlertsCount?: number
}

const navItems = [
  { href: "/historico", label: "Historico", icon: FileClock },
]

export function AppSidebar({ pendingAlertsCount = 0 }: AppSidebarProps) {
  const pathname = usePathname()

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
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                active ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60"
              }`}
            >
              <span className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {item.label}
              </span>
              {item.href === "/pendientes" && pendingAlertsCount > 0 && <Badge>{pendingAlertsCount}</Badge>}
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
