"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useDebugPendingAlerts } from "@/hooks/domain/useDebugPendingAlerts"

export default function DebugPendingAlertsPage() {
  const { data, loading, error, refetch } = useDebugPendingAlerts()
  const router = useRouter()

  return (
    <div className="min-h-screen p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>DEBUG · Pending Daily Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive mb-4">{error}</p>}

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Vista de observabilidad para alertas diarias pendientes.
            </p>
            <button
              type="button"
              onClick={refetch}
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Refrescar
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando alertas pendientes…</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay alertas pendientes.</p>
          ) : (
            <div className="space-y-2">
              {data.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{alert.date}</span>
                      <span className="font-semibold">{alert.plate}</span>
                      {alert.driverName && (
                        <span className="text-xs text-muted-foreground">{alert.driverName}</span>
                      )}
                    </div>
                    {alert.reason && (
                      <p className="text-xs text-muted-foreground">{alert.reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{alert.status}</Badge>
                    <button
                      type="button"
                      className="text-xs text-primary underline-offset-4 hover:underline"
                      onClick={() =>
                        router.push(`/vehiculos/${encodeURIComponent(alert.plate)}`)
                      }
                    >
                      Ver vehículo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

