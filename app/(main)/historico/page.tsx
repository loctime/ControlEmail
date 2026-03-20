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
import type { VehicleEventsParams } from "@/services/api"

type HistoricoPreset = "day" | "week" | "month"

const STORAGE_PRESET_KEY = "historico:preset"

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getYesterday(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d
}

function getDateRange(preset: HistoricoPreset): { dateFrom: string; dateTo: string } {
  const yesterday = getYesterday()

  if (preset === "day") {
    const s = toDateStr(yesterday)
    return { dateFrom: s, dateTo: s }
  }

  if (preset === "week") {
    const from = new Date(yesterday)
    from.setDate(from.getDate() - 6)
    return { dateFrom: toDateStr(from), dateTo: toDateStr(yesterday) }
  }

  // mes: mes calendario anterior completo
  const firstOfThisMonth = new Date(yesterday.getFullYear(), yesterday.getMonth(), 1)
  const firstOfPrevMonth = new Date(firstOfThisMonth)
  firstOfPrevMonth.setMonth(firstOfPrevMonth.getMonth() - 1)
  const lastOfPrevMonth = new Date(firstOfThisMonth)
  lastOfPrevMonth.setDate(lastOfPrevMonth.getDate() - 1)
  return { dateFrom: toDateStr(firstOfPrevMonth), dateTo: toDateStr(lastOfPrevMonth) }
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  // eventType values (lowercase, del backend /api/vehicles/events)
  NO_KEY_DETECTED: "Exceso de velocidad",
  exceso: "Exceso de velocidad",
  no_identificado: "No identificado",
  contacto: "Contacto",
  llave_sin_cargar: "Llave sin cargar",
  conductor_inactivo: "Conductor inactivo",
  // sourceEmailType values
  exceso_velocidad: "Exceso de velocidad",
  contacto_sin_identificacion: "Contacto sin identificación",
  llave_no_registrada: "Llave no registrada",
  // rawEventType / uppercase técnicos
  SPEED_EXCESS: "Exceso de velocidad",
  DRIVER_IDENTIFICATION: "No identificado",
  CONTACT_WITHOUT_ID: "Contacto sin identificación",
  KEY_NOT_REGISTERED: "Llave no registrada",
  DRIVER_NOT_IDENTIFIED: "No identificado",
  CONTACT_NO_DRIVER: "Contacto sin conductor",
  UNKNOWN_KEY: "Llave desconocida",
  INACTIVE_DRIVER: "Conductor inactivo",
  SPEEDING: "Exceso de velocidad",
}

function humanizeEventType(rawType: string): string {
  if (!rawType) return "Desconocido"
  return EVENT_TYPE_LABELS[rawType] ?? rawType
}

function getEventBadgeClassName(type: string): string {
  const normalized = (type ?? "").toLowerCase()
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

export default function HistoricoPage() {
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
    setSearch("")
  }, [preset])

  const queryParams = useMemo<VehicleEventsParams>(
    () => ({ ...getDateRange(preset), limit: 200, page: 1 }),
    [preset],
  )

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["historico-events", queryParams],
    staleTime: 60_000,
    queryFn: async () => {
      const response = await vehiclesApi.vehicleEvents(queryParams)
      const items = response.events ?? []
      const plates = response.plates ?? []

      const rows: HistoricoEventRow[] = items.map((event) => ({
        rowId: event.eventId || `${event.plate}:${event.eventTimestamp}`,
        plate: event.plate,
        brand: event.brand ?? null,
        model: event.model ?? null,
        operation: event.operationName ?? null,
        type: (event.speed != null && event.speed > 0) || (event.maxSpeed != null && event.maxSpeed > 0) || event.hasSpeed
          ? "Exceso de velocidad"
          : humanizeEventType(event.eventType || event.rawEventType || event.sourceEmailType || ""),
        driverName: event.driverName ?? null,
        keyId: event.keyId ?? null,
        speed: event.maxSpeed ?? event.speed ?? null,
        eventTimestamp: event.eventTimestamp,
        location: event.location ?? event.locationRaw ?? null,
        description: event.reason ?? event.rawEventType ?? null,
      }))

      rows.sort((a, b) => (b.eventTimestamp ?? "").localeCompare(a.eventTimestamp ?? ""))

      return { plates, rows, total: response.total }
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
          <h1 className="text-xl font-semibold tracking-tight text-white">Histórico de eventos</h1>
          <p className="mt-0.5 text-sm text-white/40">
            Listado completo · Todos los vehículos
            {data?.total != null && (
              <span className="ml-2 text-white/30">· {data.total} evento{data.total !== 1 ? "s" : ""}</span>
            )}
          </p>
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
          <div className="mb-2 text-xs text-white/40">Preset</div>
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
                {p === "day" ? "Día" : p === "week" ? "Semana" : "Mes"}
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
            No hay eventos para el período seleccionado.
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
                  <TableRow className="border-white/5 bg-white/[0.02] hover:bg-white/[0.02]">
                    <TableHead>Patente + modelo</TableHead>
                    <TableHead>Operación</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Llave</TableHead>
                    <TableHead className="text-right">Velocidad</TableHead>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Ubicación</TableHead>
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
