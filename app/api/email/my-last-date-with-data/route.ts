import { NextResponse } from "next/server"
import { getAuthUserFromRequest, authUnauthorizedResponse } from "@/lib/auth-user"
import { listCollection } from "@/lib/firestore-read"

interface LastDateWithDataResponse {
  /** Último día con datos en apps/emails/dailyAlerts (YYYY-MM-DD). */
  date: string
  /** Primer día con datos detectado (útil para navegación histórica). */
  minDate: string
  /** Último día con datos detectado (alias de date, por claridad). */
  maxDate: string
}

export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request)
  if (!user) return authUnauthorizedResponse()

  try {
    const docs = await listCollection("apps/emails/dailyAlerts", 365)

    // IDs de documentos esperados en formato YYYY-MM-DD
    const dateIds = docs
      .map((doc) => doc.id)
      .filter((id): id is string => typeof id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(id))

    if (dateIds.length === 0) {
      return NextResponse.json(
        { error: "no_data", message: "No existen cierres diarios registrados." },
        { status: 404 },
      )
    }

    // Como el formato es YYYY-MM-DD, la comparación lexicográfica coincide con el orden cronológico.
    const sorted = [...dateIds].sort()
    const minDate = sorted[0]!
    const maxDate = sorted[sorted.length - 1]!

    const payload: LastDateWithDataResponse = {
      date: maxDate,
      minDate,
      maxDate,
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error("[api/email/my-last-date-with-data] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}

