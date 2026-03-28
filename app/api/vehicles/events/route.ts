import {
  getAuthUserWithPlates,
  authUnauthorizedResponse,
  AUTH_COOKIE_NAME,
} from "@/lib/auth-user"
import { normalizePlate } from "@/lib/utils"
import {
  normalizedAllowedPlates,
  filterEventsByAllowedPlates,
} from "@/lib/vehicle-events-scope"

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
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  const token = extractToken(request)
  if (!token) return authUnauthorizedResponse()

  const { searchParams } = new URL(request.url)
  const plateParam = searchParams.get("plate")
  const normalizedAllowed = normalizedAllowedPlates(auth.allowedPlates)

  if (!auth.fullPlateAccess && plateParam) {
    const want = normalizePlate(plateParam)
    if (!want || !normalizedAllowed.has(want)) {
      return new Response(JSON.stringify({ error: "forbidden_plate" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }
  }

  const backendUrl = new URL(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/vehicles/events`)

  for (const key of ["dateFrom", "dateTo", "plate", "eventType", "limit", "page"]) {
    const value = searchParams.get(key)
    if (value !== null) backendUrl.searchParams.set(key, value)
  }

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })

    const bodyText = await backendResponse.text()
    const contentType = backendResponse.headers.get("Content-Type") ?? "application/json"

    if (!backendResponse.ok) {
      return new Response(bodyText, { status: backendResponse.status, headers: { "Content-Type": contentType } })
    }

    if (auth.fullPlateAccess) {
      return new Response(bodyText, { status: backendResponse.status, headers: { "Content-Type": contentType } })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(bodyText) as unknown
    } catch {
      return new Response(bodyText, { status: backendResponse.status, headers: { "Content-Type": contentType } })
    }

    if (!parsed || typeof parsed !== "object") {
      return new Response(bodyText, { status: backendResponse.status, headers: { "Content-Type": contentType } })
    }

    const obj = parsed as Record<string, unknown>
    const rawEvents = Array.isArray(obj.events) ? obj.events : []
    const sourcePageSize = rawEvents.length
    const filteredEvents = filterEventsByAllowedPlates(rawEvents, normalizedAllowed)
    const plateSet = new Set<string>()
    for (const ev of filteredEvents) {
      if (ev && typeof ev === "object" && typeof (ev as { plate?: unknown }).plate === "string") {
        const n = normalizePlate((ev as { plate: string }).plate)
        if (n) plateSet.add(n)
      }
    }

    const out = {
      ...obj,
      events: filteredEvents,
      plates: Array.from(plateSet).sort(),
      total: filteredEvents.length,
      sourcePageSize,
    }

    return new Response(JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (error) {
    console.error("[api/vehicles/events] GET error:", error instanceof Error ? error.message : error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "unknown_error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
