"use client"

import { memo, useMemo } from "react"
import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { CriticalAlert, RecentEvent, TopVehicle } from "@/services/dashboard-api"
import { cn } from "@/lib/utils"

interface CriticalVehiclesPanelProps {
  alerts: CriticalAlert[]
  vehicles: TopVehicle[]
  recentEvents: RecentEvent[]
  loading?: boolean
}

type EventKey = "contactos" | "excesos" | "sin conductor" | "sin llave" | "otros"

type EventBreakdown = {
  type: EventKey
  count: number
}

const EVENT_ORDER: EventKey[] = ["contactos", "excesos", "sin conductor", "sin llave", "otros"]

function normalizeEventType(value: string): EventKey {
  const normalized = value.replace(/_/g, " ").toLowerCase().trim()
  if (normalized.includes("contact")) return "contactos"
  if (normalized.includes("exceso")) return "excesos"
  if (normalized.includes("no identificado") || normalized.includes("sin conductor")) return "sin conductor"
  if (normalized.includes("llave") || normalized.includes("sin llave")) return "sin llave"
  return "otros"
}

function barWidth(score: number): number {
  return Math.max(6, Math.min(100, (score / 35) * 100))
}

function riskTone(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 25) return "critical"
  if (score >= 15) return "high"
  if (score >= 8) return "medium"
  return "low"
}

function riskBadgeTone(score: number): string {
  const tone = riskTone(score)
  if (tone === "critical") return "bg-red-500/10 text-red-500 border-red-500/20"
  if (tone === "high") return "bg-orange-500/10 text-orange-500 border-orange-500/20"
  if (tone === "medium") return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
  return "bg-green-500/10 text-green-500 border-green-500/20"
}

function riskBarClass(score: number): string {
  const tone = riskTone(score)
  if (tone === "critical") return "bg-red-500"
  if (tone === "high") return "bg-orange-500"
  if (tone === "medium") return "bg-yellow-500"
  return "bg-green-500"
}

function CriticalVehiclesPanelBase({
  alerts,
  vehicles,
  recentEvents,
  loading = false,
}: CriticalVehiclesPanelProps) {
  const vehicleStats = useMemo(() => {
    const eventsByVehicle = new Map<string, number>()
    const typeByVehicle = new Map<string, Record<EventKey, number>>()

    vehicles.forEach((vehicle) => {
      eventsByVehicle.set(vehicle.plate, vehicle.events)
    })

    recentEvents.forEach((event) => {
      const current =
        typeByVehicle.get(event.plate) ?? {
          contactos: 0,
          excesos: 0,
          "sin conductor": 0,
          "sin llave": 0,
          otros: 0,
        }

      const key = normalizeEventType(event.eventType)
      current[key] += 1
      typeByVehicle.set(event.plate, current)
    })

    return { eventsByVehicle, typeByVehicle }
  }, [vehicles, recentEvents])

  if (loading) {
    return (
      <Card className="border-border bg-card text-foreground">
        <CardHeader>
          <CardTitle>Vehiculos criticos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-52 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card text-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden />
          Vehiculos criticos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay vehiculos criticos en el rango actual.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {alerts.map((item) => {
              const totalEvents = vehicleStats.eventsByVehicle.get(item.plate) ?? 0
              const breakdownMap =
                vehicleStats.typeByVehicle.get(item.plate) ?? {
                  contactos: 0,
                  excesos: 0,
                  "sin conductor": 0,
                  "sin llave": 0,
                  otros: 0,
                }

              const sampleEvents = Object.values(breakdownMap).reduce((acc, value) => acc + value, 0)
              const topBreakdown: EventBreakdown[] = EVENT_ORDER.map((key) => ({
                type: key,
                count: breakdownMap[key],
              }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3)

              const criticalReason = item.riskScore >= 15 ? "Riesgo en zona critica" : "Riesgo en atencion"

              return (
                <article
                  key={item.plate}
                  tabIndex={0}
                  aria-label={`Vehiculo ${item.plate}, riesgo ${item.riskScore}, eventos ${totalEvents}`}
                  className="rounded-lg border border-border bg-card p-4 text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-lg font-semibold tracking-wide">{item.plate}</p>
                    <Badge className={riskBadgeTone(item.riskScore)}>riesgo {item.riskScore}</Badge>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">{criticalReason}</p>
                  <p className="text-sm text-muted-foreground">{totalEvents} eventos totales</p>

                  <div className="mt-3 space-y-1.5">
                    {topBreakdown.map((row) => (
                      <div key={`${item.plate}-${row.type}`} className="flex items-center justify-between text-sm">
                        <span className="capitalize text-muted-foreground">{row.type}</span>
                        <Badge variant="secondary" className="font-medium">
                          {row.count}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">
                    Detalle por tipo sobre muestra reciente: {sampleEvents}/{totalEvents} eventos.
                  </p>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", riskBarClass(item.riskScore))}
                      style={{ width: `${barWidth(item.riskScore)}%` }}
                    />
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const CriticalVehiclesPanel = memo(CriticalVehiclesPanelBase)
