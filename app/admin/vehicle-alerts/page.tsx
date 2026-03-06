"use client"

import { useEffect, useState } from "react"
import { VehicleAlertsTable, type VehicleAlertRow } from "@/components/vehicle-alerts-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { normalizePlate } from "@/lib/utils"
import { adminApi } from "@/services/api"

export default function VehicleAlertsPage() {
  const [loading, setLoading] = useState(true)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [vehicles, setVehicles] = useState<VehicleAlertRow[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setFetchError(null)
      setNeedsLogin(false)
      try {
        const data = await adminApi.getVehicleAlerts()
        if (!cancelled) setVehicles(Array.isArray(data) ? data : [])
      } catch (err) {
        if (cancelled) return
        const status = (err as { status?: number })?.status
        if (status === 401) {
          setNeedsLogin(true)
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setLoginLoading(true)
    try {
      await adminApi.login({ password })
      window.location.reload()
    } catch (err) {
      const apiErr = err as { message?: string }
      const msg = apiErr?.message === "invalid_password" ? "Contrasena incorrecta" : apiErr?.message || "Error al ingresar"
      setLoginError(msg)
    } finally {
      setLoginLoading(false)
    }
  }

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

  if (needsLogin) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="text-center text-xl font-semibold">Acceso administrador</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Contrasena</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                placeholder="Contrasena"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loginLoading}
                className="w-full"
              />
            </div>
            {loginError && <p className="text-sm text-destructive">{loginError}</p>}
            <Button type="submit" className="w-full" disabled={loginLoading}>
              {loginLoading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </div>
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
