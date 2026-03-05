import { NextResponse } from "next/server"
import { getEmailConfig, updateEmailConfig } from "@/lib/firestore-read"
import { hasValidAdminSession, unauthorizedResponse } from "@/lib/admin-session"

function checkAdmin(request: Request) {
  if (!hasValidAdminSession(request)) return null
  return true
}

export async function GET(request: Request) {
  if (!checkAdmin(request)) return unauthorizedResponse()
  try {
    const config = await getEmailConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error("[api/admin/email-config] GET error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  if (!checkAdmin(request)) return unauthorizedResponse()
  try {
    const body = await request.json()
    const toStrArr = (v: unknown): string[] => {
      if (!Array.isArray(v)) return []
      return (v as unknown[])
        .map((x) => String(x).trim().toLowerCase())
        .filter(Boolean)
    }
    const generalRecipients = toStrArr(body?.generalRecipients)
    const ccRecipients = toStrArr(body?.ccRecipients)
    const reportRecipients = toStrArr(body?.reportRecipients)
    await updateEmailConfig({
      generalRecipients,
      ccRecipients,
      reportRecipients,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[api/admin/email-config] PATCH error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
