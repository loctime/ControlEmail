import { NextResponse } from "next/server"
import { buildAdminSessionCookieOptions } from "@/lib/admin-session"

export async function POST(request: Request) {
  const expected = process.env.ADMIN_ALERTS_PASSWORD
  if (!expected) {
    console.error("[api/admin/login] ADMIN_ALERTS_PASSWORD no configurada")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const password = typeof body?.password === "string" ? body.password : ""
  if (password !== expected) {
    return NextResponse.json({ error: "invalid_password" }, { status: 401 })
  }

  const { name, value, options } = buildAdminSessionCookieOptions()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(name, value, options)
  return res
}
