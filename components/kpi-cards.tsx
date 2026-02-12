"use client"

import {
  AlertTriangle,
  Gauge,
  ShieldAlert,
  CircleAlert,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { VehicleEvent } from "@/lib/data"

interface KPICardsProps {
  events: VehicleEvent[]
}

export function KPICards({ events }: KPICardsProps) {
  const todayEvents = events.filter((e) => e.fecha === "2026-02-05")
  const speedEvents = todayEvents.filter(
    (e) => e.tipo === "exceso_velocidad"
  )
  const unidentified = todayEvents.filter(
    (e) => e.tipo === "vehiculo_no_identificado"
  )
  const critical = todayEvents.filter((e) => e.estado === "critico")

  const kpis = [
    {
      label: "Eventos hoy",
      value: todayEvents.length,
      icon: AlertTriangle,
      color: "text-chart-1" as const,
      bgColor: "bg-chart-1/10" as const,
    },
    {
      label: "Excesos de velocidad",
      value: speedEvents.length,
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
        <Card key={kpi.label}>
          <CardContent className="flex items-center gap-4 p-4">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${kpi.bgColor}`}
            >
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold">{kpi.value}</span>
              <span className="text-xs text-muted-foreground">
                {kpi.label}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
