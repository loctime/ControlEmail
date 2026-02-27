import { NextResponse } from "next/server"
import { markAlertSent } from "@/lib/firestore-read"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { alertIds } = body
    
    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json({ error: "alert_ids_required" }, { status: 400 })
    }
    
    await markAlertSent(alertIds)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[api/email/mark-alert-sent] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    )
  }
}
