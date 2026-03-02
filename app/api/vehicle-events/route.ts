import { NextResponse } from "next/server"
import { listVehicleEvents } from "@/lib/firestore-read"
import { normalizeBusinessDate } from "@/lib/domain/date"
import type { VehicleEventLegacyDTO } from "@/services/dto"

function eventDocToVehicleEvent(doc: Awaited<ReturnType<typeof listVehicleEvents>>[0]): VehicleEventLegacyDTO {
  const d = doc.eventDate
  const iso = d.includes("T") ? d : `${d}T00:00:00.000Z`
  const date = new Date(iso)
  const fecha = normalizeBusinessDate(iso)
  const hora = `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`
  const vehiculo = [doc.brand, doc.model].filter(Boolean).join(" ") || null
  const descripcion = doc.speed != null
    ? `Vehículo registrado a ${doc.speed} km/h. ${doc.location ? `Ubicación: ${doc.location}.` : ""}`
    : `Evento registrado. ${doc.location ? doc.location : ""}`

  return {
    id: doc.id,
    fecha,
    hora,
    patente: doc.plate,
    vehiculo,
    conductor: doc.driver ?? null,
    tipo: "exceso_velocidad",
    velocidad: doc.speed,
    limiteVelocidad: undefined,
    ubicacion: doc.location ?? null,
    estado: "pendiente",
    descripcion,
    notas: [],
  }
}

export async function GET() {
  console.log("[api/vehicle-events] GET: leyendo eventos desde Firestore (apps/emails/vehicleEvents)")
  try {
    const docs = await listVehicleEvents()
    console.log("[api/vehicle-events] GET: recibidos", docs.length, "documentos de Firestore")
    const events: VehicleEventLegacyDTO[] = docs.map(eventDocToVehicleEvent)
    console.log("[api/vehicle-events] sample event (fecha, hora, patente):", events[0] ? {
      fecha: events[0].fecha,
      hora: events[0].hora,
      patente: events[0].patente,
    } : "sin eventos")
    events.sort((a, b) => {
      const da = `${a.fecha}T${a.hora}`
      const db = `${b.fecha}T${b.hora}`
      return da > db ? -1 : da < db ? 1 : 0
    })
    console.log("[api/vehicle-events] GET: respondiendo", events.length, "eventos")
    return NextResponse.json(events)
  } catch (error) {
    console.error("[api/vehicle-events] GET error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    )
  }
}
