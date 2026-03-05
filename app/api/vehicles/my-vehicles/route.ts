import { NextResponse } from "next/server"
import { getAuthUserWithPlates, authUnauthorizedResponse } from "@/lib/auth-user"
import { listVehicles } from "@/lib/firestore-read"

export async function GET(request: Request) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  try {
    const vehicles = await listVehicles()
    const filtered = vehicles
      .filter((vehicle) => auth.allowedPlates.has(vehicle.plate))
      .map((vehicle) => ({
        id: vehicle.id,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        responsables: vehicle.responsables ?? [],
        responsablesNormalized: (vehicle.responsables ?? []).map((email) => String(email).trim().toLowerCase()),
        operationName: null,
      }))

    return NextResponse.json({ ok: true, vehicles: filtered })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
