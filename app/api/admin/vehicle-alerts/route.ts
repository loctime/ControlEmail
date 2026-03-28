import { NextResponse } from "next/server"
import { listVehicles, updateVehicleAlerts } from "@/lib/firestore-read"
import { hasAdminAccess, unauthorizedResponse } from "@/lib/admin-session"
import { normalizePlate } from "@/lib/utils"
import type { VehicleDoc } from "@/lib/firestore-read"

export async function GET(request: Request) {
  if (!(await hasAdminAccess(request))) return unauthorizedResponse()
  try {
    const vehicles: VehicleDoc[] = await listVehicles()
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
  if (!(await hasAdminAccess(request))) return unauthorizedResponse()
  try {
    const body = await request.json()

    const toVehiclesPayload = (): Array<{ plate: string; responsables: string[] }> => {
      if (Array.isArray(body?.vehicles)) {
        return (body.vehicles as unknown[])
          .map((row) => {
            const plate = normalizePlate(String((row as { plate?: string })?.plate ?? ""))
            const responsables = Array.isArray((row as { responsables?: unknown[] })?.responsables)
              ? ((row as { responsables?: unknown[] }).responsables ?? [])
                  .map((value) => String(value).trim())
                  .filter(Boolean)
              : []
            return { plate, responsables }
          })
          .filter((row) => Boolean(row.plate))
      }

      const plate = normalizePlate(String(body?.plate ?? ""))
      const responsables = Array.isArray(body?.responsables)
        ? (body.responsables as unknown[]).map((value) => String(value).trim()).filter(Boolean)
        : []

      return plate ? [{ plate, responsables }] : []
    }

    const vehicles = toVehiclesPayload()
    if (vehicles.length === 0) {
      return NextResponse.json({ error: "vehicles_required" }, { status: 400 })
    }

    await Promise.all(
      vehicles.map((vehicle) => updateVehicleAlerts(vehicle.plate, { responsables: vehicle.responsables })),
    )

    return NextResponse.json({ ok: true, vehiclesUpdated: vehicles.length })
  } catch (error) {
    console.error("[api/admin/vehicle-alerts] PATCH error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 },
    )
  }
}
