import { NextRequest, NextResponse } from "next/server"
import { getVehicleByPlate, getVehicleEventsByPlate } from "@/lib/firestore-read"
import type { VehicleDetailDTO, VehicleEventSummaryDTO, Severity } from "@/services/dto"

function mapSeverityToDomain(severity: "critico" | "advertencia"): Severity {
  // Mapeo simple inicial; se puede refinar cuando el backend exponga severidades ricas.
  if (severity === "critico") return "HIGH"
  return "MEDIUM"
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> },
) {
  try {
    const { vehicleId } = await params
    const plateUpper = vehicleId.toUpperCase()

    const vehicle = await getVehicleByPlate(plateUpper)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 })
    }

    const eventsDocs = await getVehicleEventsByPlate(plateUpper, 90)

    const events: VehicleEventSummaryDTO[] = eventsDocs.slice(0, 200).map((event) => ({
      id: event.id,
      timestamp: event.eventTimestamp,
      severity: mapSeverityToDomain(event.severity),
      eventType: event.type,
      driverName: null,
      sourceEmailType: "vehicle_event",
      inboxId: undefined,
    }))

    const detail: VehicleDetailDTO = {
      id: vehicle.id,
      licensePlate: vehicle.plate,
      externalId: undefined,
      isActive: true,
      lastEventAt: vehicle.lastEventAt ?? null,
      riskScore: undefined,
      severity: undefined,
      driverName: vehicle.driver ?? null,
      driverId: undefined,
      sourceEmailType: "vehicle_event",
      createdAt: undefined,
      updatedAt: vehicle.updatedAt,
      lastAlertSentAt: undefined,
      events,
      pendingAlertsCount: 0,
      lastAlertDate: undefined,
      lastUpdatedAt: new Date().toISOString(),
    }

    return NextResponse.json(detail)
  } catch (error) {
    console.error("[api/vehicle-detail/[vehicleId]] GET error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}

