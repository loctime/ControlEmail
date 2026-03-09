import { NextResponse } from "next/server"
import { getAuthUserWithPlates, authUnauthorizedResponse } from "@/lib/auth-user"
import { getDailyMetrics, getDailyConsistency } from "@/lib/firestore-read"
import { normalizeBusinessDate } from "@/lib/domain/date"
import type { DashboardAggregatedPayload } from "@/services/api/dashboard/types"

function makeAlertId(dateKey: string, plate: string): string {
  return `${dateKey}_${plate}`
}

export async function GET(request: Request) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get("date")
    if (!dateParam) {
      return NextResponse.json({ error: "date_required" }, { status: 400 })
    }
    const dateKey = normalizeBusinessDate(dateParam)

    const [metrics, consistency] = await Promise.all([
      getDailyMetrics(dateKey),
      getDailyConsistency(dateKey),
    ])

    const vehicles = metrics.vehicles.filter((v) => auth.allowedPlates.has(v.plate))
    const totalAlerts = vehicles.length
    const alertsPending = vehicles.filter((v) => !v.alertSent).length
    const alertsSent = vehicles.filter((v) => v.alertSent).length
    const riskScores = vehicles.map((v) => v.riskScore ?? 0)
    const maxRisk = riskScores.length > 0 ? Math.max(...riskScores) : 0
    const avgRisk =
      riskScores.length > 0
        ? Math.round((riskScores.reduce((a, b) => a + b, 0) / riskScores.length) * 100) / 100
        : 0

    const riskVehicles = vehicles
      .map((v) => ({
        plate: v.plate,
        alerts: v.summary.totalEvents,
        maxRisk: v.riskScore ?? 0,
      }))
      .sort((a, b) => b.maxRisk - a.maxRisk || a.plate.localeCompare(b.plate))

    const pendingAlerts = vehicles
      .filter((v) => !v.alertSent)
      .map((v) => ({
        alertId: makeAlertId(dateKey, v.plate),
        plate: v.plate,
        dateKey,
        riskScore: v.riskScore ?? 0,
        alertSent: false,
        lastEventAt: v.lastEventAt,
      }))

    const payload: DashboardAggregatedPayload = {
      stats: {
        totalAlerts,
        alertsPending,
        alertsSent,
        maxRisk,
        avgRisk,
      },
      vehicles: riskVehicles,
      pendingAlerts,
      consistency,
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error("[api/dashboard/day] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
