import { NextResponse } from "next/server"
import { getAuthUserWithPlates, authUnauthorizedResponse } from "@/lib/auth-user"
import { getDailyMetrics } from "@/lib/firestore-read"
import { getYesterdayKey, normalizeBusinessDate } from "@/lib/domain/date"

function makeAlertId(dateKey: string, plate: string): string {
  return `${dateKey}_${plate}`
}

export async function GET(request: Request) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const limitRaw = Number(searchParams.get("limit") ?? 50)
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50
    const startAfter = (searchParams.get("startAfter") ?? "").trim()
    const dateParam = searchParams.get("date")
    const dateKey = dateParam ? normalizeBusinessDate(dateParam) : getYesterdayKey()
    const metrics = await getDailyMetrics(dateKey)

    const alerts = metrics.vehicles
      .filter((alert) => auth.allowedPlates.has(alert.plate))
      .map((alert) => ({
        alertId: makeAlertId(dateKey, alert.plate),
        plate: alert.plate,
        dateKey,
        riskScore: alert.riskScore ?? 0,
        alertSent: alert.alertSent,
        lastEventAt: alert.lastEventAt,
      }))
      .sort((a, b) => {
        if (b.dateKey !== a.dateKey) return b.dateKey.localeCompare(a.dateKey)
        if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore
        return a.plate.localeCompare(b.plate)
      })

    const startIndex = startAfter
      ? Math.max(0, alerts.findIndex((alert) => alert.alertId === startAfter) + 1)
      : 0
    const page = alerts.slice(startIndex, startIndex + limit)
    const nextStartAfter =
      startIndex + limit < alerts.length && page.length > 0
        ? page[page.length - 1]!.alertId
        : null

    return NextResponse.json({
      ok: true,
      alerts: page,
      startAfter: nextStartAfter,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
