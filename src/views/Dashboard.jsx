"use client"

import { useState, useEffect } from "react"
import { useMe } from "../auth/useMe"
import { apiFetch } from "../api/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function Dashboard() {
  const { me, loading: meLoading, notAuthorized } = useMe()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!me) return
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch("/api/email/my-vehicles")
      .then((data) => {
        if (!cancelled && data?.ok === true && Array.isArray(data.vehicles)) {
          setVehicles(data.vehicles)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Error al cargar vehículos")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [me])

  if (notAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-center text-destructive">
          No estás autorizado para usar el sistema
        </p>
      </div>
    )
  }

  if (meLoading || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl space-y-6 py-8">
      <h1 className="text-2xl font-semibold">Panel de vehículos</h1>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {loading ? (
        <p className="text-muted-foreground">Cargando vehículos...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patente</TableHead>
              <TableHead>Responsables</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  No hay vehículos asignados
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((v) => (
                <TableRow key={v.plate || v.patente || v.id || Math.random()}>
                  <TableCell>{v.plate ?? v.patente ?? "—"}</TableCell>
                  <TableCell>
                    {Array.isArray(v.responsables)
                      ? v.responsables.join(", ")
                      : v.responsables ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
