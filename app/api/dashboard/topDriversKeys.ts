import type { DailyAlertVehicle } from "@/lib/firestore-read"
import type {
  DashboardVehicleDetailDTO,
  TopDriverKeyDTO,
  TopDriversKeysByOperationDTO,
} from "@/services/api/dashboard/types"

function normalizeDriverName(driverName: unknown): string {
  return driverName == null ? "—" : String(driverName)
}

function normalizeKeyId(keyId: unknown): string {
  return keyId == null ? "Sin llave asignada" : String(keyId)
}

function toIncidentCount(incident: { groupedEventsCount?: number | null } | undefined): number {
  const raw = incident?.groupedEventsCount
  const parsed = typeof raw === "number" ? raw : Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function parseKeyInfo(raw: unknown): { keyNumber: number | null; keyLabel: string } {
  if (raw == null) {
    return { keyNumber: null, keyLabel: "Sin llave asignada" }
  }
  const text = String(raw).trim()
  if (!text || text.toLowerCase() === "sin llave asignada") {
    return { keyNumber: null, keyLabel: "Sin llave asignada" }
  }
  const match = text.match(/llave[\s_-]*(\d+)/i) || text.match(/^(\d+)$/)
  const keyNumber = match ? Number(match[1]) : null
  const keyLabel = keyNumber !== null ? `Llave ${keyNumber}` : `Llave ${text}`
  return { keyNumber, keyLabel }
}

type IncidentLookupValue = { keyId: string | null; driverName: string | null }
type EventLookupValue = DailyAlertVehicle["events"][number]

function buildEventLookups(events: DailyAlertVehicle["events"] | undefined) {
  const incidentLookup = new Map<string, IncidentLookupValue>()
  const eventLookup = new Map<string, EventLookupValue>()
  const safeEvents = Array.isArray(events) ? events : []

  for (const event of safeEvents) {
    const eventId = event?.eventId
    if (eventId != null && !eventLookup.has(String(eventId))) {
      eventLookup.set(String(eventId), event)
    }

    const upsertIncident = (incidentRef: string | null | undefined) => {
      if (incidentRef == null) return
      const k = String(incidentRef)
      const prev = incidentLookup.get(k)
      incidentLookup.set(k, {
        keyId: prev?.keyId ?? event?.keyId ?? null,
        driverName: prev?.driverName ?? event?.driverName ?? null,
      })
    }

    upsertIncident(event?.incidentKey)
    upsertIncident(event?.groupedSpeedIncidentKey)
  }

  return { incidentLookup, eventLookup }
}

type SpeedIncident = DailyAlertVehicle["speedIncidents"][number]

function resolveIncidentFields(
  incident: SpeedIncident,
  lookups: ReturnType<typeof buildEventLookups>,
) {
  let keyId = incident?.keyId ?? null
  let driverName = incident?.driverName ?? null
  const incidentRefs = [incident?.groupedSpeedIncidentKey, incident?.incidentKey].filter(
    Boolean,
  ) as string[]

  for (const ref of incidentRefs) {
    const match = lookups.incidentLookup.get(String(ref))
    if (!match) continue
    if (keyId == null && match.keyId != null) keyId = match.keyId
    if (driverName == null && match.driverName != null) driverName = match.driverName
    if (keyId != null && driverName != null) break
  }

  if (keyId == null || driverName == null) {
    const incidentEventIds = Array.isArray(incident?.eventIds) ? incident.eventIds : []
    for (const eventId of incidentEventIds) {
      const event = lookups.eventLookup.get(String(eventId))
      if (!event) continue
      if (keyId == null && event?.keyId != null) keyId = event.keyId
      if (driverName == null && event?.driverName != null) driverName = event.driverName
      if (keyId != null && driverName != null) break
    }
  }

  return { keyId, driverName }
}

/** Top 5 combinaciones llave/conductor para un vehículo (paridad con backend Express). */
export function buildTopDriversKeysByVehicle(v: DailyAlertVehicle): TopDriverKeyDTO[] {
  const speedIncidents = Array.isArray(v?.speedIncidents) ? v.speedIncidents : []
  const grouped = new Map<string, number>()
  const plate = v?.plate || v?.id || null
  const eventLookups = buildEventLookups(v?.events)

  for (const incident of speedIncidents) {
    const resolved = resolveIncidentFields(incident, eventLookups)
    const driverName = normalizeDriverName(resolved.driverName)
    const resolvedKeyId = resolved.keyId
    const keyId = normalizeKeyId(resolvedKeyId)
    const compositeKey = `${driverName}__${keyId}`
    const current = grouped.get(compositeKey) || 0
    grouped.set(compositeKey, current + toIncidentCount(incident))
  }

  return Array.from(grouped.entries())
    .map(([compositeKey, excessCount]) => {
      const sep = compositeKey.indexOf("__")
      const driverName = sep >= 0 ? compositeKey.slice(0, sep) : compositeKey
      const keyId = sep >= 0 ? compositeKey.slice(sep + 2) : "Sin llave asignada"
      const keyInfo = parseKeyInfo(keyId)
      return {
        driverName,
        keyNumber: keyInfo.keyNumber,
        keyLabel: keyInfo.keyLabel,
        plate,
        excesos: excessCount,
      }
    })
    .sort((a, b) => b.excesos - a.excesos)
    .slice(0, 5)
}

/** Unir listas de top (ej. varios días del mismo vehículo) sumando excesos por llave/conductor/patente. */
export function mergeVehicleTopDriversKeys(lists: TopDriverKeyDTO[][]): TopDriverKeyDTO[] {
  const grouped = new Map<string, number>()
  const meta = new Map<string, TopDriverKeyDTO>()

  for (const list of lists) {
    for (const item of list) {
      const driverName = normalizeDriverName(item?.driverName)
      const keyNumber = item?.keyNumber ?? null
      const keyLabel = String(item?.keyLabel ?? "Sin llave asignada")
      const plate = item?.plate ?? null
      const compositeKey = `${driverName}__${String(keyNumber)}__${keyLabel}__${plate ?? ""}`
      grouped.set(compositeKey, (grouped.get(compositeKey) ?? 0) + (Number(item?.excesos) || 0))
      if (!meta.has(compositeKey)) {
        meta.set(compositeKey, {
          driverName,
          keyNumber,
          keyLabel,
          plate,
          excesos: 0,
        })
      }
    }
  }

  return Array.from(grouped.entries())
    .map(([k, excesos]) => {
      const base = meta.get(k)!
      return { ...base, excesos: Number(excesos) || 0 }
    })
    .sort((a, b) => b.excesos - a.excesos)
    .slice(0, 5)
}

/** Agregado por operación (top 3), paridad con backend Express. */
export function buildTopDriversKeysByOperation(
  vehicleDetails: DashboardVehicleDetailDTO[],
): TopDriversKeysByOperationDTO[] {
  const operationMap = new Map<string, Map<string, number>>()

  for (const detail of vehicleDetails) {
    const operation = detail?.operacion || "Sin operación"
    if (!operationMap.has(operation)) {
      operationMap.set(operation, new Map())
    }
    const opGrouped = operationMap.get(operation)!
    const items = Array.isArray(detail?.topDriversKeys) ? detail.topDriversKeys : []

    for (const item of items) {
      const driverName = normalizeDriverName(item?.driverName)
      const keyInfo = item?.keyLabel
        ? { keyNumber: item?.keyNumber ?? null, keyLabel: String(item.keyLabel) }
        : parseKeyInfo((item as TopDriverKeyDTO & { keyId?: unknown }).keyId)
      const plate = item?.plate || detail?.plate || null
      const compositeKey = `${driverName}__${String(keyInfo.keyNumber)}__${keyInfo.keyLabel}__${plate ?? ""}`
      opGrouped.set(compositeKey, (opGrouped.get(compositeKey) ?? 0) + (Number(item?.excesos) || 0))
    }
  }

  return Array.from(operationMap.entries()).map(([operationName, opGrouped]) => ({
    operationName,
    topDriversKeys: Array.from(opGrouped.entries())
      .map(([compositeKey, excessCount]) => {
        const parts = compositeKey.split("__")
        const driverName = parts[0] ?? "—"
        const keyNumberRaw = parts[1]
        const keyLabel = parts[2] ?? "Sin llave asignada"
        const plate = parts[3] === "" ? null : parts[3] ?? null
        const parsedNum =
          keyNumberRaw === "null" || keyNumberRaw === undefined ? NaN : Number(keyNumberRaw)
        const keyNumber = Number.isFinite(parsedNum) ? parsedNum : null

        return {
          keyNumber,
          keyLabel,
          driverName: driverName ?? "—",
          plate,
          excesos: Number(excessCount) || 0,
        }
      })
      .sort((a, b) => b.excesos - a.excesos)
      .slice(0, 3),
  }))
}
