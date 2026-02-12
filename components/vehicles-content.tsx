"use client"

import { MapPin, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Vehicle } from "@/lib/data"

function getVehicleStatusBadge(estado: string) {
  switch (estado) {
    case "activo":
      return { label: "Activo", className: "bg-chart-2/15 text-chart-2 border-chart-2/20" }
    case "inactivo":
      return { label: "Inactivo", className: "bg-muted text-muted-foreground border-border" }
    case "mantenimiento":
      return { label: "Mantenimiento", className: "bg-chart-3/15 text-chart-3 border-chart-3/20" }
    default:
      return { label: estado, className: "" }
  }
}

interface VehiclesContentProps {
  vehicles: Vehicle[]
}

export function VehiclesContent({ vehicles }: VehiclesContentProps) {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div>
        <h2 className="text-lg font-semibold">Flota de vehiculos</h2>
        <p className="text-xs text-muted-foreground">
          {vehicles.length} vehiculos registrados
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => {
          const status = getVehicleStatusBadge(vehicle.estado)
          return (
            <Card key={vehicle.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-sm font-bold">
                      {vehicle.patente}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {vehicle.marca} {vehicle.modelo} {vehicle.anio}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
                      <MapPin className="h-3 w-3" />
                    </div>
                    <span className="truncate">{vehicle.ultimaUbicacion}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
                      <AlertTriangle className="h-3 w-3" />
                    </div>
                    <span>
                      {vehicle.eventosHoy} evento
                      {vehicle.eventosHoy !== 1 ? "s" : ""} hoy
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                    {vehicle.conductor
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <span className="text-xs font-medium">
                    {vehicle.conductor}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
