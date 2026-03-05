import { NextResponse } from "next/server"
import { getPendingDailyAlerts } from "@/lib/firestore-read"
import { getAuthUserWithPlates, authUnauthorizedResponse } from "@/lib/auth-user"
import type { DailyAlertDTO } from "@/services/dto"

export async function GET(request: Request) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  try {
    const allAlerts: DailyAlertDTO[] = await getPendingDailyAlerts()
    const alerts = allAlerts.filter((a) => auth.allowedPlates.has(a.plate))
    return NextResponse.json(alerts)
  } catch (error) {
    console.error("[api/email/get-pending-daily-alerts] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    )
  }
}
