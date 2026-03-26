"use client"

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { es } from "date-fns/locale"
import { ArrowLeft, ArrowRight, CalendarIcon, RefreshCw } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import type { Matcher } from "react-day-picker"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AsyncState } from "@/components/common/async-state"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDashboardData } from "@/hooks/domain/useDashboardData"
import { dashboardApi } from "@/services/api"
import { queryKeys } from "@/lib/query/queryKeys"
import {
  formatDDMMYYYY,
  getDateKeysInMonth,
  getDateKeysLast7Days,
  getYesterdayKey,
  normalizeBusinessDate,
} from "@/lib/domain/date"
import { cn } from "@/lib/utils"
import type { DashboardAggregatedPayload } from "@/services/api/dashboard/types"

type DashboardDatePreset = "day" | "week" | "month" | "year"

const STORAGE_KEY = "dashboard:selectedDate"
const STORAGE_PRESET_KEY = "dashboard:preset"
const STALE_TIME = 5 * 60_000

function readStoredDate(): string | undefined {
  if (typeof window === "undefined") return undefined
  try { return localStorage.getItem(STORAGE_KEY) ?? undefined } catch { return undefined }
}
function writeStoredDate(date: string): void {
  try { localStorage.setItem(STORAGE_KEY, date) } catch { /* ignore */ }
}
function readStoredPreset(): DashboardDatePreset | undefined {
  if (typeof window === "undefined") return undefined
  try {
    const v = localStorage.getItem(STORAGE_PRESET_KEY)
    if (v === "day" || v === "week" || v === "month" || v === "year") return v
    return undefined
  } catch { return undefined }
}
function writeStoredPreset(preset: DashboardDatePreset): void {
  try { localStorage.setItem(STORAGE_PRESET_KEY, preset) } catch { /* ignore */ }
}

type DateState = { status: "pending" } | { status: "ready"; date: string }
type DateAction =
  | { type: "RESTORE"; date: string }
  | { type: "SET"; date: string }
  | { type: "INIT_FROM_API"; date: string }
  | { type: "INIT_FALLBACK" }

function dateReducer(state: DateState, action: DateAction): DateState {
  switch (action.type) {
    case "RESTORE": return { status: "ready", date: action.date }
    case "SET": return { status: "ready", date: action.date }
    case "INIT_FROM_API": return state.status === "ready" ? state : { status: "ready", date: action.date }
    case "INIT_FALLBACK": return state.status === "ready" ? state : { status: "ready", date: getYesterdayKey() }
    default: return state
  }
}

function formatPeriodLabel(dateStr: string, preset: DashboardDatePreset): string {
  if (preset === "day") return formatDDMMYYYY(dateStr)
  if (preset === "week") {
    const keys = getDateKeysLast7Days(dateStr)
    if (keys.length < 2) return formatDDMMYYYY(dateStr)
    return `${formatDDMMYYYY(keys[0])} - ${formatDDMMYYYY(keys[6])}`
  }
  if (preset === "month") {
    const [y, m] = dateStr.split("-")
    if (!y || !m) return formatDDMMYYYY(dateStr)
    const keys = getDateKeysInMonth(`${y}-${m}`)
    if (keys.length === 0) return formatDDMMYYYY(dateStr)
    return `${formatDDMMYYYY(keys[0])} - ${formatDDMMYYYY(keys[keys.length - 1])}`
  }
  if (preset === "year") {
    const y = dateStr.slice(0, 4)
    return `${formatDDMMYYYY(`${y}-01-01`)} - ${formatDDMMYYYY(`${y}-12-31`)}`
  }
  return formatDDMMYYYY(dateStr)
}

function getPreviousParam(dateKey: string, preset: DashboardDatePreset): string {
  if (preset === "day") {
    const d = new Date(`${dateKey}T00:00:00`)
    d.setDate(d.getDate() - 1)
    return normalizeBusinessDate(d)
  }
  if (preset === "week") {
    const d = new Date(`${dateKey}T00:00:00`)
    d.setDate(d.getDate() - 7)
    return normalizeBusinessDate(d)
  }
  if (preset === "month") {
    const [y, m] = dateKey.slice(0, 7).split("-").map(Number)
    const prev = new Date(y, m - 2, 1)
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`
  }
  // year
  return String(Number(dateKey.slice(0, 4)) - 1)
}

function deltaLabel(curr: number, prev: number): string {
  const diff = curr - prev
  if (diff === 0) return "igual"
  return diff > 0 ? `+${diff}` : `${diff}`
}

function deltaClass(curr: number, prev: number): string {
  const diff = curr - prev
  if (diff === 0) return "text-white/40"
  return diff > 0 ? "text-red-400" : "text-green-400"
}

interface KpiCardProps {
  label: string
  value: number
  prev: number | null
  accentClass: string
  prevLabel: string
}

function KpiCard({ label, value, prev, accentClass, prevLabel }: KpiCardProps) {
  return (
    <Card className="border-white/5 bg-white/[0.03]">
      <CardContent className="pb-4 pt-5">
        <p className="mb-1 text-xs text-white/40">{label}</p>
        <p className={cn("text-3xl font-bold tabular-nums", accentClass)}>{value}</p>
        {prev !== null && (
          <p className={cn("mt-1 text-xs", deltaClass(value, prev))}>
            {deltaLabel(value, prev)} vs {prevLabel}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function SuperDashboardPage() {
  const [dateState, dispatch] = useReducer(dateReducer, { status: "pending" })
  const [preset, setPreset] = useState<DashboardDatePreset>(() => readStoredPreset() ?? "day")
  const hasRestoredRef = useRef(false)

  const selectedDate = dateState.status === "ready" ? dateState.date : undefined

  useEffect(() => {
    if (hasRestoredRef.current) return
    hasRestoredRef.current = true
    const stored = readStoredDate()
    if (stored) dispatch({ type: "RESTORE", date: stored })
  }, [])

  useEffect(() => { writeStoredPreset(preset) }, [preset])

  const {
    data: lastDateData,
    isLoading: loadingLastDate,
    error: lastDateError,
  } = useQuery({
    queryKey: queryKeys.dashboard.lastDate(),
    queryFn: dashboardApi.myLastDateWithData,
    staleTime: STALE_TIME,
  })

  useEffect(() => {
    if (!hasRestoredRef.current) return
    if (lastDateData?.date) dispatch({ type: "INIT_FROM_API", date: normalizeBusinessDate(lastDateData.date) })
  }, [lastDateData?.date])

  useEffect(() => {
    if (!hasRestoredRef.current) return
    if (lastDateError) dispatch({ type: "INIT_FALLBACK" })
  }, [lastDateError])

  useEffect(() => {
    if (selectedDate) writeStoredDate(selectedDate)
  }, [selectedDate])

  const setDate = useCallback((date: string) => dispatch({ type: "SET", date }), [])

  // Current period
  const { vehicleDetails, riskVehicles, dailyBreakdown, loading, error, refetch } =
    useDashboardData(selectedDate, preset)

  useEffect(() => {
    if (!selectedDate) return
    console.log("[AUDIT-FRONT] SuperDashboardPage query trigger", { preset, selectedDate })
  }, [preset, selectedDate])

  useEffect(() => {
    if (!dailyBreakdown) return
    console.log("[AUDIT-FRONT] SuperDashboardPage dailyBreakdown", {
      length: dailyBreakdown.length,
      first2: dailyBreakdown.slice(0, 2),
    })
  }, [dailyBreakdown])

  useEffect(() => {
    console.log("[AUDIT-FRONT] SuperDashboardPage vehicleDetails length", vehicleDetails.length)
  }, [vehicleDetails])

  // Previous period — compute param
  const prevApiParam = useMemo(() => {
    if (!selectedDate) return undefined
    const raw = getPreviousParam(selectedDate, preset)
    if (preset === "month") return raw            // already "YYYY-MM"
    if (preset === "year") return raw             // already "YYYY"
    return raw                                    // full dateKey
  }, [selectedDate, preset])

  const { data: prevPayload } = useQuery({
    queryKey: ["dashboard", "prev", preset, prevApiParam ?? ""],
    queryFn: async (): Promise<DashboardAggregatedPayload | null> => {
      if (!prevApiParam) return null
      try {
        if (preset === "day") return await dashboardApi.getDay(prevApiParam)
        if (preset === "week") return await dashboardApi.getWeek(prevApiParam)
        if (preset === "month") return await dashboardApi.getMonth(prevApiParam)
        return await dashboardApi.getYear(prevApiParam)
      } catch { return null }
    },
    enabled: !!prevApiParam,
    staleTime: STALE_TIME,
  })

  const prevDetails = prevPayload?.vehicleDetails ?? []

  // KPI totals
  const kpi = useMemo(() => ({
    excesos:          vehicleDetails.reduce((s, v) => s + (v.excesos ?? 0), 0),
    llave_sin_cargar: vehicleDetails.reduce((s, v) => s + (v.llave_sin_cargar ?? 0), 0),
    no_identificados: vehicleDetails.reduce((s, v) => s + (v.no_identificados ?? 0), 0),
    conductor_inactivo: vehicleDetails.reduce((s, v) => s + (v.conductor_inactivo ?? 0), 0),
  }), [vehicleDetails])

  const kpiPrev = useMemo(() => prevDetails.length > 0 ? ({
    excesos:          prevDetails.reduce((s, v) => s + (v.excesos ?? 0), 0),
    llave_sin_cargar: prevDetails.reduce((s, v) => s + (v.llave_sin_cargar ?? 0), 0),
    no_identificados: prevDetails.reduce((s, v) => s + (v.no_identificados ?? 0), 0),
    conductor_inactivo: prevDetails.reduce((s, v) => s + (v.conductor_inactivo ?? 0), 0),
  }) : null, [prevDetails])

  const prevLabel = useMemo(() => ({
    day: "día ant.", week: "semana ant.", month: "mes ant.", year: "año ant.",
  }[preset]), [preset])

  // Bar chart data
  const chartData = useMemo(() => {
    if (!dailyBreakdown || dailyBreakdown.length === 0) return []
    return [...dailyBreakdown]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ date: d.date, label: formatDDMMYYYY(d.date).slice(0, 5), excesos: d.totalExcessEvents }))
  }, [dailyBreakdown])

  // Distribution bars
  const distribution = useMemo(() => {
    const total = kpi.excesos + kpi.llave_sin_cargar + kpi.no_identificados + kpi.conductor_inactivo
    if (total === 0) return []
    const pct = (n: number) => Math.round((n / total) * 100)
    return [
      { label: "Excesos de velocidad", value: kpi.excesos, pct: pct(kpi.excesos), color: "bg-red-500/70" },
      { label: "Llaves sin cargar",    value: kpi.llave_sin_cargar, pct: pct(kpi.llave_sin_cargar), color: "bg-yellow-500/70" },
      { label: "No identificados",     value: kpi.no_identificados, pct: pct(kpi.no_identificados), color: "bg-orange-500/70" },
      { label: "Conductor inactivo",   value: kpi.conductor_inactivo, pct: pct(kpi.conductor_inactivo), color: "bg-blue-500/70" },
    ]
  }, [kpi])

  // Table rows
  const tableRows = useMemo(() => {
    const riskMap = new Map(riskVehicles.map((v) => [v.plate, v]))
    return vehicleDetails
      .map((v) => ({
        plate: v.plate,
        totalEvents: (v.excesos ?? 0) + (v.llave_sin_cargar ?? 0) + (v.no_identificados ?? 0) + (v.conductor_inactivo ?? 0) + (v.contactos ?? 0),
        riskScore: riskMap.get(v.plate)?.maxRisk ?? 0,
      }))
      .sort((a, b) => b.totalEvents - a.totalEvents)
      .slice(0, 10)
  }, [vehicleDetails, riskVehicles])

  const hasData = vehicleDetails.length > 0 || riskVehicles.length > 0

  // Navigation
  const maxAvailableDate = useMemo(() => getYesterdayKey(), [])
  const minAvailableDate = useMemo(
    () => (lastDateData?.minDate ? normalizeBusinessDate(lastDateData.minDate) : undefined),
    [lastDateData?.minDate],
  )
  const selectedDateLabel = useMemo(
    () => (selectedDate ? formatPeriodLabel(selectedDate, preset) : "Seleccionar fecha"),
    [selectedDate, preset],
  )
  const selectedDateObj = useMemo(
    () => (selectedDate ? new Date(`${selectedDate}T00:00:00`) : undefined),
    [selectedDate],
  )
  const maxDateObj = useMemo(() => new Date(`${maxAvailableDate}T00:00:00`), [maxAvailableDate])
  const disabledDays: Matcher | undefined = { after: maxDateObj }

  const canGoPrev = !!selectedDate && !!minAvailableDate && normalizeBusinessDate(selectedDate) > minAvailableDate
  const canGoNext = !!selectedDate && normalizeBusinessDate(selectedDate) < maxAvailableDate

  const handlePrev = useCallback(() => {
    if (!selectedDate) return
    const d = new Date(`${selectedDate}T00:00:00`)
    if (preset === "day") d.setDate(d.getDate() - 1)
    else if (preset === "week") d.setDate(d.getDate() - 7)
    else if (preset === "month") d.setMonth(d.getMonth() - 1)
    else d.setFullYear(d.getFullYear() - 1)
    setDate(normalizeBusinessDate(d))
  }, [selectedDate, preset, setDate])

  const handleNext = useCallback(() => {
    if (!selectedDate) return
    const d = new Date(`${selectedDate}T00:00:00`)
    if (preset === "day") d.setDate(d.getDate() + 1)
    else if (preset === "week") d.setDate(d.getDate() + 7)
    else if (preset === "month") d.setMonth(d.getMonth() + 1)
    else d.setFullYear(d.getFullYear() + 1)
    setDate(normalizeBusinessDate(d))
  }, [selectedDate, preset, setDate])

  const handleRefetch = useCallback(() => void refetch(), [refetch])

  return (
    <div className="min-h-screen space-y-6 p-6">

      {/* SECCIÓN 1 — Selector de período */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Dashboard</h1>
          <p className="mt-0.5 text-sm text-white/40">Vista ejecutiva · HSE, Operaciones y Gerencia</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
            {(["day", "week", "month", "year"] as const).map((p) => (
              <Button
                key={p}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-3 text-xs font-medium",
                  preset === p ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/70",
                )}
                onClick={() => setPreset(p)}
              >
                {p === "day" ? "Día" : p === "week" ? "Semana" : p === "month" ? "Mes" : "Año"}
              </Button>
            ))}
          </div>

          <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.04]">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-r-none text-white/60 hover:text-white disabled:opacity-30"
              disabled={!canGoPrev}
              onClick={handlePrev}
            >
              <ArrowLeft size={15} />
            </Button>
            <div className="h-5 w-px bg-white/10" />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-l-none text-white/60 hover:text-white disabled:opacity-30"
              disabled={!canGoNext}
              onClick={handleNext}
            >
              <ArrowRight size={15} />
            </Button>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={loadingLastDate}
                className="h-9 gap-2 border-white/10 bg-white/[0.04] text-sm text-white/80 hover:bg-white/[0.08] hover:text-white"
              >
                <CalendarIcon size={14} className="text-white/40" />
                {selectedDateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto border-white/10 bg-zinc-900 p-0">
              <Calendar
                mode="single"
                locale={es}
                selected={selectedDateObj}
                onSelect={(d) => { if (d) setDate(normalizeBusinessDate(d)) }}
                disabled={disabledDays}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            disabled={loadingLastDate || !lastDateData?.date}
            className="h-9 border-white/10 bg-white/[0.04] text-xs text-white/60 hover:bg-white/[0.08] hover:text-white"
            onClick={() => lastDateData?.date && setDate(normalizeBusinessDate(lastDateData.date))}
          >
            Último con datos
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefetch}
            disabled={loading || !selectedDate}
            className="h-9 gap-1.5 border-white/10 bg-white/[0.04] text-xs text-white/60 hover:bg-white/[0.08] hover:text-white"
          >
            <RefreshCw size={13} className={cn(loading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      <AsyncState loading={loading} error={error} onRetry={handleRefetch} />

      {!loading && !error && !hasData && selectedDate && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="py-6 text-center text-sm text-white/40">
            No hay datos para el período: {selectedDateLabel}.
          </CardContent>
        </Card>
      )}

      {!loading && !error && hasData && (
        <div className="space-y-6">

          {/* SECCIÓN 2 — 4 KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Excesos de velocidad"
              value={kpi.excesos}
              prev={kpiPrev?.excesos ?? null}
              accentClass={kpi.excesos > 0 ? "text-red-400" : "text-white"}
              prevLabel={prevLabel}
            />
            <KpiCard
              label="Llaves sin cargar"
              value={kpi.llave_sin_cargar}
              prev={kpiPrev?.llave_sin_cargar ?? null}
              accentClass={kpi.llave_sin_cargar > 0 ? "text-yellow-400" : "text-white"}
              prevLabel={prevLabel}
            />
            <KpiCard
              label="No identificados"
              value={kpi.no_identificados}
              prev={kpiPrev?.no_identificados ?? null}
              accentClass={kpi.no_identificados > 0 ? "text-yellow-400" : "text-white"}
              prevLabel={prevLabel}
            />
            <KpiCard
              label="Conductor inactivo"
              value={kpi.conductor_inactivo}
              prev={kpiPrev?.conductor_inactivo ?? null}
              accentClass="text-white"
              prevLabel={prevLabel}
            />
          </div>

          {/* SECCIÓN 3 — Dos columnas */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

            {/* Columna izquierda (60%): gráfico de barras */}
            <Card className="border-white/5 bg-white/[0.03] lg:col-span-3">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-white/80">
                  Excesos de velocidad por día
                </CardTitle>
              </CardHeader>
              <CardContent>
                {preset === "day" ? (
                  <p className="py-10 text-center text-sm text-white/30">
                    Seleccioná semana, mes o año para ver la evolución
                  </p>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={28}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        contentStyle={{
                          background: "#18181b",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "6px",
                          fontSize: "12px",
                        }}
                        labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                        itemStyle={{ color: "#f87171" }}
                      />
                      <Bar dataKey="excesos" name="Excesos" fill="#ef4444" fillOpacity={0.75} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-10 text-center text-sm text-white/30">
                    Sin datos de evolución disponibles
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Columna derecha (40%): distribución */}
            <Card className="border-white/5 bg-white/[0.03] lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-white/80">
                  Distribución de eventos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {distribution.length === 0 ? (
                  <p className="py-10 text-center text-sm text-white/30">Sin eventos en el período</p>
                ) : (
                  <div className="space-y-4">
                    {distribution.map((d) => (
                      <div key={d.label}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-white/60">{d.label}</span>
                          <span className="tabular-nums text-white/80">
                            {d.value} <span className="text-white/40">({d.pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className={cn("h-full rounded-full transition-all", d.color)}
                            style={{ width: `${Math.max(d.pct, d.value > 0 ? 2 : 0)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SECCIÓN 4 — Tabla */}
          <Card className="border-white/5 bg-white/[0.03]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white/80">
                Vehículos con más eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tableRows.length === 0 ? (
                <p className="py-4 text-center text-sm text-white/30">Sin datos</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-left text-xs text-white/40">
                        <th className="pb-2 font-normal">Patente</th>
                        <th className="pb-2 text-right font-normal">Total eventos</th>
                        <th className="pb-2 text-right font-normal">Risk score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row) => (
                        <tr key={row.plate} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="py-2 font-mono text-white/90">{row.plate}</td>
                          <td className="py-2 text-right tabular-nums text-white/70">{row.totalEvents}</td>
                          <td className="py-2 text-right">
                            <span
                              className={cn(
                                "inline-block rounded px-2 py-0.5 text-xs font-medium tabular-nums",
                                row.riskScore >= 15
                                  ? "bg-red-500/20 text-red-400"
                                  : row.riskScore >= 8
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-green-500/20 text-green-400",
                              )}
                            >
                              {row.riskScore}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  )
}
