"use client"

import { memo, useMemo } from "react"
import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { CriticalAlert, TopVehicle } from "@/services/dashboard-api"

interface CriticalVehiclesPanelProps {
  alerts: CriticalAlert[]
  vehicles: TopVehicle[]
  loading?: boolean
}

function dominantTypeLabel(value: string): string {
  const normalized = value.replace(/_/g, " ").toLowerCase().trim()
  if (normalized.includes("contact")) return "Contactos"
  if (normalized.includes("exceso")) return "Excesos"
  if (normalized.includes("inactivo") || normalized.includes("conductor inactivo")) return "Sin conductor"
  if (normalized.includes("no identificado") || normalized.includes("sin identificar")) return "No identificados"
  if (normalized.includes("llave") || normalized.includes("sin llave")) return "Sin llave"
  return "Otros"
}

function barWidth(score: number): number {
  return Math.max(6, Math.min(100, (score / 35) * 100))
}

function riskBadgeTone(score: number): string {
  if (score >= 25) return "bg-red-100 text-red-700 border-red-200"
  if (score >= 15) return "bg-amber-100 text-amber-700 border-amber-200"
  return "bg-emerald-100 text-emerald-700 border-emerald-200"
}

function CriticalVehiclesPanelBase({ alerts, vehicles, loading = false }: CriticalVehiclesPanelProps) {
  const vehicleEvents = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.plate, vehicle.events])),
    [vehicles],
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vehiculos criticos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-44 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden />
          Vehiculos criticos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay vehiculos criticos en el rango actual.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {alerts.map((item) => {
              const totalEvents = vehicleEvents.get(item.plate) ?? 0
              const criticalReason = item.riskScore >= 15 ? "Riesgo en zona critica" : "Riesgo en atencion"

              return (
                <article
                  key={item.plate}
                  tabIndex={0}
                  aria-label={`Vehiculo ${item.plate}, riesgo ${item.riskScore}, eventos ${totalEvents}`}
                  className="rounded-lg border border-red-200/70 bg-red-50/50 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-lg font-semibold tracking-wide">{item.plate}</p>
                    <Badge className={riskBadgeTone(item.riskScore)}>riesgo {item.riskScore}</Badge>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">{criticalReason}</p>
                  <p className="text-sm text-muted-foreground">{totalEvents} eventos totales</p>
                  <p className="text-sm text-muted-foreground">Tipo dominante: {dominantTypeLabel(item.eventType)}</p>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-red-100" aria-hidden>
                    <div
                      className="h-full rounded-full bg-red-500 transition-all duration-700"
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
