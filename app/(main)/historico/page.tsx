"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Download, RefreshCw, X } from "lucide-react"
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
import { getVehicleEventsHistory, vehiclesApi } from "@/services/api/vehicles/vehiclesApi"
import type { VehicleEventItem, VehicleEventsParams } from "@/services/api"
import { eventTypeDescriptions } from "@/lib/data"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const PAGE_LIMIT = 100
/** Límite de páginas al traer todo el rango para filtrar en cliente (100 × 200 = 20k eventos). */
const MAX_FETCH_PAGES = 200
const MAX_RANGE_DAYS = 366

async function fetchAllVehicleEventsPages(
  dateFrom: string,
  dateTo: string,
  plate: string | undefined,
): Promise<{ events: VehicleEventItem[]; plates: string[]; total: number }> {
  const merged: VehicleEventItem[] = []
  const plates = new Set<string>()
  let page = 1
  while (page <= MAX_FETCH_PAGES) {
    const res = await vehiclesApi.vehicleEvents({
      dateFrom,
      dateTo,
      limit: PAGE_LIMIT,
      page,
      ...(plate ? { plate } : {}),
    })
    const ev = res.events ?? []
    for (const e of ev) merged.push(e)
    for (const p of res.plates ?? []) plates.add(p)
    if (ev.length < PAGE_LIMIT) break
    page++
  }
  return { events: merged, plates: Array.from(plates), total: merged.length }
}

type DatePreset = "ultimo" | "semana" | "mes" | "personalizado"

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// El sistema no procesa datos del día actual — "hoy" equivale a ayer.
function getYesterday(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d
}

function getRangeForPreset(preset: Exclude<DatePreset, "personalizado" | "ultimo">, ultimoDate: string): { dateFrom: string; dateTo: string } {
  const lastDate = getYesterday()
  if (preset === "semana") {
    const from = new Date(lastDate)
    from.setDate(from.getDate() - 6)
    return { dateFrom: toDateStr(from), dateTo: ultimoDate }
  }
  // mes — 30 días hacia atrás desde el último día disponible
  const from = new Date(lastDate)
  from.setDate(from.getDate() - 29)
  return { dateFrom: toDateStr(from), dateTo: ultimoDate }
}

function daysBetween(from: string, to: string): number {
  const msPerDay = 86400000
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / msPerDay) + 1
}

function usesMonthlyHistory(from: Date, to: Date): boolean {
  const msPerDay = 86400000
  const days = Math.round((to.getTime() - from.getTime()) / msPerDay) + 1
  return days > 31
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  NO_KEY_DETECTED: "Exceso de velocidad",
  exceso: "Exceso de velocidad",
  no_identificado: "No identificado",
  contacto: "Contacto",
  llave_sin_cargar: "Llave sin cargar",
  conductor_inactivo: "Conductor inactivo",
  exceso_velocidad: "Exceso de velocidad",
  contacto_sin_identificacion: "Contacto sin identificación",
  llave_no_registrada: "Llave no registrada",
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

// El backend embebe el estado del conductor en el string de ubicación (ej. "Desconocido (SIN LLAVE) RP51").
// Esta función elimina ese prefijo y devuelve solo la ubicación geográfica.
function cleanLocation(raw: string | null | undefined): string | null {
  if (!raw) return null
  const cleaned = raw.replace(/^[^(]*\([^)]*\)\s*/i, "").trim()
  return cleaned || null
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

  if (isSpeedExcess) {
    return "border-red-500/40 bg-red-500/15 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300"
  }
  if (isKeyOrContact) {
    return "border-yellow-500/50 bg-yellow-500/20 text-yellow-800 dark:border-yellow-400/20 dark:bg-yellow-400/10 dark:text-yellow-300"
  }
  return "border-white/10 bg-white/5 text-white/60"
}

interface HistoricoEventRow {
  rowId: string
  plate: string
  brand: string | null
  model: string | null
  operation: string | null
  type: string
  rawType: string
  driverName: string | null
  keyId: string | null
  speed: number | null
  eventTimestamp: string
  location: string | null
  description: string | null
}

function mapEventRow(event: VehicleEventItem): HistoricoEventRow {
  return {
    rowId: event.eventId || `${event.plate}:${event.eventTimestamp}`,
    plate: event.plate,
    brand: event.brand ?? null,
    model: event.model ?? null,
    operation: event.operationName ?? event.operacion ?? null,
    rawType: event.eventType || event.rawEventType || event.sourceEmailType || "",
    type:
      (event.speed != null && event.speed > 0) ||
      (event.maxSpeed != null && event.maxSpeed > 0) ||
      event.hasSpeed
        ? "Exceso de velocidad"
        : humanizeEventType(event.eventType || event.rawEventType || event.sourceEmailType || ""),
    driverName: event.driverName ?? null,
    keyId: event.keyId ?? null,
    speed: event.speed ?? event.maxSpeed ?? null,
    eventTimestamp: event.eventTimestamp,
    location: cleanLocation(event.location ?? event.locationRaw),
    description: event.reason ?? event.rawEventType ?? null,
  }
}

type ColFlags = { conductor: boolean; llave: boolean; velocidad: boolean; ubicacion: boolean }

function exportToCSV(rows: HistoricoEventRow[], cols: ColFlags, filename: string) {
  const headers: string[] = ["Patente", "Modelo", "Operación", "Tipo"]
  if (cols.conductor) headers.push("Conductor")
  if (cols.llave) headers.push("Llave")
  if (cols.velocidad) headers.push("Velocidad (km/h)")
  headers.push("Fecha/Hora")
  if (cols.ubicacion) headers.push("Ubicación")
  headers.push("Detalle")

  function esc(val: string | number | null | undefined): string {
    if (val == null) return ""
    const s = String(val)
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const lines = rows.map((row) => {
    const cells: string[] = [esc(row.plate), esc(row.model), esc(row.operation), esc(row.type)]
    if (cols.conductor) cells.push(esc(row.driverName))
    if (cols.llave) cells.push(esc(row.keyId))
    if (cols.velocidad) cells.push(row.speed != null ? String(row.speed) : "")
    cells.push(esc(formatEventDateTime(row.eventTimestamp)))
    if (cols.ubicacion) cells.push(esc(row.location))
    cells.push(esc(row.description))
    return cells.join(",")
  })

  const csv = "\uFEFF" + [headers.join(","), ...lines].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  ultimo: "Último",
  semana: "Última semana",
  mes: "Último mes",
  personalizado: "Personalizado",
}

export default function HistoricoPage() {
  const initialDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return toDateStr(d)
  }, [])

  const [ultimoDate, setUltimoDate] = useState(initialDate)
  const [fallbackTried, setFallbackTried] = useState(false)

  const [datePreset, setDatePreset] = useState<DatePreset>("ultimo")
  const [dateFrom, setDateFrom] = useState(initialDate)
  const [dateTo, setDateTo] = useState(initialDate)
  const [dateError, setDateError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isExporting, setIsExporting] = useState(false)

  const [selectedPlate, setSelectedPlate] = useState<string>("Todas")
  const [selectedEventType, setSelectedEventType] = useState<string>("Todos")
  const [selectedOperation, setSelectedOperation] = useState<string>("Todas")
  const [search, setSearch] = useState<string>("")

  function validateRange(from: string, to: string): boolean {
    if (!from || !to) { setDateError(null); return false }
    if (from > to) { setDateError("La fecha de inicio debe ser anterior a la de fin"); return false }
    const days = daysBetween(from, to)
    if (days > MAX_RANGE_DAYS) {
      setDateError(`El rango no puede superar ${MAX_RANGE_DAYS} días (seleccionaste ${days})`)
      return false
    }
    setDateError(null)
    return true
  }

  function handlePreset(preset: DatePreset) {
    setDatePreset(preset)
    if (preset === "ultimo") {
      setDateFrom(ultimoDate)
      setDateTo(ultimoDate)
      setDateError(null)
      setCurrentPage(1)
    } else if (preset !== "personalizado") {
      const range = getRangeForPreset(preset, ultimoDate)
      setDateFrom(range.dateFrom)
      setDateTo(range.dateTo)
      setDateError(null)
      setCurrentPage(1)
    }
  }

  function handleDateFromChange(val: string) {
    setDateFrom(val)
    setDatePreset("personalizado")
    setCurrentPage(1)
    validateRange(val, dateTo)
  }

  function handleDateToChange(val: string) {
    setDateTo(val)
    setDatePreset("personalizado")
    setCurrentPage(1)
    validateRange(dateFrom, val)
  }

  function handleClearFilters() {
    setSelectedPlate("Todas")
    setSelectedEventType("Todos")
    setSelectedOperation("Todas")
    setSearch("")
  }

  const isRangeValid = dateError === null && !!dateFrom && !!dateTo && dateFrom <= dateTo

  const hasActiveFilters =
    selectedPlate !== "Todas" ||
    selectedEventType !== "Todos" ||
    selectedOperation !== "Todas" ||
    search !== ""

  const monthly = useMemo(() => usesMonthlyHistory(new Date(dateFrom), new Date(dateTo)), [dateFrom, dateTo])
  /** Filtros que no van al API: se aplica paginación sobre el resultado filtrado en cliente. */
  const hasClientOnlyFilters =
    selectedEventType !== "Todos" || selectedOperation !== "Todas" || search.trim() !== ""
  const plateParam = selectedPlate !== "Todas" ? selectedPlate : undefined
  const usesClientPagination = monthly || hasClientOnlyFilters

  const pagedQueryParams = useMemo<VehicleEventsParams>(
    () => ({
      dateFrom,
      dateTo,
      limit: PAGE_LIMIT,
      page: currentPage,
      ...(plateParam ? { plate: plateParam } : {}),
    }),
    [dateFrom, dateTo, currentPage, plateParam],
  )

  const historicoQueryKey = useMemo(
    () =>
      monthly
        ? (["historico-events", "monthly", dateFrom, dateTo, plateParam ?? ""] as const)
        : hasClientOnlyFilters
          ? (["historico-events", "full-range", dateFrom, dateTo, plateParam ?? ""] as const)
          : (["historico-events", "paged", pagedQueryParams] as const),
    [monthly, hasClientOnlyFilters, dateFrom, dateTo, plateParam, pagedQueryParams],
  )

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: historicoQueryKey,
    enabled: isRangeValid,
    staleTime: 60_000,
    queryFn: async () => {
      if (monthly) {
        const response = await getVehicleEventsHistory({ dateFrom, dateTo, plate: plateParam })
        const rows = (response.events ?? []).map(mapEventRow)
        rows.sort((a, b) => (b.eventTimestamp ?? "").localeCompare(a.eventTimestamp ?? ""))
        return { plates: response.plates ?? [], rows, total: rows.length }
      }
      if (hasClientOnlyFilters) {
        const response = await fetchAllVehicleEventsPages(dateFrom, dateTo, plateParam)
        const rows = response.events.map(mapEventRow)
        rows.sort((a, b) => (b.eventTimestamp ?? "").localeCompare(a.eventTimestamp ?? ""))
        return { plates: response.plates, rows, total: response.total }
      }
      const response = await vehiclesApi.vehicleEvents(pagedQueryParams)
      const rows = (response.events ?? []).map(mapEventRow)
      rows.sort((a, b) => (b.eventTimestamp ?? "").localeCompare(a.eventTimestamp ?? ""))
      return {
        plates: response.plates ?? [],
        rows,
        total: typeof response.total === "number" ? response.total : rows.length,
      }
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

  const availableOperations = useMemo(() => {
    const ops = new Set<string>()
    for (const row of data?.rows ?? []) {
      const op = row.operation?.trim()
      if (op) ops.add(op)
    }
    return Array.from(ops).sort((a, b) => a.localeCompare(b))
  }, [data?.rows])

  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? []
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (selectedPlate !== "Todas" && row.plate !== selectedPlate) return false
      if (selectedEventType !== "Todos" && row.type !== selectedEventType) return false
      if (selectedOperation !== "Todas" && row.operation !== selectedOperation) return false
      if (!q) return true
      return (row.driverName ?? "").toLowerCase().includes(q) || (row.keyId ?? "").toLowerCase().includes(q)
    })
  }, [data?.rows, search, selectedPlate, selectedEventType, selectedOperation])

  const pageRows = useMemo(() => {
    if (!usesClientPagination) return filteredRows
    const start = (currentPage - 1) * PAGE_LIMIT
    return filteredRows.slice(start, start + PAGE_LIMIT)
  }, [usesClientPagination, filteredRows, currentPage])

  const totalPages = useMemo(() => {
    if (usesClientPagination) {
      return Math.max(1, Math.ceil(filteredRows.length / PAGE_LIMIT))
    }
    if (data?.total != null) return Math.max(1, Math.ceil(data.total / PAGE_LIMIT))
    return 1
  }, [usesClientPagination, filteredRows.length, data?.total])

  useEffect(() => {
    setCurrentPage(1)
  }, [dateFrom, dateTo, selectedEventType, selectedOperation, search, selectedPlate, monthly, hasClientOnlyFilters])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  // Auto-fallback: si ayer no tiene datos, intentar anteayer (máx 1 intento)
  useEffect(() => {
    if (isLoading || isFetching || datePreset !== "ultimo" || fallbackTried) return
    if (data && data.rows.length === 0) {
      const d = new Date()
      d.setDate(d.getDate() - 2)
      const anteayer = toDateStr(d)
      setFallbackTried(true)
      setUltimoDate(anteayer)
      setDateFrom(anteayer)
      setDateTo(anteayer)
    }
  }, [data, isLoading, isFetching, datePreset, fallbackTried])

  useEffect(() => {
    if (!data) return
    const plateSet = new Set(data.plates)
    if (selectedPlate !== "Todas" && !plateSet.has(selectedPlate)) setSelectedPlate("Todas")
    if (selectedEventType !== "Todos" && !availableEventTypes.includes(selectedEventType)) setSelectedEventType("Todos")
    if (selectedOperation !== "Todas" && !availableOperations.includes(selectedOperation)) setSelectedOperation("Todas")
  }, [data, availableEventTypes, availableOperations, selectedPlate, selectedEventType, selectedOperation])

  const visibleCols = useMemo<ColFlags>(
    () => ({
      // Siempre: `driverName` viene del API (puede ser null, p. ej. contacto sin conductor).
      conductor: true,
      llave: filteredRows.some((r) => r.keyId != null),
      velocidad: filteredRows.some((r) => r.speed != null),
      ubicacion: filteredRows.some((r) => r.location != null),
    }),
    [filteredRows],
  )

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const plate = selectedPlate !== "Todas" ? selectedPlate : undefined
      const rawEvents = usesMonthlyHistory(new Date(dateFrom), new Date(dateTo))
        ? (await getVehicleEventsHistory({ dateFrom, dateTo, plate })).events ?? []
        : (await fetchAllVehicleEventsPages(dateFrom, dateTo, plate)).events
      const allRows = rawEvents.map(mapEventRow)
      allRows.sort((a, b) => (b.eventTimestamp ?? "").localeCompare(a.eventTimestamp ?? ""))

      const q = search.trim().toLowerCase()
      const exportRows = allRows.filter((row) => {
        if (selectedPlate !== "Todas" && row.plate !== selectedPlate) return false
        if (selectedEventType !== "Todos" && row.type !== selectedEventType) return false
        if (selectedOperation !== "Todas" && row.operation !== selectedOperation) return false
        if (!q) return true
        return (row.driverName ?? "").toLowerCase().includes(q) || (row.keyId ?? "").toLowerCase().includes(q)
      })

      const exportCols: ColFlags = {
        conductor: true,
        llave: exportRows.some((r) => r.keyId != null),
        velocidad: exportRows.some((r) => r.speed != null),
        ubicacion: exportRows.some((r) => r.location != null),
      }

      exportToCSV(exportRows, exportCols, `historico_${dateFrom}_${dateTo}.csv`)
    } finally {
      setIsExporting(false)
    }
  }, [dateFrom, dateTo, selectedPlate, selectedEventType, selectedOperation, search])

  const errorMessage = error ? (error instanceof Error ? error.message : "Error desconocido") : null
  const hasAnyRows = (data?.rows?.length ?? 0) > 0
  const hasRowsAfterFilters = filteredRows.length > 0

  return (
    <div className="min-h-screen space-y-6 p-6">
      {/* Header */}
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

      {/* Filters */}
      <div className="space-y-3">
        {/* Date preset pills */}
        <div className="flex items-center gap-1">
          {(["ultimo", "semana", "mes", "personalizado"] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => handlePreset(preset)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                datePreset === preset
                  ? "border border-primary/40 bg-primary/20 text-primary ring-1 ring-primary/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:ring-white/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white/70",
              )}
            >
              {DATE_PRESET_LABELS[preset]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-start gap-4">
          {/* Date range — solo visible en modo personalizado */}
          {datePreset === "personalizado" && (
            <div className="flex flex-col gap-1">
              <div className="mb-1 text-xs text-white/40">Rango de fechas</div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className="h-9 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-white/80 [color-scheme:dark] focus:border-white/20 focus:outline-none"
                />
                <span className="text-xs text-white/30">→</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  className="h-9 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-white/80 [color-scheme:dark] focus:border-white/20 focus:outline-none"
                />
              </div>
              {dateError && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
                  <AlertTriangle size={11} />
                  {dateError}
                </p>
              )}
            </div>
          )}

          {/* Other filters */}
          <div className="flex flex-wrap items-end gap-2">
            {/* Patente */}
            <Select value={selectedPlate} onValueChange={(v) => setSelectedPlate(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Patente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas las patentes</SelectItem>
                {(data?.plates ?? []).map((plate) => (
                  <SelectItem key={plate} value={plate}>
                    {plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tipo de evento */}
            <Select value={selectedEventType} onValueChange={(v) => setSelectedEventType(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos los tipos</SelectItem>
                {availableEventTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operación */}
            <Select value={selectedOperation} onValueChange={(v) => setSelectedOperation(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Operación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas las operaciones</SelectItem>
                {availableOperations.map((op) => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Conductor / llave */}
            <div className="w-[220px]">
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
              disabled={isLoading || isFetching || !isRangeValid}
              className="h-9 gap-1.5 border-white/10 bg-white/[0.04] text-xs text-white/60 hover:bg-white/[0.08] hover:text-white"
              onClick={() => void refetch()}
            >
              <RefreshCw size={13} className={cn(isFetching && "animate-spin")} />
              Actualizar
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={isExporting || !hasAnyRows || !isRangeValid}
              className="h-9 gap-1.5 border-white/10 bg-white/[0.04] text-xs text-white/60 hover:bg-white/[0.08] hover:text-white"
              onClick={() => void handleExport()}
            >
              <Download size={13} className={cn(isExporting && "animate-pulse")} />
              {isExporting ? "Exportando…" : "Exportar CSV"}
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-9 gap-1 text-xs text-white/35 hover:bg-white/[0.04] hover:text-white/60"
              >
                <X size={12} />
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>
      </div>

      <AsyncState loading={isLoading} error={errorMessage} onRetry={() => void refetch()} />

      {!isLoading && !error && isRangeValid && !hasAnyRows && (
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
                    {visibleCols.conductor && <TableHead>Conductor</TableHead>}
                    {visibleCols.llave     && <TableHead>Llave</TableHead>}
                    {visibleCols.velocidad && <TableHead className="text-right">Velocidad</TableHead>}
                    <TableHead>Fecha/Hora</TableHead>
                    {visibleCols.ubicacion && <TableHead>Ubicación</TableHead>}
                    <TableHead>Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((row) => (
                    <TableRow key={row.rowId} className="border-white/5 bg-white/[0.02] hover:bg-white/[0.03]">
                      <TableCell className="font-mono text-xs text-white/90">
                        {row.plate} {row.model ? `· ${row.model}` : ""}
                      </TableCell>
                      <TableCell className="text-white/80">{row.operation ?? "-"}</TableCell>
                      <TableCell>
                        {eventTypeDescriptions[row.rawType] ? (
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className={getEventBadgeClassName(row.type)}>
                                  {row.type}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>{eventTypeDescriptions[row.rawType]}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <Badge variant="outline" className={getEventBadgeClassName(row.type)}>
                            {row.type}
                          </Badge>
                        )}
                      </TableCell>
                      {visibleCols.conductor && <TableCell className="text-white/80">{row.driverName ?? "-"}</TableCell>}
                      {visibleCols.llave     && <TableCell className="text-white/80">{row.keyId ?? "-"}</TableCell>}
                      {visibleCols.velocidad && (
                        <TableCell className="text-right font-mono text-xs text-white/90">
                          {row.speed != null ? `${row.speed} km/h` : "-"}
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-xs text-white/80">
                        {formatEventDateTime(row.eventTimestamp)}
                      </TableCell>
                      {visibleCols.ubicacion && <TableCell className="text-white/80">{row.location ?? "-"}</TableCell>}
                      <TableCell className="max-w-[420px] whitespace-normal text-white/80">
                        {row.description ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-white/40">
                {pageRows.length} evento{pageRows.length !== 1 ? "s" : ""} en esta página
                {usesClientPagination
                  ? filteredRows.length > 0 && ` · ${filteredRows.length} que coinciden con los filtros`
                  : data?.total != null && ` · ${data.total} total en el período`}
                {totalPages > 1 && ` · Página ${currentPage} de ${totalPages}`}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || isFetching}
                  className="h-8 gap-1 border-white/10 bg-white/[0.04] px-2.5 text-xs text-white/60 hover:bg-white/[0.08] hover:text-white disabled:opacity-30"
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft size={13} />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || isFetching}
                  className="h-8 gap-1 border-white/10 bg-white/[0.04] px-2.5 text-xs text-white/60 hover:bg-white/[0.08] hover:text-white disabled:opacity-30"
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Siguiente
                  <ChevronRight size={13} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
