import type { AuthUserWithPlates } from "@/lib/auth-user"
import type { DailyAlertsResponse } from "@/lib/firestore-read"
import type {
  DashboardAggregatedPayload,
  MyAlertItemDTO,
  MyRiskItemDTO,
} from "@/services/api/dashboard/types"
import {
  buildVehicleDetailFromVehicle,
  buildAdminTotalsFromVehicles,
  mergeVehicleDetails,
  sumAdminTotals,
  buildDailyBreakdown,
} from "@/app/api/dashboard/enrichment"
import { buildTopDriversKeysByOperation } from "@/app/api/dashboard/topDriversKeys"

function makeAlertId(dateKey: string, plate: string): string {
  return `${dateKey}_${plate}`
}

export interface AggregateEnrichedOptions {
  includeDailyBreakdown?: boolean
}

export function aggregateEnriched(
  dailyResults: { dateKey: string; metrics: DailyAlertsResponse }[],
  auth: AuthUserWithPlates,
  options: AggregateEnrichedOptions = {},
): DashboardAggregatedPayload {
  const { includeDailyBreakdown = false } = options

  let totalAlerts = 0
  let alertsPending = 0
  let alertsSent = 0
  let maxRisk = 0
  let riskSum = 0
  let riskCount = 0
  const vehicleMap = new Map<
    string,
    { alerts: number; maxRisk: number; details: ReturnType<typeof buildVehicleDetailFromVehicle>[] }
  >()
  const pendingAlerts: MyAlertItemDTO[] = []
  const dailyBreakdownData: { dateKey: string; totalExcessEvents: number; avgRisk: number }[] = []

  for (const { dateKey, metrics } of dailyResults) {
    const vehicles = metrics.vehicles.filter((v) => auth.allowedPlates.has(v.plate))
    let dayExcess = 0
    let dayRiskSum = 0
    let dayRiskCount = 0

    totalAlerts += vehicles.length
    for (const v of vehicles) {
      if (!v.alertSent) alertsPending++
      else alertsSent++
      const risk = v.riskScore ?? 0
      if (risk > maxRisk) maxRisk = risk
      riskSum += risk
      riskCount++
      dayRiskSum += risk
      dayRiskCount++
      dayExcess += v.summary?.excesos ?? 0

      const existing = vehicleMap.get(v.plate)
      const alerts = v.summary.totalEvents
      const r = v.riskScore ?? 0
      const detail = buildVehicleDetailFromVehicle(v)
      if (!existing) {
        vehicleMap.set(v.plate, { alerts, maxRisk: r, details: [detail] })
      } else {
        vehicleMap.set(v.plate, {
          alerts: existing.alerts + alerts,
          maxRisk: Math.max(existing.maxRisk, r),
          details: [...existing.details, detail],
        })
      }
      if (!v.alertSent) {
        pendingAlerts.push({
          alertId: makeAlertId(dateKey, v.plate),
          plate: v.plate,
          dateKey,
          riskScore: r,
          alertSent: false,
          lastEventAt: v.lastEventAt,
        })
      }
    }

    if (includeDailyBreakdown) {
      dailyBreakdownData.push({
        dateKey,
        totalExcessEvents: dayExcess,
        avgRisk: dayRiskCount > 0 ? Math.round((dayRiskSum / dayRiskCount) * 100) / 100 : 0,
      })
    }
  }

  const riskVehicles: MyRiskItemDTO[] = Array.from(vehicleMap.entries())
    .map(([plate, { alerts, maxRisk: r }]) => ({ plate, alerts, maxRisk: r }))
    .sort((a, b) => b.maxRisk - a.maxRisk || a.plate.localeCompare(b.plate))

  const vehicleDetails = Array.from(vehicleMap.values()).map(({ details }) =>
    mergeVehicleDetails(details),
  ).filter((d): d is NonNullable<typeof d> => d != null)

  const adminTotals = sumAdminTotals(vehicleDetails)
  const avgRisk =
    riskCount > 0 ? Math.round((riskSum / riskCount) * 100) / 100 : 0

  const payload: DashboardAggregatedPayload = {
    stats: {
      totalAlerts,
      alertsPending,
      alertsSent,
      maxRisk,
      avgRisk,
    },
    vehicles: riskVehicles,
    pendingAlerts: pendingAlerts.sort(
      (a, b) =>
        b.riskScore - a.riskScore ||
        a.dateKey.localeCompare(b.dateKey) ||
        a.plate.localeCompare(b.plate),
    ),
    vehicleDetails,
    topDriversKeysByOperation: buildTopDriversKeysByOperation(vehicleDetails),
    adminTotals,
  }

  if (includeDailyBreakdown && dailyBreakdownData.length > 0) {
    payload.dailyBreakdown = buildDailyBreakdown(dailyBreakdownData)
  }

  return payload
}
