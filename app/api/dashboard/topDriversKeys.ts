import type { DailyAlertVehicle } from "@/lib/firestore-read"
import { isSpeedExcessEvent } from "@/shared/eventClassification"
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

/**
 * Todas las combinaciones llave/conductor para un vehículo (sin recorte).
 * Importante para agregar por operación: un `.slice(0, 5)` aquí descartaba excesos
 * que luego no entraban al top por vehículo pero sí sumaban al total de la operación.
 */
export function buildTopDriversKeysByVehicle(v: DailyAlertVehicle): TopDriverKeyDTO[] {
  const speedIncidents = Array.isArray(v?.speedIncidents) ? v.speedIncidents : []
  const grouped = new Map<string, number>()
  const plate = v?.plate || v?.id || null
  const allEvents = Array.isArray(v?.events) ? v.events : []
  const eventsTruncated = Boolean(v?.eventsTruncated)
  const speedEventCount = allEvents.reduce((n, e) => n + (isSpeedExcessEvent(e) ? 1 : 0), 0)

  /**
   * Si tenemos la lista completa de eventos, contar 1 exceso por evento evita perder filas:
   * muchas veces `speedIncidents[].groupedEventsCount` o `eventIds` no reflejan todos los
   * eventos con el mismo `incidentKey`, y el bypass por `speedIncidentKeys` dejaba casi todo fuera.
   */
  const useEventLevelRanking = !eventsTruncated && speedEventCount > 0

  if (useEventLevelRanking) {
    for (const event of allEvents) {
      if (!isSpeedExcessEvent(event)) continue
      const driverName = normalizeDriverName(event?.driverName)
      const keyId = normalizeKeyId(event?.keyId)
      const compositeKey = `${driverName}__${keyId}`
      grouped.set(compositeKey, (grouped.get(compositeKey) || 0) + 1)
    }
  } else {
    const eventLookups = buildEventLookups(v?.events)

    for (const incident of speedIncidents) {
      const resolved = resolveIncidentFields(incident, eventLookups)
      const driverName = normalizeDriverName(resolved.driverName)
      const resolvedKeyId = resolved.keyId
      const keyId = normalizeKeyId(resolvedKeyId)
      const compositeKey = `${driverName}__${keyId}`
      grouped.set(compositeKey, (grouped.get(compositeKey) || 0) + toIncidentCount(incident))
    }

    const processedEventIds = new Set<string>()
    const speedIncidentKeys = new Set<string>()
    for (const incident of speedIncidents) {
      const ids = Array.isArray(incident?.eventIds) ? incident.eventIds : []
      for (const id of ids) {
        if (id != null && String(id) !== "") processedEventIds.add(String(id))
      }
      if (incident?.incidentKey != null && String(incident.incidentKey) !== "") {
        speedIncidentKeys.add(String(incident.incidentKey))
      }
    }

    for (const event of allEvents) {
      if (!isSpeedExcessEvent(event)) continue

      const eventId = event?.eventId
      if (eventId != null && String(eventId) !== "" && processedEventIds.has(String(eventId))) continue

      const gKey = event?.groupedSpeedIncidentKey
      if (gKey != null && String(gKey) !== "" && speedIncidentKeys.has(String(gKey))) continue

      const incKey = event?.incidentKey
      if (incKey != null && String(incKey) !== "" && speedIncidentKeys.has(String(incKey))) continue

      const driverName = normalizeDriverName(event?.driverName)
      const keyId = normalizeKeyId(event?.keyId)
      const compositeKey = `${driverName}__${keyId}`
      grouped.set(compositeKey, (grouped.get(compositeKey) || 0) + 1)
    }
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
}

/** Agregado por operación (top 3 para UI); incluye total atribuido en el ranking completo. */
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

  return Array.from(operationMap.entries()).map(([operationName, opGrouped]) => {
    const allRows = Array.from(opGrouped.entries())
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

    const topDriversKeysAttributedTotal = allRows.reduce((s, r) => s + r.excesos, 0)

    return {
      operationName,
      topDriversKeys: allRows.slice(0, 3),
      topDriversKeysAll: allRows,
      topDriversKeysAttributedTotal,
    }
  })
}
