"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AsyncState } from "@/components/common/async-state"
import { LastClosedDateBadge } from "@/components/common/last-closed-date-badge"
import { cn } from "@/lib/utils"
import { formatEventDateTime } from "@/lib/ui/datetime"
import { vehiclesApi } from "@/services/api"
import type { DailyAlertVehicle } from "@/lib/firestore-read"

export default function HistoricoPage() {
  type HistoricoPreset = "day" | "week" | "month"
  type VehicleDetailEvent = DailyAlertVehicle["events"][number]
  type VehicleSpeedIncident = DailyAlertVehicle["speedIncidents"][number]

  const STORAGE_PRESET_KEY = "historico:preset"
  const presetToDaysBack: Record<HistoricoPreset, 7 | 30 | 90> = {
    day: 7,
    week: 30,
    month: 90,
  }

  const [preset, setPreset] = useState<HistoricoPreset>(() => {
    if (typeof window === "undefined") return "day"
    try {
      const v = localStorage.getItem(STORAGE_PRESET_KEY)
      if (v === "day" || v === "week" || v === "month") return v
    } catch {
      // ignore
    }
    return "day"
  })

  const [selectedPlate, setSelectedPlate] = useState<string>("Todas")
  const [selectedEventType, setSelectedEventType] = useState<string>("Todos")
  const [search, setSearch] = useState<string>("")

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PRESET_KEY, preset)
    } catch {
      // ignore
    }
  }, [preset])

  useEffect(() => {
    // Cambiar periodo suele invalidar una busqueda previa.
    setSearch("")
  }, [preset])

  interface HistoricoEventRow {
    rowId: string
    plate: string
    brand: string | null
    model: string | null
    operation: string | null
    type: string
    driverName: string | null
    keyId: string | null
    speed: number | null
    eventTimestamp: string
    location: string | null
    description: string | null
  }

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["historico", preset],
    staleTime: 60_000,
    queryFn: async () => {
      const list = await vehiclesApi.myVehicles()
      const plates = Array.from(new Set(list.vehicles.map((v) => v.plate).filter(Boolean))).sort()
      const daysBack = presetToDaysBack[preset]

      const vehicleDetails = await Promise.all(
        plates.map(async (plate) => {
          try {
            return await vehiclesApi.vehicleDetailByPlate(plate, daysBack)
          } catch {
            return null
          }
        }),
      )

      const validDetails = vehicleDetails.filter((d): d is NonNullable<typeof d> => d != null)

      const rows: HistoricoEventRow[] = []

      for (const detail of validDetails) {
        const brand = detail.vehicle.brand ?? null
        const model = detail.vehicle.model ?? null

        const normalizeTypeForUi = (rawType: string) => {
          const n = rawType?.toLowerCase() ?? ""
          // UI label unificado para incidentes/filtrado de exceso de velocidad.
          if (
            n.includes("exceso") ||
            n.includes("velocidad") ||
            n.includes("speed_excess") ||
            (n.includes("speed") && n.includes("excess"))
          ) {
            return "exceso de velocidad"
          }
          return rawType
        }

        const operation =
          (detail.vehicle as unknown as { operationName?: string | null; operacion?: string | null }).operationName ??
          (detail.vehicle as unknown as { operationName?: string | null; operacion?: string | null }).operacion ??
          null

        const groupedSpeedEventIds = new Set(
          (detail.speedIncidents ?? []).flatMap((incident: VehicleSpeedIncident) => incident.eventIds ?? []),
        )

        const visibleEvents = (detail.events ?? []).filter(
          (event: VehicleDetailEvent) => !groupedSpeedEventIds.has(event.eventId),
        )

        rows.push(
          ...visibleEvents.map((event: VehicleDetailEvent) => {
            const eventId = event.eventId || `${event.eventTimestamp}-${event.locationRaw ?? ""}`
            return {
              rowId: `${detail.vehicle.plate}:${eventId}`,
              plate: event.plate,
              brand,
              model,
              operation,
              type: normalizeTypeForUi(event.type),
              driverName: event.driverName,
              keyId: event.keyId,
              speed: event.maxSpeed ?? event.speed ?? null,
              eventTimestamp: event.eventTimestamp,
              location: event.location ?? event.locationRaw,
              description:
                event.reasonRaw ??
                event.reason ??
                event.eventSubtype ??
                event.eventCategory ??
                event.type ??
                null,
            }
          }),
        )

        const speedIncidents = detail.speedIncidents ?? []
        rows.push(
          ...speedIncidents
            .slice()
            .filter((incident: VehicleSpeedIncident) => Boolean(incident.lastEventAt))
            .map((incident: VehicleSpeedIncident) => ({
              rowId: `${detail.vehicle.plate}:INCIDENT:${incident.incidentKey}`,
              plate: incident.plate,
              brand,
              model,
              operation,
              type: "exceso de velocidad",
              driverName: incident.driverName,
              keyId: incident.keyId,
              speed: incident.maxSpeed ?? incident.avgSpeed ?? null,
              eventTimestamp: incident.lastEventAt ?? "",
              location: incident.location,
              description: `Exceso de velocidad · ${incident.groupedEventsCount} eventos agrupados`,
            })),
        )
      }

      rows.sort((a, b) => (b.eventTimestamp ?? "").localeCompare(a.eventTimestamp ?? ""))

      return { plates, rows }
    },
  })

  const availableEventTypes = useMemo(() => {
    const t = new Set<string>()
    for (const row of data?.rows ?? []) {
      const type = row.type?.trim()
      if (type) t.add(type)
    }
    return Array.from(t).sort((a, b) => a.localeCompare(b))
  }, [data?.rows])

  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? []
    const q = search.trim().toLowerCase()

    return rows.filter((row) => {
      if (selectedPlate !== "Todas" && row.plate !== selectedPlate) return false
      if (selectedEventType !== "Todos" && row.type !== selectedEventType) return false
      if (!q) return true

      const driver = (row.driverName ?? "").toLowerCase()
      const key = (row.keyId ?? "").toLowerCase()
      return driver.includes(q) || key.includes(q)
    })
  }, [data?.rows, search, selectedPlate, selectedEventType])

  useEffect(() => {
    if (!data) return
    const plateSet = new Set(data.plates)
    if (selectedPlate !== "Todas" && !plateSet.has(selectedPlate)) setSelectedPlate("Todas")
    if (selectedEventType !== "Todos" && !availableEventTypes.includes(selectedEventType)) setSelectedEventType("Todos")
  }, [data, availableEventTypes, selectedPlate, selectedEventType])

  const getEventBadgeClassName = (type: string) => {
    const normalized = type?.toLowerCase() ?? ""
    const isSpeedExcess =
      normalized === "exceso" ||
      normalized === "exceso_velocidad" ||
      normalized.includes("exceso") ||
      normalized.includes("velocidad")
    const isKeyOrContact =
      ["llave_sin_cargar", "contacto", "contactos"].includes(normalized) ||
      normalized.includes("llave") ||
      normalized.includes("contact")

    if (isSpeedExcess) return "border-red-400/20 bg-red-400/10 text-red-300"
    if (isKeyOrContact) return "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
    return "border-white/10 bg-white/5 text-white/60"
  }

  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : "Error desconocido"
    : null
  const hasAnyRows = (data?.rows?.length ?? 0) > 0
  const hasRowsAfterFilters = filteredRows.length > 0

  return (
    <div className="min-h-screen space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Historico de eventos</h1>
          <p className="mt-0.5 text-sm text-white/40">Listado completo · Todos los vehiculos</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/[0.03] text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Dashboard
            </Button>
          </Link>
          <LastClosedDateBadge />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-white/40 mb-2">Preset</div>
          <div className="flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
            {(["day", "week", "month"] as const).map((p) => (
              <Button
                key={p}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-3 text-xs font-medium",
                  preset === p
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white/70",
                )}
                onClick={() => setPreset(p)}
              >
                {p === "day" ? "Dia" : p === "week" ? "Semana" : "Mes"}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedPlate} onValueChange={(v) => setSelectedPlate(v)}>
            <SelectTrigger className="w-[200px] border-white/10 bg-white/[0.04] text-white/80">
              <SelectValue placeholder="Patente" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-zinc-900 text-white">
              <SelectItem value="Todas">Todas</SelectItem>
              {(data?.plates ?? []).map((plate) => (
                <SelectItem key={plate} value={plate}>
                  {plate}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedEventType} onValueChange={(v) => setSelectedEventType(v)}>
            <SelectTrigger className="w-[220px] border-white/10 bg-white/[0.04] text-white/80">
              <SelectValue placeholder="Tipo de evento" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-zinc-900 text-white">
              <SelectItem value="Todos">Todos</SelectItem>
              {availableEventTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="w-[260px]">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por conductor o llave"
              className="border-white/10 bg-white/[0.04] text-white/80 placeholder:text-white/40"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || isFetching}
            className="h-9 gap-1.5 border-white/10 bg-white/[0.04] text-xs text-white/60 hover:bg-white/[0.08] hover:text-white"
            onClick={() => void refetch()}
          >
            <RefreshCw size={13} className={cn(isFetching && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      <AsyncState loading={isLoading} error={errorMessage} onRetry={() => void refetch()} />

      {!isLoading && !error && !hasAnyRows && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-white/40">
            <AlertTriangle size={16} className="shrink-0 text-yellow-400/60" />
            No hay eventos para el periodo seleccionado.
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && hasAnyRows && !hasRowsAfterFilters && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-white/40">
            <AlertTriangle size={16} className="shrink-0 text-yellow-400/60" />
            No hay eventos que coincidan con los filtros.
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && hasAnyRows && hasRowsAfterFilters && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="pt-4">
            <div className="overflow-x-auto rounded-lg border border-white/5">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white/[0.02] border-white/5 hover:bg-white/[0.02]">
                    <TableHead>Patente + modelo</TableHead>
                    <TableHead>Operacion</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Llave</TableHead>
                    <TableHead className="text-right">Velocidad</TableHead>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Ubicacion</TableHead>
                    <TableHead>Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.rowId} className="border-white/5 bg-white/[0.02] hover:bg-white/[0.03]">
                      <TableCell className="font-mono text-xs text-white/90">
                        {row.plate} {row.model ? `· ${row.model}` : ""}
                      </TableCell>
                      <TableCell className="text-white/80">{row.operation ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getEventBadgeClassName(row.type)}>
                          {row.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white/80">{row.driverName ?? "-"}</TableCell>
                      <TableCell className="text-white/80">{row.keyId ?? "-"}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-white/90">
                        {row.speed != null ? `${row.speed} km/h` : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-white/80">
                        {formatEventDateTime(row.eventTimestamp)}
                      </TableCell>
                      <TableCell className="text-white/80">{row.location ?? "-"}</TableCell>
                      <TableCell className="max-w-[420px] whitespace-normal text-white/80">
                        {row.description ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
