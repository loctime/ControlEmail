import { NextResponse } from "next/server"
import { getAuthUserFromRequest } from "@/lib/auth-user"
import { getEmailAccessUserByEmail } from "@/lib/firestore-read"

export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  try {
    const access = await getEmailAccessUserByEmail(user.email)
    if (!access || !access.enabled) {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_AUTHORIZED", code: "USER_NOT_AUTHORIZED" },
        { status: 403 },
      )
    }

    return NextResponse.json({
      ok: true,
      email: user.email,
      role: access.role,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
