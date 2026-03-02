import { NextResponse } from "next/server"
import { markAlertSent } from "@/lib/firestore-read"
import type { MarkAlertSentResultDTO } from "@/services/dto"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { alertIds } = body

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json({ error: "alert_ids_required" }, { status: 400 })
    }

    const result: MarkAlertSentResultDTO = await markAlertSent(alertIds)
    if (result.failed.length > 0) {
      return NextResponse.json(result, { status: 207 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[api/email/mark-alert-sent] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    )
  }
}
