"use client"

import { useMemo, useState } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useVehicleData } from "@/components/vehicles/useVehicleData"
import { formatEventDateTime } from "@/lib/ui/datetime"
import { cn } from "@/lib/utils"
import { eventTypeDescriptions } from "@/lib/data"
import type { DailyAlertVehicle } from "@/lib/firestore-read"

type VehicleDetailEvent = DailyAlertVehicle["events"][number]
type VehicleSpeedIncident = DailyAlertVehicle["speedIncidents"][number]
type Days = 7 | 30 | 90

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

function DrawerSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className={cn("h-4 animate-pulse rounded bg-white/[0.06]", i % 2 === 0 ? "w-2/3" : "w-1/2")} />
      ))}
    </div>
  )
}

// ─── Drawer content (lazy-loaded) ─────────────────────────────────────────────

function DrawerContent({ plate, days }: { plate: string; days: Days }) {
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
  } = useVehicleData(plate, days)

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

  if (loading) return <DrawerSkeleton />

  if (error) {
    return <p className="p-6 text-sm text-red-400">{error}</p>
  }

  return (
    <div className="space-y-5 p-6">

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
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
      <div className="grid grid-cols-2 gap-3">
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

      {/* Events table */}
      <div>
        <p className="mb-2 text-xs font-medium text-white/50">
          Eventos del período
          <span className="ml-1.5 text-white/30">({unifiedRows.length})</span>
        </p>
        {unifiedRows.length === 0 ? (
          <p className="py-4 text-center text-xs text-white/30">Sin eventos en el período</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-white/[0.06]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-left text-white/40">
                  <th className="px-3 py-2 font-normal">Fecha</th>
                  <th className="px-3 py-2 font-normal">Tipo</th>
                  <th className="px-3 py-2 font-normal">Conductor</th>
                  <th className="px-3 py-2 font-normal">Velocidad</th>
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
                            Exceso{inc.groupedEventsCount > 1 && <span className="ml-1 opacity-60">×{inc.groupedEventsCount}</span>}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-white/60">{inc.driverName ?? "—"}</td>
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

// ─── Drawer ───────────────────────────────────────────────────────────────────

interface VehicleDrawerProps {
  plate: string | null
  onClose: () => void
}

const PERIOD_OPTIONS: { label: string; days: Days }[] = [
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
]

export function VehicleDrawer({ plate, onClose }: VehicleDrawerProps) {
  const [days, setDays] = useState<Days>(30)

  const isOpen = plate !== null

  return (
    <>
      {/* Drawer panel — fixed, no backdrop; page handles spacing via padding-right */}
      <div
        className={cn(
          "fixed right-0 top-0 z-30 flex h-full w-[480px] max-w-full flex-col border-l border-white/[0.08] bg-[#0f1117] shadow-2xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
        aria-label="Detalle del vehículo"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-stretch border-b border-white/[0.07]">
          <div className="flex-1 px-6 py-4">
            <p className="text-xs text-white/40">Detalle del vehículo</p>
            <p className="font-mono text-lg font-semibold tracking-wider text-white">
              {plate ?? "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex items-center justify-center border-l border-white/[0.07] px-5 text-white/40 hover:bg-white/[0.06] hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Period pills */}
        <div className="flex gap-1.5 border-b border-white/[0.07] px-6 py-3">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              onClick={() => setDays(opt.days)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                days === opt.days
                  ? "bg-white/[0.12] text-white"
                  : "text-white/40 hover:bg-white/[0.06] hover:text-white/70",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Scrollable content — only mounts data when open */}
        <div className="flex-1 overflow-y-auto">
          {isOpen && plate && (
            <DrawerContent plate={plate} days={days} />
          )}
        </div>
      </div>
    </>
  )

}
