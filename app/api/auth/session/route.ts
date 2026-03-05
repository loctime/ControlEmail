import { NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/firebase-admin"
import { buildAuthCookieOptions } from "@/lib/auth-user"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const idToken = typeof body?.idToken === "string" ? body.idToken : ""
    if (!idToken) {
      return NextResponse.json({ error: "idToken_required" }, { status: 400 })
    }

    const decoded = await verifyIdToken(idToken)
    if (!decoded.email) {
      return NextResponse.json({ error: "email_required" }, { status: 400 })
    }

    const { name, value, options } = buildAuthCookieOptions(idToken)
    const res = NextResponse.json({ ok: true })
    res.cookies.set(name, value, options)
    return res
  } catch (error) {
    console.error("[api/auth/session] Error:", error)
    return NextResponse.json({ error: "invalid_token" }, { status: 401 })
  }
}
