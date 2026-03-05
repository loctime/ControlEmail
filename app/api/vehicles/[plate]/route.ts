import { NextRequest, NextResponse } from "next/server"
import { getVehicleByPlate, getAllEventsByPeriod, getDailyAlertForVehicle } from "@/lib/firestore-read"
import { getYesterdayKey } from "@/lib/domain/date"
import { getSeverityFromRiskScore } from "@/lib/domain/severity"
import { getAuthUserWithPlates, authUnauthorizedResponse } from "@/lib/auth-user"
import { normalizePlate } from "@/lib/utils"
import type { VehiclePlateDetailDTO, Severity } from "@/services/dto"

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

    const [vehicle, allEvents, dailyAlert] = await Promise.all([
      getVehicleByPlate(plateUpper),
      getAllEventsByPeriod(daysBack * 2),
      (async () => {
        const businessDate = getYesterdayKey()
        return getDailyAlertForVehicle(businessDate, plateUpper)
      })(),
    ])

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehículo no encontrado" },
        { status: 404 },
      )
    }

    const now = new Date()
    const periodStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
    const previousPeriodStart = new Date(now.getTime() - daysBack * 2 * 24 * 60 * 60 * 1000)
    const previousPeriodEnd = periodStart

    const currentEvents = allEvents.filter((event) => {
      const eventDate = new Date(event.eventTimestamp)
      return eventDate >= periodStart && event.plate === plateUpper
    })

    const eventsByPlate: Record<string, number> = {}
    allEvents.forEach((event) => {
      const eventDate = new Date(event.eventTimestamp)
      if (eventDate >= periodStart) {
        eventsByPlate[event.plate] = (eventsByPlate[event.plate] || 0) + 1
      }
    })

    const sortedPlates = Object.entries(eventsByPlate)
      .sort(([, a], [, b]) => b - a)
      .map(([plateKey]) => plateKey)

    const rankPosition = sortedPlates.indexOf(plateUpper) + 1
    const totalVehiclesInPeriod = sortedPlates.length

    const previousEvents = allEvents.filter((event) => {
      const eventDate = new Date(event.eventTimestamp)
      return eventDate >= previousPeriodStart && eventDate < previousPeriodEnd && event.plate === plateUpper
    })

    const riskScore = dailyAlert.alert ? dailyAlert.alert.riskScore : undefined
    const aggregatedSeverity: Severity | undefined =
      typeof riskScore === "number" ? getSeverityFromRiskScore(riskScore) : undefined

    const response: VehiclePlateDetailDTO = {
      vehicle,
      events: currentEvents,
      previousEvents,
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
