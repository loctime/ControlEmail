import type { DailyAlertVehicle } from "@/lib/firestore-read"
import type {
  AdminTotalsDTO,
  DashboardVehicleDetailDTO,
  DailyBreakdownPointDTO,
  TopSpeedEventDTO,
} from "@/services/api/dashboard/types"

function getTopSpeedEvent(v: DailyAlertVehicle): TopSpeedEventDTO | null {
  const incidents = v.speedIncidents?.filter((i) => i.maxSpeed != null) ?? []
  if (incidents.length === 0) return null
  const top = incidents.reduce((best, i) =>
    (i.maxSpeed ?? 0) > (best.maxSpeed ?? 0) ? i : best,
  )
  if (top.maxSpeed == null) return null
  return {
    plate: v.plate,
    speed: top.maxSpeed,
    location: top.location ?? null,
    timestamp: top.lastEventAt ?? top.firstEventAt ?? null,
  }
}

function getMaxSpeed(v: DailyAlertVehicle): number | null {
  const incidents = v.speedIncidents?.filter((i) => i.maxSpeed != null) ?? []
  if (incidents.length === 0) return null
  return Math.max(...incidents.map((i) => i.maxSpeed!))
}

function mergeResponsablesFromDetails(details: DashboardVehicleDetailDTO[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const d of details) {
    const list =
      d.responsables != null && d.responsables.length > 0
        ? d.responsables
        : d.responsable
          ? [d.responsable]
          : []
    for (const r of list) {
      const trimmed = String(r).trim()
      const key = trimmed.toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(trimmed)
    }
  }
  return out
}

/** Build one DashboardVehicleDetailDTO from a single-day vehicle. */
export function buildVehicleDetailFromVehicle(v: DailyAlertVehicle): DashboardVehicleDetailDTO {
  const summary = v.summary ?? {}
  const responsables = Array.isArray(v.responsables)
    ? v.responsables.map((x) => String(x).trim()).filter(Boolean)
    : []
  return {
    plate: v.plate,
    operacion: v.operacion ?? v.operationName ?? null,
    responsable: responsables[0] ?? null,
    responsables: responsables.length > 0 ? responsables : undefined,
    lastEventAt: v.lastEventAt ?? null,
    excesos: summary.excesos ?? 0,
    maxSpeed: getMaxSpeed(v),
    topSpeedEvent: getTopSpeedEvent(v),
    speedingDrivers: Array.isArray(v.speedingDrivers) ? [...v.speedingDrivers] : [],
    llave_sin_cargar: summary.llave_sin_cargar ?? 0,
    no_identificados: summary.no_identificados ?? 0,
    contactos: summary.contactos ?? 0,
    conductor_inactivo: summary.conductor_inactivo ?? 0,
  }
}

/** Sum admin totals from a list of vehicle details. */
export function sumAdminTotals(details: DashboardVehicleDetailDTO[]): AdminTotalsDTO {
  return details.reduce(
    (acc, d) => ({
      llave_sin_cargar: acc.llave_sin_cargar + d.llave_sin_cargar,
      no_identificados: acc.no_identificados + d.no_identificados,
      contactos: acc.contactos + d.contactos,
      conductor_inactivo: acc.conductor_inactivo + d.conductor_inactivo,
    }),
    { llave_sin_cargar: 0, no_identificados: 0, contactos: 0, conductor_inactivo: 0 },
  )
}

/** Build admin totals from raw vehicles. */
export function buildAdminTotalsFromVehicles(vehicles: DailyAlertVehicle[]): AdminTotalsDTO {
  const details = vehicles.map(buildVehicleDetailFromVehicle)
  return sumAdminTotals(details)
}

/** Merge multiple details for the same plate (e.g. across days): excesos sum, maxSpeed max, topSpeedEvent with highest speed, speedingDrivers merged and deduped, admin counts sum. */
export function mergeVehicleDetails(details: DashboardVehicleDetailDTO[]): DashboardVehicleDetailDTO | null {
  if (details.length === 0) return null
  const first = details[0]
  if (details.length === 1) return first
  const excesos = details.reduce((s, d) => s + d.excesos, 0)
  const maxSpeed = details.reduce<number | null>((best, d) => {
    if (d.maxSpeed == null) return best
    return best == null ? d.maxSpeed : Math.max(best, d.maxSpeed)
  }, null)
  const topSpeedEvent = details.reduce<TopSpeedEventDTO | null>((best, d) => {
    if (!d.topSpeedEvent) return best
    if (!best) return d.topSpeedEvent
    return d.topSpeedEvent.speed > best.speed ? d.topSpeedEvent : best
  }, null)
  const driverSet = new Set<string>()
  for (const d of details) {
    for (const name of d.speedingDrivers) driverSet.add(name)
  }
  const lastEventAt = details.reduce<string | null>((best, d) => {
    if (!d.lastEventAt) return best
    if (!best) return d.lastEventAt
    return d.lastEventAt > best ? d.lastEventAt : best
  }, null)
  const operacion = first.operacion ?? null
  const mergedResp = mergeResponsablesFromDetails(details)
  const responsable = mergedResp[0] ?? null
  return {
    plate: first.plate,
    operacion,
    responsable,
    responsables: mergedResp.length > 0 ? mergedResp : undefined,
    lastEventAt,
    excesos,
    maxSpeed,
    topSpeedEvent,
    speedingDrivers: Array.from(driverSet),
    llave_sin_cargar: details.reduce((s, d) => s + d.llave_sin_cargar, 0),
    no_identificados: details.reduce((s, d) => s + d.no_identificados, 0),
    contactos: details.reduce((s, d) => s + d.contactos, 0),
    conductor_inactivo: details.reduce((s, d) => s + d.conductor_inactivo, 0),
  }
}

/** Build daily breakdown from daily results (for week response). */
export function buildDailyBreakdown(
  dailyResults: { dateKey: string; totalExcessEvents: number; avgRisk: number }[],
): DailyBreakdownPointDTO[] {
  return dailyResults.map((d) => ({
    date: d.dateKey,
    totalExcessEvents: d.totalExcessEvents,
    avgRisk: d.avgRisk,
  }))
}

