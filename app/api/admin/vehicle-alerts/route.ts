import { NextResponse } from "next/server"
import { listVehicles, updateVehicleAlerts } from "@/lib/firestore-read"

export async function GET() {
  try {
    const vehicles = await listVehicles()
    return NextResponse.json(vehicles)
  } catch (error) {
    console.error("[api/admin/vehicle-alerts] GET error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const plate = typeof body?.plate === "string" ? body.plate.trim() : ""
    const rawResponsables = body?.responsables
    const responsables = Array.isArray(rawResponsables)
      ? (rawResponsables as unknown[]).map((v) => String(v).trim()).filter(Boolean)
      : []
    const alertEnabled = Boolean(body?.alertEnabled)

    if (!plate) {
      return NextResponse.json({ error: "plate_required" }, { status: 400 })
    }

    await updateVehicleAlerts(plate, { responsables, alertEnabled })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[api/admin/vehicle-alerts] PATCH error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
