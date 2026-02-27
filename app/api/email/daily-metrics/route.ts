import { NextResponse } from "next/server"
import { getDailyMetrics } from "@/lib/firestore-read"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    
    if (!date) {
      return NextResponse.json({ error: "date_required" }, { status: 400 })
    }
    
    const metrics = await getDailyMetrics(date)
    return NextResponse.json(metrics)
  } catch (error) {
    console.error("[api/email/daily-metrics] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    )
  }
}
