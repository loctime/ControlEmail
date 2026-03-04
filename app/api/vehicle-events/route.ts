import { NextResponse } from "next/server"
import { listVehicleEvents } from "@/lib/firestore-read"
import { normalizeBusinessDate } from "@/lib/domain/date"
import type { VehicleEventLegacyDTO } from "@/services/dto"

/** Parsea hora desde eventTimestamp (ej. "2026-03-03T13:13:46-03:00") a "HH:mm". */
function horaFromEventTimestamp(ts: string | undefined): string {
  if (!ts) return "00:00"
  const match = ts.match(/T(\d{1,2}):(\d{2})/)
  if (match) return `${match[1].padStart(2, "0")}:${match[2]}`
  try {
    const d = new Date(ts)
    if (!Number.isNaN(d.getTime()))
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  } catch {
    // ignore
  }
  return "00:00"
}

/** Mapea eventCategory/type del doc al tipo esperado por el front. */
function mapTipo(eventCategory: string, _doc: Awaited<ReturnType<typeof listVehicleEvents>>[0]): string {
  const cat = (eventCategory ?? "").toLowerCase()
  if (cat === "exceso_velocidad") return "exceso_velocidad"
  if (cat === "contacto" || cat === "contacto_sin_identificacion") return "vehiculo_no_identificado"
  if (cat === "desvio_ruta") return "desvio_ruta"
  if (cat === "parada_no_autorizada") return "parada_no_autorizada"
  if (cat === "conduccion_nocturna") return "conduccion_nocturna"
  return "vehiculo_no_identificado"
}

/** Mapea severity del doc al estado esperado por el front. */
function mapEstado(severity: string | undefined): "pendiente" | "en_revision" | "resuelto" | "critico" {
  const s = (severity ?? "").toLowerCase()
  if (s === "critico") return "critico"
  if (s === "resuelto") return "resuelto"
  if (s === "en_revision") return "en_revision"
  return "pendiente"
}

function eventDocToVehicleEvent(doc: Awaited<ReturnType<typeof listVehicleEvents>>[0]): VehicleEventLegacyDTO {
  const fecha =
    doc.dateKey ??
    (doc.eventTimestamp
      ? normalizeBusinessDate(doc.eventTimestamp)
      : doc.eventDate
        ? (doc.eventDate.includes("T") ? normalizeBusinessDate(doc.eventDate) : doc.eventDate)
        : "")
  const hora =
    doc.eventTimestamp
      ? horaFromEventTimestamp(doc.eventTimestamp)
      : doc.eventDate
        ? (() => {
            const iso = doc.eventDate.includes("T") ? doc.eventDate : `${doc.eventDate}T00:00:00.000Z`
            const date = new Date(iso)
            return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`
          })()
        : "00:00"
  const vehiculo = [doc.brand, doc.model].filter(Boolean).join(" ") || null
  const descripcion = doc.speed != null
    ? `Vehículo registrado a ${doc.speed} km/h. ${doc.location ? `Ubicación: ${doc.location}.` : ""}`
    : doc.rawLine ?? `Evento ${doc.eventCategory ?? "registrado"}. ${doc.location ?? ""}`.trim() || "Evento registrado."

  return {
    id: doc.eventId ?? doc.id,
    fecha,
    hora,
    patente: doc.plate,
    vehiculo,
    conductor: doc.driver ?? doc.driverName ?? null,
    tipo: mapTipo(doc.eventCategory, doc),
    velocidad: doc.speed,
    limiteVelocidad: undefined,
    ubicacion: doc.location ?? null,
    estado: mapEstado(doc.severity),
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
