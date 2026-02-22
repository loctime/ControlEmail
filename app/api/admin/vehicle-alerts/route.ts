import { NextResponse } from "next/server"
import { listVehicles, updateVehicleAlerts } from "@/lib/firestore-read"
import { hasValidAdminSession, unauthorizedResponse } from "@/lib/admin-session"
import { normalizePlate } from "@/lib/utils"

function checkAdmin(request: Request) {
  if (!hasValidAdminSession(request)) return null
  return true
}

export async function GET(request: Request) {
  if (!checkAdmin(request)) return unauthorizedResponse()
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
  if (!checkAdmin(request)) return unauthorizedResponse()
  try {
    const body = await request.json()
    const rawPlate = typeof body?.plate === "string" ? body.plate : ""
    // Normalizar la patente: eliminar caracteres especiales y convertir a uppercase
    const plate = normalizePlate(rawPlate)
    const rawResponsables = body?.responsables
    const responsables = Array.isArray(rawResponsables)
      ? (rawResponsables as unknown[]).map((v) => String(v).trim()).filter(Boolean)
      : []

    if (!plate) {
      return NextResponse.json({ error: "plate_required" }, { status: 400 })
    }

    await updateVehicleAlerts(plate, { responsables })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[api/admin/vehicle-alerts] PATCH error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
