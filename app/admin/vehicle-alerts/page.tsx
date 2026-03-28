"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { VehicleAlertsTable, type VehicleAlertRow } from "@/components/vehicle-alerts-table"
import { Button } from "@/components/ui/button"
import { canAccessAdminPages } from "@/lib/can-access-admin-pages"
import { normalizePlate } from "@/lib/utils"
import { adminApi, authApi } from "@/services/api"

export default function VehicleAlertsPage() {
  const [loading, setLoading] = useState(true)
  const [sessionRequired, setSessionRequired] = useState(false)
  const [accessForbidden, setAccessForbidden] = useState(false)
  const [vehicles, setVehicles] = useState<VehicleAlertRow[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setFetchError(null)
      setSessionRequired(false)
      setAccessForbidden(false)
      try {
        const me = await authApi.me()
        if (cancelled) return
        if (!canAccessAdminPages(me.role)) {
          setAccessForbidden(true)
          return
        }
        const data = await adminApi.getVehicleAlerts()
        if (!cancelled) setVehicles(Array.isArray(data) ? data : [])
      } catch (err) {
        if (cancelled) return
        const status = (err as { status?: number })?.status
        if (status === 401) {
          setSessionRequired(true)
        } else {
          setFetchError(err instanceof Error ? err.message : "Error al cargar")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async (plate: string, payload: { responsables: string[] }) => {
    const normalizedPlate = normalizePlate(plate)
    if (!normalizedPlate) {
      throw new Error("La patente no puede estar vacia")
    }

    await adminApi.updateVehicleAlerts({
      vehicles: [{ plate: normalizedPlate, responsables: payload.responsables }],
    })

    setVehicles((prev) => {
      const existing = prev.find((v) => normalizePlate(v.plate || v.id) === normalizedPlate)
      if (existing) {
        return prev.map((v) => {
          const vPlate = normalizePlate(v.plate || v.id)
          return vPlate === normalizedPlate
            ? { ...v, plate: normalizedPlate, responsables: payload.responsables }
            : v
        })
      }
      return [...prev, { id: normalizedPlate, plate: normalizedPlate, responsables: payload.responsables }]
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (sessionRequired) {
    return (
      <div className="container mx-auto max-w-lg py-16 text-center">
        <h1 className="text-xl font-semibold">Sesion requerida</h1>
        <p className="mt-2 text-sm text-muted-foreground">Inicia sesion para acceder a esta seccion.</p>
        <Button asChild className="mt-6">
          <Link href={`/login?next=${encodeURIComponent("/admin/vehicle-alerts")}`}>Ir al inicio de sesion</Link>
        </Button>
      </div>
    )
  }

  if (accessForbidden) {
    return (
      <div className="container mx-auto max-w-lg py-16 text-center">
        <h1 className="text-xl font-semibold">Acceso denegado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta seccion solo esta disponible para cuentas con permisos de administracion (no responsables de flota).
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alertas por vehiculo</h1>
        <p className="mt-1 text-sm text-muted-foreground">Asignar responsables por patente.</p>
      </div>

      {fetchError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {fetchError}
        </div>
      )}

      <VehicleAlertsTable vehicles={vehicles} onSave={handleSave} />
    </div>
  )
}
