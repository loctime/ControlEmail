import { NextResponse } from "next/server"
import { getAuthUserWithPlates, authUnauthorizedResponse } from "@/lib/auth-user"
import { listVehicles, getDailyMetrics } from "@/lib/firestore-read"
import { getYesterdayKey } from "@/lib/domain/date"

export async function GET(request: Request) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  try {
    const dateKey = getYesterdayKey()
    const [vehicles, metrics] = await Promise.all([listVehicles(), getDailyMetrics(dateKey)])
    const operationByPlate = new Map(
      metrics.vehicles.map((v) => [v.plate, v.operationName ?? null]),
    )
    const filtered = vehicles
      .filter((vehicle) => auth.allowedPlates.has(vehicle.plate))
      .map((vehicle) => ({
        id: vehicle.id,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        responsables: vehicle.responsables ?? [],
        responsablesNormalized: (vehicle.responsables ?? []).map((email) => String(email).trim().toLowerCase()),
        operationName: operationByPlate.get(vehicle.plate) ?? null,
      }))

    return NextResponse.json({ ok: true, vehicles: filtered })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
