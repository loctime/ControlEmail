"use client"

import { memo } from "react"
import { Activity, AlertOctagon, AlertTriangle, Gauge, Sigma } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { DashboardSummary } from "@/services/dashboard-api"
import { cn } from "@/lib/utils"

interface DashboardKpisProps {
  summary: DashboardSummary
  loading?: boolean
}

type KpiItem = {
  key: string
  label: string
  subtitle: string
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
  if (tone === "critical") return "text-red-500"
  if (tone === "high") return "text-orange-500"
  if (tone === "medium") return "text-yellow-500"
  return "text-foreground"
}

function DashboardKpisBase({ summary, loading = false }: DashboardKpisProps) {
  const executive: KpiItem[] = [
    {
      key: "criticalEvents",
      label: "Eventos criticos",
      subtitle: "Requieren accion inmediata",
      value: summary.criticalEvents,
      icon: AlertOctagon,
      tone: "critical",
    },
    {
      key: "vehiclesWithEvents",
      label: "Vehiculos con eventos",
      subtitle: "Unidad activa con incidentes",
      value: summary.vehiclesWithEvents,
      icon: Activity,
      tone: "high",
    },
    {
      key: "maxRisk",
      label: "Riesgo maximo",
      subtitle: "Pico de exposicion actual",
      value: summary.maxRisk,
      icon: AlertTriangle,
      tone: "critical",
    },
  ]

  const analytical: KpiItem[] = [
    {
      key: "totalEvents",
      label: "Total eventos",
      subtitle: "Carga operativa del periodo",
      value: summary.totalEvents,
      icon: Sigma,
      tone: "neutral",
    },
    {
      key: "avgRisk",
      label: "Riesgo promedio",
      subtitle: "Nivel medio de severidad",
      value: summary.avgRisk,
      icon: Gauge,
      tone: "medium",
    },
  ]

  const renderCard = (item: KpiItem) => (
    <Card
      key={item.key}
      tabIndex={0}
      aria-label={`${item.label}: ${item.value}`}
      className={cn(
        "text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary",
        toneClasses(item.tone),
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
        <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className={cn("text-3xl font-bold tabular-nums", valueClasses(item.tone))}>{item.value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{item.subtitle}</p>
          </>
        )}
      </CardContent>
    </Card>
  )

  return (
    <section aria-label="Indicadores clave de riesgo de flota" className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Nivel ejecutivo</p>
        <div className="mt-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{executive.map(renderCard)}</div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Nivel analitico</p>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">{analytical.map(renderCard)}</div>
      </div>
    </section>
  )
}

export const DashboardKpis = memo(DashboardKpisBase)
