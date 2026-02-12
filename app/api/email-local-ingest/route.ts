import { NextResponse } from "next/server"

import {
  defaultEmailLocalIngestAdapters,
  normalizeLocalIngestPayload,
} from "@/lib/email-local-ingest-adapters"
import { parseVehicleEventsFromBody } from "@/lib/vehicle-event-parser"

interface LocalIngestPayload {
  subject?: string
  from?: string
  body_text?: string
  source?: string
  message_id?: string
  to?: string[] | string
  body_html?: string
  received_at?: string
  email?: {
    subject?: string
    from?: string
    body_text?: string
    [key: string]: unknown
  }
}

function logIngest(msg: string, data?: Record<string, unknown>) {
  if (data != null) console.log("[email-local-ingest]", msg, data)
  else console.log("[email-local-ingest]", msg)
}

export async function POST(request: Request) {
  const token = request.headers.get("x-local-token")
  const expected = process.env.LOCAL_INGEST_TOKEN
  if (!expected || token !== expected) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    )
  }

  try {
    const payload = (await request.json()) as LocalIngestPayload
    const normalized = normalizeLocalIngestPayload(payload)
    const { saveRawEmailInInbox, saveVehicleEvents } = defaultEmailLocalIngestAdapters

    const bodyText = normalized.body_text ?? ""
    const totalLines = bodyText.split(/\r?\n/).length
    const linesWithKmh = bodyText.split(/\r?\n/).filter((line) => /Km\/h/i.test(line))
    logIngest("Líneas en body / con Km/h", { totalLines, linesWithKmh: linesWithKmh.length })

    const storedEmail = await saveRawEmailInInbox(normalized)
    const parsedEvents = parseVehicleEventsFromBody(storedEmail.body_text)

    logIngest("Eventos generados por parser", { count: parsedEvents.length })

    const eventsToPersist = parsedEvents.map((event) => ({
      plate: event.plate,
      brand: event.brand,
      model: event.model,
      eventDate: new Date(event.eventDate),
      eventCategory: event.eventType,
      formatType: event.eventType,
      driver: event.driver,
      speed: event.speed,
      location: event.location,
      rawLine: event.rawLine,
      rawEmailId: storedEmail.id,
    }))

    const result = await saveVehicleEvents(eventsToPersist)

    logIngest("Eventos guardados / duplicados omitidos / placas actualizadas", {
      stored: result.stored,
      skippedDuplicates: result.skippedDuplicates,
      platesUpdated: result.platesUpdated,
    })

    return NextResponse.json({
      ok: true,
      rawEmailId: storedEmail.id,
      eventsDetected: eventsToPersist.length,
      eventsStored: result.stored,
      skippedDuplicates: result.skippedDuplicates,
      platesUpdated: result.platesUpdated,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error"
    logIngest("Error", { error: message })
    return NextResponse.json(
      {
        ok: false,
        message: "Unable to ingest local email",
        error: message,
      },
      { status: 500 },
    )
  }
}
