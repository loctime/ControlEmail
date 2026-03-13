import { BUSINESS_TIMEZONE } from "@/lib/domain/date"

const EVENT_LOCALE = "es-AR"

type TimestampInput = string | Date | null | undefined

export function parseEventTimestamp(input: TimestampInput): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input
  }
  if (!input || typeof input !== "string") return null

  const date = new Date(input)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatWithOptions(
  input: TimestampInput,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = parseEventTimestamp(input)
  if (!date) return "Sin fecha valida"

  try {
    return new Intl.DateTimeFormat(EVENT_LOCALE, {
      ...options,
      timeZone: BUSINESS_TIMEZONE,
    }).format(date)
  } catch {
    return "Sin fecha valida"
  }
}

export function formatEventDateTime(input: TimestampInput): string {
  return formatWithOptions(input, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatEventDate(input: TimestampInput): string {
  return formatWithOptions(input, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

export function formatEventTime(input: TimestampInput): string {
  return formatWithOptions(input, {
    hour: "2-digit",
    minute: "2-digit",
  })
}
