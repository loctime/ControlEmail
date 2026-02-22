import { NextRequest, NextResponse } from "next/server"
import { getVehicleByPlate, getVehicleEventsByPlate, getAllEventsByPeriod } from "@/lib/firestore-read"

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
    
    const [vehicle, currentEvents, allCurrentEvents] = await Promise.all([
      getVehicleByPlate(plateUpper),
      getVehicleEventsByPlate(plateUpper, daysBack),
      getAllEventsByPeriod(daysBack),
    ])
    
    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehículo no encontrado" },
        { status: 404 },
      )
    }
    
    // Calcular ranking: contar eventos por patente en período actual
    const eventsByPlate: Record<string, number> = {}
    allCurrentEvents.forEach((event) => {
      eventsByPlate[event.plate] = (eventsByPlate[event.plate] || 0) + 1
    })
    
    // Ordenar por cantidad de eventos (descendente)
    const sortedPlates = Object.entries(eventsByPlate)
      .sort(([, a], [, b]) => b - a)
      .map(([plate]) => plate)
    
    const rankPosition = sortedPlates.indexOf(plateUpper) + 1
    const totalVehiclesInPeriod = sortedPlates.length
    
    // Obtener eventos del período anterior
    const now = new Date()
    const previousPeriodStart = new Date(now.getTime() - daysBack * 2 * 24 * 60 * 60 * 1000)
    const previousPeriodEnd = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
    
    // Obtener todos los eventos del período anterior completo
    const allPreviousPeriodEvents = await getAllEventsByPeriod(daysBack * 2)
    
    // Filtrar eventos del período anterior específico y solo del vehículo
    const previousEvents = allPreviousPeriodEvents.filter((event) => {
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
