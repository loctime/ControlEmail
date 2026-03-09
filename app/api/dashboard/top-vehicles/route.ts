import { NextResponse } from "next/server"
import { authUnauthorizedResponse, getAuthUserWithPlates } from "@/lib/auth-user"
import { aggregateFleetData, parseDashboardRange } from "@/lib/dashboard-aggregations"

export async function GET(request: Request) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const range = parseDashboardRange(searchParams)
    const aggregated = await aggregateFleetData(range.dateKeys, auth.allowedPlates)

    return NextResponse.json({
      range,
      items: aggregated.topVehicles,
    })
  } catch (error) {
    console.error("[api/dashboard/top-vehicles] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
