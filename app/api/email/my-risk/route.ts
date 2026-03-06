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
    const vehicles = metrics.vehicles
      .filter((item) => auth.allowedPlates.has(item.plate))
      .map((item) => ({
        plate: item.plate,
        alerts: item.summary.totalEvents,
        maxRisk: item.riskScore ?? 0,
      }))
      .sort((a, b) => b.maxRisk - a.maxRisk || a.plate.localeCompare(b.plate))

    return NextResponse.json({ ok: true, vehicles })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
