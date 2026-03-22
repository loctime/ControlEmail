import { getAuthUserFromRequest, authUnauthorizedResponse, AUTH_COOKIE_NAME } from "@/lib/auth-user"

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization")
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i)
    if (match) return match[1].trim()
  }
  const cookieHeader = request.headers.get("cookie")
  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`))
    if (match) return match[1].trim()
  }
  return null
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  const auth = await getAuthUserFromRequest(request)
  if (!auth) return authUnauthorizedResponse()

  const token = extractToken(request)
  if (!token) return authUnauthorizedResponse()

  const { searchParams } = new URL(request.url)

  // Convert `months` param to a dateFrom/dateTo range and proxy through
  // the standard /api/vehicles/events endpoint (which accepts Firebase Bearer tokens).
  // The backend's /api/email/vehicles/events-history uses legacy auth and rejects them.
  const months = Math.max(1, parseInt(searchParams.get("months") ?? "1", 10))
  const dateTo = new Date()
  const dateFrom = new Date()
  dateFrom.setMonth(dateFrom.getMonth() - months)

  const backendUrl = new URL(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/vehicles/events`)
  backendUrl.searchParams.set("dateFrom", toDateStr(dateFrom))
  backendUrl.searchParams.set("dateTo", toDateStr(dateTo))
  backendUrl.searchParams.set("limit", "500")
  backendUrl.searchParams.set("page", "1")

  const plate = searchParams.get("plate")
  if (plate) backendUrl.searchParams.set("plate", plate)

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })

    const body = await backendResponse.arrayBuffer()
    return new Response(body, {
      status: backendResponse.status,
      headers: {
        "Content-Type": backendResponse.headers.get("Content-Type") ?? "application/json",
      },
    })
  } catch (error) {
    console.error("[api/vehicles/events-history] GET error:", error instanceof Error ? error.message : error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "unknown_error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
