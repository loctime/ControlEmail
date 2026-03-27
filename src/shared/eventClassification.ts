/**
 * Clasificación unificada de eventos de velocidad.
 * Debe coincidir con la lógica del backend (controlfile-backend/src/shared/eventClassification.js)
 */

export function isSpeedExcessEvent(event: unknown): boolean {
  if (!event || typeof event !== "object") return false
  const ev = event as Record<string, unknown>

  return (
    // Categorías V2 (actuales)
    ev.eventCategory === "SPEEDING" ||
    ev.eventSubtype === "SPEED_EXCESS" ||

    // Categoría legacy (emails antiguos)
    ev.eventCategory === "exceso_velocidad" ||

    // Type directo (persistido en Firestore)
    ev.type === "exceso" ||

    // Marcadores de agrupación
    Boolean(ev.groupedSpeedIncidentKey) ||

    // Evento con velocidad medida
    ev.hasSpeed === true ||
    (ev.type === "exceso" && typeof ev.speed === "number")
  )
}
