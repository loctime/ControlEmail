export type FormatType = "table_simple" | "evento_simple" | "exceso_velocidad"

export type EventCategory =
  | "exceso_velocidad"
  | "llave_sin_cargar"
  | "conductor_inactivo"
  | "no_identificado"
  | "registro_simple"

export interface ParsedVehicleEvent {
  plate: string
  brand: string
  model: string
  eventDate: Date
  eventCategory: EventCategory
  formatType: FormatType
  driver?: string
  speed?: number
  location?: string
  rawLine: string
}

const PLATE_REGEX = /([A-Z]{2}-\d{3}-[A-Z]{2})/

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function parseDateTimeUtc(rawDate: string, rawTime: string): Date | null {
  const dateParts = rawDate.includes("-") ? rawDate.split("-") : rawDate.split("/")
  if (dateParts.length !== 3) {
    return null
  }

  let [day, month, year] = dateParts
  if (year.length === 2) {
    year = `20${year}`
  }

  const timeParts = rawTime.split(":")
  if (timeParts.length !== 3) {
    return null
  }

  const dd = Number(day)
  const mm = Number(month)
  const yyyy = Number(year)
  const hh = Number(timeParts[0])
  const min = Number(timeParts[1])
  const sec = Number(timeParts[2])

  if ([dd, mm, yyyy, hh, min, sec].some((n) => Number.isNaN(n))) {
    return null
  }

  const eventDate = new Date(Date.UTC(yyyy, mm - 1, dd, hh, min, sec))

  if (
    eventDate.getUTCFullYear() !== yyyy ||
    eventDate.getUTCMonth() !== mm - 1 ||
    eventDate.getUTCDate() !== dd ||
    eventDate.getUTCHours() !== hh ||
    eventDate.getUTCMinutes() !== min ||
    eventDate.getUTCSeconds() !== sec
  ) {
    return null
  }

  return eventDate
}

function splitBrandAndModel(vehicleText: string): { brand: string; model: string } | null {
  const normalized = normalizeWhitespace(vehicleText)
  if (!normalized) {
    return null
  }

  const words = normalized.split(" ")
  return {
    brand: words[0].toUpperCase(),
    model: words.slice(1).join(" "),
  }
}

function inferEventCategory(rawLine: string, formatType: FormatType): EventCategory {
  const lower = rawLine.toLowerCase()

  if (lower.includes("sin llave")) {
    return "llave_sin_cargar"
  }

  if (lower.includes("conductor inactivo")) {
    return "conductor_inactivo"
  }

  if (lower.includes("no identificado")) {
    return "no_identificado"
  }

  if (formatType === "exceso_velocidad") {
    return "exceso_velocidad"
  }

  return "registro_simple"
}

function parseFormat1(line: string): ParsedVehicleEvent | null {
  const match = line.match(/^(.*?)\s+([A-Z]{2}-\d{3}-[A-Z]{2})\s+(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2}:\d{2})$/)
  if (!match) {
    return null
  }

  const [, vehicleText, plate, rawDate, rawTime] = match
  const vehicle = splitBrandAndModel(vehicleText)
  const eventDate = parseDateTimeUtc(rawDate, rawTime)

  if (!vehicle || !eventDate) {
    return null
  }

  return {
    plate,
    brand: vehicle.brand,
    model: vehicle.model,
    eventDate,
    eventCategory: inferEventCategory(line, "table_simple"),
    formatType: "table_simple",
    rawLine: line,
  }
}

function parseFormat2(line: string): ParsedVehicleEvent | null {
  const match = line.match(/^(\d{2}\/\d{2}\/\d{2})\s+(\d{2}:\d{2}:\d{2})\s+([A-Z]{2}-\d{3}-[A-Z]{2})\s+-\s+(.+)$/)
  if (!match) {
    return null
  }

  const [, rawDate, rawTime, plate, tail] = match
  const eventDate = parseDateTimeUtc(rawDate, rawTime)
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
    eventCategory: inferEventCategory(driver ? `${line} ${driver}` : line, "evento_simple"),
    formatType: "evento_simple",
    driver,
    rawLine: line,
  }
}

function extractLocation(value: string): { main: string; location?: string } {
  const tokens = normalizeWhitespace(value).split(" ")
  const locationStarters = new Set(["ruta", "rn", "autopista", "av", "av.", "avenida", "calle", "km", "camino", "zona"])

  const locationIndex = tokens.findIndex((token) => locationStarters.has(token.toLowerCase()))
  if (locationIndex <= 0) {
    return { main: normalizeWhitespace(value) }
  }

  return {
    main: normalizeWhitespace(tokens.slice(0, locationIndex).join(" ")),
    location: normalizeWhitespace(tokens.slice(locationIndex).join(" ")),
  }
}

function extractDriverFromTail(mainText: string): { vehicleText: string; driver?: string } {
  const normalized = normalizeWhitespace(mainText)

  const driverMatchers = ["Conductor inactivo:", "No identificado", "Desconocido"]
  for (const marker of driverMatchers) {
    const idx = normalized.toLowerCase().indexOf(marker.toLowerCase())
    if (idx > 0) {
      return {
        vehicleText: normalizeWhitespace(normalized.slice(0, idx)),
        driver: normalizeWhitespace(normalized.slice(idx)),
      }
    }
  }

  const parenMatch = normalized.match(/^(.*?)\s+([^\s].*\([^)]*\))$/)
  if (parenMatch) {
    return {
      vehicleText: normalizeWhitespace(parenMatch[1]),
      driver: normalizeWhitespace(parenMatch[2]),
    }
  }

  return { vehicleText: normalized }
}

function parseFormat3(line: string): ParsedVehicleEvent | null {
  const match = line.match(/^(\d+)\s*Km\/h\s+(\d{2}\/\d{2}\/\d{2})\s+(\d{2}:\d{2}:\d{2})\s+([A-Z]{2}-\d{3}-[A-Z]{2})\s+-\s+(.+)$/i)
  if (!match) {
    return null
  }

  const [, speedRaw, rawDate, rawTime, plate, tail] = match
  const eventDate = parseDateTimeUtc(rawDate, rawTime)
  if (!eventDate) {
    return null
  }

  const speed = Number(speedRaw)
  if (Number.isNaN(speed)) {
    return null
  }

  const locationSplit = extractLocation(tail)
  const driverSplit = extractDriverFromTail(locationSplit.main)
  const vehicle = splitBrandAndModel(driverSplit.vehicleText)

  if (!vehicle) {
    return null
  }

  return {
    plate,
    brand: vehicle.brand,
    model: vehicle.model,
    eventDate,
    eventCategory: inferEventCategory(driverSplit.driver ? `${line} ${driverSplit.driver}` : line, "exceso_velocidad"),
    formatType: "exceso_velocidad",
    driver: driverSplit.driver,
    speed,
    location: locationSplit.location,
    rawLine: line,
  }
}

export function parseVehicleEventLine(line: string): ParsedVehicleEvent | null {
  const rawLine = normalizeWhitespace(line)
  if (!rawLine || !PLATE_REGEX.test(rawLine)) {
    return null
  }

  return parseFormat3(rawLine) ?? parseFormat2(rawLine) ?? parseFormat1(rawLine)
}

export function parseVehicleEventsFromBody(bodyText: string): ParsedVehicleEvent[] {
  return bodyText
    .split(/\r?\n/)
    .map((line) => parseVehicleEventLine(line))
    .filter((event): event is ParsedVehicleEvent => Boolean(event))
}
