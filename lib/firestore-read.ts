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
    throw new Error(
      `Missing required environment variable: ${name}${fallbackName ? ` or ${fallbackName}` : ""}`,
    )
  }
  return value
}

function toBase64Url(input: string): string {
  return Buffer.from(input).toString("base64url")
}

async function getGoogleAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAtMs > Date.now() + 60_000) {
    return cachedToken.value
  }
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
    throw new Error(`Unable to obtain Google access token: ${response.status}`)
  }
  const token = (await response.json()) as GoogleAccessToken
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
  return fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    },
  )
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
}

/** Lista documentos de una colección (una página). */
export async function listCollection(
  collectionPath: string,
  pageSize = 200,
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const enc = collectionPath.replace(/\//g, "%2F")
  const res = await firestoreRequest(
    `documents/${enc}?pageSize=${pageSize}`,
    { method: "GET" },
  )
  if (!res.ok) {
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
  return documents.map((doc) => {
    const id = doc.name.split("/").pop() ?? ""
    const data = doc.fields ? parseFields(doc.fields) : {}
    return { id, data }
  })
}

export async function listVehicleEvents(): Promise<VehicleEventDoc[]> {
  const items = await listCollection("apps/emails/vehicleEvents")
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
  const items = await listCollection("apps/emails/vehicles")
  return items.map(({ id, data }) => ({
    id,
    plate: String(data.plate ?? id),
    brand: String(data.brand ?? ""),
    model: String(data.model ?? ""),
    lastLocation: data.lastLocation != null ? String(data.lastLocation) : null,
    lastEventAt: data.lastEventAt != null ? String(data.lastEventAt) : undefined,
    lastEventId: data.lastEventId != null ? String(data.lastEventId) : undefined,
    driver: data.driver != null ? String(data.driver) : null,
    updatedAt: data.updatedAt != null ? String(data.updatedAt) : undefined,
  }))
}
