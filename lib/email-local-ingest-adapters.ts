import { createHash, createSign, randomUUID } from "node:crypto"

import { EventCategory, FormatType } from "@/lib/vehicle-event-parser"

export interface IncomingEmailPayload {
  source?: string
  message_id?: string
  from?: string
  to?: string[] | string
  subject?: string
  body_text?: string
  body_html?: string
  received_at?: string
  attachments?: { filename: string; size: number }[]
}

export interface LocalIngestPayload {
  source?: string
  email?: IncomingEmailPayload
  message_id?: string
  from?: string
  to?: string[] | string
  subject?: string
  body_text?: string
  body_html?: string
  received_at?: string
  attachments?: { filename: string; size: number }[]
}

export interface NormalizedEmailPayload {
  source: string
  message_id: string
  from: string
  to: string[]
  subject: string
  body_text: string
  body_html?: string
  received_at: string
  attachments: { filename: string; size: number }[]
}

export interface StoredEmail {
  id: string
  body_text: string
}

export interface VehicleEventToPersist {
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
  rawEmailId: string
}

export interface SaveVehicleEventsResult {
  stored: number
  skippedDuplicates: number
}

export interface EmailLocalIngestAdapters {
  saveRawEmailInInbox: (payload: NormalizedEmailPayload) => Promise<StoredEmail>
  saveVehicleEvents: (events: VehicleEventToPersist[]) => Promise<SaveVehicleEventsResult>
}

interface GoogleAccessToken {
  access_token: string
  expires_in: number
}

let cachedToken: { value: string; expiresAtMs: number } | null = null

function normalizeToArray(value: string[] | string | undefined): string[] {
  if (!value) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

export function normalizeLocalIngestPayload(payload: LocalIngestPayload): NormalizedEmailPayload {
  const email = payload.email

  return {
    source: payload.source ?? email?.source ?? "outlook-local",
    message_id: email?.message_id ?? payload.message_id ?? randomUUID(),
    from: email?.from ?? payload.from ?? "",
    to: normalizeToArray(email?.to ?? payload.to),
    subject: email?.subject ?? payload.subject ?? "",
    body_text: email?.body_text ?? payload.body_text ?? "",
    body_html: email?.body_html ?? payload.body_html,
    received_at: email?.received_at ?? payload.received_at ?? new Date().toISOString(),
    attachments: email?.attachments ?? payload.attachments ?? [],
  }
}

function getEnvOrThrow(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
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

  const clientEmail = getEnvOrThrow("GOOGLE_SERVICE_ACCOUNT_EMAIL")
  const privateKey = getEnvOrThrow("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n")

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

function toFirestoreValue(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) {
    return { nullValue: null }
  }

  if (typeof value === "string") {
    return { stringValue: value }
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }

  if (typeof value === "boolean") {
    return { booleanValue: value }
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() }
  }

  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => toFirestoreValue(item)) } }
  }

  if (typeof value === "object") {
    const fields = Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, toFirestoreValue(v)]),
    )

    return { mapValue: { fields } }
  }

  return { stringValue: String(value) }
}

function toFirestoreFields(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, toFirestoreValue(value)]),
  )
}

async function firestoreRequest(path: string, init: RequestInit): Promise<Response> {
  const projectId = getEnvOrThrow("FIREBASE_PROJECT_ID")
  const token = await getGoogleAccessToken()

  return fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })
}

async function commitDocument(
  documentPath: string,
  data: Record<string, unknown>,
  serverTimestampFields: string[],
): Promise<void> {
  const projectId = getEnvOrThrow("FIREBASE_PROJECT_ID")
  const documentName = `projects/${projectId}/databases/(default)/documents/${documentPath}`

  const writes: Array<Record<string, unknown>> = [
    {
      update: {
        name: documentName,
        fields: toFirestoreFields(data),
      },
    },
  ]

  if (serverTimestampFields.length > 0) {
    writes.push({
      transform: {
        document: documentName,
        fieldTransforms: serverTimestampFields.map((fieldPath) => ({
          fieldPath,
          setToServerValue: "REQUEST_TIME",
        })),
      },
    })
  }

  const response = await firestoreRequest("documents:commit", {
    method: "POST",
    body: JSON.stringify({ writes }),
  })

  if (!response.ok) {
    throw new Error(`Failed to commit document ${documentPath}: ${response.status}`)
  }
}

function buildPreview(bodyText: string): string {
  return bodyText.replace(/\s+/g, " ").trim().slice(0, 200)
}

async function saveRawEmailInInbox(payload: NormalizedEmailPayload): Promise<StoredEmail> {
  const rawEmailId = randomUUID()

  await commitDocument(
    `apps/emails/inbox/${rawEmailId}`,
    {
      source: payload.source,
      message_id: payload.message_id,
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      body_text: payload.body_text,
      body_html: payload.body_html,
      received_at: payload.received_at,
      attachments: payload.attachments,
      preview: buildPreview(payload.body_text),
    },
    ["createdAt"],
  )

  return { id: rawEmailId, body_text: payload.body_text }
}

function deterministicEventId(event: VehicleEventToPersist): string {
  return createHash("sha256").update(`${event.plate}|${event.eventDate.toISOString()}|${event.rawLine}`).digest("hex")
}

async function saveVehicleEvents(events: VehicleEventToPersist[]): Promise<SaveVehicleEventsResult> {
  let stored = 0
  let skippedDuplicates = 0

  for (const event of events) {
    const eventId = deterministicEventId(event)
    const documentPath = `apps/vehicleEvents/events/${eventId}`

    const existing = await firestoreRequest(`documents/${documentPath}`, { method: "GET" })
    if (existing.ok) {
      skippedDuplicates += 1
      continue
    }

    if (existing.status !== 404) {
      throw new Error(`Failed to verify duplicate event ${eventId}: ${existing.status}`)
    }

    await commitDocument(
      documentPath,
      {
        plate: event.plate,
        brand: event.brand,
        model: event.model,
        eventDate: event.eventDate,
        eventCategory: event.eventCategory,
        formatType: event.formatType,
        driver: event.driver,
        speed: event.speed,
        location: event.location,
        rawLine: event.rawLine,
        rawEmailId: event.rawEmailId,
      },
      ["createdAt"],
    )

    stored += 1
  }

  return { stored, skippedDuplicates }
}

export const defaultEmailLocalIngestAdapters: EmailLocalIngestAdapters = {
  saveRawEmailInInbox,
  saveVehicleEvents,
}
