import { NextResponse } from "next/server"

import {
  defaultEmailLocalIngestAdapters,
  normalizeLocalIngestPayload,
  type LocalIngestPayload,
  type VehicleEventToPersist,
} from "@/lib/email-local-ingest-adapters"
import { parseVehicleEventsFromBody } from "@/lib/vehicle-event-parser"

const adapters = defaultEmailLocalIngestAdapters

function toPersistedEvents(rawEmailId: string, bodyText: string): VehicleEventToPersist[] {
  return parseVehicleEventsFromBody(bodyText).map((event) => ({
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
    rawEmailId,
  }))
}

export async function POST(request: Request) {
  try {
    const rawPayload = (await request.json()) as LocalIngestPayload
    const payload = normalizeLocalIngestPayload(rawPayload)

    const storedEmail = await adapters.saveRawEmailInInbox(payload)
    const parsedEvents = toPersistedEvents(storedEmail.id, storedEmail.body_text)

    const { stored, skippedDuplicates } = await adapters.saveVehicleEvents(parsedEvents)

    console.info("[email-local-ingest] processed", {
      source: payload.source,
      rawEmailId: storedEmail.id,
      eventsDetected: parsedEvents.length,
      eventsStored: stored,
      eventsSkippedDuplicates: skippedDuplicates,
    })

    return NextResponse.json({
      ok: true,
      rawEmailId: storedEmail.id,
      eventsDetected: parsedEvents.length,
      eventsStored: stored,
      eventsSkippedDuplicates: skippedDuplicates,
    })
  } catch (error) {
    console.error("[email-local-ingest] failed", error)

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
