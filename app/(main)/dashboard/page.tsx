"use client"

import { useMemo, useState } from "react"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { DateRangeSelector } from "@/components/dashboard/DateRangeSelector"
import { FleetHealthIndicator } from "@/components/dashboard/FleetHealthIndicator"
import { DashboardKpis } from "@/components/dashboard/DashboardKpis"
import { CriticalVehiclesPanel } from "@/components/dashboard/CriticalVehiclesPanel"
import { FleetRiskHeatmap } from "@/components/dashboard/FleetRiskHeatmap"
import { TopRiskVehicles } from "@/components/dashboard/TopRiskVehicles"
import { EventsTrendChart } from "@/components/dashboard/EventsTrendChart"
import { TopEventsPanel } from "@/components/dashboard/TopEventsPanel"
import { FleetInsightsPanel } from "@/components/dashboard/FleetInsightsPanel"
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

  const params = useMemo(() => ({ range, startDate, endDate }), [range, startDate, endDate])

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
    <main className="min-h-screen space-y-6 bg-background p-4 md:p-6">
      <DashboardHeader isFetching={isFetching && !isLoading} />

      <DateRangeSelector
        range={range}
        startDate={startDate}
        endDate={endDate}
        onChangePreset={handlePresetChange}
        onChangeStartDate={setStartDate}
        onChangeEndDate={setEndDate}
      />

      {error && (
        <Alert variant="destructive" aria-live="polite">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al cargar dashboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FleetHealthIndicator maxRisk={summary.maxRisk} loading={isLoading} />

      <DashboardKpis summary={summary} loading={isLoading} />

      <TopEventsPanel distribution={distribution} recentEvents={recentEvents} loading={isLoading} />

      <CriticalVehiclesPanel
        alerts={criticalAlerts}
        vehicles={topVehicles}
        recentEvents={recentEvents}
        loading={isLoading}
      />

      <FleetRiskHeatmap items={riskMap} loading={isLoading} />

      <EventsTrendChart trend={trend} avgRisk={summary.avgRisk} loading={isLoading} />

      <div className="grid gap-6 xl:grid-cols-2">
        <TopRiskVehicles vehicles={topVehicles} loading={isLoading} />
        <FleetInsightsPanel
          summary={summary}
          distribution={distribution}
          topVehicles={topVehicles}
          trend={trend}
          loading={isLoading}
        />
      </div>
    </main>
  )
}
