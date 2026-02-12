import { NextResponse } from "next/server"
import { listVehicleEvents, listVehicles } from "@/lib/firestore-read"
import type { Vehicle } from "@/lib/data"

function vehicleDocToVehicle(
  doc: Awaited<ReturnType<typeof listVehicles>>[0],
  eventosHoyByPlate: Record<string, number>,
): Vehicle {
  return {
    id: doc.id,
    patente: doc.plate,
    modelo: doc.model,
    marca: doc.brand,
    anio: 0,
    conductor: doc.driver ?? "",
    estado: "activo",
    ultimaUbicacion: doc.lastLocation ?? "",
    eventosHoy: eventosHoyByPlate[doc.plate] ?? 0,
  }
}

export async function GET() {
  console.log("[api/vehicles] GET: leyendo vehículos y eventos desde Firestore (apps/emails/vehicles, apps/emails/vehicleEvents)")
  try {
    const [vehicleDocs, eventDocs] = await Promise.all([
      listVehicles(),
      listVehicleEvents(),
    ])
    console.log("[api/vehicles] GET: Firestore devolvió", vehicleDocs.length, "vehículos y", eventDocs.length, "eventos")
    const today = new Date().toISOString().slice(0, 10)
    const eventosHoyByPlate: Record<string, number> = {}
    for (const e of eventDocs) {
      const ed = e.eventDate
      const fecha = ed.slice(0, 10)
      if (fecha === today) {
        eventosHoyByPlate[e.plate] = (eventosHoyByPlate[e.plate] ?? 0) + 1
      }
    }
    const vehicles: Vehicle[] = vehicleDocs.map((doc) =>
      vehicleDocToVehicle(doc, eventosHoyByPlate),
    )
    console.log("[api/vehicles] GET: respondiendo", vehicles.length, "vehículos")
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
