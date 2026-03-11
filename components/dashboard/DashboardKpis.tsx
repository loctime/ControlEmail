"use client"

import { memo } from "react"
import { Activity, AlertOctagon, AlertTriangle, Gauge, Sigma } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { DashboardSummary } from "@/services/dashboard-api"
import { cn } from "@/lib/utils"

interface DashboardKpisProps {
  summary: DashboardSummary
  loading?: boolean
}

type KpiItem = {
  key: string
  label: string
  tooltip: string
  value: number
  icon: typeof Sigma
  tone: "critical" | "high" | "medium" | "neutral"
}

function toneClasses(tone: KpiItem["tone"]): string {
  if (tone === "critical") return "border-red-500/20 bg-red-500/10"
  if (tone === "high") return "border-orange-500/20 bg-orange-500/10"
  if (tone === "medium") return "border-yellow-500/20 bg-yellow-500/10"
  return "border-border bg-card"
}

function valueClasses(tone: KpiItem["tone"]): string {
  if (tone === "critical") return "text-red-600 dark:text-red-400"
  if (tone === "high") return "text-orange-600 dark:text-orange-400"
  if (tone === "medium") return "text-yellow-600 dark:text-yellow-400"
  return "text-foreground"
}

function DashboardKpisBase({ summary, loading = false }: DashboardKpisProps) {
  const kpis: KpiItem[] = [
    {
      key: "totalEvents",
      label: "Eventos totales",
      tooltip: "Total de eventos en el periodo seleccionado",
      value: summary.totalEvents,
      icon: Sigma,
      tone: "neutral",
    },
    {
      key: "criticalEvents",
      label: "Alertas críticas",
      tooltip: "Eventos que requieren acción inmediata",
      value: summary.criticalEvents,
      icon: AlertOctagon,
      tone: "critical",
    },
    {
      key: "vehiclesWithEvents",
      label: "Veh. con riesgo alto",
      tooltip: "Vehículos con al menos un evento en el periodo",
      value: summary.vehiclesWithEvents,
      icon: Activity,
      tone: "high",
    },
    {
      key: "avgRisk",
      label: "Riesgo promedio",
      tooltip: "Nivel medio de severidad de la flota",
      value: summary.avgRisk,
      icon: Gauge,
      tone: "medium",
    },
    {
      key: "maxRisk",
      label: "Riesgo máximo",
      tooltip: "Pico de exposición actual",
      value: summary.maxRisk,
      icon: AlertTriangle,
      tone: "critical",
    },
  ]

  return (
    <TooltipProvider delayDuration={300}>
      <section aria-label="Indicadores clave de riesgo de flota" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((item) => (
          <Tooltip key={item.key}>
            <TooltipTrigger asChild>
              <Card
                tabIndex={0}
                aria-label={`${item.label}: ${item.value}`}
                className={cn(
                  "cursor-default text-foreground transition-all duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary",
                  toneClasses(item.tone),
                )}
              >
                <CardContent className="flex flex-col gap-1 p-4">
                  <div className="flex items-center justify-between">
                    <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <span className={cn("text-2xl font-bold tabular-nums md:text-3xl", valueClasses(item.tone))}>
                      {typeof item.value === "number" && item.value % 1 !== 0 ? item.value.toFixed(1) : item.value}
                    </span>
                  )}
                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px]">
              <p>{item.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </section>
    </TooltipProvider>
  )
}

export const DashboardKpis = memo(DashboardKpisBase)
