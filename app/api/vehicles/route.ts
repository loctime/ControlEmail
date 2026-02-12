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
  try {
    const [vehicleDocs, eventDocs] = await Promise.all([
      listVehicles(),
      listVehicleEvents(),
    ])
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
    return NextResponse.json(vehicles)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    )
  }
}
