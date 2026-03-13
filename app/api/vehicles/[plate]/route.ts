import { NextRequest, NextResponse } from "next/server"
import { getVehicleByPlate, getDailyAlertForVehicle, getDailyMetrics } from "@/lib/firestore-read"
import { getYesterdayKey } from "@/lib/domain/date"
import { getSeverityFromRiskScore } from "@/lib/domain/severity"
import { getAuthUserWithPlates, authUnauthorizedResponse } from "@/lib/auth-user"
import { normalizePlate } from "@/lib/utils"
import type { VehiclePlateDetailDTO, Severity } from "@/services/dto"

function offsetDateKey(dateKey: string, deltaDays: number): string {
  const [year, month, day] = dateKey.split("-").map(Number)
  const date = new Date(year, month - 1, day + deltaDays)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ plate: string }> },
) {
  const auth = await getAuthUserWithPlates(request)
  if (!auth) return authUnauthorizedResponse()

  try {
    const { plate } = await params
    const plateUpper = normalizePlate(plate) || plate.toUpperCase()
    if (!auth.allowedPlates.has(plateUpper)) {
      return NextResponse.json(
        { error: "No tienes acceso a esta patente" },
        { status: 403 },
      )
    }

    const searchParams = request.nextUrl.searchParams
    const daysBack = searchParams.get("daysBack")
      ? parseInt(searchParams.get("daysBack")!, 10)
      : 30

    console.log("[api/vehicles/[plate]] GET:", { plate: plateUpper, daysBack })

    const dateKey = getYesterdayKey()
    const previousDateKey = offsetDateKey(dateKey, -1)

    const [vehicle, dailyAlert, previousDailyAlert, dailyMetrics] = await Promise.all([
      getVehicleByPlate(plateUpper),
      getDailyAlertForVehicle(dateKey, plateUpper),
      getDailyAlertForVehicle(previousDateKey, plateUpper),
      getDailyMetrics(dateKey),
    ])

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehículo no encontrado" },
        { status: 404 },
      )
    }

    const currentDailyVehicle = dailyAlert.alert
    const riskScore = currentDailyVehicle && currentDailyVehicle.riskScore != null ? currentDailyVehicle.riskScore : undefined
    const aggregatedSeverity: Severity | undefined =
      typeof riskScore === "number" ? getSeverityFromRiskScore(riskScore) : undefined

    const rankedVehicles = dailyMetrics.vehicles
      .filter((item) => auth.allowedPlates.has(item.plate))
      .sort(
        (a, b) =>
          (b.totalEventsCount ?? 0) - (a.totalEventsCount ?? 0) ||
          (b.riskScore ?? 0) - (a.riskScore ?? 0) ||
          a.plate.localeCompare(b.plate),
      )

    const rankPosition = rankedVehicles.findIndex((item) => item.plate === plateUpper) + 1
    const totalVehiclesInPeriod = rankedVehicles.length

    const response: VehiclePlateDetailDTO = {
      vehicle,
      dateKey,
      events: currentDailyVehicle?.events ?? [],
      speedIncidents: currentDailyVehicle?.speedIncidents ?? [],
      summary: currentDailyVehicle?.summary ?? {
        totalEvents: 0,
        criticalEvents: 0,
        warningEvents: 0,
        noKeyEvents: 0,
        excesos: 0,
        no_identificados: 0,
        contactos: 0,
        llave_sin_cargar: 0,
        conductor_inactivo: 0,
      },
      totalEventsCount: currentDailyVehicle?.totalEventsCount ?? 0,
      storedEventsCount: currentDailyVehicle?.storedEventsCount ?? 0,
      eventsTruncated: currentDailyVehicle?.eventsTruncated ?? false,
      truncatedEventsCount: currentDailyVehicle?.truncatedEventsCount ?? 0,
      incidentSummary: currentDailyVehicle?.incidentSummary,
      previousTotalEventsCount: previousDailyAlert.alert?.totalEventsCount ?? 0,
      ranking: {
        position: rankPosition,
        totalVehicles: totalVehiclesInPeriod,
      },
      riskScore,
      aggregatedSeverity,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[api/vehicles/[plate]] GET error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    )
  }
}

