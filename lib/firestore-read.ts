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

async function firestoreRequest(path: string, init: RequestInit): Promise<Response> {
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
    console.error("[firestore-read] Firestore request failed:", { status: res.status, path, body: body.slice(0, 300) })
  } else {
    console.log("[firestore-read] Firestore request OK:", { path, status: res.status })
  }
  return res
}

export interface VehicleEventDoc {
  id: string
  plate: string
  brand: string
  model: string
  eventDate: string
  eventCategory: string
  formatType: string
  driver?: string
  speed?: number
  location?: string
  rawLine?: string
  rawEmailId?: string
  createdAt?: string
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
  /** Si las alertas están habilitadas para este vehículo. */
  alertEnabled: boolean
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

export async function listVehicleEvents(): Promise<VehicleEventDoc[]> {
  const path = "apps/emails/vehicleEvents"
  console.log("[firestore-read] listVehicleEvents: leyendo desde", path)
  const items = await listCollection(path)
  console.log("[firestore-read] listVehicleEvents: leídos", items.length, "eventos")
  return items.map(({ id, data }) => {
    const rawDate = data.eventDate
    let eventDate = new Date().toISOString()
    if (typeof rawDate === "string") eventDate = rawDate
    else if (rawDate && typeof rawDate === "object" && "timestampValue" in (rawDate as Record<string, unknown>))
      eventDate = (rawDate as { timestampValue: string }).timestampValue
    return {
    id,
    plate: String(data.plate ?? ""),
    brand: String(data.brand ?? ""),
    model: String(data.model ?? ""),
    eventDate,
    eventCategory: String(data.eventCategory ?? "exceso_velocidad"),
    formatType: String(data.formatType ?? "exceso_velocidad"),
    driver: data.driver != null ? String(data.driver) : undefined,
    speed: data.speed != null ? Number(data.speed) : undefined,
    location: data.location != null ? String(data.location) : undefined,
    rawLine: data.rawLine != null ? String(data.rawLine) : undefined,
    rawEmailId: data.rawEmailId != null ? String(data.rawEmailId) : undefined,
    createdAt: data.createdAt != null ? String(data.createdAt) : undefined,
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
      alertEnabled: Boolean(data.alertEnabled),
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
    alertEnabled: Boolean(data.alertEnabled),
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
}

// Re-export para uso en componentes
export type { VehicleDoc }

export async function getVehicleEventsByPlate(
  plate: string,
  daysBack?: number,
): Promise<VehicleEventDashboard[]> {
  const path = "apps/emails/vehicleEvents"
  console.log("[firestore-read] getVehicleEventsByPlate: leyendo desde", path, "plate:", plate)
  const items = await listCollection(path, 1000) // Obtener más eventos para filtrar
  
  const now = new Date()
  const cutoffDate = daysBack
    ? new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
    : null
  
  const filtered = items
    .filter(({ data }) => {
      const itemPlate = String(data.plate ?? "").toUpperCase()
      return itemPlate === plate.toUpperCase()
    })
    .map(({ id, data }) => {
      // Intentar obtener eventTimestamp (puede ser eventTimestamp, eventDate, o createdAt)
      let eventTimestamp = ""
      if (data.eventTimestamp && typeof data.eventTimestamp === "string") {
        eventTimestamp = data.eventTimestamp
      } else if (data.eventDate) {
        const rawDate = data.eventDate
        if (typeof rawDate === "string") {
          eventTimestamp = rawDate
        } else if (rawDate && typeof rawDate === "object" && "timestampValue" in (rawDate as Record<string, unknown>)) {
          eventTimestamp = (rawDate as { timestampValue: string }).timestampValue
        }
      } else if (data.createdAt) {
        const rawCreated = data.createdAt
        if (typeof rawCreated === "string") {
          eventTimestamp = rawCreated
        } else if (rawCreated && typeof rawCreated === "object" && "timestampValue" in (rawCreated as Record<string, unknown>)) {
          eventTimestamp = (rawCreated as { timestampValue: string }).timestampValue
        }
      }
      
      // Si no hay timestamp, usar fecha actual
      if (!eventTimestamp) {
        eventTimestamp = new Date().toISOString()
      }
      
      // Filtrar por fecha si se especifica
      if (cutoffDate && eventTimestamp) {
        const eventDate = new Date(eventTimestamp)
        if (eventDate < cutoffDate) {
          return null
        }
      }
      
      // Obtener type (puede ser type, eventCategory, o formatType)
      const type = String(
        data.type ?? data.eventCategory ?? data.formatType ?? "desconocido"
      )
      
      // Obtener severity (puede ser severity o calcularse desde speed)
      let severity: "critico" | "advertencia" = "advertencia"
      if (data.severity && typeof data.severity === "string") {
        const sev = String(data.severity).toLowerCase()
        if (sev === "critico" || sev === "crítico") {
          severity = "critico"
        }
      } else if (data.speed != null) {
        // Calcular severity desde velocidad si no existe
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
      }
    })
    .filter((item): item is VehicleEventDashboard => item !== null)
    .sort((a, b) => {
      // Ordenar descendente por eventTimestamp
      return b.eventTimestamp.localeCompare(a.eventTimestamp)
    })
  
  console.log("[firestore-read] getVehicleEventsByPlate: filtrados", filtered.length, "eventos para", plate)
  return filtered
}

/**
 * Obtiene todos los eventos de un período específico (sin filtrar por patente).
 * Usado para calcular rankings y comparaciones.
 */
export async function getAllEventsByPeriod(
  daysBack: number,
): Promise<VehicleEventDashboard[]> {
  const path = "apps/emails/vehicleEvents"
  console.log("[firestore-read] getAllEventsByPeriod: leyendo desde", path, "daysBack:", daysBack)
  const items = await listCollection(path, 1000)
  
  const now = new Date()
  const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
  
  const filtered = items
    .map(({ id, data }) => {
      // Intentar obtener eventTimestamp
      let eventTimestamp = ""
      if (data.eventTimestamp && typeof data.eventTimestamp === "string") {
        eventTimestamp = data.eventTimestamp
      } else if (data.eventDate) {
        const rawDate = data.eventDate
        if (typeof rawDate === "string") {
          eventTimestamp = rawDate
        } else if (rawDate && typeof rawDate === "object" && "timestampValue" in (rawDate as Record<string, unknown>)) {
          eventTimestamp = (rawDate as { timestampValue: string }).timestampValue
        }
      } else if (data.createdAt) {
        const rawCreated = data.createdAt
        if (typeof rawCreated === "string") {
          eventTimestamp = rawCreated
        } else if (rawCreated && typeof rawCreated === "object" && "timestampValue" in (rawCreated as Record<string, unknown>)) {
          eventTimestamp = (rawCreated as { timestampValue: string }).timestampValue
        }
      }
      
      if (!eventTimestamp) {
        eventTimestamp = new Date().toISOString()
      }
      
      // Filtrar por fecha
      const eventDate = new Date(eventTimestamp)
      if (eventDate < cutoffDate) {
        return null
      }
      
      // Obtener type
      const type = String(
        data.type ?? data.eventCategory ?? data.formatType ?? "desconocido"
      )
      
      // Obtener severity
      let severity: "critico" | "advertencia" = "advertencia"
      if (data.severity && typeof data.severity === "string") {
        const sev = String(data.severity).toLowerCase()
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
      }
    })
    .filter((item): item is VehicleEventDashboard => item !== null)
    .sort((a, b) => {
      return b.eventTimestamp.localeCompare(a.eventTimestamp)
    })
  
  console.log("[firestore-read] getAllEventsByPeriod: filtrados", filtered.length, "eventos")
  return filtered
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
  alertEnabled: boolean
}

/**
 * Actualiza responsables y alertEnabled de un vehículo en apps/emails/vehicles/{plate}.
 * Si el documento no tiene responsables, se escriben los enviados (no se inicializa en lectura).
 */
export async function updateVehicleAlerts(
  plate: string,
  payload: VehicleAlertsUpdate,
): Promise<void> {
  const docPath = `apps/emails/vehicles/${encodeURIComponent(plate)}`
  const path = `documents/${docPath}?updateMask.fieldPaths=responsables&updateMask.fieldPaths=alertEnabled`
  const projectId = getEnvOrThrow(
    "FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  )
  const documentName = `projects/${projectId}/databases/(default)/documents/${docPath}`
  const body = {
    name: documentName,
    fields: toFirestoreFields({
      responsables: payload.responsables,
      alertEnabled: payload.alertEnabled,
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
