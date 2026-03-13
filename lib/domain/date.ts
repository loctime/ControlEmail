export const BUSINESS_TIMEZONE = "America/Argentina/Buenos_Aires"

function partsToDateKey(parts: Intl.DateTimeFormatPart[]): string {
  const year = parts.find((p) => p.type === "year")?.value ?? ""
  const month = parts.find((p) => p.type === "month")?.value ?? ""
  const day = parts.find((p) => p.type === "day")?.value ?? ""
  return `${year}-${month}-${day}`
}

function businessDateFormatter(): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

export function formatBusinessDate(input: Date | string): string {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) {
    return typeof input === "string" ? input.slice(0, 10) : ""
  }
  return partsToDateKey(businessDateFormatter().formatToParts(date))
}

export function parseBusinessDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Normaliza una fecha de negocio al formato YYYY-MM-DD.
 *
 * Única función permitida para obtener la \"fecha de día\" usada en
 * métricas diarias, claves de Firestore y comparaciones de negocio.
 */
export function normalizeBusinessDate(input: Date | string): string {
  if (input instanceof Date) {
    return formatBusinessDate(input)
  }

  // Si ya viene en formato YYYY-MM-DD lo devolvemos tal cual.
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input
  }

  const parsed = new Date(input)
  if (!Number.isNaN(parsed.getTime())) {
    return formatBusinessDate(parsed)
  }

  // Último recurso: truncar a 10 caracteres, sin inventar una fecha nueva.
  return input.slice(0, 10)
}

/** Zona horaria usada para dateKey en Firestore y para el día de referencia del dashboard. */
const DASHBOARD_TIMEZONE = BUSINESS_TIMEZONE

/**
 * Hoy en la zona del dashboard (Argentina), como YYYY-MM-DD.
 */
function getTodayKeyInTimezone(): string {
  return partsToDateKey(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: DASHBOARD_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date()),
  )
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

/** Devuelve todas las claves YYYY-MM-DD del mes (ej. "2026-03" → ["2026-03-01", ..., "2026-03-31"]). */
export function getDateKeysInMonth(month: string): string[] {
  const [y, m] = month.split("-").map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return []
  const first = new Date(y, m - 1, 1)
  const last = new Date(y, m, 0)
  const keys: string[] = []
  for (let d = first.getDate(); d <= last.getDate(); d++) {
    keys.push(
      `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    )
  }
  return keys
}

/** Devuelve todas las claves YYYY-MM-DD del año (ej. "2026" → ["2026-01-01", ..., "2026-12-31"]). */
export function getDateKeysInYear(year: string): string[] {
  const y = Number(year)
  if (!Number.isFinite(y)) return []
  const keys: string[] = []
  for (let m = 1; m <= 12; m++) {
    const monthStr = `${y}-${String(m).padStart(2, "0")}`
    keys.push(...getDateKeysInMonth(monthStr))
  }
  return keys
}
