import { NextResponse } from "next/server"
import { getDailyMetrics } from "@/lib/firestore-read"
import { normalizeBusinessDate } from "@/lib/domain/date"
import { getSeverityFromRiskScore } from "@/lib/domain/severity"
import type { DebugPendingAlertDTO } from "@/services/dto"

export async function GET() {
  try {
    // Fecha de negocio única para el análisis de alertas pendientes.
    const businessDate = normalizeBusinessDate(new Date())

    // Datos reales desde Firestore: apps/emails/dailyAlerts/{date}/meta y /vehicles.
    const metrics = await getDailyMetrics(businessDate)

    const pending = metrics.vehicles.filter((v) => !v.alertSent)

    const result: DebugPendingAlertDTO[] = pending.map((v) => ({
      id: `${businessDate}:${v.plate}`,
      vehicleId: v.plate,
      plate: v.plate,
      date: businessDate,
      status: "PENDING",
      severity: getSeverityFromRiskScore(v.riskScore),
      driverName: null,
      reason:
        v.summary.criticalEvents > 0
          ? "Alerta diaria con eventos críticos pendientes de envío"
          : "Alerta diaria pendiente de envío",
      lastUpdatedAt: metrics.meta.lastUpdatedAt,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error("[api/email/debug-pending-alerts] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}

