"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useVehicleData } from "@/components/vehicles/useVehicleData"
import { formatEventDateTime } from "@/lib/ui/datetime"
import { cn } from "@/lib/utils"
import type { DailyAlertVehicle } from "@/lib/firestore-read"

type DaysFilter = 7 | 30 | 90
type VehicleDetailEvent = DailyAlertVehicle["events"][number]
type VehicleSpeedIncident = DailyAlertVehicle["speedIncidents"][number]

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatResponsables(responsables: string[]): string {
  if (responsables.length === 0) return "—"
  const first = (responsables[0] ?? "").split("@")[0] ?? responsables[0] ?? ""
  if (responsables.length === 1) return first
  return `${first} +${responsables.length - 1}`
}

// ─── Event type helpers ───────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  exceso: "Exceso de velocidad",
  exceso_velocidad: "Exceso de velocidad",
  NO_KEY_DETECTED: "Exceso de velocidad",
  SPEED_EXCESS: "Exceso de velocidad",
  SPEEDING: "Exceso de velocidad",
  llave_sin_cargar: "Llave sin cargar",
  KEY_NOT_REGISTERED: "Llave sin cargar",
  UNKNOWN_KEY: "Llave desconocida",
  no_identificado: "No identificado",
  DRIVER_NOT_IDENTIFIED: "No identificado",
  DRIVER_IDENTIFICATION: "No identificado",
  conductor_inactivo: "Conductor inactivo",
  INACTIVE_DRIVER: "Conductor inactivo",
  contacto: "Contacto",
  contacto_sin_identificacion: "Contacto sin identificación",
  CONTACT_WITHOUT_ID: "Contacto sin identificación",
  CONTACT_NO_DRIVER: "Contacto sin conductor",
}

function humanizeType(type: string): string {
  return EVENT_LABELS[type] ?? type.replace(/_/g, " ")
}

function getTypeBadgeClass(type: string): string {
  const t = (type ?? "").toLowerCase()
  const isSpeed =
    t.includes("exceso") ||
    t.includes("velocidad") ||
    t.includes("speed") ||
    t.includes("speeding")
  const isYellow =
    t.includes("llave") ||
    t.includes("key") ||
    t.includes("no_identificado") ||
    t.includes("inactiv") ||
    t.includes("contact")
  if (isSpeed) return "border-red-400/20 bg-red-400/10 text-red-300"
  if (isYellow) return "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
  return "border-white/10 bg-white/5 text-white/60"
}

// ─── Unified event row ────────────────────────────────────────────────────────

type UnifiedRow =
  | { kind: "incident"; id: string; sortKey: string; incident: VehicleSpeedIncident }
  | { kind: "event"; id: string; sortKey: string; event: VehicleDetailEvent }

function buildUnifiedRows(
  visibleEvents: VehicleDetailEvent[],
  speedIncidents: VehicleSpeedIncident[],
): UnifiedRow[] {
  const rows: UnifiedRow[] = [
    ...speedIncidents.map(
      (inc): UnifiedRow => ({
        kind: "incident",
        id: inc.incidentKey,
        sortKey: inc.lastEventAt ?? inc.firstEventAt ?? "",
        incident: inc,
      }),
    ),
    ...visibleEvents.map(
      (ev): UnifiedRow => ({
        kind: "event",
        id: ev.eventId,
        sortKey: ev.eventTimestamp,
        event: ev,
      }),
    ),
  ]
  return rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey))
}

// ─── Info field component ─────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="mb-0.5 text-xs text-white/40">{label}</p>
      <p className="text-sm text-white/90">{value}</p>
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  accentClass,
}: {
  label: string
  value: number
  accentClass?: string
}) {
  return (
    <Card className="border-white/5 bg-white/[0.03]">
      <CardContent className="pb-4 pt-5">
        <p className="mb-1 text-xs text-white/40">{label}</p>
        <p className={cn("text-3xl font-bold tabular-nums", accentClass ?? "text-white")}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VehicleDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const plate = params?.plate as string
  const [daysFilter, setDaysFilter] = useState<DaysFilter>(30)

  const {
    vehicle,
    operationName,
    events,
    visibleEvents,
    speedIncidents,
    totalEventsCount,
    summary,
    loading,
    error,
  } = useVehicleData(plate, daysFilter)

  // Unique key IDs from events + speedIncidents
  const uniqueKeys = useMemo(() => {
    const seen = new Set<string>()
    for (const e of events) {
      if (e.keyId) seen.add(e.keyId)
    }
    for (const si of speedIncidents) {
      if (si.keyId) seen.add(si.keyId)
    }
    return Array.from(seen).sort()
  }, [events, speedIncidents])

  const unifiedRows = useMemo(
    () => buildUnifiedRows(visibleEvents, speedIncidents),
    [visibleEvents, speedIncidents],
  )

  if (!plate) {
    return (
      <div className="p-6">
        <Card className="border-white/5 bg-white/[0.03]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-white/40">
              <AlertCircle className="h-5 w-5" />
              <p>Patente no especificada</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const plateDisplay = plate.toUpperCase()

  return (
    <div className="min-h-screen space-y-6 p-6">

      {/* SECCIÓN 1 — Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">{plateDisplay}</h1>
            <p className="mt-0.5 text-sm text-white/40">Detalle de vehículo</p>
          </div>
        </div>

        {/* Selector de período — pills */}
        <div className="flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDaysFilter(d)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                daysFilter === d
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/70",
              )}
            >
              {d} días
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-white/5 bg-white/[0.03]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-white/[0.04]" />
          ))}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* SECCIÓN 2 — Info del vehículo */}
          <Card className="border-white/5 bg-white/[0.03]">
            <CardContent className="pt-5 pb-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <InfoField label="Operación" value={operationName ?? "—"} />
                <InfoField label="Conductor" value={vehicle?.driver ?? "—"} />
                <InfoField label="Última ubicación" value={vehicle?.lastLocation ?? "—"} />
                <InfoField
                  label="Responsables"
                  value={
                    <span title={(vehicle?.responsables ?? []).join(", ")}>
                      {formatResponsables(vehicle?.responsables ?? [])}
                    </span>
                  }
                />
                <InfoField
                  label="Último evento"
                  value={
                    vehicle?.lastEventAt
                      ? formatEventDateTime(vehicle.lastEventAt)
                      : "—"
                  }
                />
                <InfoField
                  label="Llaves vistas"
                  value={uniqueKeys.length > 0 ? uniqueKeys.join(", ") : "Sin datos"}
                />
              </div>
            </CardContent>
          </Card>

          {/* SECCIÓN 3 — 4 KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Total eventos" value={totalEventsCount} />
            <KpiCard
              label="Excesos de velocidad"
              value={summary.excesos ?? 0}
              accentClass={(summary.excesos ?? 0) > 0 ? "text-red-400" : "text-white"}
            />
            <KpiCard
              label="Llaves sin cargar"
              value={summary.llave_sin_cargar ?? 0}
              accentClass={(summary.llave_sin_cargar ?? 0) > 0 ? "text-yellow-400" : "text-white"}
            />
            <KpiCard
              label="No identificados"
              value={summary.no_identificados ?? 0}
              accentClass={(summary.no_identificados ?? 0) > 0 ? "text-yellow-400" : "text-white"}
            />
          </div>

          {/* SECCIÓN 4 — Tabla de eventos */}
          <Card className="border-white/5 bg-white/[0.03]">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
              <h2 className="text-sm font-semibold text-white/80">Eventos del período</h2>
              <span className="text-xs text-white/30">
                {unifiedRows.length} fila{unifiedRows.length !== 1 ? "s" : ""}
              </span>
            </div>
            <CardContent className="p-0">
              {unifiedRows.length === 0 ? (
                <p className="py-10 text-center text-sm text-white/30">
                  Sin eventos registrados en el período seleccionado
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-left text-xs text-white/40">
                        <th className="px-4 py-2.5 font-normal">Fecha</th>
                        <th className="px-4 py-2.5 font-normal">Tipo</th>
                        <th className="px-4 py-2.5 font-normal">Conductor</th>
                        <th className="px-4 py-2.5 font-normal">Llave</th>
                        <th className="px-4 py-2.5 font-normal">Ubicación</th>
                        <th className="px-4 py-2.5 text-right font-normal">Velocidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unifiedRows.map((row) => {
                        if (row.kind === "incident") {
                          const inc = row.incident
                          return (
                            <tr
                              key={row.id}
                              className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                            >
                              <td className="px-4 py-2.5 font-mono text-xs text-white/70">
                                {formatEventDateTime(inc.lastEventAt ?? inc.firstEventAt)}
                              </td>
                              <td className="px-4 py-2.5">
                                <Badge
                                  variant="outline"
                                  className="border-red-400/20 bg-red-400/10 text-red-300"
                                >
                                  Exceso de velocidad
                                  {inc.groupedEventsCount > 1 && (
                                    <span className="ml-1 opacity-60">
                                      ×{inc.groupedEventsCount}
                                    </span>
                                  )}
                                </Badge>
                              </td>
                              <td className="px-4 py-2.5 text-white/70">
                                {inc.driverName ?? "—"}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-xs text-white/70">
                                {inc.keyId ?? "—"}
                              </td>
                              <td className="px-4 py-2.5 text-white/60">
                                {inc.location ?? "—"}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-xs">
                                {inc.maxSpeed != null ? (
                                  <span className="text-red-300">{inc.maxSpeed} km/h</span>
                                ) : (
                                  <span className="text-white/30">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        }

                        // kind === "event"
                        const ev = row.event
                        return (
                          <tr
                            key={row.id}
                            className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                          >
                            <td className="px-4 py-2.5 font-mono text-xs text-white/70">
                              {formatEventDateTime(ev.eventTimestamp)}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge
                                variant="outline"
                                className={getTypeBadgeClass(ev.type)}
                              >
                                {humanizeType(ev.type)}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-white/70">
                              {ev.driverName ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs text-white/70">
                              {ev.keyId ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 text-white/60">
                              {ev.location ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-xs">
                              {ev.hasSpeed && ev.speed != null ? (
                                <span className="text-red-300">{ev.speed} km/h</span>
                              ) : (
                                <span className="text-white/30">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
