import { NextResponse } from "next/server"
import { getAuthUserFromRequest } from "@/lib/auth-user"
import { getEmailAccessUserByEmail } from "@/lib/firestore-read"

export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const accessUser = await getEmailAccessUserByEmail(user.email)
  if (accessUser != null && !accessUser.enabled) {
    return NextResponse.json({ error: "access_disabled" }, { status: 403 })
  }
  const role = accessUser?.role ?? "responsable"
  return NextResponse.json({ email: user.email, uid: user.uid, role })
}
