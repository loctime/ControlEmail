import { NextResponse } from "next/server"
import { listVehicleEvents, listVehicles } from "@/lib/firestore-read"
import { normalizeBusinessDate } from "@/lib/domain/date"
import { getAuthUserWithPlates, authUnauthorizedResponse } from "@/lib/auth-user"
import type { VehicleListItemDTO } from "@/services/dto"

function vehicleDocToVehicle(
  doc: Awaited<ReturnType<typeof listVehicles>>[0],
  eventosHoyByPlate: Record<string, number>,
): VehicleListItemDTO {
  return {
    id: doc.id,
    patente: doc.plate,
    modelo: doc.model,
    marca: doc.brand,
    anio: 0,
    conductor: doc.driver ?? null,
    estado: "activo",
    ultimaUbicacion: doc.lastLocation ?? null,
    eventosHoy: eventosHoyByPlate[doc.plate] ?? 0,
  }
}

export async function GET(request: Request) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  console.log("[api/vehicles] GET: leyendo vehículos y eventos desde Firestore (filtro por responsable:", auth.email, ")")
  try {
    const [vehicleDocs, eventDocs] = await Promise.all([
      listVehicles(),
      listVehicleEvents(),
    ])
    const allowedPlates = auth.allowedPlates
    const filteredVehicleDocs = vehicleDocs.filter((doc) => allowedPlates.has(doc.plate))
    const filteredEventDocs = eventDocs.filter((e) => allowedPlates.has(e.plate))

    const today = normalizeBusinessDate(new Date())
    const eventosHoyByPlate: Record<string, number> = {}
    for (const e of filteredEventDocs) {
      const fecha = normalizeBusinessDate(e.eventDate)
      if (fecha === today) {
        eventosHoyByPlate[e.plate] = (eventosHoyByPlate[e.plate] ?? 0) + 1
      }
    }
    const vehicles: VehicleListItemDTO[] = filteredVehicleDocs.map((doc) =>
      vehicleDocToVehicle(doc, eventosHoyByPlate),
    )
    console.log("[api/vehicles] GET: respondiendo", vehicles.length, "vehículos (filtrados)")
    return NextResponse.json(vehicles)
  } catch (error) {
    console.error("[api/vehicles] GET error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    )
  }
}
