import { NextResponse } from "next/server"
import { listVehicleEvents } from "@/lib/firestore-read"
import type { VehicleEvent, EventType, EventStatus } from "@/lib/data"

function eventDocToVehicleEvent(doc: Awaited<ReturnType<typeof listVehicleEvents>>[0]): VehicleEvent {
  const d = doc.eventDate
  const iso = d.includes("T") ? d : `${d}T00:00:00.000Z`
  const date = new Date(iso)
  const fecha = iso.slice(0, 10)
  const hora = `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`
  const vehiculo = [doc.brand, doc.model].filter(Boolean).join(" ") || "Sin datos"
  const tipo: EventType = (doc.eventCategory === "exceso_velocidad" ? "exceso_velocidad" : "exceso_velocidad") as EventType
  const descripcion = doc.speed != null
    ? `Vehículo registrado a ${doc.speed} km/h. ${doc.location ? `Ubicación: ${doc.location}.` : ""}`
    : `Evento registrado. ${doc.location ? doc.location : ""}`

  return {
    id: doc.id,
    fecha,
    hora,
    patente: doc.plate,
    vehiculo,
    conductor: doc.driver ?? "Sin datos",
    tipo,
    velocidad: doc.speed,
    limiteVelocidad: undefined,
    ubicacion: doc.location ?? "",
    estado: "pendiente" as EventStatus,
    descripcion,
    notas: [],
  }
}

export async function GET() {
  try {
    const docs = await listVehicleEvents()
    const events: VehicleEvent[] = docs.map(eventDocToVehicleEvent)
    events.sort((a, b) => {
      const da = `${a.fecha}T${a.hora}`
      const db = `${b.fecha}T${b.hora}`
      return da > db ? -1 : da < db ? 1 : 0
    })
    return NextResponse.json(events)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    )
  }
}
