import { NextResponse } from "next/server"
import { getAuthUserWithPlates, authUnauthorizedResponse } from "@/lib/auth-user"
import { getDailyMetrics } from "@/lib/firestore-read"
import { getYesterdayKey, normalizeBusinessDate } from "@/lib/domain/date"

export async function GET(request: Request) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get("date")
    const dateKey = dateParam ? normalizeBusinessDate(dateParam) : getYesterdayKey()
    const metrics = await getDailyMetrics(dateKey)

    const vehicles = metrics.vehicles.filter((item) => auth.allowedPlates.has(item.plate))
    const totalAlerts = vehicles.length
    const alertsPending = vehicles.filter((item) => !item.alertSent).length
    const alertsSent = vehicles.filter((item) => item.alertSent).length
    const riskScores = vehicles.map((item) => item.riskScore ?? 0)
    const maxRisk = riskScores.length > 0 ? Math.max(...riskScores) : 0
    const avgRisk = riskScores.length > 0
      ? Math.round((riskScores.reduce((sum, current) => sum + current, 0) / riskScores.length) * 100) / 100
      : 0

    return NextResponse.json({
      ok: true,
      stats: {
        totalAlerts,
        alertsToday: totalAlerts,
        alertsPending,
        alertsSent,
        maxRisk,
        avgRisk,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
