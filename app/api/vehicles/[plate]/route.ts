import { NextRequest, NextResponse } from "next/server"
import { getVehicleByPlate, getAllEventsByPeriod } from "@/lib/firestore-read"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ plate: string }> },
) {
  try {
    const { plate } = await params
    const plateUpper = plate.toUpperCase()
    
    const searchParams = request.nextUrl.searchParams
    const daysBack = searchParams.get("daysBack")
      ? parseInt(searchParams.get("daysBack")!, 10)
      : 30
    
    console.log("[api/vehicles/[plate]] GET:", { plate: plateUpper, daysBack })
    
    // Única lectura de eventos para el período solicitado (daysBack * 2).
    // A partir de esta colección se derivan:
    // - Eventos actuales del vehículo.
    // - Eventos del período anterior.
    // - Ranking por cantidad de eventos.
    const [vehicle, allEvents] = await Promise.all([
      getVehicleByPlate(plateUpper),
      getAllEventsByPeriod(daysBack * 2),
    ])
    
    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehículo no encontrado" },
        { status: 404 },
      )
    }
    
    // Calcular límites de período actual y anterior
    const now = new Date()
    const periodStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
    const previousPeriodStart = new Date(now.getTime() - daysBack * 2 * 24 * 60 * 60 * 1000)
    const previousPeriodEnd = periodStart

    // Eventos actuales del vehículo en el período
    const currentEvents = allEvents.filter((event) => {
      const eventDate = new Date(event.eventTimestamp)
      return eventDate >= periodStart && event.plate === plateUpper
    })

    // Calcular ranking: contar eventos por patente en período actual
    const eventsByPlate: Record<string, number> = {}
    allEvents.forEach((event) => {
      const eventDate = new Date(event.eventTimestamp)
      if (eventDate >= periodStart) {
        eventsByPlate[event.plate] = (eventsByPlate[event.plate] || 0) + 1
      }
    })
    
    // Ordenar por cantidad de eventos (descendente)
    const sortedPlates = Object.entries(eventsByPlate)
      .sort(([, a], [, b]) => b - a)
      .map(([plate]) => plate)
    
    const rankPosition = sortedPlates.indexOf(plateUpper) + 1
    const totalVehiclesInPeriod = sortedPlates.length
    
    // Filtrar eventos del período anterior específico y solo del vehículo
    const previousEvents = allEvents.filter((event) => {
      const eventDate = new Date(event.eventTimestamp)
      return eventDate >= previousPeriodStart && eventDate < previousPeriodEnd && event.plate === plateUpper
    })
    
    return NextResponse.json({
      vehicle,
      events: currentEvents,
      previousEvents,
      ranking: {
        position: rankPosition,
        totalVehicles: totalVehiclesInPeriod,
      },
    })
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
