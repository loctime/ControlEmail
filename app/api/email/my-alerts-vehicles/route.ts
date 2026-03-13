import { NextResponse } from "next/server"
import { getAuthUserWithPlates, authUnauthorizedResponse } from "@/lib/auth-user"
import { getDailyMetrics, listVehicles } from "@/lib/firestore-read"
import { getYesterdayKey } from "@/lib/domain/date"

export async function GET(request: Request) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  try {
    const dateKey = getYesterdayKey()
    const [metrics, vehicles] = await Promise.all([
      getDailyMetrics(dateKey),
      listVehicles(),
    ])

    const vehiclesByPlate = new Map(
      vehicles
        .filter((vehicle) => auth.allowedPlates.has(vehicle.plate))
        .map((vehicle) => [vehicle.plate, vehicle]),
    )

    const items = Array.from(vehiclesByPlate.keys()).map((plate) => {
      const alert = metrics.vehicles.find((vehicleAlert) => vehicleAlert.plate === plate)
      const vehicle = vehiclesByPlate.get(plate)

      return {
        plate,
        operationName: null,
        lastEvent: alert?.lastEventAt ?? vehicle?.lastEventAt ?? dateKey,
        riskScore: alert?.riskScore ?? 0,
        totalEventsCount: alert?.totalEventsCount ?? 0,
      }
    })

    items.sort((a, b) => b.riskScore - a.riskScore || a.plate.localeCompare(b.plate))

    return NextResponse.json({ ok: true, vehicles: items })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
