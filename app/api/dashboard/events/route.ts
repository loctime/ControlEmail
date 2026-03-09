import { NextResponse } from "next/server"
import { authUnauthorizedResponse, getAuthUserWithPlates } from "@/lib/auth-user"
import { aggregateFleetData, getRecentEvents, parseDashboardRange } from "@/lib/dashboard-aggregations"

export async function GET(request: Request) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const range = parseDashboardRange(searchParams)

    const [aggregated, recentEvents] = await Promise.all([
      aggregateFleetData(range.dateKeys, auth.allowedPlates),
      getRecentEvents(range, auth.allowedPlates, 20),
    ])

    return NextResponse.json({
      range,
      distribution: aggregated.distribution,
      criticalAlerts: aggregated.criticalAlerts,
      riskMap: aggregated.riskMap,
      recentEvents,
    })
  } catch (error) {
    console.error("[api/dashboard/events] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
