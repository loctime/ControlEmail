"use client"

import { useEffect, useState } from "react"
import { VehicleAlertsTable } from "@/components/vehicle-alerts-table"
import { VehicleAlertEditModal, type VehicleAlertRow } from "@/components/vehicle-alert-edit-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function VehicleAlertsPage() {
  const [loading, setLoading] = useState(true)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [vehicles, setVehicles] = useState<VehicleAlertRow[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [editingVehicle, setEditingVehicle] = useState<VehicleAlertRow | null>(null)

  // Login form state
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setFetchError(null)
    setNeedsLogin(false)
    fetch("/api/admin/vehicle-alerts", { credentials: "include" })
      .then((res) => {
        if (res.status === 401) {
          if (!cancelled) setNeedsLogin(true)
          return
        }
        if (!res.ok) throw new Error(res.statusText)
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        if (data !== undefined) setVehicles(Array.isArray(data) ? data : [])
      })
      .catch((e) => {
        if (!cancelled) setFetchError(e instanceof Error ? e.message : "Error al cargar")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setLoginLoading(true)
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = data?.error === "invalid_password" ? "Contraseña incorrecta" : "Error al ingresar"
        setLoginError(msg)
        return
      }
      window.location.reload()
    } catch {
      setLoginError("Error de conexión")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleSave = async (
    plate: string,
    payload: { responsables: string[]; alertEnabled: boolean },
  ) => {
    const res = await fetch("/api/admin/vehicle-alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ plate, ...payload }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error ?? "Error al guardar")
    }
    setVehicles((prev) =>
      prev.map((v) =>
        (v.plate || v.id) === plate
          ? { ...v, responsables: payload.responsables, alertEnabled: payload.alertEnabled }
          : v,
      ),
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Cargando…</p>
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
              <Label htmlFor="admin-password">Contraseña</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loginLoading}
                className="w-full"
              />
            </div>
            {loginError && (
              <p className="text-sm text-destructive">{loginError}</p>
            )}
            <Button type="submit" className="w-full" disabled={loginLoading}>
              {loginLoading ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Alertas por vehículo
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Asignar responsables y habilitar alertas por patente.
        </p>
      </div>

      {fetchError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {fetchError}
        </div>
      )}

      <VehicleAlertsTable vehicles={vehicles} onEdit={setEditingVehicle} />

      <VehicleAlertEditModal
        open={editingVehicle != null}
        vehicle={editingVehicle}
        onClose={() => setEditingVehicle(null)}
        onSave={handleSave}
      />
    </div>
  )
}
