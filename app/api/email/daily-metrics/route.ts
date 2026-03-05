import { NextResponse } from "next/server"
import { getDailyMetrics } from "@/lib/firestore-read"
import { getAuthUserWithPlates, authUnauthorizedResponse } from "@/lib/auth-user"
import type { DailyMetricsDTO } from "@/services/dto"

export async function GET(request: Request) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    
    if (!date) {
      return NextResponse.json({ error: "date_required" }, { status: 400 })
    }
    
    const metrics: DailyMetricsDTO = await getDailyMetrics(date)
    const filteredVehicles = metrics.vehicles.filter((v) => auth.allowedPlates.has(v.plate))
    return NextResponse.json({ ...metrics, vehicles: filteredVehicles })
  } catch (error) {
    console.error("[api/email/daily-metrics] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    )
  }
}
