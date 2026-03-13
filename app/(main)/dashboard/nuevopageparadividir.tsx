"use client"

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react"
import Link from "next/link"
import { format } from "date-fns"
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
  Send,
  ShieldAlert,
  TrendingUp,
  XCircle,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import type { Matcher } from "react-day-picker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AsyncState } from "@/components/common/async-state"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDashboardData } from "@/hooks/domain/useDashboardData"
import { dashboardApi } from "@/services/api"
import { queryKeys } from "@/lib/query/queryKeys"
import { getYesterdayKey, normalizeBusinessDate } from "@/lib/domain/date"
import { cn } from "@/lib/utils"

// ─── Constantes ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "dashboard:selectedDate"
const MAX_RISK_VEHICLES = 10
const MAX_PENDING_ALERTS = 8
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

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  return format(d, "dd MMM yyyy", { locale: es })
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
  const hasRestoredRef = useRef(false)

  const selectedDate = dateState.status === "ready" ? dateState.date : undefined

  // 1. Restaurar desde storage (solo una vez, al montar)
  useEffect(() => {
    if (hasRestoredRef.current) return
    hasRestoredRef.current = true
    const stored = readStoredDate()
    if (stored) dispatch({ type: "RESTORE", date: stored })
  }, [])

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
  const { stats, riskVehicles, pendingAlerts, consistency, loading, error, refetch } =
    useDashboardData(selectedDate, "day")

  // ─── Memos de fechas ────────────────────────────────────────────────────────
  const maxAvailableDate = useMemo(
    () => (lastDateData?.maxDate ?? lastDateData?.date)
      ? normalizeBusinessDate((lastDateData?.maxDate ?? lastDateData?.date)!)
      : undefined,
    [lastDateData?.maxDate, lastDateData?.date]
  )

  const minAvailableDate = useMemo(
    () => lastDateData?.minDate ? normalizeBusinessDate(lastDateData.minDate) : undefined,
    [lastDateData?.minDate]
  )

  const selectedDateLabel = useMemo(
    () => selectedDate ? formatDateLabel(selectedDate) : "Seleccionar fecha",
    [selectedDate]
  )

  const selectedDateObj = useMemo(
    () => selectedDate ? new Date(`${selectedDate}T00:00:00`) : undefined,
    [selectedDate]
  )

  const maxDateObj = useMemo(
    () => maxAvailableDate ? new Date(`${maxAvailableDate}T00:00:00`) : undefined,
    [maxAvailableDate]
  )

  const disabledDays: Matcher | undefined = maxDateObj ? { after: maxDateObj } : undefined

  const canGoPrev = selectedDate && minAvailableDate && normalizeBusinessDate(selectedDate) > minAvailableDate
  const canGoNext = selectedDate && maxAvailableDate && normalizeBusinessDate(selectedDate) < maxAvailableDate

  const handlePrev = useCallback(() => {
    if (!selectedDate) return
    const d = new Date(`${selectedDate}T00:00:00`)
    d.setDate(d.getDate() - 1)
    setDate(normalizeBusinessDate(d))
  }, [selectedDate, setDate])

  const handleNext = useCallback(() => {
    if (!selectedDate) return
    const d = new Date(`${selectedDate}T00:00:00`)
    d.setDate(d.getDate() + 1)
    setDate(normalizeBusinessDate(d))
  }, [selectedDate, setDate])

  const handleRefetch = useCallback(() => void refetch(), [refetch])

  // ─── Datos derivados ────────────────────────────────────────────────────────
  const hasData =
    (stats?.totalAlerts ?? 0) > 0 ||
    riskVehicles.length > 0 ||
    pendingAlerts.length > 0

  const topRiskVehicles = useMemo(() => riskVehicles.slice(0, MAX_RISK_VEHICLES), [riskVehicles])
  const topPendingAlerts = useMemo(() => pendingAlerts.slice(0, MAX_PENDING_ALERTS), [pendingAlerts])
  const globalMaxRisk = topRiskVehicles[0]?.maxRisk ?? 1

  const kpis: KpiCardProps[] = [
    {
      label: "Total alertas",
      value: stats?.totalAlerts ?? 0,
      icon: <BarChart3 size={20} />,
      accent: "default",
    },
    {
      label: "Pendientes",
      value: stats?.alertsPending ?? 0,
      icon: <Clock size={20} />,
      accent: (stats?.alertsPending ?? 0) > 0 ? "warning" : "success",
    },
    {
      label: "Enviadas",
      value: stats?.alertsSent ?? 0,
      icon: <Send size={20} />,
      accent: "success",
    },
    {
      label: "Riesgo máximo",
      value: stats?.maxRisk ?? 0,
      icon: <ShieldAlert size={20} />,
      accent: (stats?.maxRisk ?? 0) >= 15 ? "danger" : (stats?.maxRisk ?? 0) >= 8 ? "warning" : "default",
    },
    {
      label: "Riesgo promedio",
      value: stats?.avgRisk ?? 0,
      icon: <TrendingUp size={20} />,
      accent: "default",
    },
  ]

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
            No hay alertas registradas para {selectedDateLabel}.
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

          {/* Alertas pendientes */}
          {topPendingAlerts.length > 0 && (
            <Card className="border-white/5 bg-white/[0.03]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-white/80">
                    Alertas pendientes
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="border-orange-400/20 bg-orange-400/10 text-orange-400"
                  >
                    {pendingAlerts.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {topPendingAlerts.map((alert) => (
                    <div
                      key={alert.alertId}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04]"
                    >
                      <div>
                        <p className="font-mono text-sm font-medium tracking-wider text-white/90">
                          {alert.plate}
                        </p>
                        <p className="mt-0.5 text-xs text-white/30">{alert.dateKey}</p>
                      </div>
                      <span className={cn(
                        "rounded border px-2 py-0.5 text-xs font-semibold tabular-nums",
                        getRiskColor(alert.riskScore)
                      )}>
                        {alert.riskScore}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navegación rápida */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { href: "/historico", label: "Histórico" },
              { href: "/pendientes", label: "Pendientes" },
              { href: "/vehiculos", label: "Vehículos" },
              { href: "/configuracion", label: "Configuración" },
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
