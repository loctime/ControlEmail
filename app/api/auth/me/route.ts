import { NextResponse } from "next/server"
import { getAuthUserFromRequest } from "@/lib/auth-user"

export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  return NextResponse.json({ email: user.email, uid: user.uid })
}
