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

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Splits a date range into chunks of at most 31 days each.
 * The backend's /api/vehicles/events endpoint enforces a 31-day max.
 */
function splitIntoChunks(dateFrom: string, dateTo: string): Array<{ from: string; to: string }> {
  const chunks: Array<{ from: string; to: string }> = []
  let cursor = new Date(dateFrom + "T00:00:00Z")
  const end = new Date(dateTo + "T00:00:00Z")

  while (cursor <= end) {
    const chunkEnd = new Date(cursor)
    chunkEnd.setDate(chunkEnd.getDate() + 30) // inclusive: up to 31 days (day 0 → day 30)
    if (chunkEnd > end) chunkEnd.setTime(end.getTime())
    chunks.push({ from: toDateStr(cursor), to: toDateStr(chunkEnd) })
    cursor = new Date(chunkEnd)
    cursor.setDate(cursor.getDate() + 1)
  }

  return chunks
}

interface BackendEventsPayload {
  events?: unknown[]
  plates?: string[]
  total?: number
}

export async function GET(request: Request) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  const token = extractToken(request)
  if (!token) return authUnauthorizedResponse()

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const plate = searchParams.get("plate")
  const normalizedAllowed = normalizedAllowedPlates(auth.allowedPlates)

  if (!auth.fullPlateAccess && plate) {
    const want = normalizePlate(plate)
    if (!want || !normalizedAllowed.has(want)) {
      return new Response(JSON.stringify({ error: "forbidden_plate" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }
  }

  if (!dateFrom || !dateTo) {
    return new Response(JSON.stringify({ error: "dateFrom and dateTo are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const chunks = splitIntoChunks(dateFrom, dateTo)

  try {
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const backendUrl = new URL(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/vehicles/events`)
        backendUrl.searchParams.set("dateFrom", chunk.from)
        backendUrl.searchParams.set("dateTo", chunk.to)
        backendUrl.searchParams.set("limit", "500")
        backendUrl.searchParams.set("page", "1")
        if (plate) backendUrl.searchParams.set("plate", plate)

        const res = await fetch(backendUrl.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          const body = await res.text()
          throw new Error(`Backend ${res.status}: ${body}`)
        }

        return res.json() as Promise<BackendEventsPayload>
      }),
    )

    const allEvents: unknown[] = []
    const allPlates = new Set<string>()

    for (const result of results) {
      for (const ev of result.events ?? []) allEvents.push(ev)
      for (const p of result.plates ?? []) allPlates.add(p)
    }

    let eventsOut = allEvents
    let platesOut = Array.from(allPlates)
    if (!auth.fullPlateAccess) {
      eventsOut = filterEventsByAllowedPlates(allEvents, normalizedAllowed)
      const allowedSet = new Set<string>()
      for (const ev of eventsOut) {
        if (ev && typeof ev === "object" && typeof (ev as { plate?: unknown }).plate === "string") {
          const n = normalizePlate((ev as { plate: string }).plate)
          if (n) allowedSet.add(n)
        }
      }
      platesOut = Array.from(allowedSet).sort()
    }

    return new Response(
      JSON.stringify({ events: eventsOut, plates: platesOut, total: eventsOut.length }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error(
      "[api/vehicles/events-history] GET error:",
      error instanceof Error ? error.message : error,
    )
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "unknown_error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
