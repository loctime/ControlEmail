import { NextRequest, NextResponse } from "next/server"
import { getVehicleByPlate, getVehicleEventsByPlate } from "@/lib/firestore-read"

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
      : undefined
    
    console.log("[api/vehicles/[plate]] GET:", { plate: plateUpper, daysBack })
    
    const [vehicle, events] = await Promise.all([
      getVehicleByPlate(plateUpper),
      getVehicleEventsByPlate(plateUpper, daysBack),
    ])
    
    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehículo no encontrado" },
        { status: 404 },
      )
    }
    
    return NextResponse.json({
      vehicle,
      events,
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
