"use client"

import { useMemo, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { CriticalAlerts } from "@/components/dashboard/critical-alerts"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { EventDistributionChart } from "@/components/dashboard/event-distribution"
import { TopVehiclesTable } from "@/components/dashboard/top-vehicles-table"
import { RecentEvents } from "@/components/dashboard/recent-events"
import { FleetRiskMap } from "@/components/dashboard/fleet-risk-map"
import { TrendChart } from "@/components/dashboard/trend-chart"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import type { DashboardRangePreset } from "@/services/dashboard-api"

function getTodayKey(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return formatter.format(new Date())
}

function offsetDate(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split("-").map(Number)
  const date = new Date(y, m - 1, d + deltaDays)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function presetRange(preset: DashboardRangePreset): { startDate: string; endDate: string } {
  const today = getTodayKey()
  if (preset === "yesterday") {
    const day = offsetDate(today, -1)
    return { startDate: day, endDate: day }
  }
  if (preset === "7d") return { startDate: offsetDate(today, -6), endDate: today }
  if (preset === "30d") return { startDate: offsetDate(today, -29), endDate: today }
  return { startDate: today, endDate: today }
}

export default function DashboardPage() {
  const initialRange = presetRange("7d")
  const [range, setRange] = useState<DashboardRangePreset>("7d")
  const [startDate, setStartDate] = useState(initialRange.startDate)
  const [endDate, setEndDate] = useState(initialRange.endDate)

  const params = useMemo(
    () => ({ range, startDate, endDate }),
    [range, startDate, endDate],
  )

  const {
    summary,
    distribution,
    criticalAlerts,
    riskMap,
    topVehicles,
    recentEvents,
    trend,
    isLoading,
    isFetching,
    error,
  } = useDashboardData(params)

  const handlePresetChange = (preset: DashboardRangePreset) => {
    setRange(preset)
    if (preset !== "custom") {
      const next = presetRange(preset)
      setStartDate(next.startDate)
      setEndDate(next.endDate)
    }
  }

  return (
    <main className="space-y-6 p-6">
      <DashboardHeader
        range={range}
        startDate={startDate}
        endDate={endDate}
        onChangePreset={handlePresetChange}
        onChangeStartDate={setStartDate}
        onChangeEndDate={setEndDate}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al cargar dashboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isFetching && !isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Actualizando datos...
        </div>
      )}

      <CriticalAlerts alerts={criticalAlerts} loading={isLoading} />

      <KpiCards summary={summary} loading={isLoading} />

      <div className="grid gap-6 xl:grid-cols-2">
        <EventDistributionChart distribution={distribution} loading={isLoading} />
        <TopVehiclesTable vehicles={topVehicles} loading={isLoading} />
      </div>

      <RecentEvents events={recentEvents} loading={isLoading} />

      <FleetRiskMap items={riskMap} loading={isLoading} />

      <TrendChart trend={trend} loading={isLoading} />
    </main>
  )
}
