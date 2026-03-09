import { normalizeBusinessDate } from "@/lib/domain/date"
import { getAllEventsByPeriod, getDailyMetrics } from "@/lib/firestore-read"

export type DashboardRangePreset = "today" | "yesterday" | "7d" | "30d" | "custom"
export type EventTypeKey =
  | "excesos"
  | "no_identificados"
  | "contactos"
  | "llave_sin_cargar"
  | "conductor_inactivo"

export interface DashboardRange {
  preset: DashboardRangePreset
  startDate: string
  endDate: string
  dateKeys: string[]
}

export interface DashboardSummary {
  vehiclesMonitored: number
  vehiclesWithEvents: number
  totalEvents: number
  criticalEvents: number
  maxRisk: number
  avgRisk: number
}

export interface EventDistribution {
  excesos: number
  no_identificados: number
  contactos: number
  llave_sin_cargar: number
  conductor_inactivo: number
}

export interface CriticalAlertItem {
  plate: string
  eventType: EventTypeKey
  riskScore: number
}

export interface TopVehicleItem {
  plate: string
  events: number
  riskScore: number
}

export interface RecentEventItem {
  timestamp: string
  plate: string
  eventType: EventTypeKey
  riskScore: number
}

export interface RiskMapItem {
  plate: string
  events: number
  riskScore: number
  status: "verde" | "amarillo" | "rojo"
}

export interface TrendPoint {
  date: string
  events: number
}

interface VehicleAggregate {
  plate: string
  events: number
  riskScore: number
  lastEventAt: string | null
  eventTypes: Record<EventTypeKey, number>
}

interface FleetAggregationResult {
  summary: DashboardSummary
  distribution: EventDistribution
  topVehicles: TopVehicleItem[]
  criticalAlerts: CriticalAlertItem[]
  riskMap: RiskMapItem[]
  trend: TrendPoint[]
}

const EVENT_TYPE_KEYS: EventTypeKey[] = [
  "excesos",
  "no_identificados",
  "contactos",
  "llave_sin_cargar",
  "conductor_inactivo",
]

function emptyDistribution(): EventDistribution {
  return {
    excesos: 0,
    no_identificados: 0,
    contactos: 0,
    llave_sin_cargar: 0,
    conductor_inactivo: 0,
  }
}

function getTodayKey(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return formatter.format(new Date())
}

function offsetDate(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split("-").map(Number)
  const date = new Date(y, m - 1, d + deltaDays)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// NOTE: current boundaries are UTC-based; to fully align with business time
// (America/Argentina/Buenos_Aires), migrate this helper to timezone-local day bounds.
function dateToEpoch(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number)
  return Date.UTC(y, m - 1, d)
}

function dateRangeInclusive(startDate: string, endDate: string): string[] {
  const start = dateToEpoch(startDate)
  const end = dateToEpoch(endDate)
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) return []

  const out: string[] = []
  let cursor = startDate
  while (dateToEpoch(cursor) <= end) {
    out.push(cursor)
    cursor = offsetDate(cursor, 1)
  }
  return out
}

function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase()
}

export function parseDashboardRange(searchParams: URLSearchParams): DashboardRange {
  const presetParam = searchParams.get("range")
  const preset: DashboardRangePreset =
    presetParam === "today" ||
    presetParam === "yesterday" ||
    presetParam === "7d" ||
    presetParam === "30d" ||
    presetParam === "custom"
      ? presetParam
      : "7d"

  const today = getTodayKey()
  let startDate = today
  let endDate = today

  if (preset === "yesterday") {
    startDate = offsetDate(today, -1)
    endDate = startDate
  } else if (preset === "7d") {
    startDate = offsetDate(today, -6)
  } else if (preset === "30d") {
    startDate = offsetDate(today, -29)
  } else if (preset === "custom") {
    const rawStart = searchParams.get("startDate")
    const rawEnd = searchParams.get("endDate")
    if (rawStart) startDate = normalizeBusinessDate(rawStart)
    if (rawEnd) endDate = normalizeBusinessDate(rawEnd)
  }

  if (dateToEpoch(startDate) > dateToEpoch(endDate)) {
    const temp = startDate
    startDate = endDate
    endDate = temp
  }

  return {
    preset,
    startDate,
    endDate,
    dateKeys: dateRangeInclusive(startDate, endDate),
  }
}

function normalizeEventType(rawType: string): EventTypeKey {
  const value = rawType
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

  if (value.includes("exceso") || value.includes("speed")) return "excesos"
  if (value.includes("no_ident") || value.includes("no identificado") || value.includes("sin identificar")) {
    return "no_identificados"
  }
  if (value.includes("contact")) return "contactos"
  if (value.includes("llave") || value.includes("key")) return "llave_sin_cargar"
  if (value.includes("inactivo") || value.includes("inactive")) return "conductor_inactivo"
  return "contactos"
}

function riskStatus(riskScore: number): "verde" | "amarillo" | "rojo" {
  if (riskScore >= 6) return "rojo"
  if (riskScore >= 3) return "amarillo"
  return "verde"
}

function inferEventRisk(type: EventTypeKey, isCritical: boolean): number {
  const base: Record<EventTypeKey, number> = {
    excesos: 5,
    no_identificados: 4,
    contactos: 2,
    llave_sin_cargar: 3,
    conductor_inactivo: 4,
  }
  return Math.min(10, base[type] + (isCritical ? 1 : 0))
}

export async function aggregateFleetData(
  dateKeys: string[],
  allowedPlates: Set<string>,
): Promise<FleetAggregationResult> {
  const metricsByDay = await Promise.all(dateKeys.map((date) => getDailyMetrics(date)))
  const allowedNormalized = new Set(Array.from(allowedPlates).map(normalizePlate))

  const vehiclesMonitored = new Set<string>()
  const vehiclesWithEvents = new Set<string>()
  const vehicleMap = new Map<string, VehicleAggregate>()
  const distribution = emptyDistribution()
  const trend: TrendPoint[] = []

  let totalEvents = 0
  let criticalEvents = 0
  let maxRisk = 0
  let riskSum = 0
  let riskCount = 0

  for (let i = 0; i < dateKeys.length; i++) {
    const dateKey = dateKeys[i]
    const metrics = metricsByDay[i]
    let eventsOfDay = 0

    for (const vehicle of metrics.vehicles) {
      const plate = normalizePlate(vehicle.plate)
      if (!allowedNormalized.has(plate)) continue

      vehiclesMonitored.add(plate)
      const events = vehicle.summary.totalEvents ?? 0
      const riskScore = vehicle.riskScore ?? 0

      totalEvents += events
      eventsOfDay += events
      criticalEvents += vehicle.summary.criticalEvents ?? 0
      if (events > 0) vehiclesWithEvents.add(plate)

      if (riskScore > maxRisk) maxRisk = riskScore
      riskSum += riskScore
      riskCount++

      distribution.excesos += vehicle.summary.excesos ?? 0
      distribution.no_identificados += vehicle.summary.no_identificados ?? 0
      distribution.contactos += vehicle.summary.contactos ?? 0
      distribution.llave_sin_cargar += vehicle.summary.llave_sin_cargar ?? 0
      distribution.conductor_inactivo += vehicle.summary.conductor_inactivo ?? 0

      const existing = vehicleMap.get(plate)
      if (!existing) {
        vehicleMap.set(plate, {
          plate,
          events,
          riskScore,
          lastEventAt: vehicle.lastEventAt,
          eventTypes: {
            excesos: vehicle.summary.excesos ?? 0,
            no_identificados: vehicle.summary.no_identificados ?? 0,
            contactos: vehicle.summary.contactos ?? 0,
            llave_sin_cargar: vehicle.summary.llave_sin_cargar ?? 0,
            conductor_inactivo: vehicle.summary.conductor_inactivo ?? 0,
          },
        })
      } else {
        existing.events += events
        existing.riskScore = Math.max(existing.riskScore, riskScore)
        if ((vehicle.lastEventAt ?? "") > (existing.lastEventAt ?? "")) {
          existing.lastEventAt = vehicle.lastEventAt
        }
        for (const key of EVENT_TYPE_KEYS) {
          existing.eventTypes[key] += vehicle.summary[key] ?? 0
        }
      }
    }

    trend.push({ date: dateKey, events: eventsOfDay })
  }

  const topVehicles = Array.from(vehicleMap.values())
    .map((item) => ({
      plate: item.plate,
      events: item.events,
      riskScore: item.riskScore,
    }))
    .sort((a, b) => b.riskScore - a.riskScore || b.events - a.events || a.plate.localeCompare(b.plate))

  const criticalAlerts = Array.from(vehicleMap.values())
    .filter((item) => item.riskScore >= 6)
    .map((item) => {
      const dominantType = EVENT_TYPE_KEYS.reduce(
        (best, key) => (item.eventTypes[key] > item.eventTypes[best] ? key : best),
        "excesos" as EventTypeKey,
      )
      return {
        plate: item.plate,
        eventType: dominantType,
        riskScore: item.riskScore,
      }
    })
    .sort((a, b) => b.riskScore - a.riskScore || a.plate.localeCompare(b.plate))

  const riskMap = Array.from(vehicleMap.values())
    .map((item) => ({
      plate: item.plate,
      events: item.events,
      riskScore: item.riskScore,
      status: riskStatus(item.riskScore),
    }))
    .sort((a, b) => b.riskScore - a.riskScore || a.plate.localeCompare(b.plate))

  const summary: DashboardSummary = {
    vehiclesMonitored: vehiclesMonitored.size,
    vehiclesWithEvents: vehiclesWithEvents.size,
    totalEvents,
    criticalEvents,
    maxRisk,
    avgRisk: riskCount > 0 ? Math.round((riskSum / riskCount) * 100) / 100 : 0,
  }

  return {
    summary,
    distribution,
    topVehicles,
    criticalAlerts,
    riskMap,
    trend,
  }
}

export async function getRecentEvents(
  range: DashboardRange,
  allowedPlates: Set<string>,
  limit = 20,
): Promise<RecentEventItem[]> {
  const now = Date.now()
  const startEpoch = dateToEpoch(range.startDate)
  const endEpoch = dateToEpoch(range.endDate) + 24 * 60 * 60 * 1000 - 1
  const daysBack = Math.max(1, Math.ceil((now - startEpoch) / (24 * 60 * 60 * 1000)) + 1)
  const allowedNormalized = new Set(Array.from(allowedPlates).map(normalizePlate))

  const events = await getAllEventsByPeriod(daysBack, undefined, 500)

  return events
    .filter((event) => {
      const plate = normalizePlate(event.plate)
      if (!allowedNormalized.has(plate)) return false
      const ts = Date.parse(event.eventTimestamp)
      if (Number.isNaN(ts)) return false
      return ts >= startEpoch && ts <= endEpoch
    })
    .sort((a, b) => Date.parse(b.eventTimestamp) - Date.parse(a.eventTimestamp))
    .slice(0, limit)
    .map((event) => {
      const eventType = normalizeEventType(event.type)
      const isCritical = event.severity === "critico"
      return {
        timestamp: event.eventTimestamp,
        plate: normalizePlate(event.plate),
        eventType,
        riskScore: inferEventRisk(eventType, isCritical),
      }
    })
}

