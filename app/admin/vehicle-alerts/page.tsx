"use client"

import { useEffect, useState } from "react"
import { getApps, initializeApp, type FirebaseApp } from "firebase/app"
import { getAuth, onAuthStateChanged, type User } from "firebase/auth"
import { VehicleAlertsTable } from "@/components/vehicle-alerts-table"
import { VehicleAlertEditModal, type VehicleAlertRow } from "@/components/vehicle-alert-edit-modal"

/** Reemplazá con tu UID de Firebase Auth (temporal). */
const ALLOWED_UID = "REPLACE_WITH_YOUR_UID"

function getFirebaseApp(): FirebaseApp {
  const existing = getApps()
  if (existing.length > 0) return existing[0]!
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    throw new Error("Faltan variables de entorno de Firebase (NEXT_PUBLIC_FIREBASE_*).")
  }
  return initializeApp({
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  })
}

export default function VehicleAlertsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [vehicles, setVehicles] = useState<VehicleAlertRow[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [editingVehicle, setEditingVehicle] = useState<VehicleAlertRow | null>(null)

  useEffect(() => {
    getFirebaseApp()
    const auth = getAuth()
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!user || user.uid !== ALLOWED_UID) return
    let cancelled = false
    setFetchError(null)
    fetch("/api/admin/vehicle-alerts")
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setVehicles(Array.isArray(data) ? data : [])
      })
      .catch((e) => {
        if (!cancelled) setFetchError(e instanceof Error ? e.message : "Error al cargar")
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const handleSave = async (
    plate: string,
    payload: { responsables: string[]; alertEnabled: boolean },
  ) => {
    const res = await fetch("/api/admin/vehicle-alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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

  if (!user || user.uid !== ALLOWED_UID) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-4">
        <h1 className="text-xl font-semibold">Acceso denegado</h1>
        <p className="text-muted-foreground text-center text-sm">
          Solo los administradores pueden acceder a esta página.
        </p>
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
