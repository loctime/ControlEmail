"use client"

import { useMemo } from "react"
import {
  BarChart3,
  ShieldAlert,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { KpiCard } from "@/components/dashboard/KpiCard"
import { RiskRankingCard } from "@/components/dashboard/RiskRankingCard"
import { DataConsistencyCard } from "@/components/dashboard/DataConsistencyCard"
import { RiskKPIs } from "@/components/dashboard/RiskKPIs"
import { RiskTrendChart } from "@/components/dashboard/RiskTrendChart"
import { HighestSpeedCard } from "@/components/dashboard/HighestSpeedCard"
import { RecurrentDriversCard } from "@/components/dashboard/RecurrentDriversCard"
import type {
  DailyBreakdownPointDTO,
  DailyConsistencyDTO,
  DashboardVehicleDetailDTO,
  MyRiskItemDTO,
  TopSpeedEventDTO,
} from "@/services/api/dashboard/types"

const MAX_RISK_VEHICLES = 10

export interface OperationalRiskTabProps {
  /** Fleet KPIs */
  vehiclesMonitored: number
  eventsInPeriod: number
  highestRiskVehicle: MyRiskItemDTO | null
  fleetAvgRisk: number | null
  hasRiskData: boolean
  /** Risk data */
  riskVehicles: MyRiskItemDTO[]
  vehicleDetails: DashboardVehicleDetailDTO[]
  /** Enriched: top speed event (vehicle with max speed) */
  highestSpeedEvent: TopSpeedEventDTO | null
  /** Enriched: driver names appearing in more than one vehicle/incident */
  recurrentDrivers: string[]
  /** Consistency (day only when available) */
  consistency: DailyConsistencyDTO | null
  /** Week response: last 7 days for trend chart */
  dailyBreakdown: DailyBreakdownPointDTO[] | null
  /** Preset to show trend only for week */
  preset: "day" | "week" | "month" | "year"
}

export function OperationalRiskTab({
  vehiclesMonitored,
  eventsInPeriod,
  highestRiskVehicle,
  fleetAvgRisk,
  hasRiskData,
  riskVehicles,
  vehicleDetails,
  highestSpeedEvent,
  recurrentDrivers,
  consistency,
  dailyBreakdown,
  preset,
}: OperationalRiskTabProps) {
  const topRiskVehicles = useMemo(
    () => riskVehicles.slice(0, MAX_RISK_VEHICLES),
    [riskVehicles],
  )
  const globalMaxRisk = topRiskVehicles[0]?.maxRisk ?? 1

  const totalExcess = useMemo(
    () => vehicleDetails.reduce((s, v) => s + v.excesos, 0),
    [vehicleDetails],
  )
  const vehiclesWithDangerousDriving = useMemo(
    () => vehicleDetails.filter((v) => v.excesos > 0).length,
    [vehicleDetails],
  )
  const highestSpeed = useMemo(() => {
    const speeds = vehicleDetails
      .map((v) => v.maxSpeed)
      .filter((s): s is number => s != null)
    return speeds.length > 0 ? Math.max(...speeds) : null
  }, [vehicleDetails])

  const fleetKpis = useMemo(() => {
    const items: Array<{ label: string; value: number | string; icon: React.ReactNode; accent: "default" | "warning" | "danger" | "success"; suffix?: string }> = [
      {
        label: "Vehículos monitoreados",
        value: vehiclesMonitored,
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
    if (hasRiskData && highestRiskVehicle) {
      items.push({
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
    if (hasRiskData && fleetAvgRisk != null) {
      items.push({
        label: "Riesgo promedio flota",
        value: fleetAvgRisk,
        icon: <TrendingUp size={20} />,
        accent: "default",
      })
    }
    return items
  }, [
    vehiclesMonitored,
    eventsInPeriod,
    hasRiskData,
    highestRiskVehicle,
    fleetAvgRisk,
  ])

  return (
    <div className="space-y-5">
      {/* Fleet KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {fleetKpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Risk KPIs (excess, dangerous driving, max speed, recurrent) */}
      <RiskKPIs
        totalExcess={totalExcess}
        vehiclesWithDangerousDriving={vehiclesWithDangerousDriving}
        highestSpeed={highestSpeed}
        recurrentDriversCount={recurrentDrivers.length}
      />

      {/* Risk ranking + Data consistency */}
      <div className="grid gap-4 xl:grid-cols-2">
        <RiskRankingCard
          vehicles={topRiskVehicles}
          totalCount={riskVehicles.length}
          globalMaxRisk={globalMaxRisk}
        />
        <DataConsistencyCard consistency={consistency} />
      </div>

      {/* Trend (week only) + Highest speed */}
      <div className="grid gap-4 xl:grid-cols-2">
        <RiskTrendChart
          dailyBreakdown={dailyBreakdown}
          visible={preset === "week"}
        />
        <HighestSpeedCard event={highestSpeedEvent} />
      </div>

      {/* Recurrent drivers */}
      <RecurrentDriversCard drivers={recurrentDrivers} />
    </div>
  )
}
