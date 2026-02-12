export type EventType =
  | "exceso_velocidad"
  | "vehiculo_no_identificado"
  | "desvio_ruta"
  | "parada_no_autorizada"
  | "conduccion_nocturna"

export type EventStatus = "pendiente" | "en_revision" | "resuelto" | "critico"

export interface VehicleEvent {
  id: string
  fecha: string
  hora: string
  patente: string
  vehiculo: string
  conductor: string
  tipo: EventType
  velocidad?: number
  limiteVelocidad?: number
  ubicacion: string
  estado: EventStatus
  descripcion: string
  notas: string[]
}

export interface Vehicle {
  id: string
  patente: string
  modelo: string
  marca: string
  anio: number
  conductor: string
  estado: "activo" | "inactivo" | "mantenimiento"
  ultimaUbicacion: string
  eventosHoy: number
}

export interface Alert {
  id: string
  tipo: "critica" | "advertencia" | "info"
  mensaje: string
  fecha: string
  hora: string
  leida: boolean
  eventoId?: string
}

export const eventTypeLabels: Record<EventType, string> = {
  exceso_velocidad: "Exceso de velocidad",
  vehiculo_no_identificado: "No identificado",
  desvio_ruta: "Desvio de ruta",
  parada_no_autorizada: "Parada no autorizada",
  conduccion_nocturna: "Conduccion nocturna",
}

export const eventStatusLabels: Record<EventStatus, string> = {
  pendiente: "Pendiente",
  en_revision: "En revision",
  resuelto: "Resuelto",
  critico: "Critico",
}

/** Genera alertas a partir de eventos (exceso de velocidad = crítica, etc.). */
export function alertsFromEvents(events: VehicleEvent[]): Alert[] {
  return events.map((ev) => {
    const tipo: Alert["tipo"] =
      ev.tipo === "exceso_velocidad" && (ev.velocidad ?? 0) >= 100
        ? "critica"
        : ev.tipo === "exceso_velocidad"
          ? "advertencia"
          : "info"
    const mensaje =
      ev.tipo === "exceso_velocidad" && ev.velocidad != null
        ? `Exceso de velocidad: ${ev.patente} a ${ev.velocidad} km/h${ev.ubicacion ? ` - ${ev.ubicacion}` : ""}`
        : `Evento ${ev.tipo}: ${ev.patente} - ${ev.descripcion.slice(0, 80)}`
    return {
      id: `alr-${ev.id}`,
      tipo,
      mensaje,
      fecha: ev.fecha,
      hora: ev.hora,
      leida: false,
      eventoId: ev.id,
    }
  })
}

/** Agrupa eventos por hora para el gráfico (excesos, desvíos, otros). */
export function chartDataFromEvents(events: VehicleEvent[]): Array<{
  hora: string
  excesos: number
  desvios: number
  otros: number
}> {
  const hours = Array.from({ length: 12 }, (_, i) =>
    `${String(i + 6).padStart(2, "0")}:00`,
  )
  const byHour: Record<string, { excesos: number; desvios: number; otros: number }> = {}
  hours.forEach((h) => {
    byHour[h] = { excesos: 0, desvios: 0, otros: 0 }
  })
  const today = new Date().toISOString().slice(0, 10)
  for (const ev of events) {
    if (ev.fecha !== today) continue
    const hourNum = parseInt(ev.hora.slice(0, 2), 10)
    const h = `${String(hourNum).padStart(2, "0")}:00`
    if (!byHour[h]) byHour[h] = { excesos: 0, desvios: 0, otros: 0 }
    if (ev.tipo === "exceso_velocidad") byHour[h].excesos += 1
    else if (ev.tipo === "desvio_ruta") byHour[h].desvios += 1
    else byHour[h].otros += 1
  }
  return hours.map((hora) => ({
    hora,
    ...(byHour[hora] ?? { excesos: 0, desvios: 0, otros: 0 }),
  }))
}
