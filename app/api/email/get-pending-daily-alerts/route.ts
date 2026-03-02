import { NextResponse } from "next/server"
import { getPendingDailyAlerts } from "@/lib/firestore-read"
import type { DailyAlertDTO } from "@/services/dto"

export async function GET(request: Request) {
  try {
    const alerts: DailyAlertDTO[] = await getPendingDailyAlerts()
    return NextResponse.json(alerts)
  } catch (error) {
    console.error("[api/email/get-pending-daily-alerts] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    )
  }
}
