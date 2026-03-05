import { NextResponse } from "next/server"
import { getDailyMetrics } from "@/lib/firestore-read"
import { getYesterdayKey } from "@/lib/domain/date"
import { getSeverityFromRiskScore } from "@/lib/domain/severity"
import { getAuthUserWithPlates, authUnauthorizedResponse } from "@/lib/auth-user"
import type { DebugPendingAlertDTO } from "@/services/dto"

export async function GET(request: Request) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  try {
    // Día de referencia: ayer (las alertas diarias son del día anterior).
    const businessDate = getYesterdayKey()

    // Datos reales desde Firestore: apps/emails/dailyAlerts/{date}/meta y /vehicles.
    const metrics = await getDailyMetrics(businessDate)

    const pending = metrics.vehicles.filter(
      (v) => !v.alertSent && auth.allowedPlates.has(v.plate)
    )

    const result: DebugPendingAlertDTO[] = pending.map((v) => ({
      id: `${businessDate}:${v.plate}`,
      vehicleId: v.plate,
      plate: v.plate,
      date: businessDate,
      status: "PENDING",
      aggregatedSeverity: getSeverityFromRiskScore(v.riskScore),
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

