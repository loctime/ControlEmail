"use client"

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import Link from "next/link"
import { es } from "date-fns/locale"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarIcon,
  RefreshCw,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import type { Matcher } from "react-day-picker"
import { Card, CardContent } from "@/components/ui/card"
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
import { DashboardTabs, type SuperDashboardTabId } from "@/components/dashboard/DashboardTabs"
import { OperationalRiskTab } from "@/components/dashboard/OperationalRiskTab"
import { AdminAlertsTab } from "@/components/dashboard/AdminAlertsTab"
import type { TopSpeedEventDTO } from "@/services/api/dashboard/types"

type DashboardDatePreset = "day" | "week" | "month" | "year"

const STORAGE_KEY = "dashboard:selectedDate"
const STORAGE_PRESET_KEY = "dashboard:preset"
const STORAGE_TAB_KEY = "dashboard:tab"
const STALE_TIME = 5 * 60_000

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
    // ignore
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
    // ignore
  }
}

function readStoredTab(): SuperDashboardTabId | undefined {
  if (typeof window === "undefined") return undefined
  try {
    const v = localStorage.getItem(STORAGE_TAB_KEY)
    if (v === "operational" || v === "admin") return v
    return undefined
  } catch {
    return undefined
  }
}

function writeStoredTab(tab: SuperDashboardTabId): void {
  try {
    localStorage.setItem(STORAGE_TAB_KEY, tab)
  } catch {
    // ignore
  }
}

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
      if (state.status === "ready") return state
      return { status: "ready", date: action.date }
    case "INIT_FALLBACK":
      if (state.status === "ready") return state
      return { status: "ready", date: getYesterdayKey() }
    default:
      return state
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

export default function SuperDashboardPage() {
  const [dateState, dispatch] = useReducer(dateReducer, { status: "pending" })
  const [preset, setPreset] = useState<DashboardDatePreset>(() => readStoredPreset() ?? "day")
  const [activeTab, setActiveTab] = useState<SuperDashboardTabId>(() => readStoredTab() ?? "operational")
  const hasRestoredRef = useRef(false)

  const selectedDate = dateState.status === "ready" ? dateState.date : undefined

  useEffect(() => {
    if (hasRestoredRef.current) return
    hasRestoredRef.current = true
    const stored = readStoredDate()
    if (stored) dispatch({ type: "RESTORE", date: stored })
  }, [])

  useEffect(() => {
    writeStoredPreset(preset)
  }, [preset])

  useEffect(() => {
    writeStoredTab(activeTab)
  }, [activeTab])

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
    if (lastDateData?.date) {
      dispatch({ type: "INIT_FROM_API", date: normalizeBusinessDate(lastDateData.date) })
    }
  }, [lastDateData?.date])

  useEffect(() => {
    if (!hasRestoredRef.current) return
    if (lastDateError) dispatch({ type: "INIT_FALLBACK" })
  }, [lastDateError])

  useEffect(() => {
    if (selectedDate) writeStoredDate(selectedDate)
  }, [selectedDate])

  const setDate = useCallback((date: string) => {
    dispatch({ type: "SET", date })
  }, [])

  const {
    stats,
    riskVehicles,
    consistency,
    vehicleDetails,
    adminTotals,
    dailyBreakdown,
    loading,
    error,
    refetch,
  } = useDashboardData(selectedDate, preset)

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

  const canGoPrev =
    !!selectedDate &&
    !!minAvailableDate &&
    normalizeBusinessDate(selectedDate) > minAvailableDate
  const canGoNext =
    !!selectedDate && normalizeBusinessDate(selectedDate) < maxAvailableDate

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

  const vehiclesMonitored = riskVehicles.length
  const vehiclesWithEvents = useMemo(
    () => riskVehicles.filter((v) => (v.alerts ?? 0) > 0).length,
    [riskVehicles],
  )
  const eventsInPeriod = useMemo(
    () => riskVehicles.reduce((s, v) => s + (v.alerts ?? 0), 0),
    [riskVehicles],
  )
  const topRiskVehicles = useMemo(() => riskVehicles.slice(0, 10), [riskVehicles])
  const highestRiskVehicle = topRiskVehicles[0] ?? null
  const hasRiskData = useMemo(
    () =>
      (stats?.maxRisk != null && stats.maxRisk > 0) ||
      (stats?.avgRisk != null && stats.avgRisk > 0) ||
      (highestRiskVehicle?.maxRisk != null && highestRiskVehicle.maxRisk > 0),
    [stats?.maxRisk, stats?.avgRisk, highestRiskVehicle?.maxRisk],
  )

  const highestSpeedEvent = useMemo((): TopSpeedEventDTO | null => {
    if (!vehicleDetails.length) return null
    const withSpeed = vehicleDetails
      .map((v) => v.topSpeedEvent)
      .filter((e): e is NonNullable<typeof e> => e != null)
    if (withSpeed.length === 0) return null
    return withSpeed.reduce((best, e) => (e.speed > best.speed ? e : best))
  }, [vehicleDetails])

  const recurrentDrivers = useMemo(() => {
    const count = new Map<string, number>()
    for (const v of vehicleDetails) {
      for (const name of v.speedingDrivers) {
        if (!name.trim()) continue
        count.set(name, (count.get(name) ?? 0) + 1)
      }
    }
    return Array.from(count.entries())
      .filter(([, n]) => n > 1)
      .map(([name]) => name)
      .sort()
  }, [vehicleDetails])

  const hasData = vehiclesMonitored > 0 || vehiclesWithEvents > 0 || eventsInPeriod > 0

  return (
    <div className="min-h-screen space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Dashboard</h1>
          <p className="mt-0.5 text-sm text-white/40">
            Vista ejecutiva · HSE, Operaciones y Gerencia
          </p>
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
                onSelect={(d) => {
                  if (d) setDate(normalizeBusinessDate(d))
                }}
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
            onClick={() =>
              lastDateData?.date && setDate(normalizeBusinessDate(lastDateData.date))
            }
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
          <CardContent className="flex items-center gap-3 py-6 text-sm text-white/40">
            <AlertTriangle size={16} className="shrink-0 text-yellow-400/60" />
            No hay datos para el período: {selectedDateLabel}.
          </CardContent>
        </Card>
      )}

      {!loading && !error && hasData && (
        <>
          <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab}>
            {activeTab === "operational" && (
              <OperationalRiskTab
                vehiclesMonitored={vehiclesMonitored}
                vehiclesWithEvents={vehiclesWithEvents}
                eventsInPeriod={eventsInPeriod}
                highestRiskVehicle={highestRiskVehicle}
                fleetAvgRisk={stats?.avgRisk ?? null}
                hasRiskData={hasRiskData}
                riskVehicles={riskVehicles}
                vehicleDetails={vehicleDetails}
                highestSpeedEvent={highestSpeedEvent}
                recurrentDrivers={recurrentDrivers}
                consistency={consistency}
                dailyBreakdown={dailyBreakdown}
                preset={preset}
              />
            )}
            {activeTab === "admin" && (
              <AdminAlertsTab adminTotals={adminTotals} vehicleDetails={vehicleDetails} />
            )}
          </DashboardTabs>

          <div className="flex flex-wrap gap-2 pt-4">
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
        </>
      )}
    </div>
  )
}
