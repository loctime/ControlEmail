"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useVehicleData } from "@/components/vehicles/useVehicleData"
import { formatEventDateTime } from "@/lib/ui/datetime"
import { cn } from "@/lib/utils"
import { eventTypeDescriptions } from "@/lib/data"
import type { DailyAlertVehicle } from "@/lib/firestore-read"

type VehicleDetailEvent = DailyAlertVehicle["events"][number]
type VehicleSpeedIncident = DailyAlertVehicle["speedIncidents"][number]

// ─── Formatters ───────────────────────────────────────────────────────────────

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
  if (t.includes("exceso") || t.includes("velocidad") || t.includes("speed") || t.includes("speeding"))
    return "border-red-400/20 bg-red-400/10 text-red-300"
  if (t.includes("llave") || t.includes("key") || t.includes("no_identificado") || t.includes("inactiv") || t.includes("contact"))
    return "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
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
    ...speedIncidents.map((inc): UnifiedRow => ({
      kind: "incident",
      id: inc.incidentKey,
      sortKey: inc.lastEventAt ?? inc.firstEventAt ?? "",
      incident: inc,
    })),
    ...visibleEvents.map((ev): UnifiedRow => ({
      kind: "event",
      id: ev.eventId,
      sortKey: ev.eventTimestamp,
      event: ev,
    })),
  ]
  return rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="mb-0.5 text-xs text-white/40">{label}</p>
      <p className="text-sm text-white/90">{value}</p>
    </div>
  )
}

function KpiCard({ label, value, accentClass }: { label: string; value: number; accentClass?: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3">
      <p className="mb-0.5 text-xs text-white/40">{label}</p>
      <p className={cn("text-2xl font-bold tabular-nums", accentClass ?? "text-white")}>{value}</p>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PanelSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="h-4 w-1/3 animate-pulse rounded bg-white/[0.06]" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-white/[0.06]" />
      <div className="h-4 w-2/5 animate-pulse rounded bg-white/[0.06]" />
    </div>
  )
}

// ─── Main panel ──────────────────────────────────────────────────────────────

interface VehicleExpandPanelProps {
  plate: string
}

export function VehicleExpandPanel({ plate }: VehicleExpandPanelProps) {
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
  } = useVehicleData(plate, 30)

  const uniqueKeys = useMemo(() => {
    const seen = new Set<string>()
    for (const e of events) { if (e.keyId) seen.add(e.keyId) }
    for (const si of speedIncidents) { if (si.keyId) seen.add(si.keyId) }
    return Array.from(seen).sort()
  }, [events, speedIncidents])

  const unifiedRows = useMemo(
    () => buildUnifiedRows(visibleEvents, speedIncidents),
    [visibleEvents, speedIncidents],
  )

  if (loading) return <PanelSkeleton />

  if (error) {
    return (
      <p className="p-4 text-sm text-red-400">{error}</p>
    )
  }

  return (
    <div className="space-y-4 p-4 pt-3">

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
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
          value={vehicle?.lastEventAt ? formatEventDateTime(vehicle.lastEventAt) : "—"}
        />
        <InfoField
          label="Llaves vistas"
          value={uniqueKeys.length > 0 ? uniqueKeys.join(", ") : "Sin datos"}
        />
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      {/* Eventos table */}
      <div>
        <p className="mb-2 text-xs font-medium text-white/50">
          Eventos del período
          <span className="ml-1.5 text-white/30">({unifiedRows.length})</span>
        </p>
        {unifiedRows.length === 0 ? (
          <p className="py-3 text-center text-xs text-white/30">Sin eventos en el período</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-white/[0.06]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-left text-white/40">
                  <th className="px-3 py-2 font-normal">Fecha</th>
                  <th className="px-3 py-2 font-normal">Tipo</th>
                  <th className="px-3 py-2 font-normal">Conductor</th>
                  <th className="px-3 py-2 font-normal">Llave</th>
                  <th className="px-3 py-2 font-normal">Ubicación</th>
                  <th className="px-3 py-2 text-right font-normal">Velocidad</th>
                </tr>
              </thead>
              <tbody>
                {unifiedRows.map((row) => {
                  if (row.kind === "incident") {
                    const inc = row.incident
                    return (
                      <tr key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-3 py-2 font-mono text-white/60">
                          {formatEventDateTime(inc.lastEventAt ?? inc.firstEventAt)}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className="border-red-400/20 bg-red-400/10 text-red-300 text-[11px]">
                            Exceso
                            {inc.groupedEventsCount > 1 && (
                              <span className="ml-1 opacity-60">×{inc.groupedEventsCount}</span>
                            )}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-white/60">{inc.driverName ?? "—"}</td>
                        <td className="px-3 py-2 font-mono text-white/60">{inc.keyId ?? "—"}</td>
                        <td className="px-3 py-2 text-white/50">{inc.location ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {inc.maxSpeed != null
                            ? <span className="text-red-300">{inc.maxSpeed} km/h</span>
                            : <span className="text-white/30">—</span>}
                        </td>
                      </tr>
                    )
                  }
                  const ev = row.event
                  return (
                    <tr key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-3 py-2 font-mono text-white/60">
                        {formatEventDateTime(ev.eventTimestamp)}
                      </td>
                      <td className="px-3 py-2">
                        {eventTypeDescriptions[ev.type] ? (
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className={cn(getTypeBadgeClass(ev.type), "text-[11px]")}>
                                  {humanizeType(ev.type)}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>{eventTypeDescriptions[ev.type]}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <Badge variant="outline" className={cn(getTypeBadgeClass(ev.type), "text-[11px]")}>
                            {humanizeType(ev.type)}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-white/60">{ev.driverName ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-white/60">{ev.keyId ?? "—"}</td>
                      <td className="px-3 py-2 text-white/50">{ev.location ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {ev.hasSpeed && ev.speed != null
                          ? <span className="text-red-300">{ev.speed} km/h</span>
                          : <span className="text-white/30">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
