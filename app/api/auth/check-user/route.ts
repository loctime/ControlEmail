import { NextResponse } from "next/server"
import { checkUserByEmail } from "@/lib/auth-user"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get("email")
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : ""
  if (!email) {
    return NextResponse.json({ error: "email_required" }, { status: 400 })
  }

  try {
    const result = await checkUserByEmail(email)
    console.log("[api/auth/check-user] email=%s result=%o", email, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[api/auth/check-user] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    )
  }
}
