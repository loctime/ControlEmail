import { NextRequest, NextResponse } from "next/server"
import { getVehicleByPlate, getVehicleEventsByPlate, getDailyAlertForVehicle } from "@/lib/firestore-read"
import { normalizeBusinessDate } from "@/lib/domain/date"
import { getSeverityFromRiskScore } from "@/lib/domain/severity"
import type { VehicleDetailDTO, VehicleEventSummaryDTO, Severity } from "@/services/dto"

function mapEventSeverityToDomain(severity: "critico" | "advertencia"): Severity {
  return severity === "critico" ? "HIGH" : "MEDIUM"
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

    // Fecha de negocio: hoy en formato YYYY-MM-DD, única fuente de verdad.
    const businessDate = normalizeBusinessDate(new Date())

    // Alerta diaria y meta real desde Firestore (apps/emails/dailyAlerts/{date}/vehicles/{plate}).
    const { alert, meta } = await getDailyAlertForVehicle(businessDate, plateUpper)

    // Eventos recientes del vehículo (hasta 90 días hacia atrás).
    const eventsDocs = await getVehicleEventsByPlate(plateUpper, 90)

    const events: VehicleEventSummaryDTO[] = eventsDocs.slice(0, 200).map((event) => ({
      id: event.id,
      timestamp: event.eventTimestamp,
      severity: mapEventSeverityToDomain(event.severity),
      eventType: event.type,
      // driverName se toma del evento si existe, si no del vehículo, si no null.
      driverName: event.driver ?? vehicle.driver ?? null,
      // Hoy no tenemos inboxId ni tipo de email real para cada evento; marcamos el origen lógico.
      sourceEmailType: "vehicle_event",
      inboxId: undefined,
    }))

    // pendingAlertsCount / lastAlertDate / riskScore / severity provienen de dailyAlerts.
    const pendingAlertsCount = alert && !alert.alertSent ? 1 : 0
    const lastAlertDate = alert ? businessDate : undefined
    const riskScore = alert ? alert.riskScore : undefined
    const severity = typeof riskScore === "number" ? getSeverityFromRiskScore(riskScore) : undefined

    const lastUpdatedAt =
      meta?.lastUpdatedAt ??
      vehicle.updatedAt ??
      undefined

    const detail: VehicleDetailDTO = {
      id: vehicle.id,
      licensePlate: vehicle.plate,
      externalId: undefined,
      isActive: true,
      lastEventAt: vehicle.lastEventAt ?? null,
      // riskScore y severity de negocio vienen exclusivamente de dailyAlerts.
      riskScore,
      severity,
      driverName: vehicle.driver ?? null,
      driverId: undefined,
      sourceEmailType: "vehicle_event",
      createdAt: undefined,
      updatedAt: vehicle.updatedAt,
      lastAlertSentAt: alert?.sentAt,
      events,
      pendingAlertsCount,
      lastAlertDate,
      lastUpdatedAt,
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

