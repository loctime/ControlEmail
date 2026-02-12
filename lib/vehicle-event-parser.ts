export type VehicleEventFormat = "table_simple" | "evento_simple" | "exceso_velocidad"

/** Tipo de evento para persistencia (compatible con adapters). */
export type EventCategory = VehicleEventFormat

/** Formato detectado del evento (compatible con adapters). */
export type FormatType = VehicleEventFormat

export interface ParsedVehicleEvent {
  plate: string
  brand: string
  model: string
  eventDate: string
  eventType: VehicleEventFormat
  driver?: string
  speed?: number
  location?: string
  rawLine: string
}

const PLATE_REGEX = /([A-Z]{2}-\d{3}-[A-Z]{2})/

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function parseDateTime(rawDate: string, rawTime: string): string | null {
  const dateParts = rawDate.includes("-") ? rawDate.split("-") : rawDate.split("/")

  if (dateParts.length !== 3) {
    return null
  }

  let [day, month, year] = dateParts

  if (year.length === 2) {
    year = `20${year}`
  }

  const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${rawTime}`
  const date = new Date(isoDate)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

function splitBrandAndModel(vehicleText: string): { brand: string; model: string } | null {
  const normalized = normalizeWhitespace(vehicleText)
  if (!normalized) {
    return null
  }

  const parts = normalized.split(" ")
  if (parts.length < 2) {
    return { brand: parts[0], model: "" }
  }

  return {
    brand: parts[0],
    model: parts.slice(1).join(" "),
  }
}

function parseFormat1(line: string): ParsedVehicleEvent | null {
  const match = line.match(/^(.*?)\s+([A-Z]{2}-\d{3}-[A-Z]{2})\s+(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2}:\d{2})$/)

  if (!match) {
    return null
  }

  const [, vehicleText, plate, rawDate, rawTime] = match
  const vehicle = splitBrandAndModel(vehicleText)
  const eventDate = parseDateTime(rawDate, rawTime)

  if (!vehicle || !eventDate) {
    return null
  }

  return {
    plate,
    brand: vehicle.brand,
    model: vehicle.model,
    eventDate,
    eventType: "table_simple",
    rawLine: line,
  }
}

function parseFormat2(line: string): ParsedVehicleEvent | null {
  const match = line.match(/^(\d{2}\/\d{2}\/\d{2})\s+(\d{2}:\d{2}:\d{2})\s+([A-Z]{2}-\d{3}-[A-Z]{2})\s+-\s+(.+)$/)

  if (!match) {
    return null
  }

  const [, rawDate, rawTime, plate, tail] = match
  const eventDate = parseDateTime(rawDate, rawTime)

  if (!eventDate) {
    return null
  }

  const withDriver = tail.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  const vehicleText = withDriver ? withDriver[1] : tail
  const driver = withDriver ? normalizeWhitespace(withDriver[2]) : undefined
  const vehicle = splitBrandAndModel(vehicleText)

  if (!vehicle) {
    return null
  }

  return {
    plate,
    brand: vehicle.brand,
    model: vehicle.model,
    eventDate,
    eventType: "evento_simple",
    driver,
    rawLine: line,
  }
}

function extractVehicleDriverAndLocation(tail: string): {
  brand: string
  model: string
  driver?: string
  location?: string
} | null {
  const normalizedTail = normalizeWhitespace(tail)
  const withParen = normalizedTail.match(/^(.*?\([^)]*\))(?:\s+(.+))?$/)

  const vehicleAndDriverChunk = withParen ? withParen[1] : normalizedTail
  const location = withParen?.[2] ? normalizeWhitespace(withParen[2]) : undefined

  const vehicleDriverWithParen = vehicleAndDriverChunk.match(/^(.*?)\s+([^\s].*\([^)]*\))$/)

  if (vehicleDriverWithParen) {
    const vehicleText = vehicleDriverWithParen[1]
    const driverText = vehicleDriverWithParen[2]
    const vehicle = splitBrandAndModel(vehicleText)

    if (!vehicle) {
      return null
    }

    return {
      brand: vehicle.brand,
      model: vehicle.model,
      driver: normalizeWhitespace(driverText),
      location,
    }
  }

  const vehicle = splitBrandAndModel(vehicleAndDriverChunk)
  if (!vehicle) {
    return null
  }

  return {
    brand: vehicle.brand,
    model: vehicle.model,
    location,
  }
}

function parseFormat3(line: string): ParsedVehicleEvent | null {
  const match = line.match(/^(\d+)\s*Km\/h\s+(\d{2}\/\d{2}\/\d{2})\s+(\d{2}:\d{2}:\d{2})\s+([A-Z]{2}-\d{3}-[A-Z]{2})\s+-\s+(.+)$/i)

  if (!match) {
    return null
  }

  const [, rawSpeed, rawDate, rawTime, plate, tail] = match
  const eventDate = parseDateTime(rawDate, rawTime)

  if (!eventDate) {
    return null
  }

  const details = extractVehicleDriverAndLocation(tail)

  if (!details) {
    return null
  }

  return {
    plate,
    brand: details.brand,
    model: details.model,
    eventDate,
    eventType: "exceso_velocidad",
    driver: details.driver,
    speed: Number(rawSpeed),
    location: details.location,
    rawLine: line,
  }
}

export function parseVehicleEventLine(line: string): ParsedVehicleEvent | null {
  const normalizedLine = normalizeWhitespace(line)

  if (!normalizedLine || !PLATE_REGEX.test(normalizedLine)) {
    return null
  }

  return parseFormat3(normalizedLine) ?? parseFormat2(normalizedLine) ?? parseFormat1(normalizedLine)
}

/**
 * Parsea solo las líneas del body que contienen "Km/h" (exceso de velocidad)
 * y extrae: velocidad, fecha, hora, patente, modelo, ubicación.
 */
export function parseVehicleEventsFromBody(bodyText: string): ParsedVehicleEvent[] {
  const lines = bodyText.split(/\r?\n/)
  return lines
    .filter((line) => /Km\/h/i.test(line))
    .map((line) => parseVehicleEventLine(line))
    .filter((event): event is ParsedVehicleEvent => Boolean(event))
}
