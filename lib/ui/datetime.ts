const EVENT_LOCALE = "es-AR"

type TimestampInput = string | Date | null | undefined

export function parseEventTimestamp(input: TimestampInput): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input
  }
  if (!input || typeof input !== "string") return null

  const d = new Date(input)
  if (Number.isNaN(d.getTime())) {
    return null
  }
  return d
}

function formatWithOptions(
  input: TimestampInput,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = parseEventTimestamp(input)
  if (!date) return "Sin fecha válida"
  try {
    return new Intl.DateTimeFormat(EVENT_LOCALE, options).format(date)
  } catch {
    return "Sin fecha válida"
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

