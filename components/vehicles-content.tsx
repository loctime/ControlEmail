"use client"

import { MapPin, AlertTriangle, Gauge, Clock, Mail } from "lucide-react"
import { AppCard } from "@/components/app-card"
import { PageContainer } from "@/components/page-container"
import { SectionHeader } from "@/components/section-header"
import { StatusBadge } from "@/components/status-badge"
import type { Vehicle } from "@/lib/data"

const vehicleStatusLabels: Record<string, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  mantenimiento: "Mantenimiento",
}

interface VehiclesContentProps {
  vehicles: Vehicle[]
}

export function VehiclesContent({ vehicles }: VehiclesContentProps) {
  return (
    <PageContainer>
      <SectionHeader
        title="Flota de vehiculos"
        description={`${vehicles.length} vehiculos registrados`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => (
          <AppCard key={vehicle.id} className="overflow-hidden">
            {/* IDENTIFICACIÓN */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-base font-bold">
                  {vehicle.patente}
                </span>
                <span className="text-sm text-muted-foreground">
                  {vehicle.marca} {vehicle.modelo} {vehicle.anio}
                </span>
              </div>
              <StatusBadge
                status={vehicle.estado}
                variant="vehicle"
              >
                {vehicleStatusLabels[vehicle.estado] ?? vehicle.estado}
              </StatusBadge>
            </div>

            {/* ESTADO ACTUAL */}
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
                  <MapPin className="h-4 w-4" />
                </div>
                <span className="truncate">{vehicle.ultimaUbicacion}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
                  <Gauge className="h-4 w-4" />
                </div>
                <span>
                  {vehicle.ultimaVelocidad != null
                    ? `${vehicle.ultimaVelocidad} km/h`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
                  <Clock className="h-4 w-4" />
                </div>
                <span>{vehicle.ultimaSenal ?? "Sin señal"}</span>
              </div>

              {/* EVENTOS */}
              <div
                className={`flex items-center gap-2 text-sm ${vehicle.eventosHoy > 0 ? "text-amber-600" : "text-muted-foreground"}`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${vehicle.eventosHoy > 0 ? "bg-amber-100 text-amber-600" : "bg-muted"}`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <span>
                  {vehicle.eventosHoy} evento
                  {vehicle.eventosHoy !== 1 ? "s" : ""} hoy
                </span>
              </div>
            </div>

            {/* RESPONSABLE */}
            <div className="mt-4 flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                  {(vehicle.conductor ?? "")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <span className="text-sm font-medium">
                  {vehicle.conductor ?? "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
                  <Mail className="h-4 w-4" />
                </div>
                <span className="truncate">
                  {vehicle.responsableEmail ?? "—"}
                </span>
              </div>
            </div>
          </AppCard>
        ))}
      </div>
    </PageContainer>
  )
}
