"use client"

import type { KpiCardProps } from "./KpiCard"
import { KpiCard } from "./KpiCard"

export interface KpiGridProps {
  kpis: KpiCardProps[]
}

export function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  )
}
