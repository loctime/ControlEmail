"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AsyncState } from "@/components/common/async-state"
import { LastClosedDateBadge } from "@/components/common/last-closed-date-badge"
import { usePendingAlerts } from "@/hooks/domain/usePendingAlerts"
import { formatEventDateTime } from "@/lib/ui/datetime"

export default function PendientesPage() {
  const { alerts, loading, error, refetch, markAsSent } = usePendingAlerts()
  const [saving, setSaving] = useState<string[]>([])
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const handleMarkOne = async (plate: string) => {
    setActionMessage(null)
    setSaving((prev) => [...prev, plate])
    try {
      const result = await markAsSent([plate])
      if (result.failed.length > 0) {
        setActionMessage(`No se pudo actualizar ${result.failed.length} patente.`)
      }
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Error al marcar alerta")
    } finally {
      setSaving((prev) => prev.filter((item) => item !== plate))
    }
  }

  const handleMarkAll = async () => {
    const plates = alerts.map((item) => item.plate)
    setActionMessage(null)
    setSaving(plates)
    try {
      const result = await markAsSent(plates)
      if (result.failed.length > 0) {
        setActionMessage(`Actualizacion parcial: ${result.updated.length} ok, ${result.failed.length} con error.`)
      } else {
        setActionMessage(`Actualizacion completada: ${result.updated.length} alertas.`)
      }
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Error al marcar alertas")
    } finally {
      setSaving([])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Alertas pendientes</h1>
          <p className="text-sm text-muted-foreground">Gestion de envio de alertas del ultimo cierre.</p>
        </div>
        <div className="flex items-center gap-2">
          <LastClosedDateBadge />
          {alerts.length > 0 && (
            <Button onClick={() => void handleMarkAll()} disabled={saving.length > 0}>
              Marcar todas como enviadas ({alerts.length})
            </Button>
          )}
        </div>
      </div>

      {actionMessage && <p className="text-sm text-muted-foreground">{actionMessage}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Listado ({alerts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AsyncState loading={loading} error={error} empty={!loading && alerts.length === 0} onRetry={() => void refetch()} />

          {!loading && !error && alerts.map((alert) => (
            <div key={alert.plate} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono font-semibold">{alert.plate}</p>
                  <p className="text-xs text-muted-foreground">Ultimo evento: {formatEventDateTime(alert.lastEventAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={alert.riskScore != null && alert.riskScore >= 15 ? "destructive" : "outline"}>Risk {alert.riskScore}</Badge>
                  <Badge variant="outline">Pendiente</Badge>
                  <Button size="sm" variant="outline" onClick={() => void handleMarkOne(alert.plate)} disabled={saving.includes(alert.plate)}>
                    {saving.includes(alert.plate) ? "Guardando..." : "Marcar enviada"}
                  </Button>
                </div>
              </div>

              <div className="mt-2 grid gap-1 text-xs text-muted-foreground md:grid-cols-3">
                <p>Eventos: {alert.summary.totalEvents}</p>
                <p>Criticos: {alert.summary.criticalEvents}</p>
                <p>Responsables: {alert.responsables.length > 0 ? alert.responsables.join(", ") : "Sin responsables"}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
