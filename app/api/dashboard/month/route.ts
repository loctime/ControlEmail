import { NextResponse } from "next/server"
import { getAuthUserWithPlates, authUnauthorizedResponse } from "@/lib/auth-user"
import { getDailyMetrics } from "@/lib/firestore-read"
import { getDateKeysInMonth } from "@/lib/domain/date"
import type {
  AuthUserWithPlates,
} from "@/lib/auth-user"
import type { DailyAlertsResponse } from "@/lib/firestore-read"
import type { DashboardAggregatedPayload } from "@/services/api/dashboard/types"
import type { MyRiskItemDTO, MyAlertItemDTO } from "@/services/api/dashboard/types"

function makeAlertId(dateKey: string, plate: string): string {
  return `${dateKey}_${plate}`
}

function aggregateDailyMetrics(
  dailyResults: { dateKey: string; metrics: DailyAlertsResponse }[],
  auth: AuthUserWithPlates,
): DashboardAggregatedPayload {
  let totalAlerts = 0
  let alertsPending = 0
  let alertsSent = 0
  let maxRisk = 0
  let riskSum = 0
  let riskCount = 0
  const vehicleMap = new Map<string, { alerts: number; maxRisk: number }>()
  const pendingAlerts: MyAlertItemDTO[] = []

  for (const { dateKey, metrics } of dailyResults) {
    const vehicles = metrics.vehicles.filter((v) => auth.allowedPlates.has(v.plate))
    totalAlerts += vehicles.length
    for (const v of vehicles) {
      if (!v.alertSent) alertsPending++
      else alertsSent++
      const risk = v.riskScore ?? 0
      if (risk > maxRisk) maxRisk = risk
      riskSum += risk
      riskCount++
      const existing = vehicleMap.get(v.plate)
      const alerts = v.summary.totalEvents
      const r = v.riskScore ?? 0
      if (!existing) {
        vehicleMap.set(v.plate, { alerts, maxRisk: r })
      } else {
        vehicleMap.set(v.plate, {
          alerts: existing.alerts + alerts,
          maxRisk: Math.max(existing.maxRisk, r),
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
  }

  const riskVehicles: MyRiskItemDTO[] = Array.from(vehicleMap.entries())
    .map(([plate, { alerts, maxRisk: r }]) => ({ plate, alerts, maxRisk: r }))
    .sort((a, b) => b.maxRisk - a.maxRisk || a.plate.localeCompare(b.plate))

  const avgRisk =
    riskCount > 0
      ? Math.round((riskSum / riskCount) * 100) / 100
      : 0

  return {
    stats: {
      totalAlerts,
      alertsPending,
      alertsSent,
      maxRisk,
      avgRisk,
    },
    vehicles: riskVehicles,
    pendingAlerts: pendingAlerts.sort(
      (a, b) => b.riskScore - a.riskScore || a.dateKey.localeCompare(b.dateKey) || a.plate.localeCompare(b.plate),
    ),
  }
}

export async function GET(request: Request) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month_required_YYYY-MM" }, { status: 400 })
    }

    const dateKeys = getDateKeysInMonth(month)
    const dailyResults = await Promise.all(
      dateKeys.map(async (dateKey) => ({
        dateKey,
        metrics: await getDailyMetrics(dateKey),
      })),
    )

    const payload = aggregateDailyMetrics(dailyResults, auth)
    return NextResponse.json(payload)
  } catch (error) {
    console.error("[api/dashboard/month] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
