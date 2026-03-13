"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type SuperDashboardTabId = "operational" | "admin"

export interface DashboardTabsProps {
  activeTab: SuperDashboardTabId
  onTabChange: (tab: SuperDashboardTabId) => void
  children: React.ReactNode
}

export function DashboardTabs({ activeTab, onTabChange, children }: DashboardTabsProps) {
  return (
    <div className="space-y-4">
      <div className="flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-sm font-medium",
            activeTab === "operational"
              ? "bg-white/10 text-white"
              : "text-white/50 hover:bg-white/5 hover:text-white/70",
          )}
          onClick={() => onTabChange("operational")}
        >
          Riesgo operativo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-sm font-medium",
            activeTab === "admin"
              ? "bg-white/10 text-white"
              : "text-white/50 hover:bg-white/5 hover:text-white/70",
          )}
          onClick={() => onTabChange("admin")}
        >
          Alertas administrativas
        </Button>
      </div>
      {children}
    </div>
  )
}
