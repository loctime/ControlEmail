"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AsyncState } from "@/components/common/async-state"
import { LastClosedDateBadge } from "@/components/common/last-closed-date-badge"
import { useDashboardData } from "@/hooks/domain/useDashboardData"

export default function DashboardPage() {
  const { stats, riskVehicles, pendingAlerts, consistency, loading, error, refetch } = useDashboardData()

  const kpis = [
    { label: "Total alertas (ultimo cierre)", value: stats?.totalAlerts ?? 0 },
    { label: "Pendientes", value: stats?.alertsPending ?? 0 },
    { label: "Enviadas", value: stats?.alertsSent ?? 0 },
    { label: "Riesgo maximo", value: stats?.maxRisk ?? 0 },
    { label: "Riesgo promedio", value: stats?.avgRisk ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard profesional</h1>
          <p className="text-sm text-muted-foreground">Vista ejecutiva para HSE, operaciones y gerencia.</p>
        </div>
        <div className="flex items-center gap-2">
          <LastClosedDateBadge />
          <Button variant="outline" onClick={() => void refetch()} disabled={loading}>Actualizar</Button>
        </div>
      </div>

      <AsyncState loading={loading} error={error} onRetry={() => void refetch()} />

      {!loading && !error && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {kpis.map((kpi) => (
              <Card key={kpi.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">{kpi.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Vehiculos de mayor riesgo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {riskVehicles.slice(0, 10).map((item) => (
                  <div key={item.plate} className="flex items-center justify-between rounded border p-2 text-sm">
                    <span className="font-mono">{item.plate}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Eventos: {item.alerts}</Badge>
                      <Badge>{item.maxRisk}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen de calidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {consistency ? (
                  <>
                    <p>Expected total: <strong>{consistency.expectedTotal}</strong></p>
                    <p>Actual total: <strong>{consistency.actualTotal}</strong></p>
                    <p>
                      Estado: {consistency.isConsistent ? <Badge>Consistente</Badge> : <Badge variant="destructive">Inconsistente</Badge>}
                    </p>
                    <p>Ultima verificacion: {consistency.lastChecked ?? "Sin dato"}</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Sin datos de consistencia</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tendencia 7/30/90</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              TODO tecnico: el backend actual no expone serie temporal consolidada en endpoints my-* para calcular tendencia global 7/30/90.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alertas pendientes ({pendingAlerts.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {pendingAlerts.slice(0, 8).map((alert) => (
                <div key={alert.alertId} className="flex items-center justify-between rounded border p-2">
                  <div>
                    <p className="font-mono">{alert.plate}</p>
                    <p className="text-xs text-muted-foreground">Fecha cierre: {alert.dateKey}</p>
                  </div>
                  <Badge variant={alert.riskScore >= 15 ? "destructive" : "outline"}>Risk {alert.riskScore}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Link href="/historico"><Button variant="outline">Historico</Button></Link>
            <Link href="/pendientes"><Button variant="outline">Pendientes</Button></Link>
            <Link href="/vehiculos"><Button variant="outline">Vehiculos</Button></Link>
            <Link href="/configuracion"><Button variant="outline">Configuracion</Button></Link>
          </div>
        </>
      )}
    </div>
  )
}
