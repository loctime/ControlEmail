"use client"

import { memo, useMemo } from "react"
import { Lightbulb } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { DashboardSummary, EventDistribution, TopVehicle, TrendPoint } from "@/services/dashboard-api"

interface FleetInsightsPanelProps {
  summary: DashboardSummary
  distribution: EventDistribution
  topVehicles: TopVehicle[]
  trend: TrendPoint[]
  loading?: boolean
}

function formatPct(value: number): string {
  return `${Math.round(value)}%`
}

function FleetInsightsPanelBase({
  summary,
  distribution,
  topVehicles,
  trend,
  loading = false,
}: FleetInsightsPanelProps) {
  const insights = useMemo(() => {
    const distributionRows = [
      { label: "contacto", value: distribution.contactos },
      { label: "exceso", value: distribution.excesos },
      { label: "sin conductor", value: distribution.no_identificados },
      { label: "sin carga", value: distribution.llave_sin_cargar },
      { label: "otros", value: distribution.conductor_inactivo },
    ]

    const totalDist = distributionRows.reduce((sum, row) => sum + row.value, 0)
    const dominant = distributionRows.sort((a, b) => b.value - a.value)[0]
    const dominantPct = totalDist > 0 ? (dominant.value / totalDist) * 100 : 0

    const top3Events = topVehicles.slice(0, 3).reduce((sum, row) => sum + row.events, 0)
    const top3Pct = summary.totalEvents > 0 ? (top3Events / summary.totalEvents) * 100 : 0

    const first = trend[0]?.events ?? 0
    const last = trend[trend.length - 1]?.events ?? 0
    const trendPct = first > 0 ? ((last - first) / first) * 100 : 0
    const trendDirection = trendPct <= 0 ? "redujo" : "aumento"

    return [
      `El ${formatPct(dominantPct)} del riesgo operativo proviene de eventos de ${dominant.label}.`,
      `Los 3 vehiculos mas riesgosos concentran el ${formatPct(top3Pct)} del total de eventos.`,
      `La flota ${trendDirection} eventos en ${formatPct(Math.abs(trendPct))} entre el inicio y el cierre del periodo.`,
    ]
  }, [distribution, summary.totalEvents, topVehicles, trend])

  return (
    <Card className="border-border bg-card text-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" aria-hidden />
          Fleet Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            {insights.map((insight, index) => (
              <article
                key={index}
                tabIndex={0}
                aria-label={`Insight ${index + 1}`}
                className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-foreground transition-colors hover:bg-yellow-500/15 focus-visible:ring-2 focus-visible:ring-primary"
              >
                {insight}
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const FleetInsightsPanel = memo(FleetInsightsPanelBase)
