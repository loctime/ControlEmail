"use client"

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import Link from "next/link"
import { es } from "date-fns/locale"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarIcon,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  XCircle,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import type { Matcher } from "react-day-picker"
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

export type DashboardDatePreset = "day" | "week" | "month" | "year"

// ─── Constantes ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "dashboard:selectedDate"
const STORAGE_PRESET_KEY = "dashboard:preset"
const MAX_RISK_VEHICLES = 10
const STALE_TIME = 5 * 60_000

// ─── Helpers de storage ────────────────────────────────────────────────────────
function readStoredDate(): string | undefined {
  if (typeof window === "undefined") return undefined
  try {
    return localStorage.getItem(STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

function writeStoredDate(date: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, date)
  } catch {
    // quota / private mode — ignorar silenciosamente
  }
}

function readStoredPreset(): DashboardDatePreset | undefined {
  if (typeof window === "undefined") return undefined
  try {
    const v = localStorage.getItem(STORAGE_PRESET_KEY)
    if (v === "day" || v === "week" || v === "month" || v === "year") return v
    return undefined
  } catch {
    return undefined
  }
}

function writeStoredPreset(preset: DashboardDatePreset): void {
  try {
    localStorage.setItem(STORAGE_PRESET_KEY, preset)
  } catch {
    // ignorar
  }
}

// ─── State reducer (evita race conditions entre efectos) ───────────────────────
type DateState =
  | { status: "pending" }
  | { status: "ready"; date: string }

type DateAction =
  | { type: "RESTORE"; date: string }
  | { type: "SET"; date: string }
  | { type: "INIT_FROM_API"; date: string }
  | { type: "INIT_FALLBACK" }

function dateReducer(state: DateState, action: DateAction): DateState {
  switch (action.type) {
    case "RESTORE":
      return { status: "ready", date: action.date }
    case "SET":
      return { status: "ready", date: action.date }
    case "INIT_FROM_API":
      // Solo aplica si todavía no hay fecha (no sobreescribe elección del usuario)
      if (state.status === "ready") return state
      return { status: "ready", date: action.date }
    case "INIT_FALLBACK":
      if (state.status === "ready") return state
      return { status: "ready", date: getYesterdayKey() }
    default:
      return state
  }
}

// ─── Utilidades de riesgo ──────────────────────────────────────────────────────
function getRiskColor(risk: number): string {
  if (risk >= 15) return "text-red-400 bg-red-400/10 border-red-400/20"
  if (risk >= 8) return "text-orange-400 bg-orange-400/10 border-orange-400/20"
  if (risk >= 4) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
  return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
}

function getRiskBarWidth(risk: number, max: number): string {
  if (max === 0) return "0%"
  return `${Math.min(100, (risk / max) * 100)}%`
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

// ─── Subcomponentes ────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  accent?: "default" | "warning" | "danger" | "success"
  suffix?: string
}

function KpiCard({ label, value, icon, accent = "default", suffix }: KpiCardProps) {
  const accentMap = {
    default: "text-blue-400",
    warning: "text-orange-400",
    danger: "text-red-400",
    success: "text-emerald-400",
  }

  return (
    <Card className="relative overflow-hidden border-white/5 bg-white/[0.03] backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.05] hover:border-white/10">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-widest text-white/40">{label}</p>
            <p className="text-3xl font-semibold tabular-nums text-white">
              {value}
              {suffix && <span className="ml-1 text-base font-normal text-white/50">{suffix}</span>}
            </p>
          </div>
          <div className={cn("mt-0.5", accentMap[accent])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface RiskRowProps {
  plate: string
  alerts: number
  maxRisk: number
  globalMax: number
  index: number
}

function RiskRow({ plate, alerts, maxRisk, globalMax, index }: RiskRowProps) {
  const barWidth = getRiskBarWidth(maxRisk, globalMax)
  const colorClass = getRiskColor(maxRisk)

  return (
    <div className="group relative flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 transition-all duration-150 hover:bg-white/[0.05]">
      <span className="w-5 text-right text-xs font-medium text-white/25 tabular-nums">
        {index + 1}
      </span>
      <span className="flex-1 font-mono text-sm font-medium tracking-wider text-white/90">
        {plate}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-white/40">
          {alerts} {alerts === 1 ? "evento" : "eventos"}
        </span>
        <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{
              width: barWidth,
              background: maxRisk >= 15
                ? "rgb(248 113 113)"
                : maxRisk >= 8
                  ? "rgb(251 146 60)"
                  : maxRisk >= 4
                    ? "rgb(250 204 21)"
                    : "rgb(52 211 153)",
            }}
          />
        </div>
        <span className={cn("min-w-[2rem] rounded border px-2 py-0.5 text-center text-xs font-semibold tabular-nums", colorClass)}>
          {maxRisk}
        </span>
      </div>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const [dateState, dispatch] = useReducer(dateReducer, { status: "pending" })
  const [preset, setPreset] = useState<DashboardDatePreset>(() => readStoredPreset() ?? "day")
  const hasRestoredRef = useRef(false)

  const selectedDate = dateState.status === "ready" ? dateState.date : undefined

  // 1. Restaurar desde storage (solo una vez, al montar)
  useEffect(() => {
    if (hasRestoredRef.current) return
    hasRestoredRef.current = true
    const stored = readStoredDate()
    if (stored) dispatch({ type: "RESTORE", date: stored })
  }, [])

  useEffect(() => {
    writeStoredPreset(preset)
  }, [preset])

  // 2. Query del último día con datos
  const {
    data: lastDateData,
    isLoading: loadingLastDate,
    error: lastDateError,
  } = useQuery({
    queryKey: queryKeys.dashboard.lastDate(),
    queryFn: dashboardApi.myLastDateWithData,
    staleTime: STALE_TIME,
  })

  // 3. Inicializar desde API si no hay fecha guardada
  useEffect(() => {
    if (!hasRestoredRef.current) return
    if (lastDateData?.date) {
      dispatch({ type: "INIT_FROM_API", date: normalizeBusinessDate(lastDateData.date) })
    }
  }, [lastDateData?.date])

  useEffect(() => {
    if (!hasRestoredRef.current) return
    if (lastDateError) dispatch({ type: "INIT_FALLBACK" })
  }, [lastDateError])

  // 4. Persistir cambios
  useEffect(() => {
    if (selectedDate) writeStoredDate(selectedDate)
  }, [selectedDate])

  const setDate = useCallback((date: string) => {
    dispatch({ type: "SET", date })
  }, [])

  // ─── Datos del dashboard ────────────────────────────────────────────────────
  const { stats, riskVehicles, consistency, loading, error, refetch } =
    useDashboardData(selectedDate, preset)

  // ─── Memos de fechas (maxDate = ayer: nunca permitir hoy) ────────────────────
  const maxAvailableDate = useMemo(() => getYesterdayKey(), [])

  const minAvailableDate = useMemo(
    () => lastDateData?.minDate ? normalizeBusinessDate(lastDateData.minDate) : undefined,
    [lastDateData?.minDate]
  )

  const selectedDateLabel = useMemo(
    () => selectedDate ? formatPeriodLabel(selectedDate, preset) : "Seleccionar fecha",
    [selectedDate, preset]
  )

  const selectedDateObj = useMemo(
    () => selectedDate ? new Date(`${selectedDate}T00:00:00`) : undefined,
    [selectedDate]
  )

  const maxDateObj = useMemo(
    () => new Date(`${maxAvailableDate}T00:00:00`),
    [maxAvailableDate]
  )

  const disabledDays: Matcher | undefined = { after: maxDateObj }

  const canGoPrev = selectedDate && minAvailableDate && normalizeBusinessDate(selectedDate) > minAvailableDate
  const canGoNext = selectedDate && normalizeBusinessDate(selectedDate) < maxAvailableDate

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

  // ─── Datos derivados ────────────────────────────────────────────────────────
  const topRiskVehicles = useMemo(() => riskVehicles.slice(0, MAX_RISK_VEHICLES), [riskVehicles])
  const vehiclesMonitored = riskVehicles.length
  const vehiclesWithEvents = useMemo(
    () => riskVehicles.filter((v) => (v.alerts ?? 0) > 0).length,
    [riskVehicles],
  )
  const eventsInPeriod = useMemo(
    () => riskVehicles.reduce((s, v) => s + (v.alerts ?? 0), 0),
    [riskVehicles],
  )
  const highestRiskVehicle = topRiskVehicles[0]
  const hasRiskData = useMemo(
    () =>
      (stats?.maxRisk != null && stats.maxRisk > 0) ||
      (stats?.avgRisk != null && stats.avgRisk > 0) ||
      (highestRiskVehicle?.maxRisk != null && highestRiskVehicle.maxRisk > 0),
    [stats?.maxRisk, stats?.avgRisk, highestRiskVehicle?.maxRisk],
  )

  const hasData =
    vehiclesMonitored > 0 || vehiclesWithEvents > 0 || eventsInPeriod > 0

  const globalMaxRisk = topRiskVehicles[0]?.maxRisk ?? 1

  const kpis: KpiCardProps[] = useMemo(() => {
    const base: KpiCardProps[] = [
      {
        label: "Vehículos monitoreados",
        value: vehiclesMonitored,
        icon: <BarChart3 size={20} />,
        accent: "default",
      },
      {
        label: "Vehículos con eventos",
        value: vehiclesWithEvents,
        icon: <BarChart3 size={20} />,
        accent: "default",
      },
      {
        label: "Eventos en el período",
        value: eventsInPeriod,
        icon: <BarChart3 size={20} />,
        accent: "default",
      },
    ]
    if (hasRiskData) {
      if (highestRiskVehicle != null) {
        base.push({
          label: "Mayor riesgo (vehículo)",
          value: highestRiskVehicle.plate,
          suffix: String(highestRiskVehicle.maxRisk),
          icon: <ShieldAlert size={20} />,
          accent:
            (highestRiskVehicle.maxRisk ?? 0) >= 15
              ? "danger"
              : (highestRiskVehicle.maxRisk ?? 0) >= 8
                ? "warning"
                : "default",
        })
      }
      if (stats?.avgRisk != null) {
        base.push({
          label: "Riesgo promedio flota",
          value: stats.avgRisk,
          icon: <TrendingUp size={20} />,
          accent: "default",
        })
      }
    }
    return base
  }, [
    vehiclesMonitored,
    vehiclesWithEvents,
    eventsInPeriod,
    hasRiskData,
    highestRiskVehicle,
    stats?.avgRisk,
  ])

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen space-y-6 p-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Dashboard</h1>
          <p className="mt-0.5 text-sm text-white/40">
            Vista ejecutiva · HSE, Operaciones y Gerencia
          </p>
        </div>

        {/* ── Controles de fecha ── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Presets: DÍA | SEMANA | MES | AÑO */}
          <div className="flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
            {(["day", "week", "month", "year"] as const).map((p) => (
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
                {p === "day" ? "Día" : p === "week" ? "Semana" : p === "month" ? "Mes" : "Año"}
              </Button>
            ))}
          </div>
          {/* Navegación prev/next */}
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

          {/* Date picker */}
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
            <PopoverContent className="w-auto p-0 border-white/10 bg-zinc-900">
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

          {/* Último con datos */}
          <Button
            variant="outline"
            size="sm"
            disabled={loadingLastDate || !lastDateData?.date}
            className="h-9 border-white/10 bg-white/[0.04] text-xs text-white/60 hover:bg-white/[0.08] hover:text-white"
            onClick={() =>
              lastDateData?.date && setDate(normalizeBusinessDate(lastDateData.date))
            }
          >
            Último con datos
          </Button>

          {/* Actualizar */}
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

      {/* ── Estados async ── */}
      <AsyncState loading={loading} error={error} onRetry={handleRefetch} />

      {/* ── Sin datos ── */}
      {!loading && !error && !hasData && selectedDate && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-white/40">
            <AlertTriangle size={16} className="shrink-0 text-yellow-400/60" />
            No hay datos para el período: {selectedDateLabel}.
          </CardContent>
        </Card>
      )}

      {/* ── Contenido principal ── */}
      {!loading && !error && hasData && (
        <div className="space-y-5">

          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.label} {...kpi} />
            ))}
          </div>

          {/* Vehículos + Calidad */}
          <div className="grid gap-4 xl:grid-cols-2">

            {/* Vehículos de mayor riesgo */}
            <Card className="border-white/5 bg-white/[0.03]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-white/80">
                    Vehículos de mayor riesgo
                  </CardTitle>
                  <span className="text-xs text-white/30">
                    {topRiskVehicles.length} de {riskVehicles.length}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {topRiskVehicles.map((item, i) => (
                  <RiskRow
                    key={item.plate}
                    index={i}
                    plate={item.plate}
                    alerts={item.alerts}
                    maxRisk={item.maxRisk}
                    globalMax={globalMaxRisk}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Calidad de datos */}
            <Card className="border-white/5 bg-white/[0.03]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-white/80">
                  Calidad de datos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {consistency ? (
                  <div className="space-y-4">
                    {/* Estado principal */}
                    <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3">
                      {consistency.isConsistent ? (
                        <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                      ) : (
                        <XCircle size={18} className="shrink-0 text-red-400" />
                      )}
                      <div>
                        <p className={cn(
                          "text-sm font-semibold",
                          consistency.isConsistent ? "text-emerald-400" : "text-red-400"
                        )}>
                          {consistency.isConsistent ? "Consistente" : "Inconsistente"}
                        </p>
                        <p className="text-xs text-white/40">
                          Estado de integridad de datos
                        </p>
                      </div>
                    </div>

                    {/* Totales */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                        <p className="text-xs text-white/40">Esperado</p>
                        <p className="mt-0.5 text-xl font-semibold tabular-nums text-white">
                          {consistency.expectedTotal}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                        <p className="text-xs text-white/40">Real</p>
                        <p className="mt-0.5 text-xl font-semibold tabular-nums text-white">
                          {consistency.actualTotal}
                        </p>
                      </div>
                    </div>

                    {/* Última verificación */}
                    {consistency.lastChecked && (
                      <p className="flex items-center gap-1.5 text-xs text-white/30">
                        <Clock size={11} />
                        Verificado: {consistency.lastChecked}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-white/30">Sin datos de consistencia para esta fecha.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Navegación rápida */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { href: "/historico", label: "Histórico" },
              { href: "/vehiculos", label: "Vehículos" },
            ].map(({ href, label }) => (
              <Link key={href} href={href}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 bg-white/[0.03] text-white/50 transition-colors hover:bg-white/[0.07] hover:text-white"
                >
                  {label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
