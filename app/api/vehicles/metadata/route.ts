import { NextResponse } from "next/server"
import { getAuthUserWithPlates, authUnauthorizedResponse } from "@/lib/auth-user"
import { getVehicleByPlate } from "@/lib/firestore-read"

export interface VehicleMetadataDTO {
  plate: string
  operacion: string | null
  responsable: string | null
}

/**
 * GET /api/vehicles/metadata?plates=AG530IZ,AG572HF,...
 * Returns operacion + primary responsable for each requested plate.
 * Only returns data for plates the authenticated user is allowed to see.
 */
export async function GET(request: Request) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  const { searchParams } = new URL(request.url)
  const platesParam = searchParams.get("plates")
  if (!platesParam) {
    return NextResponse.json({ error: "plates_required" }, { status: 400 })
  }

  const requested = platesParam
    .split(",")
    .map((p) => p.trim().toUpperCase())
    .filter((p) => p.length > 0 && auth.allowedPlates.has(p))

  if (requested.length === 0) {
    return NextResponse.json({ metadata: [] })
  }

  const results = await Promise.all(
    requested.map(async (plate): Promise<VehicleMetadataDTO> => {
      try {
        const doc = await getVehicleByPlate(plate)
        return {
          plate,
          operacion: doc?.operacion ?? null,
          responsable: doc?.responsables?.[0] ?? null,
        }
      } catch {
        return { plate, operacion: null, responsable: null }
      }
    }),
  )

  return NextResponse.json({ metadata: results })
}
