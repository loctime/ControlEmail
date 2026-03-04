/**
 * Normaliza una fecha de negocio al formato YYYY-MM-DD.
 *
 * Única función permitida para obtener la \"fecha de día\" usada en
 * métricas diarias, claves de Firestore y comparaciones de negocio.
 */
export function normalizeBusinessDate(input: Date | string): string {
  if (input instanceof Date) {
    return input.toISOString().slice(0, 10)
  }

  // Si ya viene en formato YYYY-MM-DD lo devolvemos tal cual.
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input
  }

  const parsed = new Date(input)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  // Último recurso: truncar a 10 caracteres, sin inventar una fecha nueva.
  return input.slice(0, 10)
}

/**
 * Fecha de ayer en hora local, normalizada YYYY-MM-DD.
 * Se usa como "día de referencia" en el dashboard (las alertas son del día anterior).
 */
export function getYesterdayDate(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d
}

/** Clave de negocio (YYYY-MM-DD) para el día de ayer. */
export function getYesterdayKey(): string {
  return normalizeBusinessDate(getYesterdayDate())
}

