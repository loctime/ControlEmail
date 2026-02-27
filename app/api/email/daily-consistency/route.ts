import { NextResponse } from "next/server"
import { getDailyConsistency } from "@/lib/firestore-read"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    
    if (!date) {
      return NextResponse.json({ error: "date_required" }, { status: 400 })
    }
    
    const consistency = await getDailyConsistency(date)
    return NextResponse.json(consistency)
  } catch (error) {
    console.error("[api/email/daily-consistency] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    )
  }
}
