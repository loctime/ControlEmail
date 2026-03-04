"use client"

import {
  AlertTriangle,
  Gauge,
  ShieldAlert,
  CircleAlert,
} from "lucide-react"
import { AppCard } from "@/components/app-card"
import type { VehicleEvent } from "@/lib/data"
import { getYesterdayKey } from "@/lib/domain/date"

interface KPICardsProps {
  events: VehicleEvent[]
  /** Fecha de referencia (YYYY-MM-DD). Por defecto ayer, día del dashboard. */
  referenceDateKey?: string
  /** Total excesos del día desde dailyAlerts; si está definido, se usa para el KPI en lugar de contar por tipo. */
  excesosFromDailyAlerts?: number | null
}

export function KPICards({ events, referenceDateKey, excesosFromDailyAlerts }: KPICardsProps) {
  const dateKey = referenceDateKey ?? getYesterdayKey()
  const dayEvents = events.filter((e) => e.fecha === dateKey)
  const speedEvents = dayEvents.filter(
    (e) => e.tipo === "exceso_velocidad"
  )
  const excesosValue = excesosFromDailyAlerts != null ? excesosFromDailyAlerts : speedEvents.length
  const unidentified = dayEvents.filter(
    (e) => e.tipo === "vehiculo_no_identificado"
  )
  const critical = dayEvents.filter((e) => e.estado === "critico")

  const kpis = [
    {
      label: "Eventos del día",
      value: dayEvents.length,
      icon: AlertTriangle,
      color: "text-chart-1" as const,
      bgColor: "bg-chart-1/10" as const,
    },
    {
      label: "Excesos de velocidad",
      value: excesosValue,
      icon: Gauge,
      color: "text-chart-3" as const,
      bgColor: "bg-chart-3/10" as const,
    },
    {
      label: "No identificados",
      value: unidentified.length,
      icon: ShieldAlert,
      color: "text-chart-4" as const,
      bgColor: "bg-chart-4/10" as const,
    },
    {
      label: "Eventos criticos",
      value: critical.length,
      icon: CircleAlert,
      color: "text-destructive" as const,
      bgColor: "bg-destructive/10" as const,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <AppCard key={kpi.label} className="flex flex-row items-center gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${kpi.bgColor}`}
          >
            <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold">{kpi.value}</span>
            <span className="text-sm text-muted-foreground">
              {kpi.label}
            </span>
          </div>
        </AppCard>
      ))}
    </div>
  )
}
