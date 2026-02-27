import { NextResponse } from "next/server"
import { getPendingDailyAlerts } from "@/lib/firestore-read"

export async function GET(request: Request) {
  try {
    const alerts = await getPendingDailyAlerts()
    return NextResponse.json(alerts)
  } catch (error) {
    console.error("[api/email/get-pending-daily-alerts] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    )
  }
}
