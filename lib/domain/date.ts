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

/** Zona horaria usada para dateKey en Firestore y para el día de referencia del dashboard. */
const DASHBOARD_TIMEZONE = "America/Argentina/Buenos_Aires"

/**
 * Hoy en la zona del dashboard (Argentina), como YYYY-MM-DD.
 */
function getTodayKeyInTimezone(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: DASHBOARD_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(new Date())
  const year = parts.find((p) => p.type === "year")?.value ?? ""
  const month = parts.find((p) => p.type === "month")?.value ?? ""
  const day = parts.find((p) => p.type === "day")?.value ?? ""
  return `${year}-${month}-${day}`
}

/**
 * Fecha de ayer en hora local del servidor (fallback).
 */
export function getYesterdayDate(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d
}

/**
 * Clave de negocio (YYYY-MM-DD) para el día de ayer en la zona del dashboard.
 * Debe coincidir con dateKey en Firestore (guardado en Argentina).
 */
export function getYesterdayKey(): string {
  const today = getTodayKeyInTimezone()
  const [y, m, d] = today.split("-").map(Number)
  const yesterday = new Date(y, m - 1, d - 1)
  return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`
}

