import { NextResponse } from "next/server"
import { getDailyMetrics, type DailyAlertVehicle } from "@/lib/firestore-read"
import { getYesterdayKey } from "@/lib/domain/date"
import type { VehicleEventLegacyDTO } from "@/services/dto"

/** Parsea hora desde eventTimestamp (ej. "2026-03-03T13:13:46-03:00") a "HH:mm". */
function horaFromEventTimestamp(ts: string | undefined): string {
  if (!ts) return "00:00"
  const match = ts.match(/T(\d{1,2}):(\d{2})/)
  if (match) return `${match[1].padStart(2, "0")}:${match[2]}`
  try {
    const d = new Date(ts)
    if (!Number.isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    }
  } catch {
    // ignore
  }
  return "00:00"
}

function mapTipo(event: DailyAlertVehicle["events"][number]): string {
  if (event.speed != null || event.hasSpeed) return "exceso_velocidad"
  const cat = (event.eventCategory ?? event.type ?? "").toLowerCase()
  if (cat.includes("speed") || cat.includes("exceso")) return "exceso_velocidad"
  if (cat.includes("contact")) return "vehiculo_no_identificado"
  if (cat.includes("driver_not_identified") || cat.includes("no identificado")) return "vehiculo_no_identificado"
  if (cat.includes("desvio")) return "desvio_ruta"
  if (cat.includes("parada")) return "parada_no_autorizada"
  if (cat.includes("nocturna")) return "conduccion_nocturna"
  return "vehiculo_no_identificado"
}

function mapEstado(severity: string | undefined): "pendiente" | "en_revision" | "resuelto" | "critico" {
  const s = (severity ?? "").toLowerCase()
  if (s === "critico" || s === "critical") return "critico"
  if (s === "resuelto") return "resuelto"
  if (s === "en_revision") return "en_revision"
  return "pendiente"
}

function eventDocToVehicleEvent(
  event: DailyAlertVehicle["events"][number],
  vehicle: DailyAlertVehicle,
): VehicleEventLegacyDTO {
  const vehiculo = [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || null
  const descripcion =
    event.speed != null
      ? `Vehiculo registrado a ${event.speed} km/h. ${event.location ? `Ubicacion: ${event.location}.` : ""}`
      : (event.reason ?? (`Evento ${(event.eventCategory ?? event.type ?? "registrado")}. ${event.location ?? ""}`.trim() || "Evento registrado."))

  return {
    id: event.eventId,
    fecha: vehicle.dateKey,
    hora: horaFromEventTimestamp(event.eventTimestamp),
    patente: event.plate,
    vehiculo,
    conductor: event.driverName ?? null,
    tipo: mapTipo(event),
    velocidad: event.speed ?? undefined,
    limiteVelocidad: undefined,
    ubicacion: event.location ?? null,
    estado: mapEstado(event.severity ?? undefined),
    descripcion,
    notas: [],
  }
}

export async function GET(request: Request) {
  const { getAuthUserWithPlates, authUnauthorizedResponse } = await import("@/lib/auth-user")
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  console.log("[api/vehicle-events] GET: leyendo eventos del cierre diario (filtro por responsable:", auth.email, ")")
  try {
    const metrics = await getDailyMetrics(getYesterdayKey())
    const vehicles = metrics.vehicles.filter((vehicle) => auth.allowedPlates.has(vehicle.plate))
    const events: VehicleEventLegacyDTO[] = vehicles.flatMap((vehicle) => {
      const groupedSpeedEventIds = new Set(
        vehicle.speedIncidents.flatMap((incident) => incident.eventIds ?? []),
      )

      return vehicle.events
        .filter((event) => !groupedSpeedEventIds.has(event.eventId))
        .map((event) => eventDocToVehicleEvent(event, vehicle))
    })

    events.sort((a, b) => {
      const da = `${a.fecha}T${a.hora}`
      const db = `${b.fecha}T${b.hora}`
      return da > db ? -1 : da < db ? 1 : 0
    })

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
