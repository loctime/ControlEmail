import { NextResponse } from "next/server"

import { parseVehicleEventsFromBody } from "@/lib/vehicle-event-parser"

interface LocalIngestPayload {
  subject?: string
  from?: string
  body_text?: string
}

interface StoredEmail {
  id: string
  subject: string
  from: string
  body_text: string
  createdAt: string
}

interface PersistedVehicleEvent {
  plate: string
  brand: string
  model: string
  eventDate: string
  eventType: string
  driver?: string
  speed?: number
  location?: string
  rawEmailId: string
  createdAt: string
}

/**
 * NOTE:
 * This repository does not include the existing Firestore wiring.
 * Keep this adapter boundary so existing storage code can be injected
 * without changing parser logic or API contract.
 */
async function saveRawEmailInInbox(payload: LocalIngestPayload): Promise<StoredEmail> {
  return {
    id: crypto.randomUUID(),
    subject: payload.subject ?? "",
    from: payload.from ?? "",
    body_text: payload.body_text ?? "",
    createdAt: new Date().toISOString(),
  }
}

async function saveVehicleEvents(events: PersistedVehicleEvent[]): Promise<void> {
  // Replace this body with your Firestore implementation:
  // apps/vehicleEvents
  // The parser already provides a normalized schema + rawEmailId relationship.
  void events
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LocalIngestPayload

    const storedEmail = await saveRawEmailInInbox(payload)
    const parsedEvents = parseVehicleEventsFromBody(storedEmail.body_text)

    const eventsToPersist: PersistedVehicleEvent[] = parsedEvents.map((event) => ({
      plate: event.plate,
      brand: event.brand,
      model: event.model,
      eventDate: event.eventDate,
      eventType: event.eventType,
      driver: event.driver,
      speed: event.speed,
      location: event.location,
      rawEmailId: storedEmail.id,
      createdAt: new Date().toISOString(),
    }))

    await saveVehicleEvents(eventsToPersist)

    return NextResponse.json({
      ok: true,
      rawEmailId: storedEmail.id,
      eventsDetected: eventsToPersist.length,
      eventsStored: eventsToPersist.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unable to ingest local email",
        error: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    )
  }
}
