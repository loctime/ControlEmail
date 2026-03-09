"use client"

import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { RiskMapItem } from "@/services/dashboard-api"
import { cn } from "@/lib/utils"

interface FleetRiskHeatmapProps {
  items: RiskMapItem[]
  loading?: boolean
}

function riskClass(riskScore: number): string {
  if (riskScore >= 15) return "border-red-500/20 bg-red-500/10 text-red-500"
  if (riskScore >= 8) return "border-orange-500/20 bg-orange-500/10 text-orange-500"
  if (riskScore >= 4) return "border-yellow-500/20 bg-yellow-500/10 text-yellow-500"
  return "border-green-500/20 bg-green-500/10 text-green-500"
}

function FleetRiskHeatmapBase({ items, loading = false }: FleetRiskHeatmapProps) {
  return (
    <Card className="border-border bg-card text-foreground">
      <CardHeader>
        <CardTitle>Fleet Risk Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, idx) => (
              <Skeleton key={idx} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => (
              <article
                key={item.plate}
                tabIndex={0}
                aria-label={`Patente ${item.plate} riesgo ${item.riskScore} eventos ${item.events}`}
                className={cn(
                  "rounded-lg border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary",
                  riskClass(item.riskScore),
                )}
              >
                <p className="font-mono text-sm font-semibold tracking-wide text-foreground">{item.plate}</p>
                <p className="mt-1 text-xs font-medium">riesgo {item.riskScore}</p>
                <p className="text-xs opacity-80">{item.events} eventos</p>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const FleetRiskHeatmap = memo(FleetRiskHeatmapBase)
