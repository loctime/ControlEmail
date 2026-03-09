"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Clock,
  Send,
  ShieldAlert,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AsyncState } from "@/components/common/async-state"
import { useDashboardData } from "@/hooks/domain/useDashboardData"
import { useDashboardDate } from "@/hooks/domain/useDashboardDate"
import {
  DashboardHeader,
  DateControls,
  KpiGrid,
  RiskVehiclesCard,
  DataConsistencyCard,
  PendingAlertsCard,
} from "@/components/dashboard"
import type { KpiCardProps } from "@/components/dashboard"
import { cn } from "@/lib/utils"

const MAX_RISK_VEHICLES = 10
const MAX_PENDING_ALERTS = 8

export type DashboardViewMode = "day" | "month" | "year"

export default function DashboardPage() {
  const [mode, setMode] = useState<DashboardViewMode>("day")

  const {
    selectedDate,
    selectedDateLabel,
    selectedDateObj,
    disabledDays,
    canGoPrev,
    canGoNext,
    loadingLastDate,
    lastDateData,
    setDate,
    handlePrev,
    handleNext,
  } = useDashboardDate()

  const { stats, riskVehicles, pendingAlerts, consistency, loading, error, refetch } =
    useDashboardData(selectedDate, mode)

  const handleRefetch = useCallback(() => void refetch(), [refetch])

  const hasData =
    (stats?.totalAlerts ?? 0) > 0 ||
    riskVehicles.length > 0 ||
    pendingAlerts.length > 0

  const topRiskVehicles = useMemo(
    () => riskVehicles.slice(0, MAX_RISK_VEHICLES),
    [riskVehicles]
  )
  const topPendingAlerts = useMemo(
    () => pendingAlerts.slice(0, MAX_PENDING_ALERTS),
    [pendingAlerts]
  )
  const globalMaxRisk = topRiskVehicles[0]?.maxRisk ?? 1

  /** Etiqueta del período según el modo: día "04 mar 2026", mes "marzo 2026", año "2026" */
  const periodLabel = useMemo(() => {
    if (!selectedDate) return "este período"
    if (mode === "day") return selectedDateLabel
    const d = new Date(`${selectedDate}T00:00:00`)
    if (Number.isNaN(d.getTime())) return selectedDate
    if (mode === "month") return format(d, "LLLL yyyy", { locale: es })
    return format(d, "yyyy", { locale: es })
  }, [selectedDate, selectedDateLabel, mode])

  const kpis: KpiCardProps[] = useMemo(
    () => [
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
        accent:
          (stats?.maxRisk ?? 0) >= 15
            ? "danger"
            : (stats?.maxRisk ?? 0) >= 8
              ? "warning"
              : "default",
      },
      {
        label: "Riesgo promedio",
        value: stats?.avgRisk ?? 0,
        icon: <TrendingUp size={20} />,
        accent: "default",
      },
    ],
    [stats]
  )

  return (
    <div className="min-h-screen space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <DashboardHeader />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
            {(
              [
                { value: "day" as const, label: "Día", icon: CalendarDays },
                { value: "month" as const, label: "Mes", icon: CalendarDays },
                { value: "year" as const, label: "Año", icon: CalendarDays },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 px-3 text-xs text-white/60 hover:text-white",
                  mode === value && "bg-white/10 text-white",
                )}
                onClick={() => setMode(value)}
              >
                <Icon size={14} />
                {label}
              </Button>
            ))}
          </div>
          <DateControls
          selectedDate={selectedDate}
          selectedDateLabel={selectedDateLabel}
          selectedDateObj={selectedDateObj}
          disabledDays={disabledDays}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          loadingLastDate={loadingLastDate}
          loading={loading}
          lastDateData={lastDateData}
          onPrev={handlePrev}
          onNext={handleNext}
          onRefetch={handleRefetch}
          onSetDate={setDate}
        />
        </div>
      </div>

      <AsyncState loading={loading} error={error} onRetry={handleRefetch} />

      {!loading && !error && !hasData && selectedDate && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-white/40">
            <AlertTriangle size={16} className="shrink-0 text-yellow-400/60" />
            No hay alertas registradas para {periodLabel}.
          </CardContent>
        </Card>
      )}

      {!loading && !error && hasData && (
        <div className="space-y-5">
          <KpiGrid kpis={kpis} />

          <div className="grid gap-4 xl:grid-cols-2">
            <RiskVehiclesCard
              vehicles={topRiskVehicles}
              totalCount={riskVehicles.length}
              globalMaxRisk={globalMaxRisk}
            />
            <DataConsistencyCard consistency={consistency} />
          </div>

          <PendingAlertsCard alerts={topPendingAlerts} totalCount={pendingAlerts.length} />

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
