import { NextResponse } from "next/server"
import { getAuthUserWithPlates, authUnauthorizedResponse } from "@/lib/auth-user"
import { getDailyMetrics } from "@/lib/firestore-read"
import { getDateKeysInYear } from "@/lib/domain/date"
import type { DailyAlertsResponse } from "@/lib/firestore-read"
import { aggregateEnriched } from "@/app/api/dashboard/aggregate-enriched"

const BATCH_SIZE = 31

export async function GET(request: Request) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
    if (!year || !/^\d{4}$/.test(year)) {
      return NextResponse.json({ error: "year_required_YYYY" }, { status: 400 })
    }

    const dateKeys = getDateKeysInYear(year)
    const dailyResults: { dateKey: string; metrics: DailyAlertsResponse }[] = []
    for (let i = 0; i < dateKeys.length; i += BATCH_SIZE) {
      const batch = dateKeys.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(async (dateKey) => ({
          dateKey,
          metrics: await getDailyMetrics(dateKey),
        })),
      )
      dailyResults.push(...batchResults)
    }

    const payload = aggregateEnriched(dailyResults, auth)
    return NextResponse.json(payload)
  } catch (error) {
    console.error("[api/dashboard/year] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
