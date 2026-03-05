/**
 * Lectura desde Firestore (apps/emails/vehicleEvents, apps/emails/vehicles) para las API routes.
 * Usa las mismas credenciales que email-local-ingest (FIREBASE_ADMIN_* o GOOGLE_*).
 */

import { createSign } from "node:crypto"

interface GoogleAccessToken {
  access_token: string
  expires_in: number
}

let cachedToken: { value: string; expiresAtMs: number } | null = null

function getEnvOrThrow(name: string, fallbackName?: string): string {
  const value =
    process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined)
  if (!value) {
    console.error("[firestore-read] Variable de entorno faltante:", {
      name,
      fallbackName,
      hasFallback: fallbackName ? !!process.env[fallbackName] : null,
    })
    throw new Error(
      `Missing required environment variable: ${name}${fallbackName ? ` or ${fallbackName}` : ""}`,
    )
  }
  return value
}

/** Log de qué variables de entorno están definidas (sin mostrar valores). */
function logEnvCheck(): void {
  const vars = [
    "FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
    "FIREBASE_ADMIN_PRIVATE_KEY",
  ]
  const state = Object.fromEntries(
    vars.map((v) => [v, !!process.env[v]])
  )
  console.log("[firestore-read] Env check:", state)
}

function toBase64Url(input: string): string {
  return Buffer.from(input).toString("base64url")
}

async function getGoogleAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAtMs > Date.now() + 60_000) {
    return cachedToken.value
  }
  logEnvCheck()
  console.log("[firestore-read] Obteniendo token de Google OAuth2...")
  const clientEmail = getEnvOrThrow(
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
  )
  const privateKey = getEnvOrThrow(
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
    "FIREBASE_ADMIN_PRIVATE_KEY",
  ).replace(/\\n/g, "\n")
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${toBase64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  )}`
  const signer = createSign("RSA-SHA256")
  signer.update(unsigned)
  signer.end()
  const assertion = `${unsigned}.${signer.sign(privateKey, "base64url")}`
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    console.error("[firestore-read] Error obteniendo token:", response.status, text)
    throw new Error(`Unable to obtain Google access token: ${response.status}`)
  }
  const token = (await response.json()) as GoogleAccessToken
  console.log("[firestore-read] Token obtenido correctamente")
  cachedToken = {
    value: token.access_token,
    expiresAtMs: Date.now() + token.expires_in * 1000,
  }
  return token.access_token
}

function fromFirestoreValue(value: Record<string, unknown>): unknown {
  if ("stringValue" in value) return value.stringValue
  if ("integerValue" in value) return Number(value.integerValue)
  if ("doubleValue" in value) return value.doubleValue
  if ("booleanValue" in value) return value.booleanValue
  if ("nullValue" in value) return null
  if ("timestampValue" in value) return value.timestampValue
  if ("arrayValue" in value) {
    const arr = (value.arrayValue as { values?: Record<string, unknown>[] })?.values ?? []
    return arr.map((v) => fromFirestoreValue(v))
  }
  if ("mapValue" in value) {
    const fields = (value.mapValue as { fields?: Record<string, Record<string, unknown>> })?.fields ?? {}
    return Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, fromFirestoreValue(v)]),
    )
  }
  return null
}

function parseFields(fields: Record<string, Record<string, unknown>>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [k, fromFirestoreValue(v)]),
  )
}

interface FirestoreRequestOptions {
  /** Si true, 404 se loguea como info en lugar de error (ej. meta opcional). */
  quiet404?: boolean
}

async function firestoreRequest(
  path: string,
  init: RequestInit,
  options?: FirestoreRequestOptions
): Promise<Response> {
  const projectId = getEnvOrThrow(
    "FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  )
  const token = await getGoogleAccessToken()
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/${path}`
  console.log("[firestore-read] Request Firestore:", { projectId, path })
  const res = await fetch(
    url,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    },
  )
  if (!res.ok) {
    const body = await res.clone().text()
    if (res.status === 404 && options?.quiet404) {
      console.log("[firestore-read] Document not found (expected):", path)
    } else {
      console.error("[firestore-read] Firestore request failed:", { status: res.status, path, body: body.slice(0, 300) })
    }
  } else {
    console.log("[firestore-read] Firestore request OK:", { path, status: res.status })
  }
  return res
}

/** Resultado tipado de una llamada a documents:runQuery. */
interface FirestoreRunQueryDocument {
  name: string
  fields?: Record<string, Record<string, unknown>>
}

interface FirestoreRunQueryResponse {
  document?: FirestoreRunQueryDocument
  readTime?: string
  skippedResults?: number
}

export interface StructuredQueryOrder {
  field: string
  direction: "ASCENDING" | "DESCENDING"
}

export interface StructuredQueryFilter {
  field: string
  op:
    | "EQUAL"
    | "GREATER_THAN_OR_EQUAL"
    | "LESS_THAN"
    | "LESS_THAN_OR_EQUAL"
  value: string | number
}

export interface RunStructuredQueryParams {
  parent: string
  collectionId: string
  filters: StructuredQueryFilter[]
  orderBy: StructuredQueryOrder[]
  limit: number
  startAfter?: string
}

export interface RunStructuredQueryResult {
  documents: Array<{ id: string; data: Record<string, unknown> }>
  nextCursor?: string
}

/**
 * Helper reutilizable para ejecutar consultas estructuradas (documents:runQuery) sobre Firestore.
 * IMPORTANTE: requiere índices compuestos adecuados según los filtros/orden usados.
 */
async function runStructuredQuery(params: RunStructuredQueryParams): Promise<RunStructuredQueryResult> {
  const projectId = getEnvOrThrow(
    "FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  )

  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId: params.collectionId }],
    where: {
      compositeFilter: {
        op: "AND",
        filters: params.filters.map((f) => ({
          fieldFilter: {
            field: { fieldPath: f.field },
            op: f.op,
            value:
              typeof f.value === "number"
                ? { doubleValue: f.value }
                : { stringValue: f.value },
          },
        })),
      },
    },
    orderBy: params.orderBy.map((o) => ({
      field: { fieldPath: o.field },
      direction: o.direction,
    })),
    limit: params.limit,
  }

  if (params.startAfter) {
    structuredQuery.startAt = {
      values: [{ stringValue: params.startAfter }],
      before: false,
    }
  }

  const path = `documents:runQuery`
  const urlPath = `${path}`

  console.log("[firestore-read] runStructuredQuery request:", {
    projectId,
    parent: params.parent,
    collectionId: params.collectionId,
    filters: params.filters,
    orderBy: params.orderBy,
    limit: params.limit,
    startAfter: params.startAfter ?? null,
  })

  const token = await getGoogleAccessToken()
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/${urlPath}`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: params.parent,
      structuredQuery,
    }),
  })

  if (!res.ok) {
    const body = await res.clone().text()
    console.error("[firestore-read] runStructuredQuery failed:", {
      status: res.status,
      body: body.slice(0, 300),
    })
    throw new Error(`Firestore runQuery failed: ${res.status}`)
  }

  const json = (await res.json()) as FirestoreRunQueryResponse[]

  const documents: Array<{ id: string; data: Record<string, unknown> }> = []
  let lastTimestamp: string | undefined

  for (const entry of json) {
    if (!entry.document || !entry.document.name) continue
    const doc = entry.document
    const id = doc.name.split("/").pop() ?? ""
    const data = doc.fields ? parseFields(doc.fields) : {}
    documents.push({ id, data })

    const tsCandidate = (data as Record<string, unknown>).eventTimestamp
    if (typeof tsCandidate === "string") {
      lastTimestamp = tsCandidate
    }
  }

  const nextCursor = documents.length === params.limit && lastTimestamp
    ? lastTimestamp
    : undefined

  console.log("[firestore-read] runStructuredQuery OK:", {
    count: documents.length,
    nextCursor: nextCursor ?? null,
  })

  return { documents, nextCursor }
}

export interface VehicleEventDoc {
  id: string
  plate: string
  brand: string
  model: string
  /** Fecha del evento en formato YYYY-MM-DD (día de referencia del sistema). */
  dateKey?: string
  /** Fecha/hora del evento, ej. "2026-03-03T13:13:46-03:00". */
  eventTimestamp?: string
  eventId?: string
  eventDate: string
  eventCategory: string
  formatType: string
  driver?: string
  driverName?: string | null
  speed?: number
  location?: string
  rawLine?: string
  rawEmailId?: string
  createdAt?: string
  /** Severidad: critico, etc. */
  severity?: string
  type?: string
  hasSpeed?: boolean
}

export interface VehicleDoc {
  id: string
  plate: string
  brand: string
  model: string
  lastLocation?: string | null
  lastEventAt?: string
  lastEventId?: string
  driver?: string | null
  updatedAt?: string
  /** Responsables (emails) para alertas. Si no existe en el documento, se devuelve []. */
  responsables: string[]
}

/**
 * Comprueba si existe el documento apps/emails/users/{email}.
 * El email se normaliza (trim + lowercase). Usado para autorización de acceso.
 * El ID del documento en Firestore debe ser exactamente el email normalizado (ej: user@domain.com).
 */
export async function allowedUserExistsByEmail(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false
  const docPath = `apps/emails/users/${encodeURIComponent(normalized)}`
  const path = `documents/${docPath}`
  const res = await firestoreRequest(path, { method: "GET" }, { quiet404: true })
  const exists = res.ok
  console.log("[auth] allowedUserExistsByEmail:", {
    email: normalized,
    path: docPath,
    exists,
    status: res.status,
  })
  return exists
}

/**
 * Lista documentos de una colección (una página).
 * La REST API espera path con segmentos reales: documents/apps/emails/vehicleEvents
 * (NO codificar barras como %2F, sino la API interpreta una sola colección raíz y devuelve 0).
 */
export async function listCollection(
  collectionPath: string,
  pageSize = 200,
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  console.log("[firestore-read] listCollection:", { collectionPath, pageSize })
  const path = `documents/${collectionPath}?pageSize=${pageSize}`
  const res = await firestoreRequest(path, { method: "GET" })
  if (!res.ok) {
    console.error("[firestore-read] listCollection failed:", { collectionPath, status: res.status })
    if (res.status === 404) return []
    throw new Error(`Firestore list failed: ${res.status}`)
  }
  const json = (await res.json()) as {
    documents?: Array<{
      name: string
      fields?: Record<string, Record<string, unknown>>
    }>
  }
  const documents = json.documents ?? []
  console.log("[firestore-read] listCollection OK:", { collectionPath, count: documents.length })
  return documents.map((doc) => {
    const id = doc.name.split("/").pop() ?? ""
    const data = doc.fields ? parseFields(doc.fields) : {}
    return { id, data }
  })
}

/** Máximo de eventos a leer para el dashboard/API (Firestore limita por página). */
const VEHICLE_EVENTS_PAGE_SIZE = 500

export async function listVehicleEvents(): Promise<VehicleEventDoc[]> {
  const path = "apps/emails/vehicleEvents"
  console.log("[firestore-read] listVehicleEvents: leyendo desde", path)
  const items = await listCollection(path, VEHICLE_EVENTS_PAGE_SIZE)
  console.log("[firestore-read] listVehicleEvents: leídos", items.length, "eventos")
  return items.map(({ id, data }) => {
    const rawDate = data.eventDate
    let eventDate = ""
    if (typeof rawDate === "string") eventDate = rawDate
    else if (rawDate && typeof rawDate === "object" && "timestampValue" in (rawDate as Record<string, unknown>))
      eventDate = (rawDate as { timestampValue: string }).timestampValue
    const dateKey = typeof data.dateKey === "string" ? data.dateKey : undefined
    const eventTimestamp = typeof data.eventTimestamp === "string" ? data.eventTimestamp : undefined
    return {
      id,
      plate: String(data.plate ?? data.plateNormalized ?? ""),
      brand: String(data.brand ?? ""),
      model: String(data.model ?? ""),
      dateKey,
      eventTimestamp,
      eventId: data.eventId != null ? String(data.eventId) : undefined,
      eventDate,
      eventCategory: String(
        data.eventCategory ?? data.event_category ?? data.type ?? "exceso_velocidad"
      ),
      formatType: String(data.formatType ?? "exceso_velocidad"),
      driver: data.driver != null ? String(data.driver) : undefined,
      driverName: data.driverName != null ? String(data.driverName) : data.driver != null ? String(data.driver) : undefined,
      speed: data.speed != null ? Number(data.speed) : undefined,
      location: data.location != null ? String(data.location) : undefined,
      rawLine: data.rawLine != null ? String(data.rawLine) : undefined,
      rawEmailId: data.rawEmailId != null ? String(data.rawEmailId) : undefined,
      createdAt: data.createdAt != null ? String(data.createdAt) : undefined,
      severity: data.severity != null ? String(data.severity) : undefined,
      type: data.type != null ? String(data.type) : undefined,
      hasSpeed: data.hasSpeed === true,
    }
  })
}

export async function listVehicles(): Promise<VehicleDoc[]> {
  const path = "apps/emails/vehicles"
  console.log("[firestore-read] listVehicles: leyendo desde", path)
  const items = await listCollection(path)
  console.log("[firestore-read] listVehicles: leídos", items.length, "vehículos")
  return items.map(({ id, data }) => {
    const rawResponsables = data.responsables
    const responsables = Array.isArray(rawResponsables)
      ? (rawResponsables as unknown[]).map((v) => String(v))
      : []
    return {
      id,
      plate: String(data.plate ?? id),
      brand: String(data.brand ?? ""),
      model: String(data.model ?? ""),
      lastLocation: data.lastLocation != null ? String(data.lastLocation) : null,
      lastEventAt: data.lastEventAt != null ? String(data.lastEventAt) : undefined,
      lastEventId: data.lastEventId != null ? String(data.lastEventId) : undefined,
      driver: data.driver != null ? String(data.driver) : null,
      updatedAt: data.updatedAt != null ? String(data.updatedAt) : undefined,
      responsables,
    }
  })
}

/**
 * Obtiene un vehículo específico por patente.
 */
export async function getVehicleByPlate(plate: string): Promise<VehicleDoc | null> {
  const docPath = `apps/emails/vehicles/${encodeURIComponent(plate)}`
  const path = `documents/${docPath}`
  const res = await firestoreRequest(path, { method: "GET" })
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`Firestore get failed: ${res.status}`)
  }
  const json = (await res.json()) as {
    name?: string
    fields?: Record<string, Record<string, unknown>>
  }
  if (!json.fields) return null
  const id = json.name?.split("/").pop() ?? plate
  const data = parseFields(json.fields)
  const rawResponsables = data.responsables
  const responsables = Array.isArray(rawResponsables)
    ? (rawResponsables as unknown[]).map((v) => String(v))
    : []
  return {
    id,
    plate: String(data.plate ?? plate),
    brand: String(data.brand ?? ""),
    model: String(data.model ?? ""),
    lastLocation: data.lastLocation != null ? String(data.lastLocation) : null,
    lastEventAt: data.lastEventAt != null ? String(data.lastEventAt) : undefined,
    lastEventId: data.lastEventId != null ? String(data.lastEventId) : undefined,
    driver: data.driver != null ? String(data.driver) : null,
    updatedAt: data.updatedAt != null ? String(data.updatedAt) : undefined,
    responsables,
  }
}

/**
 * Obtiene eventos de un vehículo específico, filtrados por rango de fechas.
 * La estructura esperada es según la especificación del usuario:
 * - type: string
 * - severity: "critico" | "advertencia"
 * - eventTimestamp: string (ISO)
 * - speed?: number
 * - location?: string
 * - reason?: string
 */
export interface VehicleEventDashboard {
  id: string
  plate: string
  type: string
  severity: "critico" | "advertencia"
  eventTimestamp: string
  speed?: number
  location?: string
  reason?: string
  driver?: string | null
}

/**
 * Obtiene eventos de un vehículo específico usando documents:runQuery con:
 * - where plate == y eventTimestamp >= cutoff
 * - orderBy eventTimestamp DESC
 * - paginación por cursor basado en eventTimestamp.
 *
 * Índice requerido:
 * - collectionId: apps/emails/vehicleEvents
 *   fields: [plate ASC, eventTimestamp DESC]
 */
export async function getVehicleEventsByPlate(
  plate: string,
  daysBack?: number,
  cursor?: string,
  limit = 50,
): Promise<VehicleEventDashboard[]> {
  const upperPlate = plate.toUpperCase()
  const now = new Date()
  const cutoffDate = daysBack
    ? new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const cutoffIso = cutoffDate.toISOString()

  console.log("[firestore-read] getVehicleEventsByPlate (runQuery):", {
    plate: upperPlate,
    daysBack,
    cutoffIso,
    cursor: cursor ?? null,
    limit,
  })

  const { documents } = await runStructuredQuery({
    parent: `projects/${getEnvOrThrow("FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID")}/databases/(default)/documents/apps/emails`,
    collectionId: "vehicleEvents",
    filters: [
      { field: "plate", op: "EQUAL", value: upperPlate },
      { field: "eventTimestamp", op: "GREATER_THAN_OR_EQUAL", value: cutoffIso },
    ],
    orderBy: [{ field: "eventTimestamp", direction: "DESCENDING" }],
    limit,
    startAfter: cursor,
  })

  const mapped: VehicleEventDashboard[] = documents
    .map(({ id, data }) => {
      const eventTimestamp =
        typeof data.eventTimestamp === "string"
          ? (data.eventTimestamp as string)
          : typeof data.eventDate === "string"
            ? (data.eventDate as string)
            : typeof data.createdAt === "string"
              ? (data.createdAt as string)
              : ""

      if (!eventTimestamp) {
        return null
      }

      const type = String(
        (data.type ??
          data.eventCategory ??
          data.formatType ??
          "") as string,
      )

      let severity: "critico" | "advertencia" = "advertencia"
      if (typeof data.severity === "string") {
        const sev = (data.severity as string).toLowerCase()
        if (sev === "critico" || sev === "crítico") {
          severity = "critico"
        }
      } else if (data.speed != null) {
        const speedNum = Number(data.speed)
        severity = speedNum >= 100 ? "critico" : "advertencia"
      }

      return {
        id,
        plate: String(data.plate ?? "").toUpperCase(),
        type,
        severity,
        eventTimestamp,
        speed: data.speed != null ? Number(data.speed) : undefined,
        location: data.location != null ? String(data.location) : undefined,
        reason: data.reason != null ? String(data.reason) : undefined,
        driver: data.driver != null ? String(data.driver) : null,
      } as VehicleEventDashboard
    })
    .filter((item): item is VehicleEventDashboard => item !== null)

  console.log("[firestore-read] getVehicleEventsByPlate: fetched", mapped.length, "eventos para", upperPlate)
  return mapped
}

/**
 * Obtiene todos los eventos de un período específico (sin filtrar por patente).
 * Usado para calcular rankings y comparaciones.
 */
/**
 * Obtiene todos los eventos de un período específico usando documents:runQuery con:
 * - where eventTimestamp >= cutoff
 * - orderBy eventTimestamp DESC
 * - paginación por cursor basado en eventTimestamp.
 *
 * Índice requerido:
 * - collectionId: apps/emails/vehicleEvents
 *   fields: [eventTimestamp DESC]
 */
export async function getAllEventsByPeriod(
  daysBack: number,
  cursor?: string,
  limit = 200,
): Promise<VehicleEventDashboard[]> {
  const now = new Date()
  const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
  const cutoffIso = cutoffDate.toISOString()

  console.log("[firestore-read] getAllEventsByPeriod (runQuery):", {
    daysBack,
    cutoffIso,
    cursor: cursor ?? null,
    limit,
  })

  const { documents } = await runStructuredQuery({
    parent: `projects/${getEnvOrThrow("FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID")}/databases/(default)/documents/apps/emails`,
    collectionId: "vehicleEvents",
    filters: [
      { field: "eventTimestamp", op: "GREATER_THAN_OR_EQUAL", value: cutoffIso },
    ],
    orderBy: [{ field: "eventTimestamp", direction: "DESCENDING" }],
    limit,
    startAfter: cursor,
  })

  const mapped: VehicleEventDashboard[] = documents
    .map(({ id, data }) => {
      const eventTimestamp =
        typeof data.eventTimestamp === "string"
          ? (data.eventTimestamp as string)
          : typeof data.eventDate === "string"
            ? (data.eventDate as string)
            : typeof data.createdAt === "string"
              ? (data.createdAt as string)
              : ""

      if (!eventTimestamp) {
        return null
      }

      const type = String(
        (data.type ??
          data.eventCategory ??
          data.formatType ??
          "") as string,
      )

      let severity: "critico" | "advertencia" = "advertencia"
      if (typeof data.severity === "string") {
        const sev = (data.severity as string).toLowerCase()
        if (sev === "critico" || sev === "crítico") {
          severity = "critico"
        }
      } else if (data.speed != null) {
        const speedNum = Number(data.speed)
        severity = speedNum >= 100 ? "critico" : "advertencia"
      }

      return {
        id,
        plate: String(data.plate ?? "").toUpperCase(),
        type,
        severity,
        eventTimestamp,
        speed: data.speed != null ? Number(data.speed) : undefined,
        location: data.location != null ? String(data.location) : undefined,
        reason: data.reason != null ? String(data.reason) : undefined,
        driver: data.driver != null ? String(data.driver) : null,
      } as VehicleEventDashboard
    })
    .filter((item): item is VehicleEventDashboard => item !== null)

  console.log("[firestore-read] getAllEventsByPeriod: fetched", mapped.length, "eventos")
  return mapped
}

/** Convierte valores a formato de campos Firestore REST API. */
function toFirestoreFields(fields: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {}
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) {
      out[k] = {
        arrayValue: {
          values: v.map((item) => ({ stringValue: String(item) })),
        },
      }
    } else if (typeof v === "boolean") {
      out[k] = { booleanValue: v }
    } else if (typeof v === "string") {
      out[k] = { stringValue: v }
    } else if (typeof v === "number") {
      out[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
    }
  }
  return out
}

export interface VehicleAlertsUpdate {
  responsables: string[]
}

/**
 * Actualiza responsables de un vehículo en apps/emails/vehicles/{plate}.
 * Si el documento no tiene responsables, se escriben los enviados (no se inicializa en lectura).
 */
export async function updateVehicleAlerts(
  plate: string,
  payload: VehicleAlertsUpdate,
): Promise<void> {
  const docPath = `apps/emails/vehicles/${encodeURIComponent(plate)}`
  const path = `documents/${docPath}?updateMask.fieldPaths=responsables`
  const projectId = getEnvOrThrow(
    "FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  )
  const documentName = `projects/${projectId}/databases/(default)/documents/${docPath}`
  const body = {
    name: documentName,
    fields: toFirestoreFields({
      responsables: payload.responsables,
    }),
  }
  const res = await firestoreRequest(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error("[firestore-read] updateVehicleAlerts failed:", res.status, text)
    throw new Error(`Firestore update failed: ${res.status}`)
  }
  console.log("[firestore-read] updateVehicleAlerts OK:", plate)
}

// Daily Alerts structure for new email module
export interface DailyAlertVehicle {
  plate: string
  summary: {
    totalEvents: number
    criticalEvents: number
    warningEvents: number
    noKeyEvents: number
    /** Excesos de velocidad del día (desde dailyAlerts). */
    excesos?: number
  }
  /** Risk score agregado calculado en backend. Si falta en origen, se expone como null. */
  riskScore: number | null
  alertSent: boolean
  sentAt?: string
  events: string[]
  /** Último evento conocido del día. Si falta en origen, se expone como null. */
  lastEventAt: string | null
}

export interface DailyAlertMeta {
  totalEvents: number
  totalVehicles: number
  totalCriticos: number
  totalAdvertencias: number
  vehiclesWithCritical: number
  /** Timestamp ISO de generación de métricas; null si no existe en origen. */
  generatedAt: string | null
  lastUpdatedAt?: string
}

export interface DailyAlertsResponse {
  meta: DailyAlertMeta
  vehicles: DailyAlertVehicle[]
}

/** Formato del documento del día en Firestore: YYYY-MM-DD (ej. 2026-03-03). */
function toDailyDocId(date: string): string {
  const normalized = date.replace(/-/g, "").trim()
  if (normalized.length >= 8) {
    return `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`
  }
  return date
}

function parseMetaFromFields(data: Record<string, unknown>): DailyAlertMeta {
  return {
    totalEvents: Number(data.totalEvents ?? 0),
    totalVehicles: Number(data.totalVehicles ?? 0),
    totalCriticos: Number(data.totalCriticos ?? 0),
    totalAdvertencias: Number(data.totalAdvertencias ?? 0),
    vehiclesWithCritical: Number(data.vehiclesWithCritical ?? 0),
    generatedAt: data.generatedAt != null ? String(data.generatedAt) : null,
    lastUpdatedAt: data.lastUpdatedAt ? String(data.lastUpdatedAt) : undefined,
  }
}

/** Mapea summary del doc (excesos, no_identificados, contactos...) al formato esperado. */
function parseVehicleSummary(summary: Record<string, unknown>): DailyAlertVehicle["summary"] {
  const excesos = Number(summary.excesos ?? 0)
  const noIdentificados = Number(summary.no_identificados ?? summary.noKeyEvents ?? 0)
  const contactos = Number(summary.contactos ?? 0)
  const totalFromFields = excesos + noIdentificados + contactos +
    Number(summary.conductor_inactivo ?? 0) + Number(summary.llave_sin_cargar ?? 0)
  return {
    totalEvents: Number(summary.totalEvents ?? totalFromFields ?? 0),
    criticalEvents: Number(summary.criticalEvents ?? excesos + noIdentificados ?? 0),
    warningEvents: Number(summary.warningEvents ?? 0),
    noKeyEvents: Number(summary.noKeyEvents ?? summary.llave_sin_cargar ?? 0),
    excesos,
  }
}

export async function getDailyMetrics(date: string): Promise<DailyAlertsResponse> {
  const dateDocId = toDailyDocId(date)
  const basePath = `apps/emails/dailyAlerts/${dateDocId}`
  
  const defaultMeta: DailyAlertMeta = {
    totalEvents: 0,
    totalVehicles: 0,
    totalCriticos: 0,
    totalAdvertencias: 0,
    vehiclesWithCritical: 0,
    generatedAt: null,
    lastUpdatedAt: undefined,
  }

  // Get meta: primero meta/meta, si 404 intentar documento del día (meta en el doc)
  const metaPath = `documents/${basePath}/meta/meta`
  const metaRes = await firestoreRequest(metaPath, { method: "GET" }, { quiet404: true })
  let meta: DailyAlertMeta = defaultMeta
  
  if (metaRes.ok) {
    const metaJson = await metaRes.json()
    if (metaJson.fields) {
      meta = parseMetaFromFields(parseFields(metaJson.fields))
    }
  } else if (metaRes.status === 404) {
    const dateDocPath = `documents/${basePath}`
    const dateDocRes = await firestoreRequest(dateDocPath, { method: "GET" }, { quiet404: true })
    if (dateDocRes.ok) {
      const dateDocJson = await dateDocRes.json()
      if (dateDocJson.fields) {
        meta = parseMetaFromFields(parseFields(dateDocJson.fields))
      }
    }
  }
  
  // Get vehicles (subcolección dailyAlerts/{dateKey}/vehicles)
  const vehiclesPath = `documents/${basePath}/vehicles`
  const vehiclesRes = await firestoreRequest(vehiclesPath, { method: "GET" })
  const vehicles: DailyAlertVehicle[] = []
  
  if (vehiclesRes.ok) {
    const vehiclesJson = await vehiclesRes.json()
    const docList = vehiclesJson.documents ?? []
    if (docList.length === 0) {
      console.log("[firestore-read] getDailyMetrics: sin documentos en", vehiclesPath, "(¿generaste alertas para esta fecha?)")
    }
    for (const doc of docList) {
        const plate = doc.name.split("/").pop() ?? ""
        const data = parseFields(doc.fields ?? {})
        const summary = (data.summary ?? {}) as Record<string, unknown>
        const events = Array.isArray(data.events) ? data.events : []
        vehicles.push({
          plate,
          summary: parseVehicleSummary(summary),
          riskScore: typeof data.riskScore === "number" ? (data.riskScore as number) : null,
          alertSent: Boolean(data.alertSent ?? false),
          sentAt: data.sentAt ? String(data.sentAt) : undefined,
          events,
          lastEventAt: typeof data.lastEventAt === "string" ? (data.lastEventAt as string) : null,
        })
      }
  }
  
  return { meta, vehicles }
}

export async function getPendingDailyAlerts(): Promise<DailyAlertVehicle[]> {
  const { getYesterdayKey } = await import("@/lib/domain/date")
  const dateKey = getYesterdayKey()
  const metrics = await getDailyMetrics(dateKey)
  return metrics.vehicles.filter((v) => !v.alertSent)
}

export interface MarkAlertSentResult {
  requested: number
  updated: string[]
  failed: Array<{ plate: string; error: string }>
}

export async function markAlertSent(alertIds: string[]): Promise<MarkAlertSentResult> {
  const { getYesterdayKey } = await import("@/lib/domain/date")
  const dateDocId = toDailyDocId(getYesterdayKey())
  
  const result: MarkAlertSentResult = { requested: alertIds.length, updated: [], failed: [] }

  for (const plate of alertIds) {
    const docPath = `apps/emails/dailyAlerts/${dateDocId}/vehicles/${encodeURIComponent(plate)}`
    const path = `documents/${docPath}?updateMask.fieldPaths=alertSent&updateMask.fieldPaths=sentAt`
    
    const projectId = getEnvOrThrow(
      "FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    )
    const documentName = `projects/${projectId}/databases/(default)/documents/${docPath}`
    const body = {
      name: documentName,
      fields: toFirestoreFields({
        alertSent: true,
        sentAt: new Date().toISOString()
      }),
    }
    
    const res = await firestoreRequest(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
    
    if (!res.ok) {
      console.error(`[firestore-read] markAlertSent failed for ${plate}:`, res.status)
      result.failed.push({ plate, error: `status_${res.status}` })
      continue
    }

    result.updated.push(plate)
  }

  return result
}

export interface DailyConsistency {
  expectedTotal: number
  actualTotal: number
  /** Estado de consistencia reportado por el proceso batch. */
  isConsistent: boolean
  /** Timestamp ISO de la última verificación; null si no existe en origen. */
  lastChecked: string | null
  discrepancies?: Array<{
    plate: string
    expected: number
    actual: number
  }>
}

export async function getDailyConsistency(date: string): Promise<DailyConsistency> {
  const dateDocId = toDailyDocId(date)
  const docPath = `apps/emails/dailyAlerts/${dateDocId}/consistency/check`
  const path = `documents/${docPath}`
  
  const res = await firestoreRequest(path, { method: "GET" })
  
  if (!res.ok) {
    if (res.status === 404) {
      // Si no existe documento de consistencia, devolvemos estructura vacía sin inventar timestamps.
      return {
        expectedTotal: 0,
        actualTotal: 0,
        isConsistent: false,
        lastChecked: null,
      }
    }
    throw new Error(`Firestore get failed: ${res.status}`)
  }
  
  const json = await res.json()
  if (!json.fields) {
    return {
      expectedTotal: 0,
      actualTotal: 0,
      isConsistent: false,
      lastChecked: null,
    }
  }
  
  const data = parseFields(json.fields)
  const discrepancies = Array.isArray(data.discrepancies) ? data.discrepancies : []
  
  return {
    expectedTotal: Number(data.expectedTotal ?? 0),
    actualTotal: Number(data.actualTotal ?? 0),
    isConsistent: typeof data.isConsistent === "boolean" ? (data.isConsistent as boolean) : false,
    lastChecked: typeof data.lastChecked === "string" ? (data.lastChecked as string) : null,
    discrepancies
  }
}

/**
 * Devuelve la alerta diaria y meta asociada para un vehículo y fecha de negocio dada.
 * Única función de acceso a dailyAlerts por vehículo; otras capas no deben leer directamente Firestore.
 */
export async function getDailyAlertForVehicle(
  date: string,
  plate: string,
): Promise<{ alert: DailyAlertVehicle | null; meta: DailyAlertMeta | null }> {
  const dateDocId = toDailyDocId(date)
  const basePath = `apps/emails/dailyAlerts/${dateDocId}`

  // Meta del día (404 esperado si no existe el doc)
  const metaPath = `documents/${basePath}/meta/meta`
  const metaRes = await firestoreRequest(metaPath, { method: "GET" }, { quiet404: true })
  let meta: DailyAlertMeta | null = null
  if (metaRes.ok) {
    const metaJson = await metaRes.json()
    if (metaJson.fields) {
      meta = parseMetaFromFields(parseFields(metaJson.fields))
    }
  }

  // Alerta diaria específica del vehículo (404 esperado si no hay alerta para esa patente)
  const vehicleDocPath = `documents/${basePath}/vehicles/${encodeURIComponent(plate)}`
  const vehicleRes = await firestoreRequest(vehicleDocPath, { method: "GET" }, { quiet404: true })
  if (!vehicleRes.ok) {
    if (vehicleRes.status === 404) {
      return { alert: null, meta }
    }
    throw new Error(`Firestore get failed for daily alert vehicle: ${vehicleRes.status}`)
  }

  const vehicleJson = await vehicleRes.json()
  if (!vehicleJson.fields) {
    return { alert: null, meta }
  }
  const data = parseFields(vehicleJson.fields)
  const summary = (data.summary ?? {}) as Record<string, unknown>
  const events = Array.isArray(data.events) ? data.events : []

  const alert: DailyAlertVehicle = {
    plate,
    summary: parseVehicleSummary(summary),
    riskScore: typeof data.riskScore === "number" ? (data.riskScore as number) : null,
    alertSent: Boolean(data.alertSent ?? false),
    sentAt: data.sentAt ? String(data.sentAt) : undefined,
    events,
    lastEventAt: typeof data.lastEventAt === "string" ? (data.lastEventAt as string) : null,
  }

  return { alert, meta }
}
