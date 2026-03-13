import { NextResponse } from "next/server"
import { getAuthUserWithPlates, authUnauthorizedResponse } from "@/lib/auth-user"
import { getDailyMetrics } from "@/lib/firestore-read"
import { getDateKeysLast7Days, normalizeBusinessDate } from "@/lib/domain/date"
import { aggregateEnriched } from "@/app/api/dashboard/aggregate-enriched"

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
    const dateKeys = getDateKeysLast7Days(dateKey)
    if (dateKeys.length === 0) {
      return NextResponse.json({ error: "invalid_date" }, { status: 400 })
    }

    const dailyResults = await Promise.all(
      dateKeys.map(async (dk) => ({
        dateKey: dk,
        metrics: await getDailyMetrics(dk),
      })),
    )

    const payload = aggregateEnriched(dailyResults, auth, { includeDailyBreakdown: true })
    return NextResponse.json(payload)
  } catch (error) {
    console.error("[api/dashboard/week] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
