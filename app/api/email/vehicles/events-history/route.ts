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

export async function GET(request: Request) {
  const auth = await getAuthUserFromRequest(request)
  if (!auth) return authUnauthorizedResponse()

  const token = extractToken(request)
  if (!token) return authUnauthorizedResponse()

  const { searchParams } = new URL(request.url)
  const backendUrl = new URL(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/email/vehicles/events-history`)

  for (const key of ["months", "plate"]) {
    const value = searchParams.get(key)
    if (value !== null) backendUrl.searchParams.set(key, value)
  }

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
    console.error("[api/email/vehicles/events-history] GET error:", error instanceof Error ? error.message : error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "unknown_error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
