"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type KpiCardAccent = "default" | "warning" | "danger" | "success"

export interface KpiCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  accent?: KpiCardAccent
  suffix?: string
}

const accentMap: Record<KpiCardAccent, string> = {
  default: "text-blue-400",
  warning: "text-orange-400",
  danger: "text-red-400",
  success: "text-emerald-400",
}

export function KpiCard({ label, value, icon, accent = "default", suffix }: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden border-white/5 bg-white/[0.03] backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.05] hover:border-white/10">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-widest text-white/40">{label}</p>
            <p className="text-3xl font-semibold tabular-nums text-white">
              {value}
              {suffix && <span className="ml-1 text-base font-normal text-white/50">{suffix}</span>}
            </p>
          </div>
          <div className={cn("mt-0.5", accentMap[accent])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
